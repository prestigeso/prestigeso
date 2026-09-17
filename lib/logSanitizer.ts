const PRIVATE_KEY = /authorization|cookie|password|secret|token|key|salt|email|phone|address|name|message|stack|body|payload|card|iban|birth|ip(?:address)?$/i;
const SAFE_ENUM = /^(nodejs|edge|production|development|test|GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|render|route|action|middleware|app|pages|pending|paid|failed|unknown|sent|refunded|partially_refunded|matched|mismatch|error|none|recovered|manual_review)$/;
const SAFE_FIELDS = new Set(['error','errors','nested','details','context','list','orderId','productId','variantId','requestId','entityId',
  'runtime','environment','method','path','routePath','routeType','digest','status','level','attempts','count','durationMs','httpStatus',
  'code','reason','message','stack','email','phone','address','password','token','secret','Authorization','cookies','cardNumber']);
const SAFE_PATH_SEGMENTS = new Set(['api','admin','orders','order','paytr','callback','create-token','checkout','cart','product','products',
  'shop','profile','auth','login','logout','maintenance','operations','refund','returns','invoice','shipping','settings','telemetry',
  'client-error','siparis-takip','success','failed','payment','search','categories','favorites','reviews']);

function safePath(value: string) {
  const pathname = value.split(/[?#]/, 1)[0];
  if (!pathname.startsWith('/')) return '[redacted]';
  return pathname.split('/').slice(0, 12).map(segment => !segment || SAFE_PATH_SEGMENTS.has(segment) ? segment : '[segment]').join('/');
}

// Unstructured strings cannot reliably be scrubbed with a token/email regex:
// provider errors may embed customer fields or credentials without labels.
// Keep small diagnostic enums/IDs and drop the free-form text entirely.
export function sanitizeLogContext(value: unknown, depth = 0, field = ''): unknown {
  if (depth > 3) return '[truncated]';
  if (PRIVATE_KEY.test(field)) return '[redacted]';
  if (value instanceof Error) return { type: ['Error','TypeError','RangeError','SyntaxError','AbortError','TimeoutError'].includes(value.name) ? value.name : 'Error' };
  if (Array.isArray(value)) return value.slice(0, 20).map(item => sanitizeLogContext(item, depth + 1, field));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 30)
    .map(([key, item], index) => [SAFE_FIELDS.has(key) ? key : `field${index}`, sanitizeLogContext(item, depth + 1, key)]));
  if (typeof value === 'string') {
    if (field === 'path' || field === 'routePath') return safePath(value);
    if (field === 'digest') return /^\d{1,12}$/.test(value) ? value : '[redacted]';
    return SAFE_ENUM.test(value) ? value : '[redacted]';
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : '[invalid number]';
  if (typeof value === 'boolean' || value === null) return value;
  return undefined;
}

export function safeLogEventName(value: string) {
  return /^[a-z][a-z0-9_.-]{0,99}$/.test(value) ? value : 'invalid_event_name';
}
