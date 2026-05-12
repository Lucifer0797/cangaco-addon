'use strict';
/**
 * index.js â€” Dubra Addon
 * Entry point. Express + stremio-addon-sdk.
 */

const express = require('express');
const { addonBuilder } = require('stremio-addon-sdk');

const cache           = require('./utils/cache');
const { getTitleInfo, isActive } = require('./utils/tmdb');
const { raceAll }     = require('./utils/http');
const { parseConfig } = require('./utils/config');
const {
  isPtBrStream, passesQualityFilter, passesCodecFilter, passesSrcFilter,
  passesEpisodeFilter, deduplicate, applyScores, sortAndClean, isLikelyPtBrFromTrustedSource, isClearlyNonPtBr,
} = require('./utils/filter');
const { enrichWithDebrid }  = require('./debrid');
const { startMonitor, getStatus } = require('./utils/health');
const tokenStore = require('./utils/tokenStore');
const { configurePage }     = require('./configure');

const torrentio    = require('./scrapers/torrentio');
const brazuca      = require('./scrapers/brazuca');
const indexer      = require('./scrapers/indexer');
const betor        = require('./scrapers/betor');
const torrentsdb   = require('./scrapers/torrentsdb');

// â”€â”€â”€ Manifest â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const manifest = {
  id:          'br.dubra.torrents',
  version:     '1.0.0',
  name:        'Dubra',
  description: 'Audio em portugues primeiro. Torrents dublados e dual audio PT-BR.',
  resources:   ['stream'],
  types:       ['movie', 'series'],
  idPrefixes:  ['tt'],
  catalogs:    [],
  behaviorHints: {
    p2p:            true,
    configurable:   true,
    configurePath:  '/configure',
  },
};

// â”€â”€â”€ Builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const builder = new addonBuilder(manifest);

builder.defineStreamHandler(async ({ type, id }) => {
  return handleStream(type, id, parseConfig(''));
});

function buildRescueConfig(cfg) {
  const next = JSON.parse(JSON.stringify(cfg || {}));
  next.behavior = 'all';
  next.quality = ['4k', '1080p', '720p', '480p', '360p', 'any'];
  next.qualityOrder = ['1080p', '4k', '720p', '480p', '360p', 'any'];
  next.codec = ['h265', 'h264', 'av1', 'xvid', 'mpeg2'];
  next.codecOrder = ['h265', 'h264', 'av1', 'xvid', 'mpeg2'];
  next.src = ['remux', 'bluray', 'webdl', 'webrip', 'bdrip', 'hdrip', 'hdtv', 'dvdrip', 'cam'];
  next.srcOrder = ['remux', 'bluray', 'webdl', 'webrip', 'bdrip', 'hdrip', 'hdtv', 'dvdrip', 'cam'];
  next.sources = {
    betor: true,
    torrentio: true,
    brazuca: true,
    indexer: true,
    torrentsdb: true,
  };
  next.timeout = Math.max(8000, Number(next.timeout || 0));
  next.limitPerSource = Math.max(5, Number(next.limitPerSource || 0));
  next.limitTotal = Math.max(20, Number(next.limitTotal || 0));
  return next;
}

function applyQualityBehavior(streams, cfg) {
  if (!cfg?.quality?.length) return streams;
  const mode = cfg.behavior || 'all';
  if (mode === 'all') return streams;

  const preferred = streams.filter(s => {
    const title = s._title || s.name || s.description || '';
    return passesQualityFilter(title, cfg);
  });

  if (mode === 'strict') return preferred;
  if (mode === 'fallback') return preferred.length ? preferred : streams;
  return streams;
}

