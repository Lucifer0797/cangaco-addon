'use strict';
/**
 * filter.js
 * DetecÃ§Ã£o PT-BR, filtros de qualidade/codec/fonte e formataÃ§Ã£o AIOStreams.
 */

const PTBR_REGEX = /(portuguese|dual\s*portuguese|pt-br|ptbr|dublado|dual\s*audio|brazilian)/i;
const PTBR_AUDIO_REGEX = /(\bpt-?br\b|\bptbr\b|dublado|dual\s*audio|dual\s*portuguese|portuguese\s*(audio|dub)|brazilian\s*dub|multi\s*(audio)?\s*(com|with)?\s*(pt-?br|portuguese))/i;
const PTBR_SUBTITLE_ONLY_REGEX = /(legendado|legenda|subbed|subtitle|subs?|softsub|hardsub).{0,20}(pt-?br|ptbr|portuguese)/i;
const TRUSTED_BR_SOURCE_REGEX = /(Torrentio|BrazucaTorrents|BeTor|BluDV|Comando|StarckFilmes|TorrentDosFilmes|RedeTorrent|VacaTorrent)/i;
const FOREIGN_AUDIO_ONLY_REGEX = /(\beng(lish)?\b|\bita(liano)?\b|\bjap(anese)?\b|\besp(a[nÃ±]ol)?\b|\bfr(e|an[cÃ§]ais)?\b|\bde(utsch)?\b).{0,16}(audio|dub)/i;

// â”€â”€â”€ Mapeamentos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const RESOLUTION_MAP = {
  '2160p': '4k', '4k': '4k', 'uhd': '4k',
  '1080p': '1080p', 'fhd': '1080p',
  '720p': '720p', 'hd': '720p',
  '480p': '480p', 'sd': '480p',
  '360p': '360p',
};

const RESOLUTION_SCORE = { '4k': 5, '1080p': 4, '720p': 3, '480p': 2, '360p': 1 };

const CODEC_MAP = {
  'hevc': 'h265', 'h265': 'h265', 'x265': 'h265',
  'h264': 'h264', 'x264': 'h264', 'avc': 'h264',
  'av1': 'av1',
  'xvid': 'xvid', 'divx': 'xvid',
  'vc-1': 'vc1', 'vc1': 'vc1',
  'mpeg2': 'mpeg2', 'mpeg-2': 'mpeg2',
};

const SOURCE_MAP = {
  'remux': 'remux',
  'bluray': 'bluray', 'blu-ray': 'bluray', 'bdrip': 'bdrip', 'bdremux': 'remux',
  'web-dl': 'webdl', 'webdl': 'webdl',
  'webrip': 'webrip', 'web': 'webrip',
  'hdrip': 'hdrip', 'hdlight': 'hdrip',
  'hdtv': 'hdtv',
  'dvdrip': 'dvdrip', 'dvdscr': 'dvdrip',
  'cam': 'cam', 'ts': 'cam', 'tc': 'cam', 'scr': 'cam',
};

const SOURCE_SCORE = {
  remux: 10, bluray: 9, webdl: 8, webrip: 7,
  bdrip: 6, hdrip: 5, hdtv: 4, dvdrip: 3, cam: 0,
};

// â”€â”€â”€ DetecÃ§Ã£o PT-BR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function hasPtBrAudio(text) {
  return PTBR_AUDIO_REGEX.test(String(text || ''));
}

function isPtBrStream(s, opts) {
  const strictAudio = !!opts?.strictAudio;
  const text = [
    s.title || '', s.name || '', s.description || '',
    s.filename || '',
    (s.behaviorHints && s.behaviorHints.filename) || '',
  ].join(' ');
  if (strictAudio) return hasPtBrAudio(text);
  // Muitos releases BR vÃªm sÃ³ com "DUAL" no nome; aceita quando vier de fonte BR confiÃ¡vel.
  if (/\bdual\b/i.test(text) && TRUSTED_BR_SOURCE_REGEX.test(text) && !PTBR_SUBTITLE_ONLY_REGEX.test(text)) return true;
  if (PTBR_SUBTITLE_ONLY_REGEX.test(text) && !hasPtBrAudio(text)) return false;
  return PTBR_REGEX.test(text);
}

