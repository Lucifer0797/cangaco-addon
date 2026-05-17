'use strict';
/**
 * tmdb.js
 * Busca título PT-BR via TMDB. Cache em memória + disco.
 */

const { http } = require('./http');
const cache    = require('./cache');

const BASE    = 'https://api.themoviedb.org/3';
let apiKey = process.env.TMDB_API_KEY || '';
let tmdbDisabled = false;

async function getTitleInfo(imdbId, type) {
  const cached = cache.getTmdb(imdbId);
  if (cached) return cached;

  if (!apiKey || tmdbDisabled) {
    const fb = fallback(imdbId);
    cache.setTmdb(imdbId, fb);
    return fb;
  }

  try {
    const mediaType = type === 'series' ? 'tv' : 'movie';
    const params = { external_source: 'imdb_id', language: 'pt-BR' };
    if (apiKey) params.api_key = apiKey;

    const res = await http.get(BASE + '/find/' + imdbId, { params, timeout: 6000 });
    const results = res.data[mediaType + '_results'] || [];

    if (!results.length) return fallback(imdbId);

    const item = results[0];
    const info = {
      imdbId,
      title:         item.title || item.name || '',
      titlePtBr:     item.title || item.name || '',
      originalTitle: item.original_title || item.original_name || '',
      year:          parseInt((item.release_date || item.first_air_date || '0000').slice(0, 4)),
      status:        item.status || '',
    };

    cache.setTmdb(imdbId, info);
    return info;
  } catch (err) {
    if (err.response?.status === 401) {
      tmdbDisabled = true;
      console.warn('[TMDB] API key inválida/ausente. TMDB desativado nesta sessão.');
    } else {
      console.warn('[TMDB] Erro para ' + imdbId + ':', err.message);
    }
    const fb = fallback(imdbId);
    cache.setTmdb(imdbId, fb);
    return fb;
  }
}

function isActive(info) {
  if (!info || !info.status) return true;
  return !['ended', 'canceled', 'cancelled'].includes(info.status.toLowerCase());
}

function fallback(imdbId) {
  return { imdbId, title: '', titlePtBr: '', originalTitle: '', year: 0, status: '' };
}

function setApiKey(nextKey) {
  apiKey = String(nextKey || '').trim();
  tmdbDisabled = !apiKey;
}

function hasApiKey() {
  return !!apiKey;
}

async function testApiKey(nextKey) {
  const key = String(nextKey || '').trim();
  if (!key) return { ok: false, reason: 'empty' };
  try {
    const res = await http.get(BASE + '/configuration', {
      params: { api_key: key },
      timeout: 6000,
    });
    return { ok: !!res.data?.images };
  } catch (err) {
    return { ok: false, reason: err.response?.status ? String(err.response.status) : 'request_failed' };
  }
}

module.exports = { getTitleInfo, isActive, setApiKey, hasApiKey, testApiKey };
