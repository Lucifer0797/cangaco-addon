'use strict';
/**
 * tmdb.js
 * Busca título PT-BR via TMDB. Cache em memória + disco.
 */

const { http } = require('./http');
const cache    = require('./cache');

const BASE    = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY || '';
let tmdbDisabled = false;

async function getTitleInfo(imdbId, type) {
  const cached = cache.getTmdb(imdbId);
  if (cached) return cached;

  if (!API_KEY || tmdbDisabled) {
    const fb = fallback(imdbId);
    cache.setTmdb(imdbId, fb);
    return fb;
  }

  try {
    const mediaType = type === 'series' ? 'tv' : 'movie';
    const params = { external_source: 'imdb_id', language: 'pt-BR' };
    if (API_KEY) params.api_key = API_KEY;

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

module.exports = { getTitleInfo, isActive };
