'use strict';

const { http } = require('../utils/http');
const { isPtBr, detectAudioType, formatStream } = require('../utils/filter');
const cache = require('../utils/cache');
const health = require('../utils/health');

const BASE = process.env.TORRENT_INDEXER_URL || 'https://vlambdas.oci.darklyn.online';
const INDEXERS = [
  { key: 'bludv', name: 'BluDV' },
  { key: 'comando_torrents', name: 'Comando' },
  { key: 'rede_torrent', name: 'RedeTorrent' },
  { key: 'starck-filmes', name: 'StarckFilmes' },
  { key: 'torrent-dos-filmes', name: 'TorrentDosFilmes' },
  { key: 'vaca_torrent', name: 'VacaTorrent' },
];

function normalizeSeeds(item) {
  const candidates = [item?.seed_count, item?.seeders, item?.seeds, item?.seed, item?.stats?.seeders];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

async function searchOne(indexer, query, type, season, episode, cfg) {
  try {
    let q = query;
    if (type === 'series' && season) q += ' temporada ' + season;
    const res = await http.get(BASE + '/indexers/' + indexer.key, { params: { q }, timeout: cfg?.timeout || 8000 });
    const results = Array.isArray(res.data) ? res.data : (res.data?.results || []);
    return results
      .filter((r) => {
        const text = (r.title || '') + ' ' + (r.original_title || '');
        const audioType = detectAudioType(text);
        if (!(audioType === 'dubbed' || audioType === 'dual' || audioType === 'multi' || isPtBr(text))) return false;
        if (type === 'series' && season && episode) {
          const ep = (r.title || '').match(/S(\d{2})E(\d{2})/i);
          if (ep) return parseInt(ep[1], 10) === season && parseInt(ep[2], 10) === episode;
        }
        return true;
      })
      .map((r) => formatStream({
        title: r.title || '',
        infoHash: r.info_hash,
        magnet: r.magnet_link,
        source: indexer.name,
        seeds: normalizeSeeds(r),
        size: r.size,
        audioType: detectAudioType(r.title || ''),
      }))
      .filter(Boolean)
      .slice(0, cfg?.limitPerSource || 5);
  } catch {
    cache.missSource(indexer.name);
    return [];
  }
}

async function getStreams(titleInfo, type, season, episode, cfg) {
  if (!health.canQuery('Indexer')) return [];
  const query = titleInfo.titlePtBr || titleInfo.title || titleInfo.originalTitle;
  if (!query) return [];
  const sorted = [...INDEXERS].sort((a, b) => cache.getScore(b.name) - cache.getScore(a.name));
  const results = await Promise.allSettled(sorted.map((idx) => searchOne(idx, query, type, season, episode, cfg)));
  const streams = results.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value);
  if (streams.length) health.noteSuccess('Indexer');
  else health.noteFailure('Indexer');
  return streams;
}

module.exports = { getStreams };

