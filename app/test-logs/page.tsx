"use client"

import { useEffect, useState } from 'react'
import { logger } from '@/lib/logger'

export default function TestLogsPage() {
  const [env, setEnv] = useState<string>('')
  const [logsVisible, setLogsVisible] = useState<boolean>(false)

  useEffect(() => {
    // Check environment
    const nodeEnv = process.env.NODE_ENV
    const enableLogging = process.env.NEXT_PUBLIC_ENABLE_LOGGING
    setEnv(`NODE_ENV: ${nodeEnv}, ENABLE_LOGGING: ${enableLogging}`)

    // Test logging
    logger.log('🧪 Test log message - this should only appear in development')
    logger.error('🧪 Test error message - this should only appear in development')
    logger.warn('🧪 Test warning message - this should only appear in development')
    logger.info('🧪 Test info message - this should only appear in development')
    logger.debug('🧪 Test debug message - this should only appear in development')

    // Check if logs are actually visible
    // We'll use a trick: if logger.log doesn't call console.log in production,
    // we won't see these messages
    console.log('🔍 Direct console.log - this will ALWAYS appear')
    
    // Try to detect if logger is working
    const testMessage = 'LOGGER_TEST_' + Date.now()
    logger.log(testMessage)
    
    // Check if the message appeared (we can't directly check, but we can inform user)
    setLogsVisible(true)
  }, [])

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Production Logging Test</h1>
      
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded mb-4">
        <h2 className="text-xl font-semibold mb-2">Environment Information</h2>
        <p className="font-mono text-sm">{env}</p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded mb-4">
        <h2 className="text-xl font-semibold mb-2">Test Instructions</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Open Browser Developer Tools (F12)</li>
          <li>Go to the Console tab</li>
          <li>Look for messages starting with 🧪</li>
          <li>
            <strong>Expected in Production:</strong>
            <ul className="list-disc list-inside ml-4 mt-2">
              <li>✅ You should see: "🔍 Direct console.log - this will ALWAYS appear"</li>
              <li>❌ You should NOT see: "🧪 Test log message..."</li>
              <li>❌ You should NOT see: "🧪 Test error message..."</li>
              <li>❌ You should NOT see: "🧪 Test warning message..."</li>
            </ul>
          </li>
          <li>
            <strong>Expected in Development:</strong>
            <ul className="list-disc list-inside ml-4 mt-2">
              <li>✅ You should see ALL messages including 🧪 test messages</li>
            </ul>
          </li>
        </ol>
      </div>

      <div className="bg-green-50 dark:bg-green-900 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Test Status</h2>
        {logsVisible ? (
          <p className="text-green-700 dark:text-green-300">
            ✅ Logger test executed. Check the browser console above for results.
          </p>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">
            ⏳ Loading test...
          </p>
        )}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900 rounded">
        <h3 className="font-semibold mb-2">How to Verify:</h3>
        <p className="text-sm">
          In production mode (NODE_ENV=production), the logger functions should be completely disabled.
          You should only see the direct console.log message, but none of the logger.* messages.
        </p>
      </div>
    </div>
  )
}

