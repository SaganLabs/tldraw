'use client'
import { useEffect, useState } from 'react'
import './dashboard.css'

type Board = {
  id: string
  name: string
  icon?: string
  updated_at: string
}

type BusyMap = Record<string, boolean>

export default function Dashboard() {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<{show: boolean, board: Board | null}>({show: false, board: null})
  const [showRenameModal, setShowRenameModal] = useState<{show: boolean, board: Board | null}>({show: false, board: null})
  const [showShareModal, setShowShareModal] = useState<{show: boolean, board: Board | null}>({show: false, board: null})
  const [showIconModal, setShowIconModal] = useState<{show: boolean, board: Board | null}>({show: false, board: null})
  const [newBoardName, setNewBoardName] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [busy, setBusy] = useState<BusyMap>({})
  const [shareEmail, setShareEmail] = useState('')
  const [shareCanEdit, setShareCanEdit] = useState(true)
  const [iconValue, setIconValue] = useState('🎨')

  const base = process.env.NEXT_PUBLIC_API_BASE_URL || ''

  useEffect(() => { loadBoards() }, [])

  const setCardBusy = (id: string, val: boolean) =>
    setBusy(prev => ({ ...prev, [id]: val }))

  const loadBoards = async () => {
    try {
      const res = await fetch(`${base}/api/me/boards`, { credentials: 'include' })
      if (!res.ok) throw new Error(`Failed to load boards: ${res.status}`)
      const data = await res.json()
      const allBoards: Board[] = [...data.owned, ...data.shared]
      setBoards(allBoards)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load boards')
    } finally {
      setLoading(false)
    }
  }

  const createBoard = async () => {
    if (!newBoardName.trim()) return
    setCardBusy('create', true)
    try {
      const res = await fetch(`${base}/api/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newBoardName.trim(), icon: '🧩' })
      })
      if (!res.ok) throw new Error('Failed to create board')
      const data = await res.json()
      window.location.href = `/board/${data.id}`
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create board')
      setCardBusy('create', false)
    }
  }

  const deleteBoard = async () => {
    if (!showDeleteModal.board) return
    const id = showDeleteModal.board.id
    setCardBusy(id, true)
    try {
      const res = await fetch(`${base}/api/boards/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Failed to delete board')
      await loadBoards()
      setShowDeleteModal({show: false, board: null})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete board')
    } finally {
      setCardBusy(id, false)
    }
  }

  const renameBoard = async () => {
    if (!showRenameModal.board || !renameValue.trim()) return
    const id = showRenameModal.board.id
    setCardBusy(id, true)
    try {
      const res = await fetch(`${base}/api/boards/${id}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: renameValue.trim() })
      })
      if (!res.ok) throw new Error('Failed to rename board')
      await loadBoards()
      setShowRenameModal({show: false, board: null})
      setRenameValue('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to rename board')
    } finally {
      setCardBusy(id, false)
    }
  }

  const shareBoard = async () => {
    if (!showShareModal.board || !shareEmail.trim()) return
    const id = showShareModal.board.id
    setCardBusy(id, true)
    try {
      const res = await fetch(`${base}/api/boards/${id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: shareEmail.trim(), canEdit: !!shareCanEdit })
      })
      if (!res.ok) throw new Error('Failed to share board')
      setShowShareModal({show: false, board: null})
      setShareEmail('')
      setShareCanEdit(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to share board')
    } finally {
      setCardBusy(id, false)
    }
  }

  const changeIcon = async () => {
    if (!showIconModal.board || !iconValue.trim()) return
    const id = showIconModal.board.id
    setCardBusy(id, true)
    try {
      const res = await fetch(`${base}/api/boards/${id}/icon`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ icon: iconValue.trim() })
      })
      if (!res.ok) throw new Error('Failed to update icon')
      await loadBoards()
      setShowIconModal({show: false, board: null})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update icon')
    } finally {
      setCardBusy(id, false)
    }
  }

  const openBoard = (boardId: string) => window.location.href = `/board/${boardId}`

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const filteredBoards = boards.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Preparing your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <nav className="nav-header">
        <div className="nav-content">
          <div className="brand">
            <div className="brand-icon">
              <img src="/logo.png" alt="Free Spirit" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }}/>
            </div>
            <div className="brand-text">
              <h1>Free Spirit</h1>
              <span>Creative Studio</span>
            </div>
          </div>
          <div className="nav-actions">
            <div className="search-container">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search boards…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <button className="nav-btn primary" onClick={() => setShowCreateForm(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h2 className="hero-title">Your Boards</h2>
            <p className="hero-subtitle">Fast access, delightful details, built for real work.</p>
          </div>
        </div>
      </section>

      {/* Errors */}
      {error && (
        <div className="error-toast">
          <div className="error-content">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="error-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Main */}
      <main className="main-content">
        {/* Create Modal */}
        {showCreateForm && (
          <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Create New Board</h3>
                <button onClick={() => setShowCreateForm(false)} className="modal-close">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label htmlFor="boardName">Board Name</label>
                  <input
                    id="boardName"
                    type="text"
                    placeholder="Enter a name…"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createBoard()}
                    autoFocus
                    maxLength={100}
                    className="board-name-input"
                  />
                </div>
                <div className="modal-actions">
                  <button onClick={() => setShowCreateForm(false)} className="btn-secondary">Cancel</button>
                  <button onClick={createBoard} disabled={!newBoardName.trim() || busy['create']} className="btn-primary">
                    {busy['create'] ? (<><div className="spinner-mini"></div>Creating…</>) : ('Create Board')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete */}
        {showDeleteModal.show && (
          <div className="modal-overlay" onClick={() => setShowDeleteModal({show: false, board: null})}>
            <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Delete Board</h3>
                <button onClick={() => setShowDeleteModal({show: false, board: null})} className="modal-close">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <div className="delete-warning">
                  <div className="warning-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18l-1.5 14H4.5L3 6z"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </div>
                  <h4>Are you absolutely sure?</h4>
                  <p>This will permanently delete <strong>"{showDeleteModal.board?.name}"</strong>.</p>
                </div>
                <div className="modal-actions">
                  <button onClick={() => setShowDeleteModal({show: false, board: null})} className="btn-secondary" disabled={busy[showDeleteModal.board!.id]}>Cancel</button>
                  <button onClick={deleteBoard} className="btn-danger" disabled={busy[showDeleteModal.board!.id]}>
                    {busy[showDeleteModal.board!.id] ? (<><div className="spinner-mini"></div>Deleting…</>) : ('Yes, Delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rename */}
        {showRenameModal.show && (
          <div className="modal-overlay" onClick={() => setShowRenameModal({show: false, board: null})}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Rename Board</h3>
                <button onClick={() => setShowRenameModal({show: false, board: null})} className="modal-close">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label htmlFor="renameBoardName">New Board Name</label>
                  <input
                    id="renameBoardName"
                    type="text"
                    placeholder="Enter new name…"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && renameBoard()}
                    autoFocus
                    maxLength={100}
                    className="board-name-input"
                  />
                </div>
                <div className="modal-actions">
                  <button onClick={() => setShowRenameModal({show: false, board: null})} className="btn-secondary">Cancel</button>
                  <button onClick={renameBoard} disabled={!renameValue.trim() || busy[showRenameModal.board!.id]} className="btn-primary">
                    {busy[showRenameModal.board!.id] ? (<><div className="spinner-mini"></div>Renaming…</>) : ('Rename')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Share */}
        {showShareModal.show && (
          <div className="modal-overlay" onClick={() => setShowShareModal({show: false, board: null})}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Share “{showShareModal.board?.name}”</h3>
                <button onClick={() => setShowShareModal({show: false, board: null})} className="modal-close">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label htmlFor="shareEmail">User email</label>
                  <input
                    id="shareEmail"
                    type="email"
                    placeholder="name@example.com"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    autoFocus
                    className="board-name-input"
                    maxLength={200}
                  />
                </div>
                <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input id="shareCanEdit" type="checkbox" checked={shareCanEdit} onChange={e => setShareCanEdit(e.target.checked)} />
                  <label htmlFor="shareCanEdit">Allow editing</label>
                </div>
                <div className="modal-actions">
                  <button onClick={() => setShowShareModal({show: false, board: null})} className="btn-secondary">Cancel</button>
                  <button onClick={shareBoard} disabled={!shareEmail.trim() || busy[showShareModal.board!.id]} className="btn-primary">
                    {busy[showShareModal.board!.id] ? (<><div className="spinner-mini"></div>Sharing…</>) : ('Share')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Icon */}
        {showIconModal.show && (
          <div className="modal-overlay" onClick={() => setShowIconModal({show: false, board: null})}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Choose Icon</h3>
                <button onClick={() => setShowIconModal({show: false, board: null})} className="modal-close">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <div className="icon-grid">
                  {['🎨','🧩','🧠','✏️','📐','🗺️','🧪','📎','📊','📦','🛰️','⚙️','🔭','🧭','💡','🚀','🌈','🖼️','🔧','🧰','🧱','🧬','📌','📁'].map(emo => (
                    <button
                      key={emo}
                      className={`icon-cell ${iconValue===emo ? 'selected' : ''}`}
                      onClick={() => setIconValue(emo)}
                      title={emo}
                    >
                      <span>{emo}</span>
                    </button>
                  ))}
                </div>
                <div className="input-group" style={{ marginTop: 12 }}>
                  <label htmlFor="iconString">Or paste an emoji</label>
                  <input
                    id="iconString"
                    type="text"
                    value={iconValue}
                    onChange={(e) => setIconValue(e.target.value)}
                    className="board-name-input"
                    maxLength={8}
                  />
                </div>
                <div className="modal-actions">
                  <button onClick={() => setShowIconModal({show: false, board: null})} className="btn-secondary">Cancel</button>
                  <button onClick={changeIcon} disabled={!iconValue.trim() || busy[showIconModal.board!.id]} className="btn-primary">
                    {busy[showIconModal.board!.id] ? (<><div className="spinner-mini"></div>Saving…</>) : ('Save Icon')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Boards */}
        <section className="boards-section">
          <div className="section-header">
            <div className="section-title">
              <h3>Your Boards</h3>
              <span className="board-count">{filteredBoards.length} {filteredBoards.length === 1 ? 'board' : 'boards'}{searchQuery && ` matching "${searchQuery}"`}</span>
            </div>
          </div>

          {filteredBoards.length === 0 ? (
            <div className="empty-state">
              <div className="empty-illustration">
                <div className="empty-badge">{searchQuery ? '🔍' : '🎨'}</div>
              </div>
              <h4>{searchQuery ? 'No boards found' : 'Start Your Creative Journey'}</h4>
              <p>{searchQuery ? `No boards match "${searchQuery}". Try a different search.` : 'Create your first board and bring your ideas to life.'}</p>
              {!searchQuery && (<button onClick={() => setShowCreateForm(true)} className="empty-cta">Create Your First Board</button>)}
            </div>
          ) : (
            <div className="neo-grid">
              {filteredBoards.map((board, index) => (
                <article
                  key={board.id}
                  className="neo-card"
                  style={{ animationDelay: `${index * 0.06}s` }}
                >
                  {/* Decorative header with parallax dots */}
                  <div className="neo-card__visual" onClick={() => openBoard(board.id)}>
                    <div className="neo-card__icon">
                      <div className="neo-card__icon-badge" title="Board icon">{board.icon || '🎨'}</div>
                    </div>
                  </div>

                  <div className="neo-card__body">
                    <h4 className="neo-card__title" title={board.name}>{board.name}</h4>
                    <p className="neo-card__meta">Updated {formatDate(board.updated_at)}</p>

                    <div className="neo-card__actions">
                      <button onClick={() => openBoard(board.id)} className="neo-btn neo-btn--primary" disabled={!!busy[board.id]}>
                        <span className="neo-btn__icon">👁️</span>
                        <span>Open</span>
                      </button>
                      <button onClick={() => { setRenameValue(board.name); setShowRenameModal({show: true, board}) }} className="neo-btn">
                        <span className="neo-btn__icon">✏️</span>
                        <span>Rename</span>
                      </button>
                      <button onClick={() => { setIconValue(board.icon || '🎨'); setShowIconModal({show: true, board}) }} className="neo-btn">
                        <span className="neo-btn__icon">🖼️</span>
                        <span>Icon</span>
                      </button>
                      <button onClick={() => setShowShareModal({show: true, board})} className="neo-btn">
                        <span className="neo-btn__icon">🔗</span>
                        <span>Share</span>
                      </button>
                      <button onClick={() => setShowDeleteModal({show: true, board})} className="neo-btn neo-btn--danger" title="Delete">
                        <span className="neo-btn__icon">🗑️</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
