'use strict';
/**
 * health.js
 * Monitora disponibilidade das fontes.
 * Desativa fontes offline automaticamente e reativa quando voltam.
 */

const { http } = require('./http');
const cache    = require('./cache');

const ENDPOINTS = {
  Torrentio:       'https://torrentio.strem.fun/manifest.json',
  BrazucaTorrents: 'https://94c8cb9f702d-brazuca-torrents.baby-beamup.club/manifest.json',
  BeTor:           'https://catalogo.betor.top/',
  Indexer:         'https://vlambdas.oci.darklyn.online/indexers',
  TorrentsDB:      'https://torrentsdb.com/',
};

const status = {};
const failStreak = {};

async function checkSource(name, url) {
  try {
    const start = Date.now();
    await http.get(url, { timeout: 5000 });
    const ms = Date.now() - start;
    failStreak[name] = 0;
    const state = ms >= 3500 ? 'unstable' : 'online';
    status[name] = { online: true, state, ms, checkedAt: Date.now() };
    cache.setHealth(name, { online: true, state, ms });
    return true;
  } catch {
    failStreak[name] = (failStreak[name] || 0) + 1;
    const offline = failStreak[name] >= 3;
    const state = offline ? 'offline' : 'unstable';
    status[name] = { online: !offline, state, ms: null, checkedAt: Date.now() };
    cache.setHealth(name, { online: !offline, state, ms: null });
    console.warn('[Health] ' + name + ' ' + state);
    return false;
  }
}

async function checkAll() {
  await Promise.allSettled(
    Object.entries(ENDPOINTS).map(([name, url]) => checkSource(name, url))
  );
}

function isOnline(name) {
  const h = cache.getHealth(name);
  if (h) return h.online;
  return true; // assume online se não checou ainda
}

function getStatus() {
  return Object.entries(ENDPOINTS).reduce((acc, [name]) => {
    const h = cache.getHealth(name);
    acc[name] = h || { online: true, state: 'online', ms: null };
    return acc;
  }, {});
}

// Checa ao iniciar e a cada 5 minutos
function startMonitor() {
  checkAll();
  setInterval(checkAll, 5 * 60 * 1000);
}

module.exports = { startMonitor, isOnline, getStatus, checkAll };