async function handleStream(type, id, cfg) {
  if (!cfg.debrid && cfg.debridRef) {
    cfg.debrid = tokenStore.get(cfg.debridRef);
  }

  console.log('\n[Dubra] â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
  console.log('ID recebido:', id);

  const parts   = id.split(':');
  const imdbId  = parts[0];
  const season  = parts[1] ? parseInt(parts[1]) : null;
  const episode = parts[2] ? parseInt(parts[2]) : null;

  console.log('IMDB:', imdbId);
  console.log('Tipo:', type);
  if (season)  console.log('Temporada:', season, '| EpisÃ³dio:', episode);

  // Cache hit
  const cached = cfg.cache ? cache.getStreams(type, id) : null;
  if (cached) {
    console.log('[Dubra] Cache hit â€”', cached.length, 'streams');
    if (cfg.prefetch && type === 'series' && season && episode) prefetchNext(imdbId, season, episode, cfg);
    return { streams: cached };
  }

  // Busca tÃ­tulo PT-BR via TMDB
  const titleInfo = await getTitleInfo(imdbId, type);
  console.log('TÃ­tulo:', titleInfo.titlePtBr || titleInfo.title || imdbId);

  // Busca em todas as fontes em paralelo
  const streams = await fetchAll(imdbId, type, season, episode, titleInfo, cfg);

  // Prefetch prÃ³ximo episÃ³dio
  if (cfg.prefetch && type === 'series' && season && episode) {
    prefetchNext(imdbId, season, episode, cfg);
  }

  // Cache
  if (cfg.cache) cache.setStreams(type, id, streams, isActive(titleInfo));

  return { streams };
}

// â”€â”€â”€ Busca principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function fetchAll(imdbId, type, season, episode, titleInfo, cfg) {
  const softPtSources = new Set(['BrazucaTorrents', 'BeTor', 'BluDV', 'Comando', 'StarckFilmes', 'TorrentDosFilmes', 'RedeTorrent', 'VacaTorrent']);

  const sourceFns = [];

  if (cfg.sources.torrentio) {
    sourceFns.push(torrentio.getStreams(imdbId, type, season, episode, cfg));
  }
  if (cfg.sources.brazuca) {
    sourceFns.push(brazuca.getStreams(imdbId, type, season, episode, cfg));
  }
  if (cfg.sources.betor) {
    sourceFns.push(betor.getStreams(imdbId, type, season, episode, titleInfo, cfg));
  }
  if (cfg.sources.indexer) {
    sourceFns.push(indexer.getStreams(titleInfo, type, season, episode, cfg));
  }
  if (!sourceFns.length) return [];

  const results = await raceAll(sourceFns, cfg.timeout + 2000);

  let all = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value || []);

  // TorrentsDB como fallback secundÃ¡rio: sÃ³ consulta quando base retorna pouco.
  if (cfg.sources.torrentsdb) {
    const fallbackThreshold = Math.max(2, Math.min(4, cfg.limitPerSource || 5));
    if (all.length < fallbackThreshold) {
      console.log('[Dubra] TorrentsDB fallback acionado (base:', all.length, ')');
      const tdbResults = await raceAll(
        [torrentsdb.getStreams(imdbId, type, season, episode, cfg)],
        cfg.timeout + 2000
      );
      const tdbStreams = tdbResults
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value || []);
      all = all.concat(tdbStreams);
    }
  }

  // PadrÃ£o: sÃ³ PT-BR. Opcional: permitir tambÃ©m idioma original.
  if (!cfg.allowOriginal) {
    // Fontes BR: filtro leve (remove sÃ³ o claramente nÃ£o-PT-BR).
    // Fontes mistas: mantÃ©m filtro mais estrito.
    all = all.filter(s => {
      if (softPtSources.has(s._source)) return !isClearlyNonPtBr(s);
      return isPtBrStream(s) || isLikelyPtBrFromTrustedSource(s);
    });
  }

  // Para episÃ³dios, nÃ£o aceita pack de temporada e sÃ³ mantÃ©m episÃ³dio compatÃ­vel.
  if (type === 'series' && season && episode) {
    const beforeEpisodeFilter = all.length;
    const episodeFiltered = all.filter(s => {
      const title = s._title || s.name || s.description || '';
      const allowPack = cfg.packMode === 'smart' && typeof s.fileIdx === 'number';
      return passesEpisodeFilter(title, season, episode, { allowPack });
    });

    // Hard guard: para episÃ³dio, sem fileIdx sÃ³ passa se tiver SxE explÃ­cito em algum campo.
    const s = Number(season);
    const e = Number(episode);
    const sxea = new RegExp(`\\bs0?${s}\\s*e0?${e}\\b`, 'i');
    const sxeb = new RegExp(`\\b${s}\\s*x\\s*0?${e}\\b`, 'i');
    const sxec = new RegExp(`\\bs${String(s).padStart(2, '0')}e${String(e).padStart(2, '0')}\\b`, 'i');
    all = episodeFiltered.filter(stream => {
      if (typeof stream.fileIdx === 'number') return true;
      const blob = [
        stream._title || '',
        stream.name || '',
        stream.description || '',
        stream.filename || '',
        stream.behaviorHints?.filename || '',
      ].join(' ');
      return sxea.test(blob) || sxeb.test(blob) || sxec.test(blob);
    });

    // Fallback de robustez: se hard-guard zerar tudo, usa o filtro de episÃ³dio sem hard-guard.
    if (!all.length && episodeFiltered.length) {
      console.log('[Dubra] Hard-guard zerou resultados; aplicando fallback do filtro de episÃ³dio.');
      all = episodeFiltered;
    }

    if (beforeEpisodeFilter !== all.length) {
      console.log('[Dubra] Filtro de episÃ³dio removeu', (beforeEpisodeFilter - all.length), 'itens');
    }
  }

  // Quality behavior: all | strict | fallback
  all = applyQualityBehavior(all, cfg);

  // Filtros de codec/fonte (qualidade jÃ¡ tratada por behavior acima)
  all = all.filter(s => {
    const title = s._title || s.name || s.description || '';
    return (
      passesCodecFilter(title, cfg) &&
      passesSrcFilter(title, cfg)
    );
  });

  // Deduplica, pontua e ordena
  all = cfg.dedup === false ? all : deduplicate(all, { dedupBySize: cfg.dedupBySize !== false });
  all = applyScores(all, cfg);
  all = sortAndClean(all);

  // Limite total
  all = all.slice(0, cfg.limitTotal);

  // Debrid
  if (cfg.debrid) all = await enrichWithDebrid(all, cfg.debrid);

  console.log('[Dubra] Total final:', all.length, 'streams');
  return all;
}