function isLikelyPtBrFromTrustedSource(s) {
  const text = [
    s.title || '', s.name || '', s.description || '',
    s.filename || '',
    (s.behaviorHints && s.behaviorHints.filename) || '',
  ].join(' ');
  if (!TRUSTED_BR_SOURCE_REGEX.test(text)) return false;
  if (PTBR_SUBTITLE_ONLY_REGEX.test(text)) return false;
  if (FOREIGN_AUDIO_ONLY_REGEX.test(text)) return false;
  return /\bdual\b/i.test(text) || /\bdub(bed|lado)?\b/i.test(text) || /\bportuguese\b/i.test(text);
}

function isClearlyNonPtBr(s) {
  const text = [
    s.title || '', s.name || '', s.description || '',
    s.filename || '',
    (s.behaviorHints && s.behaviorHints.filename) || '',
  ].join(' ');
  if (hasPtBrAudio(text)) return false;
  if (PTBR_SUBTITLE_ONLY_REGEX.test(text)) return true;
  if (FOREIGN_AUDIO_ONLY_REGEX.test(text)) return true;
  if (/\b(raw|subbed|softsub|hardsub)\b/i.test(text) && !/\bdual\b/i.test(text)) return true;
  return false;
}

function isPtBr(text) {
  return PTBR_REGEX.test(text || '');
}

function detectAudioType(text) {
  const t = text || '';
  if (/dual\s*portuguese/i.test(t) || /dual\s*audio/i.test(t) || /\bDUAL\b/i.test(t)) return 'dual';
  if (/multi/i.test(t)) return 'multi';
  if (/(dublado|dubbed|pt-br\s*dub|portuguese\s*dub)/i.test(t)) return 'dubbed';
  if (/(legendado|legenda|subbed|subtitle|subs?|softsub|hardsub|pt-br\s*sub|portuguese\s*sub)/i.test(t)) return 'subtitled';
  return 'original';
}

// â”€â”€â”€ ExtraÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function extractResolution(title) {
  const m = (title || '').match(/\b(2160p|4K|UHD|1080p|FHD|720p|480p|360p)\b/i);
  if (!m) return null;
  return RESOLUTION_MAP[m[1].toLowerCase()] || null;
}

function extractCodec(title) {
  const u = (title || '').toUpperCase();
  for (const [k, v] of Object.entries(CODEC_MAP)) {
    if (u.includes(k.toUpperCase())) return v;
  }
  return null;
}

function extractSource(title) {
  const u = (title || '').toUpperCase();
  for (const [k, v] of Object.entries(SOURCE_MAP)) {
    if (u.includes(k.toUpperCase())) return v;
  }
  return null;
}

function extractInfoHash(magnet) {
  if (!magnet) return null;
  const m = magnet.match(/xt=urn:btih:([a-f0-9]{40})/i);
  return m ? m[1].toLowerCase() : null;
}

function extractSeeds(text) {
  const m = (text || '').match(/ðŸ‘¤\s*(\d+)/);
  return m ? parseInt(m[1]) : null;
}

function extractSize(text) {
  const m = (text || '').match(/ðŸ’¾\s*([\d.,]+\s*(?:GB|MB))/i);
  return m ? m[1] : null;
}

function sizeToMb(sizeText) {
  if (!sizeText) return null;
  const m = String(sizeText).trim().match(/^([\d.,]+)\s*(GiB|MiB|GB|MB)$/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  if (!isFinite(n)) return null;
  const unit = m[2].toUpperCase();
  return unit === 'GB' || unit === 'GIB' ? n * 1024 : n;
}

// â”€â”€â”€ Score â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function passesEpisodeFilter(title, season, episode, opts) {
  if (!season || !episode) return true;
  const t = String(title || '').toLowerCase();
  const s = Number(season);
  const e = Number(episode);
  const sPad = String(s).padStart(2, '0');
  const ePad = String(e).padStart(2, '0');

  const exactA = new RegExp(`\\bs0?${s}\\s*e0?${e}\\b`, 'i').test(t);
  const exactB = new RegExp(`\\b${s}\\s*x\\s*0?${e}\\b`, 'i').test(t);
  const exactC = new RegExp(`\\bs${sPad}e${ePad}\\b`, 'i').test(t);
  const hasExact = exactA || exactB || exactC;

  const hasAnyEpisodePattern = /\bs\d{1,2}\s*e\d{1,2}\b/i.test(t) || /\b\d{1,2}\s*x\s*\d{1,2}\b/i.test(t);
  if (hasAnyEpisodePattern && !hasExact) return false;

  const strongPack = /(temporada\s*completa|season\s*\d+\s*complete|complete\s*season|pack\s*season|acesso\s*e\s*original|www\.bludv)/i.test(t);
  if (strongPack) {
    if (opts?.allowPack) return true;
    return false;
  }

  const weakSeasonOnly = /(1Âª\s*temporada|2Âª\s*temporada|3Âª\s*temporada|season\s*[0-9]{1,2}\b|temporada\s*[0-9]{1,2}\b)/i.test(t);
  const explicitEpisodeWord = /(epis[oÃ³]dio\s*[0-9]{1,2}|ep\s*[0-9]{1,2}\b)/i.test(t);
  if (weakSeasonOnly && !hasExact && !explicitEpisodeWord) return false;

  return true;
}

