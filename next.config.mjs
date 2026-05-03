import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // Explicitly set the workspace root to prevent Next.js from detecting lockfiles in parent directories
  turbopack: {
    root: __dirname,
  },
  // Suppress console messages in production
  reactStrictMode: true,
  // Remove ALL console methods in production (log, info, debug, warn, error)
  // This removes them at build time from ALL code (including bundles)
  // No console output will be visible in production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? true : false,
  },
  async headers() {
    return [
      {
        // Assessment pages — COOP only; no COEP so cross-origin Azure container
        // iframes are not blocked. COEP (credentialless) was required for
        // StackBlitz SharedArrayBuffer but breaks the code-server iframe.
        source: '/assessment',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // No COEP — Azure code-server doesn't send CORP headers
        ],
      },
      {
        source: '/assessment/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // No COEP — Azure code-server doesn't send CORP headers
        ],
      },
      {
        // IDE sandbox / test page
        source: '/test-ide',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      {
        // Test assessment — full workflow with IDE
        source: '/test-assessment',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      {
        // Dashboard routes (including live monitoring) don't need COEP
        // This allows cross-origin video loading from Supabase
        source: '/dashboard/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // No COEP header to allow cross-origin video resources
        ],
      },
      {
        // Default headers for other routes
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
}

export default nextConfig
