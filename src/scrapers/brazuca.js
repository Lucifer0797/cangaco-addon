'use strict';
/**
 * scrapers/brazuca.js
 * Proxy do addon Brazuca Torrents — 100% PT-BR dublado.
 */

const { http }                                    = require('../utils/http');
const { detectAudioType, formatStream,
        extractSeeds, extractSize }               = require('../utils/filter');
const cache                                       = require('../utils/cache');
const health                                      = require('../utils/health');

const SOURCE = 'BrazucaTorrents';
const BASE   = process.env.BRAZUCA_URL || 'https://94c8cb9f702d-brazuca-torrents.baby-beamup.club';
let cooldownUntil = 0;

async function getStreams(imdbId, type, season, episode, cfg) {
  if (Date.now() < cooldownUntil) {
    const leftSec = Math.ceil((cooldownUntil - Date.now()) / 1000);
    console.log('[Brazuca] Cooldown ativo (' + leftSec + 's) — tentando mesmo assim');
  }

  if (!health.isOnline(SOURCE)) {
    console.log('[Brazuca] Health offline — tentando mesmo assim');
  }

  try {
    const url = type === 'movie'
      ? BASE + '/stream/movie/' + imdbId + '.json'
      : BASE + '/stream/series/' + imdbId + ':' + season + ':' + episode + '.json';

    console.log('[Brazuca] GET', url);
    const res = await http.get(url, { timeout: cfg?.timeout || 8000 });
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
          audioType: detectAudioType(title) || 'dubbed',
          fileIdx:   typeof s.fileIdx === 'number' ? s.fileIdx : undefined,
          url:       s.url,
          behaviorHints: s.behaviorHints,
          filename:  s.filename,
        });
      })
      .filter(Boolean)
      .slice(0, cfg?.limitPerSource || 5);

    console.log('Brazuca:', streams.length);
    cache.hitSource(SOURCE);
    return streams;
  } catch (err) {
    if (err.response?.status === 429) {
      cooldownUntil = Date.now() + 90 * 1000;
      console.warn('[Brazuca] 429 rate limit — cooldown de 90s');
    }
    console.error('[Brazuca] Erro:', err.message);
    cache.missSource(SOURCE);
    return [];
  }
}

module.exports = { getStreams };