// â”€â”€â”€ Prefetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const prefetching = new Set();

function prefetchNext(imdbId, season, episode, cfg) {
  const nextEp  = episode + 1;
  const key     = imdbId + ':' + season + ':' + nextEp;
  if (prefetching.has(key) || cache.getStreams('series', key)) return;

  prefetching.add(key);
  setImmediate(async () => {
    try {
      console.log('[Prefetch] S' + String(season).padStart(2,'0') + 'E' + String(nextEp).padStart(2,'0') + ' de ' + imdbId);
      const titleInfo = await getTitleInfo(imdbId, 'series');
      const streams   = await fetchAll(imdbId, 'series', season, nextEp, titleInfo, cfg);
      cache.setStreams('series', key, streams, true);
    } catch { /* silencioso */ }
    finally  { prefetching.delete(key); }
  });
}

// â”€â”€â”€ Servidor Express + SDK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PORT    = parseInt(process.env.PORT || '7000');
const HOST    = process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + PORT;

const app = express();
app.set('trust proxy', true);
const addonInterface = builder.getInterface();

// â”€â”€â”€ Middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.use(express.json());

// CORS â€” requerido por Stremio
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// â”€â”€â”€ Rotas Stremio (manifest.json, stream/:type/:id.json) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Manifesto padrÃ£o e configurado.
// Aceita:
// /manifest.json
// /quality~1080p/codec~h265/src~webdl/manifest.json
// /quality-1080p/codec-h265/src-webdl/manifest.json
app.get(/^(?:\/(.*))?\/manifest\.json$/, (req, res) => {
  res.json(manifest);
});

// Stream handler padrÃ£o e configurado.
// Quando o manifest Ã© instalado por um path configurado, o Stremio chama:
// /quality~.../stream/movie/tt123.json
app.get(/^(?:\/(.*))?\/stream\/(movie|series)\/(.+)\.json$/, async (req, res) => {
  try {
    const configPath = req.params[0] ? '/' + req.params[0] : '';
    const type = req.params[1];
    const id = req.params[2];

    const cfg = parseConfig(configPath);
    let result = await handleStream(type, id, cfg);

    // Fallback de compatibilidade entre apps:
    // quando combinaÃ§Ãµes muito restritivas zerarem tudo, tenta uma busca mais permissiva.
    if (!result?.streams?.length && configPath) {
      console.log('[Dubra] Zero streams com config atual, aplicando fallback de compatibilidade:', configPath);
      const rescueCfg = buildRescueConfig(cfg);
      const rescue = await handleStream(type, id, rescueCfg);
      if (rescue?.streams?.length) {
        console.log('[Dubra] Fallback de compatibilidade recuperou', rescue.streams.length, 'streams');
        result = rescue;
      }
    }

    res.json(result);
  } catch (e) {
    console.error('[ERROR] Stream handler:', e.message);
    res.json({ streams: [] });
  }
});

// â”€â”€â”€ Rotas Customizadas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// PÃ¡gina de configuraÃ§Ã£o
app.get('/configure', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  // URL pÃºblica/manual. Use PUBLIC_URL quando publicar no Render.
  // Em localhost SEMPRE usa http e preserva a porta, porque o Stremio falha com https://localhost.
  let baseUrl = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '';
  if (!baseUrl) {
    const host = req.get('host') || ('localhost:' + PORT);
    const isLocal = /^localhost(?::\d+)?$/.test(host) || /^127\.0\.0\.1(?::\d+)?$/.test(host);
    const proto = isLocal ? 'http' : (req.get('x-forwarded-proto') || req.protocol || 'http');
    baseUrl = proto + '://' + host;
  }
  baseUrl = baseUrl.replace(/\/$/, '');

  res.send(configurePage(baseUrl, getStatus()));
});

