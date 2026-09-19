export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function readBodyText(request: Request, maxBytes = 128_000): Promise<string> {
  if (Number(request.headers.get('content-length')) > maxBytes) throw new RequestError('Request is too large.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError('Invalid request.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new RequestError('Request is too large.', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}
export async function readJsonObject(request: Request, maxBytes = 128_000): Promise<Record<string, unknown>> {
  const text = await readBodyText(request, maxBytes);
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new RequestError('Invalid JSON object.'); }
}
export function stringList(value: unknown, limit = 5): value is string[] {
  return Array.isArray(value) && value.length <= limit && value.every(v => typeof v === 'string' && v.length <= 4000);
}
