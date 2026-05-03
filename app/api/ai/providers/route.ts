/**
 * Proxies GET /api/ai/providers from the backend.
 * Returns which LLM providers have API keys configured — candidates only see those.
 */

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/ai/chat/providers`);
    const data = await res.json();
    return Response.json(data);
  } catch {
    // If backend is unreachable, fail open so the picker still shows
    return Response.json({ openai: true, google: true, groq: true, anthropic: true });
  }
}
