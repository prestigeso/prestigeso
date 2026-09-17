export async function limitedJson(request: Request, maxBytes = 16384): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("CONTENT_TYPE");
  if (Number(request.headers.get("content-length")) > maxBytes) throw new Error("BODY_LIMIT");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("EMPTY_BODY");
  const decoder = new TextDecoder();
  let bytes = 0, text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) { await reader.cancel(); throw new Error("BODY_LIMIT"); }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { reader.releaseLock(); }
}
