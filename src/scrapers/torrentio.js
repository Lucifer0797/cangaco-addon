'use strict';
/**
 * scrapers/torrentio.js
 * Fonte principal — proxy do Torrentio preset /brazuca.
 * Já filtra PT-BR nativamente, nós aplicamos filtro adicional.
 */

const { torrentioGet }                            = require('../utils/http');
const { detectAudioType, formatStream,
        extractSeeds, extractSize }               = require('../utils/filter');
const cache                                       = require('../utils/cache');
const health                                      = require('../utils/health');

const SOURCE = 'Torrentio';
const BASE   = 'https://torrentio.strem.fun/brazuca';

async function getStreams(imdbId, type, season, episode, cfg) {
  if (!health.isOnline(SOURCE)) {
    console.log('[Torrentio] Health offline — tentando mesmo assim');
  }

  try {
    const url = type === 'movie'
      ? BASE + '/stream/movie/' + imdbId + '.json'
      : BASE + '/stream/series/' + imdbId + ':' + season + ':' + episode + '.json';

    console.log('[Torrentio] GET', url);
    const res = await torrentioGet(url, { timeout: (cfg?.timeout || 8000) });
    const raw = res.data?.streams || [];

    const streams = raw
      .map(s => {
        const title = s.title || s.name || '';
        return formatStream({
          title,
          infoHash:  s.infoHash,
          source:    SOURCE,
          seeds:     extractSeeds(title),
          size:      extractSize(title),
          audioType: detectAudioType(title),
          fileIdx:   typeof s.fileIdx === 'number' ? s.fileIdx : undefined,
          url:       s.url,
          behaviorHints: s.behaviorHints,
          filename:  s.filename,
        });
      })
      .filter(Boolean)
      .slice(0, cfg?.limitPerSource || 5);

    console.log('Torrentio:', streams.length);
    cache.hitSource(SOURCE);
    return streams;
  } catch (err) {
    console.error('[Torrentio] Erro:', err.message);
    cache.missSource(SOURCE);
    return [];
  }
}

module.exports = { getStreams };
