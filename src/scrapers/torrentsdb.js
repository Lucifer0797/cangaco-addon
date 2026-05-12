'use strict';
/**
 * TorrentsDB fallback scraper (Stremio stream endpoint proxy).
 */

const { http } = require('../utils/http');
const { isPtBrStream, detectAudioType, formatStream, extractSeeds, extractSize } = require('../utils/filter');
const cache = require('../utils/cache');

const SOURCE = 'TorrentsDB';
const BASE = process.env.TORRENTSDB_URL || 'https://torrentsdb.com';

async function getStreams(imdbId, type, season, episode, cfg) {
  try {
    const url = type === 'movie'
      ? BASE + '/stream/movie/' + imdbId + '.json'
      : BASE + '/stream/series/' + imdbId + ':' + season + ':' + episode + '.json';

    console.log('[TorrentsDB] GET', url);
    const res = await http.get(url, { timeout: cfg?.timeout || 8000 });
    const raw = res.data?.streams || [];

    const streams = raw
      .filter(s => cfg?.allowOriginal ? true : isPtBrStream(s, { strictAudio: true }))
      .map(s => {
        const title = s.title || s.name || '';
        return formatStream({
          title,
          infoHash: s.infoHash,
          source: SOURCE,
          seeds: extractSeeds(title),
          size: extractSize(title),
          audioType: detectAudioType(title),
          fileIdx: typeof s.fileIdx === 'number' ? s.fileIdx : undefined,
          url: s.url,
          behaviorHints: s.behaviorHints,
          filename: s.filename,
        });
      })
      .filter(Boolean)
      .slice(0, cfg?.limitPerSource || 5);

    console.log('TorrentsDB:', streams.length);
    if (streams.length) cache.hitSource(SOURCE);
    return streams;
  } catch (err) {
    console.warn('[TorrentsDB] Erro:', err.message);
    cache.missSource(SOURCE);
    return [];
  }
}

module.exports = { getStreams };
