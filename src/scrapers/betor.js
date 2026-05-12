'use strict';
/**
 * BeTor scraper.
 * Fase 1: prioriza Prowlarr (quando configurado) e usa HTML como fallback.
 */

const cheerio = require('cheerio');
const { http } = require('../utils/http');
const { isPtBr, detectAudioType, formatStream } = require('../utils/filter');
const cache = require('../utils/cache');

const SOURCE = 'BeTor';
const BASE = 'https://catalogo.betor.top';
const PROWLARR_URL = process.env.PROWLARR_URL || '';
const PROWLARR_API_KEY = process.env.PROWLARR_API_KEY || '';
const PROWLARR_INDEXER_ID = process.env.PROWLARR_INDEXER_ID || '';
let cooldownUntil = 0;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
  'Accept-Language': 'pt-BR,pt;q=0.9',
  'Accept': 'text/html,*/*',
};

function sourceFromUrl(url) {
  if (!url) return SOURCE;
  if (/bludv/i.test(url)) return 'BluDV';
  if (/comando/i.test(url)) return 'Comando';
  if (/starck/i.test(url)) return 'StarckFilmes';
  if (/torrentdosfilmes|torrent-dos/i.test(url)) return 'TorrentDosFilmes';
  if (/semtorrent|sem-torrent/i.test(url)) return 'SemTorrent';
  if (/hidra/i.test(url)) return 'HidraTorrents';
  return SOURCE;
}

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

function parseTorrents($, type, season, episode, cfg) {
  const streams = [];

  $('[data-torrent]').each((_, el) => {
    const magnet = $(el).attr('data-torrent-magnet-uri') || '';
    const name = $(el).attr('data-torrent-name') || '';
    const langs = $(el).attr('data-torrent-languages') || '';
    const size = $(el).attr('data-torrent-size') || '';
    const seeds = $(el).attr('data-torrent-num-seeds') || null;
    const provider = $(el).attr('data-provider-url') || '';

    if (!magnet) return;

    const audioType = detectAudioType(name);
    const isPt = /pt-?br/i.test(langs) || /pt/i.test(langs) || isPtBr(name);
    if (!(isPt || audioType === 'dubbed' || audioType === 'dual' || audioType === 'multi')) return;

    if (!isSeriesEpisodeMatch(name, type, season, episode)) return;

    const sourceName = sourceFromUrl(provider);
    const stream = formatStream({
      title: name,
      magnet,
      source: sourceName,
      seeds: seeds ? parseInt(seeds, 10) : null,
      size: formatSizeBytes(size),
      audioType: audioType || 'dubbed',
    });

    if (stream) streams.push(stream);
  });

  return streams.slice(0, cfg?.limitPerSource || 5);
}

async function fetchByImdb(imdbId, type, season, cfg) {
  let url;
  if (type === 'movie') url = BASE + '/imdb/' + imdbId + '/';
  else url = BASE + '/imdb/' + imdbId + '/season/' + season + '/';

  console.log('[BeTor] GET', url);
  const res = await http.get(url, {
    headers: HEADERS,
    timeout: cfg?.timeout || 8000,
    'axios-retry': { retries: 0 },
  });
  if (res.status === 404) return null;
  return cheerio.load(res.data);
}

async function fetchByTitle(query, cfg) {
  const url = BASE + '/search/?q=' + encodeURIComponent(query);
  console.log('[BeTor] Search', url);
  const res = await http.get(url, {
    headers: HEADERS,
    timeout: cfg?.timeout || 8000,
    'axios-retry': { retries: 0 },
  });
  const $ = cheerio.load(res.data);
  const postLinks = new Set();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.startsWith(BASE + '/imdb/') || href.startsWith('/imdb/')) {
      postLinks.add(href.startsWith('/') ? BASE + href : href);
    }
  });

  for (const link of [...postLinks].slice(0, 1)) {
    try {
      const r = await http.get(link, {
        headers: HEADERS,
        timeout: cfg?.timeout || 8000,
        'axios-retry': { retries: 0 },
      });
      return cheerio.load(r.data);
    } catch { /* ignore */ }
  }
  return null;
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

      const url = base + '/api/v1/search';
      console.log('[BeTor:Prowlarr] GET', url, 'q=', query);
      const res = await http.get(url, {
        params,
        timeout: cfg?.timeout || 8000,
        headers: { 'X-Api-Key': PROWLARR_API_KEY },
        'axios-retry': { retries: 0 },
      });

      const results = Array.isArray(res.data) ? res.data : [];
      const streams = results
        .filter(item => {
          const name = item?.title || '';
          const audioType = detectAudioType(name);
          const isPt = isPtBr(name);
          if (!(isPt || audioType === 'dubbed' || audioType === 'dual' || audioType === 'multi')) return false;
          return isSeriesEpisodeMatch(name, type, season, episode);
        })
        .map(item => {
          const name = item?.title || '';
          const magnet = normalizeProwlarrMagnet(item);
          if (!magnet) return null;
          return formatStream({
            title: name,
            magnet,
            source: sourceFromUrl(item?.indexer || SOURCE),
            seeds: Number.isFinite(Number(item?.seeders)) ? Number(item.seeders) : null,
            size: formatSizeBytes(item?.size),
            audioType: detectAudioType(name) || 'dubbed',
          });
        })
        .filter(Boolean)
        .slice(0, cfg?.limitPerSource || 5);

      if (streams.length) return streams;
    } catch (err) {
      console.warn('[BeTor:Prowlarr] Erro:', err.message);
    }
  }
  return [];
}

async function getStreams(imdbId, type, season, episode, titleInfo, cfg) {
  if (Date.now() < cooldownUntil) {
    const leftSec = Math.ceil((cooldownUntil - Date.now()) / 1000);
    console.log('[BeTor] Cooldown ativo (' + leftSec + 's) - pulando consulta');
    return [];
  }

  try {
    const prowlarrStreams = await fetchFromProwlarr(imdbId, type, season, episode, titleInfo, cfg);
    if (prowlarrStreams.length) {
      console.log('BeTor(Prowlarr):', prowlarrStreams.length);
      cache.hitSource(SOURCE);
      return prowlarrStreams;
    }

    let streams = [];
    const byImdb = await fetchByImdb(imdbId, type, season, cfg);
    if (byImdb) streams = parseTorrents(byImdb, type, season, episode, cfg);

    if (!streams.length && titleInfo) {
      const query = titleInfo.titlePtBr || titleInfo.title || titleInfo.originalTitle;
      if (query) {
        const byTitle = await fetchByTitle(query, cfg);
        if (byTitle) streams = parseTorrents(byTitle, type, season, episode, cfg);
      }
    }

    console.log('BeTor:', streams.length);
    if (streams.length) cache.hitSource(SOURCE);
    return streams;
  } catch (err) {
    const status = err.response?.status;
    if (status === 503 || status === 504) {
      cooldownUntil = Date.now() + 120 * 1000;
      console.warn('[BeTor] ' + status + ' - cooldown de 120s');
    }
    console.warn('[BeTor] Erro:', err.message);
    cache.missSource(SOURCE);
    return [];
  }
}

module.exports = { getStreams };

