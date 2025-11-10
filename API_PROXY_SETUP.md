# API Proxy Setup - Hiding Backend URLs

## Overview
This setup hides the backend API URL from the client by using Next.js API routes as a proxy. All API calls appear to come from the same domain.

## How It Works

1. **Frontend makes relative API calls**: `/api/sessions`, `/api/auth/login`, etc.
2. **Next.js API route proxies requests**: `app/api/[...path]/route.ts` forwards to backend
3. **Backend URL is server-side only**: Never exposed to the client

## Configuration

### Environment Variables

**Frontend `.env.local`:**
```env
# Optional: Only needed if you want to override the default
# If not set, defaults to http://localhost:5001
BACKEND_URL=http://localhost:5001

# Remove or leave empty to use relative paths
NEXT_PUBLIC_API_URL=
```

**Backend URL is determined by:**
1. `BACKEND_URL` environment variable (server-side only)
2. `NEXT_PUBLIC_API_URL` (fallback, but not recommended for production)
3. Default: `http://localhost:5001`

## Benefits

✅ **Backend URL hidden**: Client never sees the actual backend URL
✅ **Same-origin requests**: All API calls appear from same domain
✅ **CORS simplified**: No cross-origin issues
✅ **Security**: Backend URL not exposed in browser DevTools
✅ **Flexibility**: Easy to change backend without updating frontend

## API Route Structure

```
Frontend/app/api/[...path]/route.ts
```

This catch-all route handles:
- `GET /api/*`
- `POST /api/*`
- `PUT /api/*`
- `PATCH /api/*`
- `DELETE /api/*`

## Example Flow

**Before (exposed):**
```
Client → https://yourapp.com
  ↓ fetch('http://backend:5001/api/sessions')
Backend → http://backend:5001/api/sessions
```

**After (hidden):**
```
Client → https://yourapp.com
  ↓ fetch('/api/sessions')
Next.js API Route → http://backend:5001/api/sessions
Backend → http://backend:5001/api/sessions
```

## Testing

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd Frontend && npm run dev`
3. Check Network tab - all API calls show as `/api/...` (relative)
4. Backend URL is never visible in browser

## WebSocket Connections

WebSocket connections still need the full URL. These are configured separately:
- `WS_BASE_URL` in `Frontend/lib/config.ts`
- Used for video streaming and real-time features

## Notes

- The proxy forwards all headers (including Authorization)
- Query parameters are preserved
- Request/response bodies are forwarded as-is
- Error handling returns 502 if backend is unavailable
