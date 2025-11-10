/**
 * Next.js API Route Proxy
 * Proxies all API requests to the backend server
 * This hides the backend URL from the client
 */

import { NextRequest, NextResponse } from 'next/server';

// Backend URL - only used server-side, never exposed to client
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'DELETE');
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    // Reconstruct the API path
    // The catch-all route receives segments like ['auth', 'me'] for /api/auth/me
    // We need to add /api prefix when forwarding to backend
    const apiPath = `/api/${pathSegments.join('/')}`;
    
    // Get query string if present
    const searchParams = request.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';
    
    // Construct backend URL
    const backendUrl = `${BACKEND_URL}${apiPath}${queryString}`;
    
    // Check if this is a FormData request
    const contentType = request.headers.get('content-type') || '';
    const isFormData = contentType.includes('multipart/form-data');
    
    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Proxy] ${method} /api/${pathSegments.join('/')} -> ${backendUrl}`);
      console.log(`[API Proxy] Backend URL: ${BACKEND_URL}`);
      if (isFormData) {
        console.log(`[API Proxy] Handling FormData upload`);
      }
    }
    
    // Get request body if present
    let body: BodyInit | undefined;
    let headers: HeadersInit = {};
    
    if (method !== 'GET' && method !== 'DELETE') {
      if (isFormData) {
        // For FormData, parse it and reconstruct it for forwarding
        try {
          const formData = await request.formData();
          // Reconstruct FormData - this preserves file uploads
          const newFormData = new FormData();
          for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
              newFormData.append(key, value, value.name);
            } else {
              newFormData.append(key, value);
            }
          }
          body = newFormData;
          // Don't set Content-Type header - fetch will set it with the correct boundary
        } catch (error) {
          console.error('Error parsing FormData:', error);
          // Fallback: try to get as array buffer
          try {
            const arrayBuffer = await request.arrayBuffer();
            body = arrayBuffer;
            // Preserve content-type for fallback
            headers['Content-Type'] = contentType;
          } catch (e) {
            console.error('Failed to read FormData body:', e);
          }
        }
      } else {
        // For JSON or other content types, read as text
        try {
          body = await request.text();
        } catch {
          // No body
        }
      }
    }
    
    // Forward headers (exclude host and connection headers)
    // For FormData, we let fetch set Content-Type automatically
    if (Object.keys(headers).length === 0) {
      request.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        // Skip headers that shouldn't be forwarded
        if (['host', 'connection', 'content-length'].includes(lowerKey)) {
          return;
        }
        // For FormData, skip Content-Type (fetch will set it with boundary)
        if (isFormData && lowerKey === 'content-type') {
          return;
        }
        // Forward all other headers (including Authorization, etc.)
        headers[key] = value;
      });
    }
    
    // Make request to backend
    const response = await fetch(backendUrl, {
      method,
      headers,
      body: body,
    });
    
    // Get response body
    const responseBody = await response.text();
    
    // Create response with same status and headers
    const proxiedResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
    });
    
    // Forward relevant response headers
    response.headers.forEach((value, key) => {
      // Skip headers that shouldn't be forwarded
      if (
        !['content-encoding', 'transfer-encoding', 'connection'].includes(
          key.toLowerCase()
        )
      ) {
        proxiedResponse.headers.set(key, value);
      }
    });
    
    return proxiedResponse;
  } catch (error: any) {
    console.error('API proxy error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      backendUrl: BACKEND_URL,
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to proxy request to backend',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 502 }
    );
  }
}

