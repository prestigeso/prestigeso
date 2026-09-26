import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchTrendyolStream } from './stream.ts';

type Dependencies = {
  db: SupabaseClient;
  env: Record<string, string | undefined>;
  budget: (seller: string) => Promise<{ allowed: boolean }>;
  fetchPage?: typeof fetchTrendyolStream;
  now?: () => number;
};

// One bounded page per invocation. The database cursor/revision is the checkpoint,
// shared by browser-triggered and scheduled runs (never a process-local cursor).
export async function syncAutomaticPage({ db, env, budget, fetchPage = fetchTrendyolStream, now = Date.now }: Dependencies) {
  if (env.TRENDYOL_SYNC_ENABLED !== '1') return { status: 503, body: { error: 'Senkronizasyon kapalı.', disabled: true } };
  const seller = env.TRENDYOL_SELLER_ID || '';
  const environment = env.TRENDYOL_ENVIRONMENT;
  if (!/^[1-9][0-9]{0,15}$/.test(seller) || (environment !== 'stage' && environment !== 'production') || !env.TRENDYOL_API_KEY || !env.TRENDYOL_API_SECRET)
    return { status: 503, body: { error: 'Trendyol yapılandırması eksik.', configuration: true } };
  try {
    if (!(await budget(seller)).allowed) return { status: 429, body: { error: 'Senkronizasyon sırada; yeniden denenecek.' } };
    const next = await db.rpc('trendyol_auto_job', { p_seller: seller, p_environment: environment, p_now: now() });
    if (next.error) throw next.error;
    if (!next.data) return { status: 200, body: { complete: true, fresh: true } };
    const row = await db.from('trendyol_sync_jobs').select('*').eq('id', next.data).eq('seller_id', seller).eq('environment', environment).maybeSingle();
    if (row.error || !row.data) throw Error('JOB');
    const job = row.data;
    if (job.status === 'complete') return { status: 200, body: { complete: false, fresh: true } };
    const page = await fetchPage({ sellerId: seller, environment, apiKey: env.TRENDYOL_API_KEY, apiSecret: env.TRENDYOL_API_SECRET, buyerSecret: env.TRENDYOL_BUYER_HASH_SECRET }, { start: Number(job.starts_at), end: Number(job.ends_at), cursor: job.cursor_value });
    if (page.buyers) {
      const buyers = await db.rpc('trendyol_record_buyers', { p_seller: seller, p_environment: environment, p_buyers: page.buyers });
      if (buyers.error) throw buyers.error;
    }
    const saved = await db.rpc('trendyol_apply_sync_page', { p_job: job.id, p_revision: job.revision, p_packages: page.packages, p_cursor: page.nextCursor, p_more: page.hasMore });
    if (saved.error) throw saved.error;
    return { status: 200, body: { complete: !page.hasMore && Number(job.ends_at) > now() - 120000, count: page.packages.length, revision: saved.data } };
  } catch {
    return { status: 503, body: { error: 'Senkronizasyon tamamlanamadı. Kayıtlar korunuyor; son kontrol noktasından yeniden denenecek.' } };
  }
}
