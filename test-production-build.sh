#!/bin/bash

# Test script to verify production logs are disabled
# This script builds the app in production mode and starts it

set -e

echo "🔨 Building production build..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "🚀 Starting production server..."
echo "   The server will start on http://localhost:3000"
echo ""
echo "📋 To test logging:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Open Developer Tools (F12)"
echo "   3. Go to Console tab"
echo "   4. Navigate through the app"
echo "   5. Verify NO logger.log() messages appear"
echo ""
echo "   Expected: No logs from logger.log(), logger.error(), logger.warn()"
echo "   If you see logs, they should only be from Next.js or React (not from our logger)"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start production server
npm start

