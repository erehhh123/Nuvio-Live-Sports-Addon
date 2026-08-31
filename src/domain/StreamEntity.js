class StreamEntity {
  constructor({ name, title, url, externalUrl, resolution, bitrate, score, behaviorHints }) {
    this.name = name || 'Live Sports';
    this.title = title || 'Live Stream';

    if (url) this.url = url;
    if (externalUrl) this.externalUrl = externalUrl;

    this.resolution = resolution || null;
    this.bitrate = bitrate || null;
    this.score = score || 0;

    if (behaviorHints) this.behaviorHints = behaviorHints;
  }
}

module.exports = StreamEntity;
