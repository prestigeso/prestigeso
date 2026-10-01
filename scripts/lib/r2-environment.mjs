/** Validate R2 settings without printing credential values or accessing a service. */
export function validateR2Environment(env) {
  const issues = [];
  const backend = env.PRODUCT_MEDIA_BACKEND?.trim() || 'supabase';
  if (!['supabase', 'r2'].includes(backend)) issues.push('PRODUCT_MEDIA_BACKEND');
  const enabled = backend === 'r2';
  const rules = {
    R2_ACCOUNT_ID: (value) => /^[a-f0-9]{32}$/i.test(value),
    R2_BUCKET: (value) => /^[a-z0-9][a-z0-9-]{1,62}$/.test(value),
    R2_ACCESS_KEY_ID: (value) => /^[a-f0-9]{32}$/i.test(value),
    R2_SECRET_ACCESS_KEY: (value) => /^[a-f0-9]{64}$/i.test(value),
    R2_PUBLIC_BASE_URL: (value) => {
      try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password &&
          !url.port && url.pathname === '/' && !url.search && !url.hash &&
          url.hostname.includes('.') && url.hostname !== 'localhost' &&
          !url.hostname.endsWith('.r2.dev') &&
          !url.hostname.endsWith('.r2.cloudflarestorage.com');
      } catch { return false; }
    },
  };
  for (const [name, rule] of Object.entries(rules)) {
    const value = env[name]?.trim() || '';
    if ((enabled || value) && !rule(value)) issues.push(name);
  }
  return issues;
}
