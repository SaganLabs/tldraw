// tldraw persist API (Postgres + Keycloak via oauth2-proxy headers)
import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import { randomUUID } from "node:crypto"
import pg from "pg"
import { z } from "zod"

const {
  PORT = "8080",
  DATABASE_URL = "postgres://saganlabsadmin:Postgres1k80@db_boards:5432/tldraw",
  AUTH_HEADER_USER = "X-Forwarded-Email",
  TZ = "America/New_York",
} = process.env

process.env.TZ = TZ

const pool = new pg.Pool({ connectionString: DATABASE_URL })
const app = express()

app.use(cors({ origin: true, credentials: false }))
app.use(bodyParser.json({ limit: "25mb" }))

// --- Schema bootstrapping & migrations ---
const ddl = `
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Board',
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
-- Add icon column if missing
ALTER TABLE boards ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT '🎨';
`
await pool.query(ddl).catch(err => { console.error("DB init failed", err); process.exit(1); })

function requireUser(req, res, next) {
  const expectedHeader = AUTH_HEADER_USER.toLowerCase()
  const user = req.headers[expectedHeader]
  if (!user) return res.status(401).json({ error: "unauthorized" })
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
const PutBody = z.any()
const CreateBoardBody = z.object({ name: z.string().min(1).max(100).default('Untitled Board'), icon: z.string().max(50).optional() })
const RenameBoardBody = z.object({ name: z.string().min(1).max(100) })
const IconBody = z.object({ icon: z.string().min(1).max(50) })
const ShareBody = z.object({ email: z.string().min(3).max(200), canEdit: z.boolean().default(true) })

// health
app.get("/healthz", (_req, res) => res.send("ok"))

// create board
app.post("/api/boards", requireUser, async (req, res) => {
  try {
    const id = randomUUID()
    const owner = req.user
    const body = CreateBoardBody.parse(req.body)
    const icon = body.icon || '🎨'
    const empty = { shapes: [], bindings: [], assets: {}, pages: {}, pageStates: {}, meta: {} }

    await pool.query(
      `INSERT INTO boards (id, owner, name, content, icon) VALUES ($1, $2, $3, $4, $5)`,
      [id, owner, body.name, empty, icon]
    )
    res.json({ id, name: body.name, icon })
  } catch (error) {
    console.error('Create board error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'validation_error', details: error.errors })
    }
    res.status(500).json({ error: 'internal_server_error' })
  }
})

// get one board (returns name + icon + content)
app.get("/api/boards/:id", requireUser, async (req, res) => {
  try {
    const id = req.params.id
    const user = req.user
    const { rows } = await pool.query(`SELECT * FROM boards WHERE id=$1`, [id])
    if (!rows.length) return res.status(404).json({ error: "not_found" })
    const board = rows[0]
    if (board.deleted_at) return res.status(410).json({ error: "gone_soft_deleted" })
    const shares = (await pool.query(`SELECT * FROM board_shares WHERE board_id=$1`, [id])).rows
    if (!canAccess(user, board, shares, false)) return res.status(403).json({ error: "forbidden" })

    // Optional: weak ETag based on updated_at timestamp
    res.setHeader('ETag', `"${new Date(board.updated_at).getTime()}"`)
    if (req.headers['if-none-match'] === res.getHeader('ETag')) return res.status(304).end()

    res.json({ content: board.content, name: board.name, icon: board.icon })
  } catch (error) {
    console.error('Get board error:', error)
    res.status(500).json({ error: 'internal_server_error' })
  }
})

// update content (manual save)
app.put("/api/boards/:id", requireUser, async (req, res) => {
  try {
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
    const after = await pool.query(`SELECT updated_at FROM boards WHERE id=$1`, [id])
    res.setHeader('ETag', `"${new Date(after.rows[0].updated_at).getTime()}"`)
    res.json({ ok: true })
  } catch (error) {
    console.error('Update board content error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'validation_error', details: error.errors })
    }
    res.status(500).json({ error: 'internal_server_error' })
  }
})

// rename
app.patch("/api/boards/:id/rename", requireUser, async (req, res) => {
  try {
    const id = req.params.id
    const user = req.user
    const body = RenameBoardBody.parse(req.body)
    const r = await pool.query(`SELECT * FROM boards WHERE id=$1`, [id])
    if (!r.rows.length) return res.status(404).json({ error: "not_found" })
    const board = r.rows[0]
    if (board.owner !== user) return res.status(403).json({ error: "owner_only" })
    await pool.query(`UPDATE boards SET name=$1, updated_at=NOW() WHERE id=$2`, [body.name, id])
    const after = await pool.query(`SELECT updated_at FROM boards WHERE id=$1`, [id])
    res.setHeader('ETag', `"${new Date(after.rows[0].updated_at).getTime()}"`)
    res.json({ ok: true, name: body.name })
  } catch (error) {
    console.error('Rename board error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'validation_error', details: error.errors })
    }
    res.status(500).json({ error: 'internal_server_error' })
  }
})

// update icon (owner only)
app.patch("/api/boards/:id/icon", requireUser, async (req, res) => {
  try {
    const id = req.params.id
    const user = req.user
    const body = IconBody.parse(req.body)
    const r = await pool.query(`SELECT * FROM boards WHERE id=$1`, [id])
    if (!r.rows.length) return res.status(404).json({ error: "not_found" })
    const board = r.rows[0]
    if (board.owner !== user) return res.status(403).json({ error: "owner_only" })
    await pool.query(`UPDATE boards SET icon=$1, updated_at=NOW() WHERE id=$2`, [body.icon, id])
    res.json({ ok: true, icon: body.icon })
  } catch (error) {
    console.error('Update icon error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'validation_error', details: error.errors })
    }
    res.status(500).json({ error: 'internal_server_error' })
  }
})

// soft delete
app.delete("/api/boards/:id", requireUser, async (req, res) => {
  try {
    const id = req.params.id
    const user = req.user
    const r = await pool.query(`SELECT * FROM boards WHERE id=$1`, [id])
    if (!r.rows.length) return res.status(404).json({ error: "not_found" })
    const board = r.rows[0]
    if (board.owner !== user) return res.status(403).json({ error: "owner_only" })
    await pool.query(`UPDATE boards SET deleted_at=NOW() WHERE id=$1`, [id])
    res.json({ ok: true })
  } catch (error) {
    console.error('Delete board error:', error)
    res.status(500).json({ error: 'internal_server_error' })
  }
})

// restore
app.post("/api/boards/:id/restore", requireUser, async (req, res) => {
  try {
    const id = req.params.id
    const user = req.user
    const r = await pool.query(`SELECT * FROM boards WHERE id=$1`, [id])
    if (!r.rows.length) return res.status(404).json({ error: "not_found" })
    const board = r.rows[0]
    if (board.owner !== user) return res.status(403).json({ error: "owner_only" })
    await pool.query(`UPDATE boards SET deleted_at=NULL WHERE id=$1`, [id])
    res.json({ ok: true })
  } catch (error) {
    console.error('Restore board error:', error)
    res.status(500).json({ error: 'internal_server_error' })
  }
})

// share
app.post("/api/boards/:id/share", requireUser, async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Share board error:', error)
    res.status(500).json({ error: 'internal_server_error' })
  }
})

// list my boards (owned + shared, name + icon + updated)
app.get("/api/me/boards", requireUser, async (req, res) => {
  try {
    const user = req.user
    const owned = (await pool.query(
      `SELECT id, name, icon, updated_at FROM boards WHERE owner=$1 AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 200`, [user]
    )).rows
    const shared = (await pool.query(
      `SELECT b.id, b.name, b.icon, b.updated_at FROM board_shares s JOIN boards b ON b.id=s.board_id WHERE s.subject=$1 AND b.deleted_at IS NULL ORDER BY b.updated_at DESC LIMIT 200`, [user]
    )).rows
    res.json({ owned, shared })
  } catch (error) {
    console.error('List boards error:', error)
    res.status(500).json({ error: 'internal_server_error' })
  }
})

// Global error handler - MUST be after all routes
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'internal_server_error' })
})

// Handle uncaught exceptions to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  // Don't exit the process - log and continue
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  // Don't exit the process - log and continue
})

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`persist-api listening on ${PORT}`)
})