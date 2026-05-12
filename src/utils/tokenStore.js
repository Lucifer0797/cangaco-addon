'use strict';

const crypto = require('crypto');

const TTL_MS = 24 * 60 * 60 * 1000;
const store = new Map();

function put(service, apiKey) {
  const ref = crypto.randomBytes(12).toString('hex');
  store.set(ref, {
    service,
    apiKey,
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
