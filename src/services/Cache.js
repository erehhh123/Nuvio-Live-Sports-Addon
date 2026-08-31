class Cache {
  constructor(defaultTtlMs = 60_000) {
    this.defaultTtlMs = defaultTtlMs;
    this.map = new Map();
  }

  get(key) {
    const item = this.map.get(key);
    if (!item) return undefined;
    if (Date.now() >= item.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return item.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  async remember(key, fn, ttlMs = this.defaultTtlMs) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await fn();
    return this.set(key, value, ttlMs);
  }
}

module.exports = Cache;
