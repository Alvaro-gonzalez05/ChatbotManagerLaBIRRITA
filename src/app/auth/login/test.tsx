'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function TestConnection() {
  const [status, setStatus] = useState('Testing...')
  
  const testConnection = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name')
        .limit(1)
      
      if (error) {
        setStatus(`Error: ${error.message}`)
      } else {
        setStatus('Connection successful!')
      }
    } catch (err: any) {
      setStatus(`Connection failed: ${err.message}`)
    }
  }
  
  return (
    <div className="p-4 bg-gray-100">
      <button onClick={testConnection} className="bg-blue-500 text-white px-4 py-2 rounded">
        Test DB Connection
      </button>
      <p className="mt-2">{status}</p>
    </div>
  )
}