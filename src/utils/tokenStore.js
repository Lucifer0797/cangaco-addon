'use strict';

const crypto = require('crypto');

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ITEMS = 1000;
const MAX_TOKEN_LEN = 512;
const store = new Map();

function put(service, apiKey) {
  const token = String(apiKey || '').trim();
  if (!token || token.length > MAX_TOKEN_LEN) return null;

  if (store.size >= MAX_ITEMS) {
    // remove entradas expiradas primeiro
    cleanup();
    // se ainda lotado, remove a mais antiga
    if (store.size >= MAX_ITEMS) {
      const firstKey = store.keys().next().value;
      if (firstKey) store.delete(firstKey);
    }
  }

  const ref = crypto.randomBytes(12).toString('hex');
  store.set(ref, {
    service,
    apiKey: token,
    exp: Date.now() + TTL_MS,
  });
  return { ref, ttlSec: Math.floor(TTL_MS / 1000) };
}

function get(ref) {
  const item = store.get(ref);
  if (!item) return null;
  if (item.exp < Date.now()) {
    store.delete(ref);
    return null;
  }
  return { service: item.service, apiKey: item.apiKey };
}

function cleanup() {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.exp < now) store.delete(k);
  }
}

module.exports = { put, get, cleanup };
