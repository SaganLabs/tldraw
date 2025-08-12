'use client'
import { Tldraw, useEditor, loadSnapshot } from 'tldraw'
import 'tldraw/tldraw.css'
import { useEffect, useRef, useState } from 'react'
import './board.css'

// Modern Floating Controls Panel
function BoardControlsPanel({ 
  boardId, 
  boardName, 
  status, 
  onRename,
  onSave 
}: { 
  boardId: string
  boardName: string
  status: 'loading' | 'saving' | 'saved' | 'error'
  onRename: (newName: string) => void
  onSave: () => void
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

  const handleSave = () => {
    onSave()
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'saved': return '✓'
      case 'saving': return '↻'
      case 'loading': return '⏳'
      case 'error': return '⚠'
      default: return '•'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'saved': return '#10b981'
      case 'saving': return '#f59e0b'
      case 'loading': return '#6b7280'
      case 'error': return '#ef4444'
      default: return '#6b7280'
    }
  }

  return (
    <div className={`floating-controls ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Status Indicator (Always Visible) */}
      <div className="status-indicator">
        <span 
          className="status-dot"
          style={{ color: getStatusColor() }}
          title={`Status: ${status}`}
        >
          {getStatusIcon()}
        </span>
      </div>

      {/* Main Toggle Button */}
      <button 
        className="main-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        title={isExpanded ? 'Collapse controls' : 'Expand controls'}
      >
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          className={`toggle-icon ${isExpanded ? 'rotated' : ''}`}
        >
          <path d="M12 2v20m8-10H4"/>
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
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                </button>
                <button onClick={cancelRename} className="rename-btn cancel">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
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
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
          )}
        </div>

        <div className="control-section">
          <label className="control-label">Status</label>
          <div className="status-display">
            <span 
              className="status-indicator-text"
              style={{ color: getStatusColor() }}
            >
              {getStatusIcon()} {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
        </div>

        <div className="controls-actions">
          <button 
            onClick={handleSave}
            className="action-btn save-btn"
            disabled={status === 'saving'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17,21 17,13 7,13 7,21"/>
              <polyline points="7,3 7,8 15,8"/>
            </svg>
            {status === 'saving' ? 'Saving...' : 'Save Now'}
          </button>
          
          <button 
            onClick={() => window.location.href = '/'}
            className="action-btn dashboard-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9,22 9,12 15,12 15,22"/>
            </svg>
            Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

// Autosave Handler Component
function AutosaveHandler({ boardId }: { boardId: string }) {
  const editor = useEditor()
  const timer = useRef<number | undefined>(undefined)
  const [status, setStatus] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading')
  const [boardName, setBoardName] = useState<string>('')

  useEffect(() => {
    if (!boardId || !editor) return
    
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || ''

    ;(async () => {
      try {
        const res = await fetch(`${base}/api/boards/${boardId}`, {
          credentials: 'include'
        })
        
        if (res.ok) {
          const data = await res.json()
          console.log('Board loaded successfully')
          
          const snapshot = data.content || data
          const name = data.name || 'Untitled Board'
          setBoardName(name)
          
          if (snapshot && typeof snapshot === 'object' && Object.keys(snapshot).length > 0) {
            try {
              loadSnapshot(editor.store, snapshot)
              console.log('Snapshot loaded successfully')
            } catch (snapshotError) {
              console.warn('Failed to load snapshot, using empty board:', snapshotError)
            }
          }
          setStatus('saved')
        } else if (res.status === 404) {
          console.log('Board not found')
          setBoardName('Board Not Found')
          setStatus('error')
        } else {
          console.error('Failed to load board:', res.status, await res.text())
          setStatus('error')
        }
      } catch (e) {
        console.error('Error loading board:', e)
        setStatus('error')
      }
    })()

    const save = async () => {
      try {
        setStatus('saving')
        const snapshot = editor.store.getStoreSnapshot()
        
        const res = await fetch(`${base}/api/boards/${boardId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(snapshot),
        })
        
        if (res.ok) {
          setStatus('saved')
        } else {
          console.error('Save failed:', res.status, await res.text())
          setStatus('error')
        }
      } catch (e) {
        console.error('Save error:', e)
        setStatus('error')
      }
    }

    const onChange = () => {
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(save, 10_000)
    }

    const unsubs = [editor.store.listen(() => onChange(), { scope: 'document' })]
    const beforeUnload = () => { save() }
    window.addEventListener('beforeunload', beforeUnload)

    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      unsubs.forEach(u => u())
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [boardId, editor])

  const handleRename = async (newName: string) => {
    try {
      const res = await fetch(`/api/boards/${boardId}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName })
      })

      if (res.ok) {
        setBoardName(newName)
        console.log('Board renamed successfully')
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
      
      const res = await fetch(`/api/boards/${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(snapshot),
      })
      
      if (res.ok) {
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

  return (
    <BoardControlsPanel
      boardId={boardId}
      boardName={boardName}
      status={status}
      onRename={handleRename}
      onSave={handleManualSave}
    />
  )
}

export default function Board({ params }: { params: { id: string } }) {
  return (
    <div className="board-container">
      <Tldraw>
        <AutosaveHandler boardId={params.id} />
      </Tldraw>
    </div>
  )
}