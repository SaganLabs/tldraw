'use client'
import { Tldraw, useEditor, loadSnapshot } from 'tldraw'
import 'tldraw/tldraw.css'
import { useEffect, useRef, useState } from 'react'
import './board.css'

// Material Icon Component
const MaterialIcon = ({ name, className = '' }: { name: string, className?: string }) => (
  <span className={`material-symbols-rounded ${className}`}>{name}</span>
)

// Confirmation Modal for Unsaved Changes
function UnsavedChangesModal({
  open,
  onClose,
  onSave,
  onDiscard,
  saving
}: {
  open: boolean
  onClose: () => void
  onSave: () => void
  onDiscard: () => void
  saving: boolean
}) {
  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content unsaved-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <MaterialIcon name="warning" className="modal-icon warning" />
            <h3>Unsaved Changes</h3>
          </div>
        </div>
        
        <div className="modal-body">
          <div className="unsaved-content">
            <p>You have unsaved changes on this board. What would you like to do?</p>
          </div>
        </div>
        
        <div className="modal-actions">
          <button onClick={onDiscard} className="btn-secondary" disabled={saving}>
            <MaterialIcon name="close" />
            <span>Discard Changes</span>
          </button>
          <button onClick={onSave} className="btn-primary" disabled={saving}>
            {saving ? (
              <>
                <div className="spinner-mini"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <MaterialIcon name="save" />
                <span>Save & Continue</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Share Modal
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
          <div className="modal-title">
            <MaterialIcon name="share" className="modal-icon" />
            <h3>Share Board</h3>
          </div>
          <button onClick={onClose} className="modal-close">
            <MaterialIcon name="close" />
          </button>
        </div>

        <div className="modal-body">
          <div className="input-group">
            <label htmlFor="shareEmailBoard">Email Address</label>
            <div className="input-container">
              <MaterialIcon name="mail" className="input-icon" />
              <input
                id="shareEmailBoard"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                className="board-input"
                maxLength={200}
              />
            </div>
          </div>

          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                id="shareCanEditBoard"
                type="checkbox"
                checked={canEdit}
                onChange={(e) => setCanEdit(e.target.checked)}
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
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => onShare(email.trim(), canEdit)}
            disabled={!email.trim() || sharing}
            className="btn-primary"
          >
            {sharing ? (
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
  )
}

// Revolutionary Draggable Floating Controls
function DraggableFloatingControls({
  boardId,
  boardName,
  status,
  onRename,
  onSave,
  onOpenShare,
  onDashboard
}: {
  boardId: string
  boardName: string
  status: 'loading' | 'saving' | 'saved' | 'error' | 'dirty'
  onRename: (newName: string) => void
  onSave: () => void
  onOpenShare: () => void
  onDashboard: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 24, y: 24 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState('')
  
  const controlsRef = useRef<HTMLDivElement>(null)
  const dragStartPos = useRef({ x: 0, y: 0 })

  const getStatusIcon = () => {
    switch (status) {
      case 'saved': return 'check_circle'
      case 'saving': return 'sync'
      case 'loading': return 'hourglass_empty'
      case 'error': return 'error'
      case 'dirty': return 'edit'
      default: return 'edit'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'saved': return '#10b981'
      case 'saving': return '#f59e0b'
      case 'loading': return '#6b7280'
      case 'error': return '#ef4444'
      case 'dirty': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'saved': return 'All changes saved'
      case 'saving': return 'Saving changes...'
      case 'loading': return 'Loading board...'
      case 'error': return 'Error occurred'
      case 'dirty': return 'Unsaved changes'
      default: return 'Ready'
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isRenaming) return
    
    const rect = controlsRef.current?.getBoundingClientRect()
    if (!rect) return

    setIsDragging(true)
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
  
    const deltaX = Math.abs(e.clientX - dragStartPos.current.x)
    const deltaY = Math.abs(e.clientY - dragStartPos.current.y)
    
    // Only start dragging if moved more than 5px (prevents accidental drags)
    if (deltaX > 5 || deltaY > 5) {
      const controlsWidth = isExpanded ? 380 : 64
      const controlsHeight = isExpanded ? 420 : 64
      const newX = Math.max(0, Math.min(window.innerWidth - controlsWidth, e.clientX - dragOffset.x))
      const newY = Math.max(0, Math.min(window.innerHeight - controlsHeight, e.clientY - dragOffset.y))
      
      setPosition({ x: newX, y: newY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

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

  return (
    <div
      ref={controlsRef}
      className={`floating-controls ${isExpanded ? 'expanded' : 'collapsed'} ${isDragging ? 'dragging' : ''}`}
      style={{
        right: 'auto',
        bottom: 'auto',
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      {/* Draggable Header */}
      <div 
        className="controls-header-drag"
        onMouseDown={handleMouseDown}
      >
        <div className="drag-indicator">
          <MaterialIcon name="drag_indicator" />
        </div>
        
        {/* Status Indicator */}
        <div className="status-pill" style={{ color: getStatusColor() }}>
          <MaterialIcon name={getStatusIcon()} className={`status-icon ${status === 'saving' ? 'spinning' : ''}`} />
          <span className="status-text">{getStatusText()}</span>
        </div>

        {/* Expand/Collapse Button */}
        <button
          className="expand-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Collapse controls' : 'Expand controls'}
        >
          <MaterialIcon name={isExpanded ? 'expand_less' : 'expand_more'} className="toggle-icon" />
        </button>
      </div>

      {/* Expanded Content */}
      <div className={`controls-content ${isExpanded ? 'visible' : 'hidden'}`}>
        {/* Board Name Section */}
        <div className="control-section">
          <label className="control-label">Board Name</label>
          {isRenaming ? (
            <div className="rename-container">
              <div className="input-container">
                <MaterialIcon name="title" className="input-icon" />
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
                  className="board-input"
                  maxLength={100}
                />
              </div>
              <div className="rename-actions">
                <button onClick={confirmRename} className="rename-btn confirm">
                  <MaterialIcon name="check" />
                </button>
                <button onClick={cancelRename} className="rename-btn cancel">
                  <MaterialIcon name="close" />
                </button>
              </div>
            </div>
          ) : (
            <div className="board-name-display" onClick={startRename}>
              <span className="board-name-text" title={boardName}>
                {boardName}
              </span>
              <MaterialIcon name="edit" className="edit-icon" />
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <button
            onClick={onSave}
            className={`quick-action-btn ${status === 'dirty' ? 'save-ready' : 'save-disabled'}`}
            disabled={status !== 'dirty'}
            title="Save board"
          >
            <MaterialIcon name={status === 'saving' ? 'sync' : 'save'} className={status === 'saving' ? 'spinning' : ''} />
            <span>Save</span>
          </button>

          <button
            onClick={onOpenShare}
            className="quick-action-btn"
            title="Share board"
          >
            <MaterialIcon name="share" />
            <span>Share</span>
          </button>

          <button
            onClick={onDashboard}
            className="quick-action-btn dashboard"
            title="Back to dashboard"
          >
            <MaterialIcon name="dashboard" />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Board Info */}
        <div className="board-info">
          <div className="info-item">
            <MaterialIcon name="schedule" className="info-icon" />
            <span>Last saved: {status === 'saved' ? 'Just now' : 'Pending'}</span>
          </div>
          <div className="info-item">
            <MaterialIcon name="sync" className="info-icon" />
            <span>Auto-sync: Off</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Manual-save + Polling with Unsaved Changes Detection
function BoardSyncHandler({ boardId }: { boardId: string }) {
  const editor = useEditor()
  const poller = useRef<number | undefined>(undefined)
  const etagRef = useRef<string | null>(null)
  const applyingRef = useRef(false)
  const statusRef = useRef<'loading' | 'saving' | 'saved' | 'error' | 'dirty'>('loading')

  const [status, setStatus] = useState<'loading' | 'saving' | 'saved' | 'error' | 'dirty'>('loading')
  const [boardName, setBoardName] = useState<string>('')
  const [shareOpen, setShareOpen] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)

  const base = process.env.NEXT_PUBLIC_API_BASE_URL || ''

  const handleAuthRedirect = (res: Response) => {
    if (res.status === 401) {
      const rd = encodeURIComponent(window.location.href)
      window.location.href = `/oauth2/sign_in?rd=${rd}`
      return true
    }
    return false
  }

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

    // Mark "dirty" on local edits
    const unsub = editor.store.listen(() => {
      if (applyingRef.current) return
      setStatus((s) => (s === 'saving' ? s : 'dirty'))
    }, { scope: 'document' })

    // Polling for remote updates
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
        
        // Execute pending navigation if any
        if (pendingNavigation) {
          pendingNavigation()
          setPendingNavigation(null)
          setShowUnsavedModal(false)
        }
      } else {
        console.error('Manual save failed:', res.status, await res.text())
        setStatus('error')
      }
    } catch (e) {
      console.error('Manual save error:', e)
      setStatus('error')
    }
  }

  const handleDashboardNavigation = () => {
    if (status === 'dirty') {
      setPendingNavigation(() => () => window.location.href = '/')
      setShowUnsavedModal(true)
    } else {
      window.location.href = '/'
    }
  }

  const handleDiscardChanges = () => {
    if (pendingNavigation) {
      pendingNavigation()
      setPendingNavigation(null)
    }
    setShowUnsavedModal(false)
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
      <DraggableFloatingControls
        boardId={boardId}
        boardName={boardName}
        status={status}
        onRename={handleRename}
        onSave={handleManualSave}
        onOpenShare={() => setShareOpen(true)}
        onDashboard={handleDashboardNavigation}
      />
      
      <ShareModal 
        open={shareOpen} 
        onClose={() => setShareOpen(false)} 
        onShare={share} 
        sharing={sharing} 
      />
      
      <UnsavedChangesModal
        open={showUnsavedModal}
        onClose={() => setShowUnsavedModal(false)}
        onSave={handleManualSave}
        onDiscard={handleDiscardChanges}
        saving={status === 'saving'}
      />
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