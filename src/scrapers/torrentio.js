'use strict';

const { torrentioGet } = require('../utils/http');
const { detectAudioType, formatStream, extractSeeds, extractSize } = require('../utils/filter');
const cache = require('../utils/cache');
const health = require('../utils/health');

const SOURCE = 'Torrentio';
const BASE = 'https://torrentio.strem.fun/brazuca';

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

    const res = await torrentioGet(url, { timeout: cfg?.timeout || 8000 });
    const raw = res.data?.streams || [];

    const streams = raw
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

    health.noteSuccess(SOURCE);
    cache.hitSource(SOURCE);
    return streams;
  } catch {
    health.noteFailure(SOURCE);
    cache.missSource(SOURCE);
    return [];
  }
}

module.exports = { getStreams };

