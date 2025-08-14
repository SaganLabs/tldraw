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
  const [iconValue, setIconValue] = useState('palette')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid') // FIXED: Added view mode state

  const base = process.env.NEXT_PUBLIC_API_BASE_URL || ''

  useEffect(() => { loadBoards() }, [])

  const setCardBusy = (id: string, val: boolean) =>
    setBusy(prev => ({ ...prev, [id]: val }))

  // FIXED: Added error handling for API responses
  const handleApiError = (res: Response) => {
    if (res.status === 502) {
      setError('Server temporarily unavailable. Please try again.')
      return true
    }
    if (res.status === 401) {
      // Redirect to login
      window.location.href = '/oauth2/sign_in'
      return true
    }
    return false
  }

  const loadBoards = async () => {
    try {
      const res = await fetch(`${base}/api/me/boards`, { credentials: 'include' })
      if (handleApiError(res)) return
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
        body: JSON.stringify({ name: newBoardName.trim(), icon: iconValue })
      })
      if (handleApiError(res)) {
        setCardBusy('create', false)
        return
      }
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
      if (handleApiError(res)) {
        setCardBusy(id, false)
        return
      }
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
      if (handleApiError(res)) {
        setCardBusy(id, false)
        return
      }
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
      if (handleApiError(res)) {
        setCardBusy(id, false)
        return
      }
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
      if (handleApiError(res)) {
        setCardBusy(id, false)
        return
      }
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

  // FIXED: Search functionality
  const filteredBoards = boards.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const MaterialIcon = ({ name, className = '' }: { name: string, className?: string }) => (
    <span className={`material-symbols-rounded ${className}`}>{name}</span>
  )

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="loading-system">
            <div className="loading-orb"></div>
            <div className="loading-rings">
              <div className="ring ring-1"></div>
              <div className="ring ring-2"></div>
              <div className="ring ring-3"></div>
            </div>
          </div>
          <div className="loading-content">
            <h3 className="loading-title">Preparing your workspace</h3>
            <p className="loading-subtitle">Setting up your creative environment...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {/* Ambient Background */}
      <div className="ambient-bg">
        <div className="ambient-orb orb-1"></div>
        <div className="ambient-orb orb-2"></div>
        <div className="ambient-orb orb-3"></div>
        <div className="ambient-grid"></div>
      </div>

      {/* Navigation Header */}
      <nav className="nav-header">
        <div className="nav-glass"></div>
        <div className="nav-content">
          <div className="brand">
            <div className="brand-icon">
              <div className="logo-container">
                <img src="/logo.png" alt="Free Spirit" className="logo-image" />
                {/* REMOVED: logo-glow div that was causing white circle */}
              </div>
            </div>
            <div className="brand-text">
              <h1>Free Spirit</h1>
              <span>Creative Studio</span>
            </div>
          </div>

          <div className="nav-center">
            <div className="search-container">
              <MaterialIcon name="search" className="search-icon" />
              <input
                type="text"
                placeholder="Search your boards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <div className="search-glass"></div>
            </div>
          </div>

          <div className="nav-actions">
            {/* REMOVED: Help button as requested */}
            <button className="nav-btn primary" onClick={() => setShowCreateForm(true)}>
              <MaterialIcon name="add" />
              <span>New Board</span>
              <div className="btn-glow"></div>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-badge">
              <MaterialIcon name="workspace_premium" />
              <span>Your Workspace</span>
            </div>
            <h1 className="hero-title">
              Your Creative
              <span className="gradient-text"> Boards</span>
            </h1>
            <p className="hero-subtitle">
              Design, collaborate, and bring your ideas to life with our powerful visual workspace.
            </p>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">{boards.length}</span>
                <span className="stat-label">Boards</span>
              </div>
              <div className="stat">
                <span className="stat-number">{boards.filter(b => new Date(b.updated_at) > new Date(Date.now() - 7*24*60*60*1000)).length}</span>
                <span className="stat-label">Active this week</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            {/* UPDATED: Modern Brand Art */}
            <div className="brand-art">
              <div className="art-container">
                <div className="floating-elements">
                  <div className="element element-1">
                    <MaterialIcon name="palette" />
                  </div>
                  <div className="element element-2">
                    <MaterialIcon name="design_services" />
                  </div>
                  <div className="element element-3">
                    <MaterialIcon name="draw" />
                  </div>
                  <div className="element element-4">
                    <MaterialIcon name="brush" />
                  </div>
                </div>
                <div className="central-logo">
                  <div className="logo-bg">
                    <img src="/logo.png" alt="Free Spirit" className="hero-logo" />
                  </div>
                </div>
                <div className="connection-lines">
                  <div className="line line-1"></div>
                  <div className="line line-2"></div>
                  <div className="line line-3"></div>
                  <div className="line line-4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Error Toast */}
      {error && (
        <div className="error-toast">
          <div className="toast-content">
            <MaterialIcon name="error" className="toast-icon" />
            <div className="toast-text">
              <span className="toast-title">Something went wrong</span>
              <span className="toast-message">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="toast-close">
              <MaterialIcon name="close" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        {/* Boards Section */}
        <section className="boards-section">
          <div className="section-header">
            <div className="section-title">
              <h2>Your Boards</h2>
              <span className="board-count">
                {filteredBoards.length} board{filteredBoards.length !== 1 ? 's' : ''}
                {searchQuery && ` matching "${searchQuery}"`}
              </span>
            </div>
            {boards.length > 0 && (
              <div className="view-options">
                <button 
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  <MaterialIcon name="grid_view" />
                </button>
                <button 
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  <MaterialIcon name="view_list" />
                </button>
              </div>
            )}
          </div>

          {filteredBoards.length === 0 ? (
            <div className="empty-state">
              <div className="empty-visual">
                <div className="empty-icon">
                  <MaterialIcon name={searchQuery ? "search_off" : "dashboard"} />
                </div>
                <div className="empty-particles">
                  <div className="particle"></div>
                  <div className="particle"></div>
                  <div className="particle"></div>
                </div>
              </div>
              <div className="empty-content">
                <h3>{searchQuery ? 'No boards found' : 'Ready to create?'}</h3>
                <p>
                  {searchQuery 
                    ? `No boards match "${searchQuery}". Try adjusting your search.`
                    : 'Start your creative journey by creating your first board.'
                  }
                </p>
                {!searchQuery && (
                  <button onClick={() => setShowCreateForm(true)} className="empty-cta">
                    <MaterialIcon name="add" />
                    <span>Create Your First Board</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className={`boards-container ${viewMode}`}>
              {viewMode === 'grid' ? (
                <div className="boards-grid">
                  {filteredBoards.map((board, index) => (
                    <article
                      key={board.id}
                      className="board-card"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="card-glass"></div>
                      
                      {/* Card Header */}
                      <div className="card-header" onClick={() => openBoard(board.id)}>
                        <div className="card-icon">
                          <MaterialIcon name={board.icon || 'palette'} />
                          <div className="icon-glow"></div>
                        </div>
                        <div className="card-preview">
                          <div className="preview-dots">
                            <div className="dot"></div>
                            <div className="dot"></div>
                            <div className="dot"></div>
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="card-body">
                        <h3 className="card-title" title={board.name}>
                          {board.name}
                        </h3>
                        <p className="card-meta">
                          <MaterialIcon name="schedule" className="meta-icon" />
                          <span>Updated {formatDate(board.updated_at)}</span>
                        </p>
                      </div>

                      {/* Card Actions */}
                      <div className="card-actions">
                        <button 
                          onClick={() => openBoard(board.id)} 
                          className="action-btn primary"
                          disabled={!!busy[board.id]}
                        >
                          <MaterialIcon name="launch" />
                          <span>Open</span>
                        </button>
                        
                        <div className="action-group">
                          <button 
                            onClick={() => { setRenameValue(board.name); setShowRenameModal({show: true, board}) }}
                            className="action-btn icon-only"
                            title="Rename board"
                          >
                            <MaterialIcon name="edit" />
                          </button>
                          
                          <button 
                            onClick={() => { setIconValue(board.icon || 'palette'); setShowIconModal({show: true, board}) }}
                            className="action-btn icon-only"
                            title="Change icon"
                          >
                            <MaterialIcon name="emoji_emotions" />
                          </button>
                          
                          <button 
                            onClick={() => setShowShareModal({show: true, board})}
                            className="action-btn icon-only"
                            title="Share board"
                          >
                            <MaterialIcon name="share" />
                          </button>
                          
                          <button 
                            onClick={() => setShowDeleteModal({show: true, board})}
                            className="action-btn icon-only danger"
                            title="Delete board"
                          >
                            <MaterialIcon name="delete" />
                          </button>
                        </div>
                      </div>

                      {/* Loading Overlay */}
                      {busy[board.id] && (
                        <div className="card-loading">
                          <div className="loading-spinner"></div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="boards-list">
                  {filteredBoards.map((board, index) => (
                    <div
                      key={board.id}
                      className="board-list-item"
                      style={{ animationDelay: `${index * 25}ms` }}
                    >
                      <div className="list-item-icon">
                        <MaterialIcon name={board.icon || 'palette'} />
                      </div>
                      <div className="list-item-content">
                        <h3 className="list-item-title">{board.name}</h3>
                        <p className="list-item-meta">Updated {formatDate(board.updated_at)}</p>
                      </div>
                      <div className="list-item-actions">
                        <button 
                          onClick={() => openBoard(board.id)} 
                          className="action-btn primary small"
                          disabled={!!busy[board.id]}
                        >
                          <MaterialIcon name="launch" />
                          <span>Open</span>
                        </button>
                        
                        <button 
                          onClick={() => { setRenameValue(board.name); setShowRenameModal({show: true, board}) }}
                          className="action-btn icon-only small"
                          title="Rename board"
                        >
                          <MaterialIcon name="edit" />
                        </button>
                        
                        <button 
                          onClick={() => { setIconValue(board.icon || 'palette'); setShowIconModal({show: true, board}) }}
                          className="action-btn icon-only small"
                          title="Change icon"
                        >
                          <MaterialIcon name="emoji_emotions" />
                        </button>
                        
                        <button 
                          onClick={() => setShowShareModal({show: true, board})}
                          className="action-btn icon-only small"
                          title="Share board"
                        >
                          <MaterialIcon name="share" />
                        </button>
                        
                        <button 
                          onClick={() => setShowDeleteModal({show: true, board})}
                          className="action-btn icon-only small danger"
                          title="Delete board"
                        >
                          <MaterialIcon name="delete" />
                        </button>
                      </div>

                      {/* Loading Overlay */}
                      {busy[board.id] && (
                        <div className="list-loading">
                          <div className="loading-spinner small"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* All your existing modals stay the same */}
      {/* Create Board Modal */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <MaterialIcon name="add_box" className="modal-icon" />
                <h3>Create New Board</h3>
              </div>
              <button onClick={() => setShowCreateForm(false)} className="modal-close">
                <MaterialIcon name="close" />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="input-group">
                <label htmlFor="boardName">Board Name</label>
                <div className="input-container">
                  <MaterialIcon name="title" className="input-icon" />
                  <input
                    id="boardName"
                    type="text"
                    placeholder="Enter board name..."
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createBoard()}
                    autoFocus
                    maxLength={100}
                    className="board-input"
                  />
                </div>
              </div>
              
              <div className="input-group">
                <label htmlFor="boardIcon">Choose Icon</label>
                <div className="icon-selector">
                {[
                  'palette', 'draw', 'architecture', 'design_services', 'brush', 'create',
                  'dashboard', 'view_quilt', 'analytics', 'psychology', 'lightbulb',
                  'rocket_launch', 'auto_awesome', 'camera_alt', 'movie', 'music_note',
                  'code', 'terminal', 'storage', 'cloud', 'smartphone', 'laptop',
                  'headphones', 'gamepad'
                ].map(icon => (
                    <button
                      key={icon}
                      className={`icon-option ${iconValue === icon ? 'selected' : ''}`}
                      onClick={() => setIconValue(icon)}
                    >
                      <MaterialIcon name={icon} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button onClick={() => setShowCreateForm(false)} className="btn-secondary">
                Cancel
              </button>
              <button 
                onClick={createBoard} 
                disabled={!newBoardName.trim() || busy['create']} 
                className="btn-primary"
              >
                {busy['create'] ? (
                  <>
                    <div className="spinner-mini"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <MaterialIcon name="add" />
                    <span>Create Board</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal.show && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal({show: false, board: null})}>
          <div className="modal-content danger-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <MaterialIcon name="warning" className="modal-icon danger" />
                <h3>Delete Board</h3>
              </div>
              <button onClick={() => setShowDeleteModal({show: false, board: null})} className="modal-close">
                <MaterialIcon name="close" />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="warning-content">
                <h4>Are you absolutely sure?</h4>
                <p>
                  This will permanently delete <strong>"{showDeleteModal.board?.name}"</strong>. 
                  This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                onClick={() => setShowDeleteModal({show: false, board: null})} 
                className="btn-secondary"
                disabled={busy[showDeleteModal.board!.id]}
              >
                Cancel
              </button>
              <button 
                onClick={deleteBoard} 
                className="btn-danger" 
                disabled={busy[showDeleteModal.board!.id]}
              >
                {busy[showDeleteModal.board!.id] ? (
                  <>
                    <div className="spinner-mini"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <MaterialIcon name="delete" />
                    <span>Delete Board</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal.show && (
        <div className="modal-overlay" onClick={() => setShowRenameModal({show: false, board: null})}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <MaterialIcon name="edit" className="modal-icon" />
                <h3>Rename Board</h3>
              </div>
              <button onClick={() => setShowRenameModal({show: false, board: null})} className="modal-close">
                <MaterialIcon name="close" />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="input-group">
                <label htmlFor="renameBoardName">New Board Name</label>
                <div className="input-container">
                  <MaterialIcon name="title" className="input-icon" />
                  <input
                    id="renameBoardName"
                    type="text"
                    placeholder="Enter new name..."
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && renameBoard()}
                    autoFocus
                    maxLength={100}
                    className="board-input"
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button onClick={() => setShowRenameModal({show: false, board: null})} className="btn-secondary">
                Cancel
              </button>
              <button 
                onClick={renameBoard} 
                disabled={!renameValue.trim() || busy[showRenameModal.board!.id]} 
                className="btn-primary"
              >
                {busy[showRenameModal.board!.id] ? (
                  <>
                    <div className="spinner-mini"></div>
                    <span>Renaming...</span>
                  </>
                ) : (
                  <>
                    <MaterialIcon name="check" />
                    <span>Rename</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal.show && (
        <div className="modal-overlay" onClick={() => setShowShareModal({show: false, board: null})}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <MaterialIcon name="share" className="modal-icon" />
                <h3>Share "{showShareModal.board?.name}"</h3>
              </div>
              <button onClick={() => setShowShareModal({show: false, board: null})} className="modal-close">
                <MaterialIcon name="close" />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="input-group">
                <label htmlFor="shareEmail">Email Address</label>
                <div className="input-container">
                  <MaterialIcon name="mail" className="input-icon" />
                  <input
                    id="shareEmail"
                    type="email"
                    placeholder="colleague@company.com"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    autoFocus
                    className="board-input"
                    maxLength={200}
                  />
                </div>
              </div>
              
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input 
                    id="shareCanEdit" 
                    type="checkbox" 
                    checked={shareCanEdit} 
                    onChange={e => setShareCanEdit(e.target.checked)}
                    className="checkbox-input"
                  />
                  <div className="checkbox-custom">
                    <MaterialIcon name="check" className="checkbox-icon" />
                  </div>
                  <span>Allow editing</span>
                </label>
              </div>
            </div>
            
            <div className="modal-actions">
              <button onClick={() => setShowShareModal({show: false, board: null})} className="btn-secondary">
                Cancel
              </button>
              <button 
                onClick={shareBoard} 
                disabled={!shareEmail.trim() || busy[showShareModal.board!.id]} 
                className="btn-primary"
              >
                {busy[showShareModal.board!.id] ? (
                  <>
                    <div className="spinner-mini"></div>
                    <span>Sharing...</span>
                  </>
                ) : (
                  <>
                    <MaterialIcon name="send" />
                    <span>Share Board</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Icon Modal */}
      {showIconModal.show && (
        <div className="modal-overlay" onClick={() => setShowIconModal({show: false, board: null})}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <MaterialIcon name="emoji_emotions" className="modal-icon" />
                <h3>Choose Icon</h3>
              </div>
              <button onClick={() => setShowIconModal({show: false, board: null})} className="modal-close">
                <MaterialIcon name="close" />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="icon-grid">
                {[
                  'palette', 'draw', 'architecture', 'design_services', 'brush', 'create',
                  'dashboard', 'view_quilt', 'analytics', 'psychology', 'lightbulb',
                  'rocket_launch', 'auto_awesome', 'camera_alt', 'movie', 'music_note',
                  'code', 'terminal', 'storage', 'cloud', 'smartphone', 'laptop',
                  'headphones', 'gamepad'
                ].map(icon => (
                  <button
                    key={icon}
                    className={`icon-cell ${iconValue === icon ? 'selected' : ''}`}
                    onClick={() => setIconValue(icon)}
                    title={icon}
                  >
                    <MaterialIcon name={icon} />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="modal-actions">
              <button onClick={() => setShowIconModal({show: false, board: null})} className="btn-secondary">
                Cancel
              </button>
              <button 
                onClick={changeIcon} 
                disabled={!iconValue.trim() || busy[showIconModal.board!.id]} 
                className="btn-primary"
              >
                {busy[showIconModal.board!.id] ? (
                  <>
                    <div className="spinner-mini"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <MaterialIcon name="check" />
                    <span>Save Icon</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}