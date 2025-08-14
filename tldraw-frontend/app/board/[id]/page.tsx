'use client'
import { Tldraw, useEditor, loadSnapshot } from 'tldraw'
import 'tldraw/tldraw.css'
import { useEffect, useRef, useState } from 'react'
import './board.css'

// --- Share Modal ---
function ShareModal({
  open,
  onClose,
  onShare,
  sharing,
}: {
  open: boolean
  onClose: () => void
  onShare: (email: string, canEdit: boolean) => void
  sharing: boolean
}) {
  const [email, setEmail] = useState('')
  const [canEdit, setCanEdit] = useState(true)

  useEffect(() => {
    if (!open) {
      setEmail('')
      setCanEdit(true)
    }
  }, [open])

  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Share Board</h3>
          <button onClick={onClose} className="modal-close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="input-group">
            <label htmlFor="shareEmailBoard">User email</label>
            <input
              id="shareEmailBoard"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              className="board-name-input"
              maxLength={200}
            />
          </div>

          <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              id="shareCanEditBoard"
              type="checkbox"
              checked={canEdit}
              onChange={(e) => setCanEdit(e.target.checked)}
            />
            <label htmlFor="shareCanEditBoard">Allow editing</label>
          </div>

          <div className="modal-actions">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              onClick={() => onShare(email.trim(), canEdit)}
              disabled={!email.trim() || sharing}
              className="btn-primary"
            >
              {sharing ? (<><div className="spinner-mini"></div>Sharing...</>) : ('Share')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Modern Floating Controls Panel
function BoardControlsPanel({
  boardId,
  boardName,
  status,
  onRename,
  onSave,
  onOpenShare
}: {
  boardId: string
  boardName: string
  status: 'loading' | 'saving' | 'saved' | 'error' | 'dirty'
  onRename: (newName: string) => void
  onSave: () => void
  onOpenShare: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState('')

  const startRename = () => {
    setNewName(boardName)
    setIsRenaming(true)
    setIsExpanded(true)
  }

  const confirmRename = () => {
    if (newName.trim() && newName.trim() !== boardName) {
      onRename(newName.trim())
    }
    setIsRenaming(false)
  }

  const cancelRename = () => {
    setIsRenaming(false)
    setNewName('')
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'saved': return '✓'
      case 'saving': return '↻'
      case 'loading': return '⏳'
      case 'error': return '⚠'
      case 'dirty': return '•'
      default: return '•'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'saved': return '#10b981'
      case 'saving': return '#f59e0b'
      case 'loading': return '#6b7280'
      case 'error': return '#ef4444'
      case 'dirty': return '#f59e0b' // unsaved changes
      default: return '#6b7280'
    }
  }

  return (
    <div className={`floating-controls ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Status Indicator */}
      <div className="status-indicator">
        <span className="status-dot" style={{ color: getStatusColor() }} title={`Status: ${status}`}>
          {getStatusIcon()}
        </span>
      </div>

      {/* Main Toggle Button */}
      <button
        className="main-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        title={isExpanded ? 'Collapse controls' : 'Expand controls'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`toggle-icon ${isExpanded ? 'rotated' : ''}`}>
          <path d="M12 2v20m8-10H4" />
        </svg>
      </button>

      {/* Expanded Content */}
      <div className={`controls-content ${isExpanded ? 'visible' : 'hidden'}`}>
        <div className="controls-header">
          <h3>Board Controls</h3>
        </div>

        <div className="control-section">
          <label className="control-label">Board Name</label>
          {isRenaming ? (
            <div className="rename-input-group">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmRename()
                  if (e.key === 'Escape') cancelRename()
                }}
                onBlur={confirmRename}
                autoFocus
                className="rename-input"
                maxLength={100}
              />
              <div className="rename-actions">
                <button onClick={confirmRename} className="rename-btn confirm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                </button>
                <button onClick={cancelRename} className="rename-btn cancel">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="board-name-display" onClick={startRename}>
              <span className="board-name-text" title={boardName}>
                {boardName}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="edit-icon">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
          )}
        </div>

        <div className="control-section">
          <label className="control-label">Status</label>
          <div className="status-display">
            <span className="status-indicator-text" style={{ color: getStatusColor() }}>
              {getStatusIcon()} {status === 'dirty' ? 'Unsaved changes' : status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
        </div>

        <div className="controls-actions">
          <button
            onClick={onSave}
            className="action-btn save-btn"
            // Only enable Save when there are unsaved changes
            disabled={!(status === 'dirty')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17,21 17,13 7,13 7,21" />
              <polyline points="7,3 7,8 15,8" />
            </svg>
            {status === 'saving' ? 'Saving...' : 'Save Now'}
          </button>

          <button onClick={onOpenShare} className="action-btn secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v7a2 2 0 0 0 2 2h12" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share
          </button>

          <button onClick={() => (window.location.href = '/')} className="action-btn dashboard-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9,22 9,12 15,12 15,22" />
            </svg>
            Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

// Manual-save + Polling (no autosave)
function BoardSyncHandler({ boardId }: { boardId: string }) {
  const editor = useEditor()
  const poller = useRef<number | undefined>(undefined)
  const etagRef = useRef<string | null>(null)
  const applyingRef = useRef(false) // suppress dirty during remote apply
  const statusRef = useRef<'loading' | 'saving' | 'saved' | 'error' | 'dirty'>('loading')

  const [status, setStatus] = useState<'loading' | 'saving' | 'saved' | 'error' | 'dirty'>('loading')
  const [boardName, setBoardName] = useState<string>('')
  const [shareOpen, setShareOpen] = useState(false)
  const [sharing, setSharing] = useState(false)

  const base = process.env.NEXT_PUBLIC_API_BASE_URL || ''

  const handleAuthRedirect = (res: Response) => {
    if (res.status === 401) {
      const rd = encodeURIComponent(window.location.href)
      window.location.href = `/oauth2/sign_in?rd=${rd}`
      return true
    }
    return false
  }

  // keep ref in sync so poll loop sees current status
  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    if (!boardId || !editor) return

    // Initial load
    ;(async () => {
      try {
        const res = await fetch(`${base}/api/boards/${boardId}`, { credentials: 'include' })
        if (handleAuthRedirect(res)) return
        if (!res.ok && res.status !== 304) {
          if (res.status === 404) setBoardName('Board Not Found')
          setStatus('error')
          return
        }
        if (res.ok) {
          const data = await res.json()
          const snapshot = data.content || data
          const name = data.name || 'Untitled Board'
          const et = res.headers.get('ETag')
          if (et) etagRef.current = et

          setBoardName(name)
          if (snapshot && typeof snapshot === 'object' && Object.keys(snapshot).length > 0) {
            try {
              applyingRef.current = true
              loadSnapshot(editor.store, snapshot)
            } finally {
              applyingRef.current = false
            }
          }
        }
        setStatus('saved')
      } catch (e) {
        console.error('Error loading board:', e)
        setStatus('error')
      }
    })()

    // Mark "dirty" on local edits (no autosave)
    const unsub = editor.store.listen(() => {
      if (applyingRef.current) return
      setStatus((s) => (s === 'saving' ? s : 'dirty'))
    }, { scope: 'document' })

    // Polling for remote updates (skip if we have unsaved changes)
    const poll = async () => {
      try {
        if (statusRef.current === 'dirty' || statusRef.current === 'saving') return
        const headers: HeadersInit = {}
        if (etagRef.current) headers['If-None-Match'] = etagRef.current
        const res = await fetch(`${base}/api/boards/${boardId}`, { method: 'GET', headers, credentials: 'include' })
        if (handleAuthRedirect(res)) return
        if (res.status === 304) return
        if (!res.ok) return

        const et = res.headers.get('ETag')
        if (et) etagRef.current = et
        const data = await res.json()
        const snapshot = data.content || data
        const name = data.name || 'Untitled Board'
        setBoardName(name)

        if (snapshot && typeof snapshot === 'object' && Object.keys(snapshot).length > 0) {
          try {
            applyingRef.current = true
            loadSnapshot(editor.store, snapshot)
          } finally {
            applyingRef.current = false
          }
        }
        // keep status as 'saved' (we only change to 'dirty' on local edits)
      } catch {
        // Ignore transient polling errors
      }
    }
    poller.current = window.setInterval(poll, 2500)

    return () => {
      unsub()
      if (poller.current) window.clearInterval(poller.current)
    }
  }, [boardId, editor])

  const handleRename = async (newName: string) => {
    try {
      const res = await fetch(`${base}/api/boards/${boardId}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName })
      })
      if (handleAuthRedirect(res)) return
      if (res.ok) {
        setBoardName(newName)
        const et = res.headers.get('ETag')
        if (et) etagRef.current = et
      } else {
        console.error('Failed to rename board')
      }
    } catch (e) {
      console.error('Error renaming board:', e)
    }
  }

  const handleManualSave = async () => {
    try {
      setStatus('saving')
      const snapshot = editor.store.getStoreSnapshot()

      const res = await fetch(`${base}/api/boards/${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(snapshot),
      })
      if (handleAuthRedirect(res)) return

      if (res.ok) {
        const et = res.headers.get('ETag')
        if (et) etagRef.current = et
        setStatus('saved')
      } else {
        console.error('Manual save failed:', res.status, await res.text())
        setStatus('error')
      }
    } catch (e) {
      console.error('Manual save error:', e)
      setStatus('error')
    }
  }

  const share = async (email: string, canEdit: boolean) => {
    try {
      setSharing(true)
      const res = await fetch(`${base}/api/boards/${boardId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, canEdit })
      })
      if (res.status === 401) {
        const rd = encodeURIComponent(window.location.href)
        window.location.href = `/oauth2/sign_in?rd=${rd}`
        return
      }
      if (!res.ok) {
        console.error('Share failed:', await res.text())
        return
      }
      setShareOpen(false)
    } catch (e) {
      console.error('Share error:', e)
    } finally {
      setSharing(false)
    }
  }

  return (
    <>
      <BoardControlsPanel
        boardId={boardId}
        boardName={boardName}
        status={status}
        onRename={handleRename}
        onSave={handleManualSave}
        onOpenShare={() => setShareOpen(true)}
      />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} onShare={share} sharing={sharing} />
    </>
  )
}

export default function Board({ params }: { params: { id: string } }) {
  return (
    <div className="board-container">
      <Tldraw>
        <BoardSyncHandler boardId={params.id} />
      </Tldraw>
    </div>
  )
}
