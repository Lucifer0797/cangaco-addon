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

  // Alguns indexadores devolvem URL com magnet codificado em query param.
  const fromWrappedUrl = extractMagnetFromWrappedUrl(item?.downloadUrl) || extractMagnetFromWrappedUrl(item?.guid);
  if (fromWrappedUrl) return fromWrappedUrl;

  // Campos alternativos de hash que aparecem em alguns providers.
  const possibleHash =
    item?.infoHash ||
    item?.infohash ||
    item?.hash ||
    item?.torrentInfoHash ||
    item?.torrentHash;

  if (possibleHash) {
    const dn = encodeURIComponent(item?.title || 'torrent');
    return 'magnet:?xt=urn:btih:' + String(possibleHash).trim() + '&dn=' + dn;
  }

  // Alguns indexadores no Prowlarr nao retornam magnet direto, so hash.
  if (item?.infoHash) {
    const dn = encodeURIComponent(item?.title || 'torrent');
    return 'magnet:?xt=urn:btih:' + String(item.infoHash).trim() + '&dn=' + dn;
  }
  return null;
}

function extractMagnetFromWrappedUrl(raw) {
  const str = String(raw || '');
  if (!str) return null;
  try {
    const u = new URL(str);
    const candidates = [
      u.searchParams.get('link'),
      u.searchParams.get('url'),
      u.searchParams.get('target'),
      u.searchParams.get('r'),
    ].filter(Boolean);
    for (const c of candidates) {
      const decoded = safeDecode(c);
      if (String(decoded).startsWith('magnet:')) return decoded;
      const btih = String(decoded).match(/btih:([a-z0-9]{32,40})/i);
      if (btih) {
        const dn = encodeURIComponent('torrent');
        return 'magnet:?xt=urn:btih:' + btih[1] + '&dn=' + dn;
      }
    }
  } catch {
    // ignora parse error
  }
  return null;
}

function safeDecode(val) {
  try {
    return decodeURIComponent(String(val || ''));
  } catch {
    return String(val || '');
  }
}

function toAbsoluteUrl(base, rawUrl) {
  const raw = String(rawUrl || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw, base + '/').toString();
  } catch {
    return raw;
  }
}

function normalizeProwlarrDownloadUrl(base, rawUrl) {
  const abs = toAbsoluteUrl(base, rawUrl);
  if (!abs) return null;
  try {
    const u = new URL(abs);
    // Se for endpoint do Prowlarr, garante apikey para o Stremio conseguir baixar.
    if (u.pathname.startsWith('/api/v1/indexer/') && !u.searchParams.get('apikey')) {
      u.searchParams.set('apikey', PROWLARR_API_KEY);
    }
    return u.toString();
  } catch {
    return abs;
  }
}

function isSeriesEpisodeMatch(name, type, season, episode) {
  if (type !== 'series' || !season || !episode) return true;
  const t = String(name || '');

  const s = Number(season);
  const e = Number(episode);
  const sPad = String(s).padStart(2, '0');
  const ePad = String(e).padStart(2, '0');

  const exactA = new RegExp(`\\bS0?${s}E0?${e}\\b`, 'i').test(t);
  const exactB = new RegExp(`\\b${s}\\s*x\\s*0?${e}\\b`, 'i').test(t);
  const exactC = new RegExp(`\\bS${sPad}E${ePad}\\b`, 'i').test(t);
  if (exactA || exactB || exactC) return true;

  const hasAnyEpisodePattern = /\bS\d{1,2}E\d{1,2}\b/i.test(t) || /\b\d{1,2}\s*x\s*\d{1,2}\b/i.test(t);
  if (hasAnyEpisodePattern) return false;

  // Evita aceitar filme/resultado solto quando não houver marcação clara de episódio.
  return false;
}

function normalizeImdbId(raw) {
  const s = String(raw || '').trim().toLowerCase();
  const m = s.match(/tt\d{5,10}/i);
  return m ? m[0].toLowerCase() : null;
}

function extractItemImdbId(item) {
  return normalizeImdbId(
    item?.imdbId ||
    item?.imdbid ||
    item?.imdb ||
    item?.imdbID ||
    item?.infoUrl ||
    item?.guid ||
    item?.comments
  );
}

async function fetchFromProwlarr(imdbId, type, season, episode, titleInfo, cfg) {
  if (!PROWLARR_URL || !PROWLARR_API_KEY) return [];

  const base = PROWLARR_URL.replace(/\/+$/, '');
  const queries = [imdbId];
  if (titleInfo) {
    const t = titleInfo.titlePtBr || titleInfo.title || titleInfo.originalTitle;
    if (t) queries.push(t);
  }

  const baseParams = {};
  if (PROWLARR_INDEXER_ID) baseParams.indexerIds = PROWLARR_INDEXER_ID;
  else {
    const autoId = await resolveBetorIndexerId(base);
    if (autoId) baseParams.indexerIds = String(autoId);
  }

  for (const raw of queries) {
    const query = String(raw || '').trim();
    try {
      const strategies = [];
      if (type === 'series') {
        strategies.push({
          ...baseParams,
          type: 'tvsearch',
          imdbId,
          season,
          episode,
          query,
        });
      } else {
        strategies.push({
          ...baseParams,
          type: 'movie',
          imdbId,
          query,
        });
      }

      // Fallback que replica melhor o comportamento da UI do Prowlarr.
      strategies.push({ ...baseParams, type: 'search', query });

      for (const params of strategies) {
        const res = await http.get(base + '/api/v1/search', {
          params,
          timeout: cfg?.timeout || 8000,
          headers: { 'X-Api-Key': PROWLARR_API_KEY },
          'axios-retry': { retries: 0 },
        })

        const results = Array.isArray(res.data) ? res.data : [];
        const expectedImdb = normalizeImdbId(imdbId);
        const streams = results
          .filter((item) => {
            const name = item?.title || '';
            const itemImdb = extractItemImdbId(item);
            if (expectedImdb && itemImdb && itemImdb !== expectedImdb) return false;

            const audioType = detectAudioType(name);
            const isPt = isPtBr(name);
            if (!(isPt || audioType === 'dubbed' || audioType === 'dual' || audioType === 'multi')) return false;
            return isSeriesEpisodeMatch(name, type, season, episode);
          })
          .map((item) => {
            const name = item?.title || '';
            const magnet = normalizeProwlarrMagnet(item);
            const url = normalizeProwlarrDownloadUrl(base, item?.downloadUrl || item?.guid);
            if (!magnet && !url) return null;
            return formatStream({
              title: name,
              url,
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
      }
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
