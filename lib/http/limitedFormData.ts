export class PayloadTooLarge extends Error {}

export async function limitedFormData(request: Request, maxBytes: number): Promise<FormData> {
  const length = request.headers.get("content-length");
  if (length && Number(length) > maxBytes) {
    await request.body?.cancel().catch(() => undefined);
    throw new PayloadTooLarge();
  }
  const reader = request.body?.getReader();
  if (!reader) throw new Error("EMPTY_BODY");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new PayloadTooLarge(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new Response(bytes, { headers: { "content-type": request.headers.get("content-type") || "" } }).formData();
}
