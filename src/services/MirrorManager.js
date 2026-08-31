const { fetchJson, fetchText, fetchWithTimeout } = require('../utils/http');

class MirrorManager {
  constructor({ name, bases, timeoutMs = 7000, cache, mirrorIndex = '', discover = null }) {
    this.name = name;
    this.bases = [...new Set((bases || []).map(normalizeBase))];
    this.timeoutMs = timeoutMs;
    this.cache = cache;
    this.mirrorIndex = mirrorIndex;
    this.discover = discover;
    this.lastGood = null;
  }

  async getBases() {
    const key = `mirror-list:${this.name}`;
    return this.cache.remember(key, async () => {
      let discovered = [];
      if (this.mirrorIndex && this.discover) {
        try {
          const html = await fetchText(this.mirrorIndex, {}, this.timeoutMs);
          discovered = await this.discover(html);
        } catch (err) {
          console.warn(`[${this.name}] mirror discovery failed: ${err.message}`);
        }
      }
      return [...new Set([...this.bases, ...discovered.map(normalizeBase)])];
    }, 10 * 60_000);
  }

  async requestJson(path, options = {}) {
    const bases = await this.getBases();
    const ordered = this.lastGood
      ? [this.lastGood, ...bases.filter(b => b !== this.lastGood)]
      : bases;

    let lastError;
    for (const base of ordered) {
      const url = new URL(path, base.endsWith('/') ? base : `${base}/`).toString();
      try {
        const value = await fetchJson(url, options, this.timeoutMs);
        this.lastGood = base;
        return { base, value };
      } catch (err) {
        lastError = err;
        console.warn(`[${this.name}] ${base} failed: ${err.message}`);
      }
    }
    throw lastError || new Error(`[${this.name}] no mirror available`);
  }

  async health() {
    const bases = await this.getBases();
    const checks = await Promise.all(bases.map(async base => {
      const started = Date.now();
      try {
        const res = await fetchWithTimeout(base, { method: 'HEAD' }, Math.min(this.timeoutMs, 4000));
        return { base, ok: res.ok || res.status < 500, status: res.status, ms: Date.now() - started };
      } catch (err) {
        return { base, ok: false, error: err.message, ms: Date.now() - started };
      }
    }));
    return checks;
  }
}

function normalizeBase(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function discoverStreamedOfficialMirrors(html) {
  const urls = [];
  for (const match of String(html).matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)) {
    try {
      const url = new URL(match[1]);
      if (/^streamed\.[a-z0-9.-]+$/i.test(url.hostname)) urls.push(url.origin);
    } catch {}
  }
  return [...new Set(urls)];
}

module.exports = { MirrorManager, discoverStreamedOfficialMirrors };
