'use strict';
/**
 * cache.js
 * Cache em memória com TTL diferenciado por tipo.
 * TMDB persiste em disco (best-effort — Render tem filesystem efêmero).
 */

const NodeCache = require('node-cache');
const fs  = require('fs');
const path = require('path');

const TTL = {
  movie:          60 * 60 * 24,
  series_active:  60 * 30,
  series_ended:   60 * 60 * 12,
  tmdb:           60 * 60 * 24 * 7,
  source_score:   60 * 60 * 24,
  health:         60 * 5,
};

const mem = new NodeCache({ checkperiod: 300 });

// TMDB disk cache
const TMDB_FILE = path.join(__dirname, '../../.tmdb-cache.json');
let tmdbDisk = {};

try {
  if (fs.existsSync(TMDB_FILE)) {
    tmdbDisk = JSON.parse(fs.readFileSync(TMDB_FILE, 'utf8'));
  }
} catch { tmdbDisk = {}; }

function saveTmdb() {
  try { fs.writeFileSync(TMDB_FILE, JSON.stringify(tmdbDisk), 'utf8'); } catch {}
}

// ─── Streams ──────────────────────────────────────────────────────────────────

function getStreams(type, id) {
  return mem.get('s:' + type + ':' + id) || null;
}

function setStreams(type, id, streams, isActive) {
  let ttl;
  if (type === 'movie')        ttl = TTL.movie;
  else if (isActive !== false) ttl = TTL.series_active;
  else                         ttl = TTL.series_ended;
  mem.set('s:' + type + ':' + id, streams, ttl);
}

// ─── TMDB ─────────────────────────────────────────────────────────────────────

function getTmdb(imdbId) {
  const m = mem.get('t:' + imdbId);
  if (m) return m;
  const d = tmdbDisk[imdbId];
  if (d && d.exp > Date.now()) {
    mem.set('t:' + imdbId, d.data, TTL.tmdb);
    return d.data;
  }
  return null;
}

function setTmdb(imdbId, data) {
  mem.set('t:' + imdbId, data, TTL.tmdb);
  tmdbDisk[imdbId] = { data, exp: Date.now() + TTL.tmdb * 1000 };
  saveTmdb();
}

// ─── Score de confiabilidade por fonte ───────────────────────────────────────

function getScore(source)   { return mem.get('sc:' + source) ?? 1.0; }
function hitSource(source)  { mem.set('sc:' + source, Math.min(1.0, getScore(source) + 0.05), TTL.source_score); }
function missSource(source) {
  const s = Math.max(0.1, getScore(source) - 0.2);
  mem.set('sc:' + source, s, TTL.source_score);
  console.warn('[Cache] Score ' + source + ' -> ' + s.toFixed(2));
}

// ─── Health check ─────────────────────────────────────────────────────────────

function getHealth(source)        { return mem.get('h:' + source); }
function setHealth(source, state) { mem.set('h:' + source, state, TTL.health); }

// ─── Stats ────────────────────────────────────────────────────────────────────

function stats() {
  const s = mem.getStats();
  return { keys: mem.keys().length, hits: s.hits, misses: s.misses };
}

module.exports = {
  getStreams, setStreams,
  getTmdb, setTmdb,
  getScore, hitSource, missSource,
  getHealth, setHealth,
  stats,
};
