#!/bin/bash

# Clean rebuild script to apply all fixes

echo "🧹 Cleaning old build..."
rm -rf .next

echo "🔨 Building production version..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "🚀 Starting production server..."
echo "   The server will start on http://localhost:3000"
echo ""
echo "📋 Test Instructions:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Open Developer Tools (F12)"
echo "   3. Go to Console tab"
echo "   4. Verify:"
echo "      ✅ No '[v0] BackgroundPaths' message"
echo "      ✅ No Vercel Analytics 404 error"
echo "      ✅ No logger messages"
echo "      ✅ Clean console!"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start

