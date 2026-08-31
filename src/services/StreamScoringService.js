class StreamScoringService {
  calculateScore(stream, sourceName = '') {
    let score = 50;

    if (stream.url) score += 30;
    else if (stream.externalUrl) score -= 20;

    const title = String(stream.title || '').toLowerCase();
    const resolution = String(stream.resolution || '').toLowerCase();
    if (title.includes('2160') || resolution.includes('3840x2160')) score += 25;
    else if (title.includes('1080') || resolution.includes('1920x1080')) score += 20;
    else if (title.includes('720') || resolution.includes('1280x720')) score += 10;
    else if (title.includes('sd') || title.includes('540')) score -= 5;

    if (/test|authorized|direct/i.test(sourceName)) score += 5;
    return score;
  }
}

module.exports = StreamScoringService;