// Status do addon
app.get('/status', (req, res) => {
  res.json({
    name:    'Dubra',
    version: manifest.version,
    uptime:  Math.round(process.uptime()),
    cache:   cache.stats(),
    health:  getStatus(),
  });
});

// Teste de token debrid
app.get('/debrid-test', async (req, res) => {
  const { service, key } = req.query;
  if (!service || !key) return res.json({ ok: false });
  try {
    const { enrichWithDebrid } = require('./debrid');
    const result = await enrichWithDebrid(
      [{ infoHash: '0'.repeat(40), name: 'test', description: '', behaviorHints: {} }],
      { service, apiKey: key }
    );
    res.json({ ok: !!result[0]?.url });
  } catch {
    res.json({ ok: false });
  }
});

app.post('/debrid-test', async (req, res) => {
  const service = req.body?.service;
  const key = req.body?.key;
  if (!service || !key) return res.json({ ok: false });
  try {
    const { enrichWithDebrid } = require('./debrid');
    const result = await enrichWithDebrid(
      [{ infoHash: '0'.repeat(40), name: 'test', description: '', behaviorHints: {} }],
      { service, apiKey: key }
    );
    res.json({ ok: !!result[0]?.url });
  } catch {
    res.json({ ok: false });
  }
});

app.post('/debrid-token', (req, res) => {
  const service = req.body?.service;
  const key = req.body?.key;
  if (!service || !key) return res.json({ ok: false });
  if (!['rd', 'torbox', 'ad', 'pm'].includes(service)) return res.json({ ok: false });

  const out = tokenStore.put(service, key);
  res.json({ ok: true, ref: out.ref, ttlSec: out.ttlSec });
});

app.get('/scrapers-test', async (req, res) => {
  const imdbId = req.query.imdb || 'tt0133093';
  const type = req.query.type === 'series' ? 'series' : 'movie';
  const season = req.query.season ? parseInt(req.query.season, 10) : null;
  const episode = req.query.episode ? parseInt(req.query.episode, 10) : null;
  const cfg = parseConfig(req.query.configPath ? String(req.query.configPath) : '');
  const titleInfo = await getTitleInfo(imdbId, type);

  const tests = [
    { name: 'torrentio', run: () => torrentio.getStreams(imdbId, type, season, episode, cfg) },
    { name: 'brazuca', run: () => brazuca.getStreams(imdbId, type, season, episode, cfg) },
    { name: 'betor', run: () => betor.getStreams(imdbId, type, season, episode, titleInfo, cfg) },
    { name: 'indexer', run: () => indexer.getStreams(titleInfo, type, season, episode, cfg) },
    { name: 'torrentsdb', run: () => torrentsdb.getStreams(imdbId, type, season, episode, cfg) },
  ];

  const out = [];
  for (const t of tests) {
    const t0 = Date.now();
    try {
      const streams = await t.run();
      out.push({ scraper: t.name, ok: true, ms: Date.now() - t0, count: streams.length });
    } catch (e) {
      out.push({ scraper: t.name, ok: false, ms: Date.now() - t0, count: 0, error: e.message });
    }
  }

  res.json({
    imdbId, type, season, episode,
    testedAt: new Date().toISOString(),
    results: out,
  });
});

// â”€â”€â”€ Inicia servidor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.listen(PORT, () => {
  startMonitor();
  setInterval(tokenStore.cleanup, 10 * 60 * 1000);

  const ip = getLocalIP();
  console.log('\nðŸ”¥  Dubra rodando!\n');
  console.log('ðŸ“¡  Manifest:      ' + HOST + '/manifest.json');
  console.log('ðŸ“º  Rede local:    http://' + ip + ':' + PORT + '/manifest.json');
  console.log('âš™ï¸   ConfiguraÃ§Ã£o:  ' + HOST + '/configure');
  console.log('ðŸ“Š  Status:        ' + HOST + '/status\n');
});

function getLocalIP() {
  try {
    const nets = require('os').networkInterfaces();
    for (const ifaces of Object.values(nets)) {
      for (const i of ifaces) {
        if (i.family === 'IPv4' && !i.internal) return i.address;
      }
    }
  } catch {}
  return 'localhost';
}


