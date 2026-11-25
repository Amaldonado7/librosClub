const COVER_TIMEOUT_MS = 2000;
const COVER_MAX_BYTES = 2097152;
const COVER_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPT_HEADER = COVER_CONTENT_TYPES.join(',');
const FAILURE = Object.freeze({ ok: false });

function mediaTypeOf(header) {
  if (typeof header !== 'string') return '';
  return header.split(';')[0].trim().toLowerCase();
}

function declaredLength(headers) {
  const raw = headers.get('content-length');
  if (raw === null || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function abortPromise(signal) {
  const promise = new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });
  promise.catch(() => {});
  return promise;
}

async function readBody(body, maxBytes, aborted) {
  const reader = body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), aborted]);
      if (done) return Buffer.concat(chunks, total);
      total += value.byteLength;
      if (total > maxBytes) return null;
      chunks.push(value);
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

async function fetchCoverImage(url, {
  fetchImpl = globalThis.fetch,
  timeoutMs = COVER_TIMEOUT_MS,
  maxBytes = COVER_MAX_BYTES,
} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const aborted = abortPromise(controller.signal);
  try {
    const response = await Promise.race([
      fetchImpl(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { Accept: ACCEPT_HEADER },
      }),
      aborted,
    ]);
    if (!response || response.status !== 200) return FAILURE;
    const contentType = mediaTypeOf(response.headers.get('content-type'));
    if (!COVER_CONTENT_TYPES.includes(contentType)) return FAILURE;
    const length = declaredLength(response.headers);
    if (length !== null && length > maxBytes) return FAILURE;
    if (!response.body || typeof response.body.getReader !== 'function') return FAILURE;
    const body = await readBody(response.body, maxBytes, aborted);
    if (!body) return FAILURE;
    return { ok: true, contentType, body };
  } catch {
    return FAILURE;
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

module.exports = { fetchCoverImage, COVER_TIMEOUT_MS, COVER_MAX_BYTES, COVER_CONTENT_TYPES };
