'use strict';
/**
 * health.js
 * Monitora disponibilidade das fontes e aplica cooldown progressivo por falhas.
 */

const { http } = require('./http');
const cache = require('./cache');

const ENDPOINTS = {
  Torrentio: 'https://torrentio.strem.fun/manifest.json',
  BrazucaTorrents: 'https://94c8cb9f702d-brazuca-torrents.baby-beamup.club/manifest.json',
  BeTor: 'https://catalogo.betor.top/',
  ThepirataFilmes: 'https://www.thepiratafilmes.online/',
  TorrentsDB: 'https://torrentsdb.com/',
};

const failStreak = {};
const blockedUntil = {};

function nowMs() { return Date.now(); }

function computeBackoffMs(streak) {
  if (streak >= 12) return 10 * 60 * 1000;
  if (streak >= 8) return 5 * 60 * 1000;
  if (streak >= 5) return 2 * 60 * 1000;
  if (streak >= 3) return 60 * 1000;
  return 0;
}

function canQuery(name) {
  const until = blockedUntil[name] || 0;
  return nowMs() >= until;
}

function noteSuccess(name) {
  failStreak[name] = 0;
  blockedUntil[name] = 0;
}

function noteFailure(name) {
  failStreak[name] = (failStreak[name] || 0) + 1;
  const wait = computeBackoffMs(failStreak[name]);
  if (wait > 0) blockedUntil[name] = nowMs() + wait;
}

async function checkSource(name, url) {
  try {
    const start = Date.now();
    await http.get(url, { timeout: 5000 });
    const ms = Date.now() - start;
    noteSuccess(name);
    const state = ms >= 3500 ? 'unstable' : 'online';
    cache.setHealth(name, { online: true, state, ms });
    return true;
  } catch {
    noteFailure(name);
    const offline = (failStreak[name] || 0) >= 3;
    const state = offline ? 'offline' : 'unstable';
    cache.setHealth(name, { online: !offline, state, ms: null });
    return false;
  }
}

async function checkAll() {
  await Promise.allSettled(
    Object.entries(ENDPOINTS).map(([name, url]) => checkSource(name, url))
  );
}

function isOnline(name) {
  if (!canQuery(name)) return false;
  const h = cache.getHealth(name);
  if (h) return h.online;
  return true;
}

function getStatus() {
  return Object.entries(ENDPOINTS).reduce((acc, [name]) => {
    const h = cache.getHealth(name) || { online: true, state: 'online', ms: null };
    acc[name] = {
      ...h,
      failStreak: failStreak[name] || 0,
      blockedUntil: blockedUntil[name] || 0,
      blocked: !canQuery(name),
    };
    return acc;
  }, {});
}

function startMonitor() {
  checkAll();
  setInterval(checkAll, 5 * 60 * 1000);
}

module.exports = { startMonitor, isOnline, getStatus, checkAll, canQuery, noteSuccess, noteFailure };