function qualityScore(title, seeds, cfg) {
  let score = 0;
  const res = extractResolution(title);
  const src = extractSource(title);
  const codec = extractCodec(title);
  const audioType = detectAudioType(title);

  // Score por posiÃ§Ã£o na ordem preferida do usuÃ¡rio
  if (res && cfg && cfg.qualityOrder) {
    const pos = cfg.qualityOrder.indexOf(res);
    score += pos >= 0 ? (cfg.qualityOrder.length - pos) * 1000 : 0;
  } else if (res) {
    score += (RESOLUTION_SCORE[res] || 0) * 1000;
  }

  if (src && cfg && cfg.srcOrder) {
    const pos = cfg.srcOrder.indexOf(src);
    score += pos >= 0 ? (cfg.srcOrder.length - pos) * 100 : (SOURCE_SCORE[src] || 0) * 10;
  } else if (src) {
    score += (SOURCE_SCORE[src] || 0) * 100;
  }

  if (codec && cfg && cfg.codecOrder) {
    const pos = cfg.codecOrder.indexOf(codec);
    score += pos >= 0 ? (cfg.codecOrder.length - pos) * 50 : 0;
  }

  if (audioType === 'dual')   score += 30;
  if (audioType === 'dubbed') score += 20;
  if (audioType === 'multi')  score += 25;

  if (seeds) score += Math.min(seeds, 500) * 0.1;

  return score;
}

// â”€â”€â”€ Filtros â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function passesQualityFilter(title, cfg) {
  if (!cfg || !cfg.quality || cfg.quality.length === 0) return true;
  const res = extractResolution(title);
  if (!res) return cfg.quality.includes('any');
  return cfg.quality.includes(res);
}

function passesCodecFilter(title, cfg) {
  if (!cfg || !cfg.codec || cfg.codec.length === 0) return true;
  const codec = extractCodec(title);
  if (!codec) return true; // sem info de codec: passa
  return cfg.codec.includes(codec);
}

function passesSrcFilter(title, cfg) {
  if (!cfg || !cfg.src || cfg.src.length === 0) return true;
  const src = extractSource(title);
  if (!src) return true; // sem info de fonte: passa
  return cfg.src.includes(src);
}

// â”€â”€â”€ FormataÃ§Ã£o AIOStreams â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SOURCE_ICONS = {
  Torrentio: 'ðŸŒ', BrazucaTorrents: 'ðŸ‡§ðŸ‡·', BluDV: 'ðŸ“€',
  Comando: 'ðŸ“¡', RedeTorrent: 'ðŸ•¸ï¸', StarckFilmes: 'â­',
  TorrentDosFilmes: 'ðŸŽ¬', VacaTorrent: 'ðŸ„',
};

function inferLanguageFlags(text) {
  const t = String(text || '');
  const flags = [];
  const push = (f) => { if (!flags.includes(f)) flags.push(f); };

  if (/(pt-br|ptbr|portuguese|dublado|dual\s*portuguese)/i.test(t)) push('\uD83C\uDDE7\uD83C\uDDF7');
  if (/(english|eng\b|en\b)/i.test(t)) push('\uD83C\uDDFA\uD83C\uDDF8');
  if (/(japanese|jap\b|jp\b|anime)/i.test(t)) push('\uD83C\uDDEF\uD83C\uDDF5');
  if (/(spanish|espanol|espaÃ±ol|latino)/i.test(t)) push('\uD83C\uDDEA\uD83C\uDDF8');
  if (/(french|francais|franÃ§ais|vf\b)/i.test(t)) push('\uD83C\uDDEB\uD83C\uDDF7');
  if (/(italian|italiano)/i.test(t)) push('\uD83C\uDDEE\uD83C\uDDF9');
  if (/(german|deutsch)/i.test(t)) push('\uD83C\uDDE9\uD83C\uDDEA');

  return flags;
}

