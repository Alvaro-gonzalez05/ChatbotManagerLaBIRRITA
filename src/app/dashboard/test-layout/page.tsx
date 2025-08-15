'use client'

import { useState } from 'react'

export default function TestLayoutPage() {
  const [count, setCount] = useState(0)
  
  console.log('TestLayoutPage render:', { count })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Test Layout Page</h1>
      <p>Página con estado de cliente</p>
      <button 
        onClick={() => setCount(count + 1)}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Click me: {count}
      </button>
    </div>
  )
}