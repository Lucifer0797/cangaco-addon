'use strict';
/**
 * config.js
 * Lê a configuração embutida no path da URL do manifest.
 *
 * Formato do path:
 * /quality~1080p,4k,720p/codec~h265,h264/src~remux,webdl/behavior~all/limit~5,20/timeout~8/rd=TOKEN/manifest.json
 *
 * Todos os segmentos são opcionais — defaults aplicados se ausentes.
 */

const DEFAULTS = {
  quality:  ['4k', '1440p', '1080p', '720p'],
  qualityOrder: ['1080p', '1440p', '4k', '720p'],
  behavior: 'all',           // all | fallback | strict
  packMode: 'smart',         // strict | smart
  sortBy: 'balanced',        // balanced | quality | seeds | size_asc | size_desc
  codec:    ['h265', 'h264'],
  codecOrder: ['h265', 'h264'],
  src:      ['remux', 'bluray', 'webdl'],
  srcOrder: ['remux', 'bluray', 'webdl'],
  limitPerSource: 5,
  limitTotal: 20,
  timeout: 8000,
  sources: {
    betor:     true,
    thepirata: true,
    torrentio: true,
    brazuca:   true,
    torrentsdb:false,
  },
  allowOriginal: false,
  debug: false,
  formatterPreset: 'compact', // compact | detailed | technical | custom
  formatterName: '',
  formatterDesc: '',
  cache:       true,
  prefetch:    false,
  dedup:       true,
  dedupBySize: true,
  debridRef:   null,
  debrid: null,  // { service: 'rd'|'torbox'|'ad'|'pm', apiKey: '...' }
};

/**
 * Parseia o path da URL e retorna configuração.
 * @param {string} urlPath - ex: "/quality~1080p,720p/rd=TOKEN/manifest.json"
 * @returns {object} config
 */
function parseConfig(urlPath) {
  const cfg = JSON.parse(JSON.stringify(DEFAULTS));
  if (!urlPath) return cfg;

  const segments = urlPath.split('/').filter(Boolean);

  for (const seg of segments) {
    if (seg === 'manifest.json') continue;

    // quality~4k,1080p,720p
    if (seg.startsWith('quality~') || seg.startsWith('quality-')) {
      const vals = seg.slice(8).split(',').filter(Boolean);
      if (vals.length) {
        cfg.quality = vals;
        cfg.qualityOrder = vals;
      }
      continue;
    }

    // behavior~all|fallback|strict
    if (seg.startsWith('behavior~') || seg.startsWith('behavior-')) {
      const v = seg.slice(9);
      if (['all', 'fallback', 'strict'].includes(v)) cfg.behavior = v;
      continue;
    }

    // pack~strict|smart
    if (seg.startsWith('pack~') || seg.startsWith('pack-')) {
      const v = seg.slice(5);
      if (['strict', 'smart'].includes(v)) cfg.packMode = v;
      continue;
    }

    // sort~balanced|quality|seeds
    if (seg.startsWith('sort~') || seg.startsWith('sort-')) {
      const v = seg.slice(5);
      if (['balanced', 'quality', 'seeds', 'size_asc', 'size_desc'].includes(v)) cfg.sortBy = v;
      continue;
    }

    // codec~h265,h264
    if (seg.startsWith('codec~') || seg.startsWith('codec-')) {
      const vals = seg.slice(6).split(',').filter(Boolean);
      if (vals.length) { cfg.codec = vals; cfg.codecOrder = vals; }
      continue;
    }

    // src~remux,bluray,webdl
    if (seg.startsWith('src~') || seg.startsWith('src-')) {
      const vals = seg.slice(4).split(',').filter(Boolean);
      if (vals.length) { cfg.src = vals; cfg.srcOrder = vals; }
      continue;
    }

    // limit~5,20
    if (seg.startsWith('limit~') || seg.startsWith('limit-')) {
      const parts = seg.slice(6).split(',');
      if (parts[0]) cfg.limitPerSource = Math.min(20, Math.max(1, parseInt(parts[0]) || 5));
      if (parts[1]) cfg.limitTotal     = Math.min(50, Math.max(5, parseInt(parts[1]) || 20));
      continue;
    }

    // timeout~8
    if (seg.startsWith('timeout~') || seg.startsWith('timeout-')) {
      const v = parseInt(seg.slice(8));
      if (v >= 3 && v <= 20) cfg.timeout = v * 1000;
      continue;
    }

    // sources~betor,thepirata,torrentio,brazuca,torrentsdb
    if (seg.startsWith('sources~') || seg.startsWith('sources-')) {
      const vals = seg.slice(8).split(',').filter(Boolean);
      cfg.sources.betor     = vals.includes('betor');
      cfg.sources.thepirata = vals.includes('thepirata') || vals.includes('betor');
      cfg.sources.torrentio = vals.includes('torrentio');
      cfg.sources.brazuca   = vals.includes('brazuca');
      cfg.sources.torrentsdb = vals.includes('torrentsdb');
      continue;
    }

    // Debrid: rd=TOKEN | torbox=TOKEN | ad=TOKEN | pm=TOKEN
    const debridMatch = seg.match(/^(rd|torbox|ad|pm)=(.+)$/);
    if (debridMatch) {
      cfg.debrid = { service: debridMatch[1], apiKey: debridMatch[2] };
      continue;
    }

    // Debrid reference segura: dref~abc123
    if (seg.startsWith('dref~') || seg.startsWith('dref-')) {
      const ref = seg.slice(5).trim();
      if (ref) cfg.debridRef = ref;
      continue;
    }

    // flags~cache0,prefetch0,dedup0,dedupsize0,original1,debug1
    if (seg.startsWith('flags~') || seg.startsWith('flags-')) {
      const vals = seg.slice(6).split(',').filter(Boolean);
      if (vals.includes('cache0')) cfg.cache = false;
      if (vals.includes('prefetch0')) cfg.prefetch = false;
      if (vals.includes('dedup0')) cfg.dedup = false;
      if (vals.includes('dedupsize0')) cfg.dedupBySize = false;
      if (vals.includes('original1')) cfg.allowOriginal = true;
      if (vals.includes('debug1')) cfg.debug = true;
      if (vals.includes('debug0')) cfg.debug = false;
      continue;
    }

    // fmt~compact|detailed|technical|custom
    if (seg.startsWith('fmt~') || seg.startsWith('fmt-')) {
      const v = seg.slice(4);
      if (['compact', 'detailed', 'technical', 'custom'].includes(v)) cfg.formatterPreset = v;
      continue;
    }

    // fmtn~<urlencoded-template>
    if (seg.startsWith('fmtn~') || seg.startsWith('fmtn-')) {
      try { cfg.formatterName = decodeURIComponent(seg.slice(5)); } catch {}
      continue;
    }

    // fmtd~<urlencoded-template>
    if (seg.startsWith('fmtd~') || seg.startsWith('fmtd-')) {
      try { cfg.formatterDesc = decodeURIComponent(seg.slice(5)); } catch {}
      continue;
    }
  }

  return cfg;
}
module.exports = { parseConfig, DEFAULTS };
