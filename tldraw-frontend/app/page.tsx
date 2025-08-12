'use client'
import { useEffect, useState } from 'react'

export default function Page() {
  const [error, setError] = useState<string | null>(null)
  const [debug, setDebug] = useState<string[]>([])

  const addDebug = (msg: string) => {
    console.log(msg)
    setDebug(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])
  }

  useEffect(() => {
    (async () => {
      try {
        addDebug('🚀 Starting board creation...')
        
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || ''
        addDebug(`Environment API base: "${base}"`)
        
        let apiUrl = '/api/boards'
        addDebug(`Trying API call to: ${apiUrl}`)
        
        const res = await fetch(apiUrl, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        })
        
        addDebug(`Response status: ${res.status}`)
        
        if (!res.ok) {
          const errorText = await res.text()
          addDebug(`Error response body: ${errorText}`)
          throw new Error(`POST ${apiUrl} -> ${res.status}: ${errorText}`)
        }
        
        const data = await res.json()
        addDebug(`✅ Board created successfully: ${JSON.stringify(data)}`)
        
        if (!data.id) {
          throw new Error('No board ID returned from server')
        }
        
        addDebug(`🔄 Redirecting to /board/${data.id}`)
        window.location.replace(`/board/${data.id}`)
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        addDebug(`❌ ERROR: ${errorMsg}`)
        console.error('Board creation failed:', e)
        setError(errorMsg)
      }
    })()
  }, [])

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: 800 }}>
      <h1>Free Spirit Project - Board Creation</h1>
      
      {error ? (
        <div>
          <h2 style={{ color: 'red' }}>❌ Error creating board</h2>
          <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>
        </div>
      ) : (
        <p>🔄 Creating your board...</p>
      )}

      <div style={{ marginTop: 20 }}>
        <h3>🔍 Debug Log:</h3>
        <div style={{ 
          background: '#f5f5f5', 
          padding: 15, 
          fontSize: 12, 
          fontFamily: 'monospace',
          border: '1px solid #ddd',
          borderRadius: 4,
          maxHeight: 400,
          overflow: 'auto'
        }}>
          {debug.length > 0 ? debug.join('\n') : 'No debug info yet...'}
        </div>
      </div>

      {error && (
        <button 
          onClick={() => window.location.reload()} 
          style={{ 
            marginTop: 20, 
            padding: '10px 20px', 
            fontSize: 16,
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          🔄 Try Again
        </button>
      )}
    </div>
  )
}