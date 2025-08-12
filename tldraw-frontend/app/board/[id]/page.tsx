'use client'
import { Tldraw, useEditor, loadSnapshot } from 'tldraw'
import 'tldraw/tldraw.css'
import { useEffect, useRef, useState } from 'react'

// Autosave component that runs INSIDE Tldraw
function AutosaveHandler({ boardId }: { boardId: string }) {
  const editor = useEditor()
  const timer = useRef<number | undefined>(undefined)
  const [status, setStatus] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading')

  useEffect(() => {
    if (!boardId || !editor) return
    
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || ''
    console.log('Loading board:', boardId, 'from:', `${base}/api/boards/${boardId}`)

    ;(async () => {
      try {
        const res = await fetch(`${base}/api/boards/${boardId}`, {
          credentials: 'include'
        })
        
        if (res.ok) {
          const snapshot = await res.json()
          console.log('Board loaded successfully, snapshot:', snapshot)
          
          // Check if snapshot has proper structure
          if (snapshot && typeof snapshot === 'object' && Object.keys(snapshot).length > 0) {
            try {
              // Use the new loadSnapshot function from tldraw package
              loadSnapshot(editor.store, snapshot)
              console.log('Snapshot loaded successfully')
            } catch (snapshotError) {
              console.warn('Failed to load snapshot, using empty board:', snapshotError)
              // If snapshot loading fails, just continue with empty board
            }
          } else {
            console.log('Empty or invalid snapshot, using empty board')
          }
          setStatus('saved')
        } else if (res.status === 404) {
          console.log('Board not found, using empty board')
          setStatus('saved')
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
          console.log('Board saved successfully')
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

  return (
    <div style={{ 
      position: 'absolute', 
      top: 10, 
      right: 10, 
      zIndex: 1000, 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '4px 8px', 
      borderRadius: 4,
      fontSize: 12
    }}>
      Status: {status}
    </div>
  )
}

export default function Board({ params }: { params: { id: string } }) {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw>
        <AutosaveHandler boardId={params.id} />
      </Tldraw>
    </div>
  )
}