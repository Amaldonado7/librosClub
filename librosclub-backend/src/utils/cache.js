const cache = new Map();

function get(key) {
  const hit = cache.get(key);
  if (!hit) return null;

  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function set(key, data, ttlMs) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

module.exports = { get, set };
