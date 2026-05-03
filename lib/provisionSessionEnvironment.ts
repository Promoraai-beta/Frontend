import { API_BASE_URL } from './config';

export type ProvisionSessionResult = { ide_url: string; terminal_url?: string; reused?: boolean };

/**
 * Waits for the candidate IDE container to be running (POST /api/sessions/start-container).
 * Call after creating a session so the recruiter only shares a link when the environment is ready.
 */
export async function waitForSessionEnvironmentReady(options: {
  sessionId: string;
  assessmentId: string;
  signal?: AbortSignal;
}): Promise<ProvisionSessionResult> {
  const res = await fetch(`${API_BASE_URL}/api/sessions/start-container`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: options.sessionId,
      assessment_id: options.assessmentId,
    }),
    signal: options.signal,
  });

  let data: { success?: boolean; error?: string; session?: { ide_url?: string; terminal_url?: string; reused?: boolean } } =
    {};
  try {
    data = await res.json();
  } catch {
    // leave data empty
  }

  if (!res.ok || !data.success) {
    throw new Error(data.error || res.statusText || 'Failed to prepare the assessment environment');
  }

  const ide = data.session?.ide_url;
  if (!ide) {
    throw new Error('The server did not return an environment URL. Try again in a moment.');
  }

  return {
    ide_url: ide,
    terminal_url: data.session?.terminal_url,
    reused: data.session?.reused,
  };
}
