export type EmailPayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
};

export type ClaimedEmail = {
  id: string;
  lease_token: string;
  payload: EmailPayload;
  first_attempt_at: string;
  attempts: number;
};

export type EmailDeliveryResult = {
  status: 'sent' | 'failed' | 'unknown';
  providerId?: string;
  errorCode?: string;
  retry: boolean;
};

export type OutboxDependencies = {
  apiKey: string | undefined;
  now: () => number;
  claim: (id: string) => Promise<ClaimedEmail | null>;
  finish: (row: ClaimedEmail, result: EmailDeliveryResult) => Promise<boolean>;
  fetch: typeof fetch;
};

// `unknown` is committed BEFORE the provider call. A process crash/timeout must
// never turn into an untracked second message after the provider's dedupe TTL.
export async function runEmailDelivery(id: string, deps: OutboxDependencies) {
  if (!deps.apiKey) return { status: 'not_configured' as const };
  const row = await deps.claim(id);
  if (!row) return { status: 'not_claimed' as const };
  if (!Number.isFinite(Date.parse(row.first_attempt_at)) ||
      deps.now() - Date.parse(row.first_attempt_at) >= 23 * 60 * 60 * 1000 || row.attempts > 5) {
    const result: EmailDeliveryResult = { status: 'unknown', errorCode: 'manual_delivery_reconciliation', retry: false };
    await deps.finish(row, result);
    return result;
  }

  let result: EmailDeliveryResult;
  try {
    const response = await deps.fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${deps.apiKey}`, 'Content-Type': 'application/json',
        'Idempotency-Key': `prestigeso-outbox/${row.id}` },
      body: JSON.stringify(row.payload),
      signal: AbortSignal.timeout(20000), cache: 'no-store', redirect: 'error',
    });
    if (response.ok) {
      const payload: unknown = await response.json();
      const providerId = payload && typeof payload === 'object' && 'id' in payload ? payload.id : null;
      result = typeof providerId === 'string' && providerId.length > 0 && providerId.length <= 128
        ? { status: 'sent', providerId, retry: false }
        : { status: 'unknown', errorCode: 'invalid_provider_response', retry: true };
    } else if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 409) {
      result = { status: 'failed', errorCode: `provider_http_${response.status}`, retry: response.status === 429 };
    } else {
      result = { status: 'unknown', errorCode: `provider_http_${response.status}`, retry: true };
    }
  } catch {
    result = { status: 'unknown', errorCode: 'provider_transport_unknown', retry: true };
  }
  // A lost acknowledgement leaves the original unknown lease for reconciliation;
  // it never overwrites the record with pending or starts another provider call.
  if (!await deps.finish(row, result)) throw new Error('EMAIL_RESULT_NOT_RECORDED');
  return result;
}
