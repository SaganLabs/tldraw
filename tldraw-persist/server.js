// tldraw persist API (Postgres + Keycloak via oauth2-proxy headers)
import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import { randomUUID } from "node:crypto"
import pg from "pg"
import { z } from "zod"

const {
  PORT = "8080",
  DATABASE_URL = "postgres://tldraw:Postgres1k80@db_boards:5432/tldraw",
  AUTH_HEADER_USER = "X-Auth-Request-Email",
  TZ = "America/New_York",
} = process.env

process.env.TZ = TZ

const pool = new pg.Pool({ connectionString: DATABASE_URL })
const app = express()

app.use(cors({ origin: true, credentials: false }))
app.use(bodyParser.json({ limit: "25mb" }))

const ddl = `
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS boards_owner_idx ON boards(owner);
CREATE INDEX IF NOT EXISTS boards_deleted_idx ON boards(deleted_at);

CREATE TABLE IF NOT EXISTS board_shares (
  board_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  can_edit BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (board_id, subject),
  CONSTRAINT fk_board FOREIGN KEY(board_id) REFERENCES boards(id) ON DELETE CASCADE
);
`
await pool.query(ddl).catch(err => { console.error("DB init failed", err); process.exit(1); })

function requireUser(req, res, next) {
  // DEBUG: Log all headers to see what we're receiving
  console.log('=== DEBUG: All request headers ===')
  console.log(JSON.stringify(req.headers, null, 2))
  console.log('=== END DEBUG ===')
  
  // Debug: Show what header we're looking for
  const expectedHeader = AUTH_HEADER_USER.toLowerCase()
  console.log(`Looking for auth header: "${expectedHeader}" (from env: ${AUTH_HEADER_USER})`)
  
  // Get the user from headers
  const user = req.headers[expectedHeader]
  console.log(`Found user value: "${user}"`)
  
  // Debug: List all header names to see what's available
  console.log('Available header names:', Object.keys(req.headers))
  
  // Check for common auth header variations
  const authHeaders = [
    'x-auth-request-email',
    'x-auth-request-user', 
    'x-forwarded-email',
    'x-forwarded-user',
    'authorization',
    'x-user',
    'x-email'
  ]
  
  console.log('Auth header check:')
  authHeaders.forEach(header => {
    const value = req.headers[header]
    if (value) {
      console.log(`  ${header}: "${value}"`)
    }
  })
  
  if (!user) {
    console.log('❌ No user found in headers - returning 401')
    return res.status(401).json({ error: "unauthorized" })
  }
  
  console.log(`✅ User authenticated: ${user}`)
  req.user = String(user)
  next()
}

function canAccess(user, board, shares, wantEdit = false) {
  if (user === board.owner) return true
  const s = shares.find((r) => r.subject === user)
  if (!s) return false
  return wantEdit ? !!s.can_edit : true
}

// --- Schemas ---
const PutBody = z.any() // accept any valid tldraw JSON snapshot
const ShareBody = z.object({ email: z.string().min(3).max(200), canEdit: z.boolean().default(true) })

// --- Routes ---
// health
app.get("/healthz", (_req, res) => res.send("ok"))

// create new board
app.post("/api/boards", requireUser, async (req, res) => {
  const id = randomUUID()
  const owner = req.user
  const empty = { shapes: [], bindings: [], assets: {}, pages: {}, pageStates: {}, meta: {} }
  await pool.query(
    `INSERT INTO boards (id, owner, content) VALUES ($1, $2, $3)`,
    [id, owner, empty]
  )
  res.json({ id })
})

// get one board
app.get("/api/boards/:id", requireUser, async (req, res) => {
  const id = req.params.id
  const user = req.user
  const { rows } = await pool.query(`SELECT * FROM boards WHERE id=$1`, [id])
  if (!rows.length) return res.status(404).json({ error: "not_found" })
  const board = rows[0]
  if (board.deleted_at) return res.status(410).json({ error: "gone_soft_deleted" })
  const shares = (await pool.query(`SELECT * FROM board_shares WHERE board_id=$1`, [id])).rows
  if (!canAccess(user, board, shares, false)) return res.status(403).json({ error: "forbidden" })
  res.json(board.content)
})

// autosave (update)
app.put("/api/boards/:id", requireUser, async (req, res) => {
  const id = req.params.id
  const user = req.user
  const body = PutBody.parse(req.body)
  const r = await pool.query(`SELECT * FROM boards WHERE id=$1`, [id])
  if (!r.rows.length) return res.status(404).json({ error: "not_found" })
  const board = r.rows[0]
  if (board.deleted_at) return res.status(410).json({ error: "gone_soft_deleted" })
  const shares = (await pool.query(`SELECT * FROM board_shares WHERE board_id=$1`, [id])).rows
  if (!canAccess(user, board, shares, true)) return res.status(403).json({ error: "forbidden" })
  await pool.query(`UPDATE boards SET content=$1, updated_at=NOW() WHERE id=$2`, [body, id])
  res.json({ ok: true })
})

// soft delete
app.delete("/api/boards/:id", requireUser, async (req, res) => {
  const id = req.params.id
  const user = req.user
  const r = await pool.query(`SELECT * FROM boards WHERE id=$1`, [id])
  if (!r.rows.length) return res.status(404).json({ error: "not_found" })
  const board = r.rows[0]
  if (board.owner !== user) return res.status(403).json({ error: "owner_only" })
  await pool.query(`UPDATE boards SET deleted_at=NOW() WHERE id=$1`, [id])
  res.json({ ok: true })
})

// restore
app.post("/api/boards/:id/restore", requireUser, async (req, res) => {
  const id = req.params.id
  const user = req.user
  const r = await pool.query(`SELECT * FROM boards WHERE id=$1`, [id])
  if (!r.rows.length) return res.status(404).json({ error: "not_found" })
  const board = r.rows[0]
  if (board.owner !== user) return res.status(403).json({ error: "owner_only" })
  await pool.query(`UPDATE boards SET deleted_at=NULL WHERE id=$1`, [id])
  res.json({ ok: true })
})

// share
app.post("/api/boards/:id/share", requireUser, async (req, res) => {
  const id = req.params.id
  const user = req.user
  const body = ShareBody.safeParse(req.body)
  if (!body.success) return res.status(400).json({ error: "bad_request" })
  const { email, canEdit } = body.data
  const r = await pool.query(`SELECT * FROM boards WHERE id=$1`, [id])
  if (!r.rows.length) return res.status(404).json({ error: "not_found" })
  const board = r.rows[0]
  if (board.owner !== user) return res.status(403).json({ error: "owner_only" })
  await pool.query(
    `INSERT INTO board_shares (board_id, subject, can_edit)
     VALUES ($1, $2, $3)
     ON CONFLICT (board_id, subject) DO UPDATE SET can_edit=EXCLUDED.can_edit`,
    [id, email, !!canEdit]
  )
  res.json({ ok: true })
})

// list my boards (owned + shared, non-deleted)
app.get("/api/me/boards", requireUser, async (req, res) => {
  const user = req.user
  const owned = (await pool.query(
    `SELECT id, updated_at FROM boards WHERE owner=$1 AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 200`, [user]
  )).rows
  const shared = (await pool.query(
    `SELECT b.id, b.updated_at FROM board_shares s JOIN boards b ON b.id=s.board_id WHERE s.subject=$1 AND b.deleted_at IS NULL ORDER BY b.updated_at DESC LIMIT 200`, [user]
  )).rows
  res.json({ owned, shared })
})

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`persist-api listening on ${PORT}`)
})