function formatStreamName(title, audioType) {
  const res   = extractResolution(title);
  const src   = extractSource(title);
  const codec = extractCodec(title);

  const parts = [];
  if (res)   parts.push(res === '4k' ? '4K' : res);
  if (src)   parts.push(src.toUpperCase().replace('WEBDL', 'WEB-DL'));
  if (codec) parts.push(codec === 'h265' ? 'HEVC' : codec.toUpperCase());
  return parts.join(' ');
}

function formatStream({ title, infoHash, magnet, source, seeds, size, audioType, fileIdx, url, behaviorHints, filename }) {
  const hash = infoHash || extractInfoHash(magnet);
  if (!hash) return null;

  const type = audioType || detectAudioType(title || '') || 'dubbed';
  const icon = SOURCE_ICONS[source] || '\uD83C\uDF10';
  const flags = inferLanguageFlags(title || '');

  const desc = [
    icon + ' ' + source,
    size ? '\uD83D\uDCBE ' + size : '',
    seeds ? '\uD83D\uDC64 ' + seeds + ' seeds' : '',
    flags.length ? flags.join(' ') : '',
    (title || '').substring(0, 90),
  ].filter(Boolean).join('\n');

  return {
    name:        formatStreamName(title || '', type),
    description: desc,
    infoHash:    hash,
    ...(typeof fileIdx === 'number' ? { fileIdx } : {}),
    ...(url ? { url } : {}),
    behaviorHints: {
      bingeGroup:  'dubra-' + source,
      notWebReady: true,
      ...(behaviorHints || {}),
    },
    ...(filename ? { filename } : {}),
    _score:     0,
    _source:    source,
    _audioType: type,
    _title:     title || '',
    _size:      size || null,
    _sizeMb:    sizeToMb(size),
    _seeds:     typeof seeds === 'number' ? seeds : null,
  };
}

// â”€â”€â”€ DeduplicaÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function deduplicate(streams, opts) {
  const dedupBySize = opts?.dedupBySize !== false;
  const byHash = new Set();
  const bySize = new Set();
  return streams.filter(s => {
    if (!s || !s.infoHash) return false;
    if (byHash.has(s.infoHash)) return false;
    byHash.add(s.infoHash);
    if (dedupBySize && s._size) {
      if (bySize.has(s._size)) return false;
      bySize.add(s._size);
    }
    return true;
  });
}

// â”€â”€â”€ OrdenaÃ§Ã£o e limpeza â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function applyScores(streams, cfg) {
  const mode = cfg?.sortBy || 'balanced';
  return streams.map(s => ({
    ...s,
    _score: (() => {
      const seeds = typeof s._seeds === 'number' ? s._seeds : 0;
      const sizeMb = typeof s._sizeMb === 'number' ? s._sizeMb : null;
      if (mode === 'seeds') return seeds * 1000 + qualityScore(s._title, seeds, cfg) * 0.1;
      if (mode === 'quality') return qualityScore(s._title, seeds, cfg) * 1000 + seeds;
      if (mode === 'size_asc') return sizeMb != null ? (1000000 - sizeMb) : -1;
      if (mode === 'size_desc') return sizeMb != null ? sizeMb : -1;
      return qualityScore(s._title, seeds, cfg);
    })(),
  }));
}

function sortAndClean(streams) {
  return streams
    .sort((a, b) => b._score - a._score)
    .map(({ _score, _source, _audioType, _title, _size, _sizeMb, _seeds, ...s }) => s);
}

module.exports = {
  isPtBr, isPtBrStream, isLikelyPtBrFromTrustedSource, isClearlyNonPtBr, hasPtBrAudio, detectAudioType,
  extractResolution, extractCodec, extractSource,
  extractInfoHash, extractSeeds, extractSize,
  passesEpisodeFilter,
  passesQualityFilter, passesCodecFilter, passesSrcFilter,
  formatStream, deduplicate, applyScores, sortAndClean,
};


