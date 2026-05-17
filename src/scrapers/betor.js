'use strict';
/**
 * BeTor scraper (Prowlarr-only).
 * HTML fallback foi removido por estabilidade.
 */

const { http } = require('../utils/http');
const { isPtBr, detectAudioType, formatStream } = require('../utils/filter');
const cache = require('../utils/cache');
const health = require('../utils/health');

const SOURCE = 'BeTor';
const PROWLARR_URL = process.env.PROWLARR_URL || '';
const PROWLARR_API_KEY = process.env.PROWLARR_API_KEY || '';
const PROWLARR_INDEXER_ID = process.env.PROWLARR_INDEXER_ID || '';
// Referência de definição Cardigann para configurar no Prowlarr:
const BETOR_CARDIGANN_YML = process.env.BETOR_CARDIGANN_YML || 'https://catalogo.betor.top/static/catalogo-betor.yml';
let cachedAutoIndexerId = null;
let cachedAutoIndexerAt = 0;
const AUTO_INDEXER_TTL_MS = 5 * 60 * 1000;

function formatSizeBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1e9) return (n / 1e9).toFixed(1) + ' GB';
  if (n >= 1e6) return (n / 1e6).toFixed(0) + ' MB';
  return null;
}

function normalizeProwlarrMagnet(item) {
  if (item?.magnetUrl) return item.magnetUrl;
  if (item?.downloadUrl && String(item.downloadUrl).startsWith('magnet:')) return item.downloadUrl;
  if (item?.guid && String(item.guid).startsWith('magnet:')) return item.guid;
  return null;
}

function isSeriesEpisodeMatch(name, type, season, episode) {
  if (type !== 'series' || !season || !episode) return true;
  const ep = String(name || '').match(/S(\d{2})E(\d{2})/i);
  if (ep) return parseInt(ep[1], 10) === season && parseInt(ep[2], 10) === episode;
  const temp = String(name || '').match(/temporada\s*(\d+)/i);
  if (temp && parseInt(temp[1], 10) !== season) return false;
  return true;
}

async function fetchFromProwlarr(imdbId, type, season, episode, titleInfo, cfg) {
  if (!PROWLARR_URL || !PROWLARR_API_KEY) return [];

  const base = PROWLARR_URL.replace(/\/+$/, '');
  const queries = [imdbId];
  if (titleInfo) {
    const t = titleInfo.titlePtBr || titleInfo.title || titleInfo.originalTitle;
    if (t) queries.push(t);
  }

  for (const raw of queries) {
    let query = raw;
    if (type === 'series' && season) query += ' temporada ' + season;
    try {
      const params = { query, type: 'search' };
      if (PROWLARR_INDEXER_ID) params.indexerIds = PROWLARR_INDEXER_ID;
      else {
        const autoId = await resolveBetorIndexerId(base);
        if (autoId) params.indexerIds = String(autoId);
      }

      const res = await http.get(base + '/api/v1/search', {
        params,
        timeout: cfg?.timeout || 8000,
        headers: { 'X-Api-Key': PROWLARR_API_KEY },
        'axios-retry': { retries: 0 },
      });

      const results = Array.isArray(res.data) ? res.data : [];
      const streams = results
        .filter((item) => {
          const name = item?.title || '';
          const audioType = detectAudioType(name);
          const isPt = isPtBr(name);
          if (!(isPt || audioType === 'dubbed' || audioType === 'dual' || audioType === 'multi')) return false;
          return isSeriesEpisodeMatch(name, type, season, episode);
        })
        .map((item) => {
          const name = item?.title || '';
          const magnet = normalizeProwlarrMagnet(item);
          if (!magnet) return null;
          return formatStream({
            title: name,
            magnet,
            source: SOURCE,
            seeds: Number.isFinite(Number(item?.seeders)) ? Number(item.seeders) : null,
            size: formatSizeBytes(item?.size),
            audioType: detectAudioType(name) || 'dubbed',
          });
        })
        .filter(Boolean)
        .slice(0, cfg?.limitPerSource || 5);

      if (streams.length) return streams;
    } catch {
      // silencioso
    }
  }
  return [];
}

async function resolveBetorIndexerId(base) {
  if (PROWLARR_INDEXER_ID) return PROWLARR_INDEXER_ID;
  if (cachedAutoIndexerId && (Date.now() - cachedAutoIndexerAt) < AUTO_INDEXER_TTL_MS) {
    return cachedAutoIndexerId;
  }
  try {
    const res = await http.get(base + '/api/v1/indexer', {
      timeout: 5000,
      headers: { 'X-Api-Key': PROWLARR_API_KEY },
      'axios-retry': { retries: 0 },
    });
    const list = Array.isArray(res.data) ? res.data : [];
    const hit = list.find((x) => {
      const blob = [
        x?.name || '',
        x?.implementationName || '',
        x?.implementation || '',
        x?.description || '',
      ].join(' ').toLowerCase();
      return blob.includes('betor') || blob.includes('catalogo betor');
    });
    const id = hit?.id;
    if (id) {
      cachedAutoIndexerId = id;
      cachedAutoIndexerAt = Date.now();
      return id;
    }
  } catch {
    // silencioso
  }
  return null;
}

async function getStreams(imdbId, type, season, episode, titleInfo, cfg) {
  if (!health.canQuery(SOURCE)) return [];
  if (!PROWLARR_URL || !PROWLARR_API_KEY) {
    // Modo Prowlarr-only: sem credenciais, não busca.
    return [];
  }

  try {
    const streams = await fetchFromProwlarr(imdbId, type, season, episode, titleInfo, cfg);
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

module.exports = { getStreams, BETOR_CARDIGANN_YML };
