'use client'
import { useEffect, useState } from 'react'
import './dashboard.css'

interface Board {
  id: string
  name: string
  updated_at: string
}

export default function Dashboard() {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<{show: boolean, board: Board | null}>({show: false, board: null})
  const [showRenameModal, setShowRenameModal] = useState<{show: boolean, board: Board | null}>({show: false, board: null})
  const [newBoardName, setNewBoardName] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadBoards()
  }, [])

  const loadBoards = async () => {
    try {
      const res = await fetch('/api/me/boards', { credentials: 'include' })
      if (!res.ok) throw new Error(`Failed to load boards: ${res.status}`)
      const data = await res.json()
      const allBoards = [...data.owned, ...data.shared]
      setBoards(allBoards)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load boards')
    } finally {
      setLoading(false)
    }
  }

  const createBoard = async () => {
    if (!newBoardName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newBoardName.trim() })
      })
      if (!res.ok) throw new Error('Failed to create board')
      const data = await res.json()
      window.location.href = `/board/${data.id}`
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create board')
      setCreating(false)
    }
  }

  const deleteBoard = async () => {
    if (!showDeleteModal.board) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/boards/${showDeleteModal.board.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to delete board')
      await loadBoards()
      setShowDeleteModal({show: false, board: null})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete board')
    } finally {
      setDeleting(false)
    }
  }

  const renameBoard = async () => {
    if (!showRenameModal.board || !renameValue.trim()) return
    setRenaming(true)
    try {
      const res = await fetch(`/api/boards/${showRenameModal.board.id}/rename`, {
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
      setRenaming(false)
    }
  }

  const openBoard = (boardId: string) => {
    window.location.href = `/board/${boardId}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredBoards = boards.filter(board => 
    board.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {/* Navigation Header */}
      <nav className="nav-header">
        <div className="nav-content">
          <div className="brand">
            <div className="brand-icon">
              <img 
                src="/logo.png" 
                alt="Free Spirit" 
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  objectFit: 'cover'
                }}
              />
            </div>
            <div className="brand-text">
              <h1>Free Spirit</h1>
              <span>Creative Studio</span>
            </div>
          </div>
          
          <div className="nav-actions">
            <div className="search-container">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search boards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <button 
              className="nav-btn primary"
              onClick={() => setShowCreateForm(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h2 className="hero-title">Welcome back to your creative space</h2>
            <p className="hero-subtitle">
              Continue where you left off or start something new. Your ideas deserve the perfect canvas.
            </p>
          </div>
          
          <button 
            className="cta-button"
            onClick={() => setShowCreateForm(true)}
          >
            <span className="cta-text">Create New Board</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </section>

      {/* Error Display */}
      {error && (
        <div className="error-toast">
          <div className="error-content">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="error-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Create New Board</h3>
                <button 
                  onClick={() => setShowCreateForm(false)}
                  className="modal-close"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              
              <div className="modal-body">
                <div className="input-group">
                  <label htmlFor="boardName">Board Name</label>
                  <input
                    id="boardName"
                    type="text"
                    placeholder="Enter a name for your board..."
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createBoard()}
                    autoFocus
                    maxLength={100}
                    className="board-name-input"
                  />
                </div>
                
                <div className="modal-actions">
                  <button 
                    onClick={() => setShowCreateForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={createBoard}
                    disabled={!newBoardName.trim() || creating}
                    className="btn-primary"
                  >
                    {creating ? (
                      <>
                        <div className="spinner-mini"></div>
                        Creating...
                      </>
                    ) : (
                      'Create Board'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal.show && (
          <div className="modal-overlay" onClick={() => setShowDeleteModal({show: false, board: null})}>
            <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Delete Board</h3>
                <button 
                  onClick={() => setShowDeleteModal({show: false, board: null})}
                  className="modal-close"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              
              <div className="modal-body">
                <div className="delete-warning">
                  <div className="warning-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18l-1.5 14H4.5L3 6z"/>
                      <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </div>
                  <h4>Are you absolutely sure?</h4>
                  <p>
                    This will permanently delete <strong>"{showDeleteModal.board?.name}"</strong>. 
                    This action cannot be undone.
                  </p>
                </div>
                
                <div className="modal-actions">
                  <button 
                    onClick={() => setShowDeleteModal({show: false, board: null})}
                    className="btn-secondary"
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={deleteBoard}
                    disabled={deleting}
                    className="btn-danger"
                  >
                    {deleting ? (
                      <>
                        <div className="spinner-mini"></div>
                        Deleting...
                      </>
                    ) : (
                      'Yes, Delete Board'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rename Modal */}
        {showRenameModal.show && (
          <div className="modal-overlay" onClick={() => setShowRenameModal({show: false, board: null})}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Rename Board</h3>
                <button 
                  onClick={() => setShowRenameModal({show: false, board: null})}
                  className="modal-close"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              
              <div className="modal-body">
                <div className="input-group">
                  <label htmlFor="renameBoardName">New Board Name</label>
                  <input
                    id="renameBoardName"
                    type="text"
                    placeholder="Enter new name..."
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && renameBoard()}
                    autoFocus
                    maxLength={100}
                    className="board-name-input"
                  />
                </div>
                
                <div className="modal-actions">
                  <button 
                    onClick={() => setShowRenameModal({show: false, board: null})}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={renameBoard}
                    disabled={!renameValue.trim() || renaming}
                    className="btn-primary"
                  >
                    {renaming ? (
                      <>
                        <div className="spinner-mini"></div>
                        Renaming...
                      </>
                    ) : (
                      'Rename Board'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Boards Section */}
        <section className="boards-section">
          <div className="section-header">
            <div className="section-title">
              <h3>Your Boards</h3>
              <span className="board-count">
                {filteredBoards.length} {filteredBoards.length === 1 ? 'board' : 'boards'}
                {searchQuery && ` matching "${searchQuery}"`}
              </span>
            </div>
          </div>

          {filteredBoards.length === 0 ? (
            <div className="empty-state">
              <div className="empty-illustration">
                <div style={{
                  width: 120,
                  height: 120,
                  border: '2px solid #e2e8f0',
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f8fafc',
                  fontSize: '2rem'
                }}>
                  {searchQuery ? '🔍' : '🎨'}
                </div>
              </div>
              <h4>{searchQuery ? 'No boards found' : 'Start Your Creative Journey'}</h4>
              <p>
                {searchQuery 
                  ? `No boards match "${searchQuery}". Try a different search term.`
                  : 'Create your first board and bring your ideas to life with our powerful drawing tools.'
                }
              </p>
              {!searchQuery && (
                <button 
                  onClick={() => setShowCreateForm(true)}
                  className="empty-cta"
                >
                  Create Your First Board
                </button>
              )}
            </div>
          ) : (
            <div className="boards-grid">
              {filteredBoards.map((board, index) => (
                <div 
                  key={board.id} 
                  className="board-card"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="board-preview" onClick={() => openBoard(board.id)}>
                    <div className="preview-content">
                      <div className="board-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                          <path d="M2 17l10 5 10-5"/>
                          <path d="M2 12l10 5 10-5"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="board-info">
                    <h4 className="board-name" title={board.name}>
                      {board.name}
                    </h4>
                    <p className="board-date">
                      Updated {formatDate(board.updated_at)}
                    </p>
                    
                    <div className="board-actions">
                      <button 
                        onClick={() => openBoard(board.id)}
                        className="action-btn primary"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Open
                      </button>
                      <button 
                        onClick={() => {
                          setRenameValue(board.name)
                          setShowRenameModal({show: true, board})
                        }}
                        className="action-btn secondary"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Rename
                      </button>
                      <button 
                        onClick={() => setShowDeleteModal({show: true, board})}
                        className="action-btn danger"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3,6 5,6 21,6" />
                          <path d="M19,6V20a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6M8,6V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2V6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}