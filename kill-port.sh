#!/bin/bash

# Script to kill process on port 3000

echo "🔍 Finding process on port 3000..."

PORT=3000
PID=$(lsof -ti:$PORT)

if [ -z "$PID" ]; then
  echo "✅ No process found on port $PORT"
  exit 0
fi

echo "📋 Found process: $PID"
echo "🛑 Killing process..."
kill -9 $PID

sleep 1

# Verify it's killed
if lsof -ti:$PORT > /dev/null 2>&1; then
  echo "⚠️ Process still running, trying force kill..."
  kill -9 $PID
  sleep 1
fi

if lsof -ti:$PORT > /dev/null 2>&1; then
  echo "❌ Failed to kill process on port $PORT"
  echo "   Try manually: kill -9 $PID"
  exit 1
else
  echo "✅ Port $PORT is now free!"
  echo ""
  echo "🚀 You can now start the server:"
  echo "   npm start"
fi

