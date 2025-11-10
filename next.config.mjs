import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Explicitly set the workspace root to prevent Next.js from detecting lockfiles in parent directories
  turbopack: {
    root: __dirname,
  },
  // Suppress console messages in production
  reactStrictMode: true,
  // Remove ALL console.log, console.info, console.debug in production
  // This removes them at build time from ALL code (including bundles)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep errors and warnings, remove log/info/debug
    } : false,
  },
  async headers() {
    return [
      {
        // Enable cross-origin isolation required for SharedArrayBuffer/WebContainer
        // Apply COEP only to assessment routes that use WebContainer
        source: '/assessment/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
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
