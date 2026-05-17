'use strict';

const { http } = require('../utils/http');
const { isPtBrStream, detectAudioType, formatStream, extractSeeds, extractSize } = require('../utils/filter');
const cache = require('../utils/cache');
const health = require('../utils/health');

const SOURCE = 'TorrentsDB';
const BASE = process.env.TORRENTSDB_URL || 'https://torrentsdb.com';

function resolveSeeds(stream, fallbackText) {
  const candidates = [stream?.seeders, stream?.seeds, stream?.seed_count, stream?.stats?.seeders];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return extractSeeds(fallbackText);
}

async function getStreams(imdbId, type, season, episode, cfg) {
  if (!health.canQuery(SOURCE)) return [];
  try {
    const url = type === 'movie'
      ? BASE + '/stream/movie/' + imdbId + '.json'
      : BASE + '/stream/series/' + imdbId + ':' + season + ':' + episode + '.json';
    const res = await http.get(url, { timeout: cfg?.timeout || 8000 });
    const raw = res.data?.streams || [];
    const streams = raw
      .filter((s) => (cfg?.allowOriginal ? true : isPtBrStream(s, { strictAudio: true })))
      .map((s) => {
        const title = s.title || s.name || '';
        const metaText = [s.title || '', s.name || '', s.description || ''].join(' ');
        return formatStream({
          title,
          infoHash: s.infoHash,
          source: SOURCE,
          seeds: resolveSeeds(s, metaText),
          size: extractSize(metaText),
          audioType: detectAudioType(title),
          fileIdx: typeof s.fileIdx === 'number' ? s.fileIdx : undefined,
          url: s.url,
          behaviorHints: s.behaviorHints,
          filename: s.filename,
        });
      })
      .filter(Boolean)
      .slice(0, cfg?.limitPerSource || 5);
    if (streams.length) {
      health.noteSuccess(SOURCE);
      cache.hitSource(SOURCE);
    } else {
      health.noteFailure(SOURCE);
    }
    return streams;
  } catch {
    health.noteFailure(SOURCE);
    cache.missSource(SOURCE);
    return [];
  }
}

module.exports = { getStreams };

