class BaseProvider {
  constructor({ cache }) {
    this.cache = cache;
    this.id = 'base';
    this.name = 'Base';
  }

  async getItems() { return []; }
  async getItem() { return null; }
  async getStreams() { return []; }
  async health() { return { provider: this.id, ok: true }; }
}

module.exports = BaseProvider;
