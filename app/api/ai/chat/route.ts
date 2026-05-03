/**
 * Thin proxy — all LLM provider keys and logic live in the Express backend.
 * This route just forwards the request and pipes the streaming response back.
 */

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const upstream = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Forward abort signal so stopping the stream cancels the upstream request too
      signal: req.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => `HTTP ${upstream.status}`);
      let message = text;
      try { message = JSON.parse(text).error ?? text; } catch { /* ignore */ }
      return new Response(JSON.stringify({ error: message }), {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Pipe the streaming body straight through — no buffering
    return new Response(upstream.body, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return new Response(null, { status: 499 });
    }
    console.error('[AI Chat Proxy] Error:', err);
    return new Response(JSON.stringify({ error: err?.message ?? 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
