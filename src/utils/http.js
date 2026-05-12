'use strict';
/**
 * http.js
 * Axios com retry, backoff e rate limiter para o Torrentio.
 */

const axios      = require('axios');
const axiosRetry = require('axios-retry').default || require('axios-retry');

const http = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
    'Accept': 'application/json, text/html, */*',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  },
});

axiosRetry(http, {
  retries: 2,
  retryDelay: (n) => n * 1500,
  retryCondition: (err) =>
    axiosRetry.isNetworkError(err) ||
    [500, 502, 503, 504].includes(err.response?.status),
  onRetry: (n, err, cfg) =>
    console.warn('[HTTP] Retry ' + n + ' para ' + cfg.url + ': ' + err.message),
});

// Rate limiter para Torrentio
const queue = [];
let running = 0;
const MAX = 2;
const DELAY = 350;

function torrentioGet(url, cfg) {
  return new Promise((resolve, reject) => {
    queue.push({ url, cfg, resolve, reject });
    flush();
  });
}

function flush() {
  if (running >= MAX || !queue.length) return;
  running++;
  const { url, cfg, resolve, reject } = queue.shift();
  http.get(url, cfg || {})
    .then(resolve).catch(reject)
    .finally(() => {
      setTimeout(() => { running--; flush(); }, DELAY);
    });
}

/**
 * Executa promises em paralelo com timeout individual por promise.
 */
function raceAll(promises, timeoutMs) {
  return Promise.allSettled(
    promises.map(p =>
      Promise.race([
        p,
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error('timeout')), timeoutMs)
        ),
      ])
    )
  );
}

module.exports = { http, torrentioGet, raceAll };
