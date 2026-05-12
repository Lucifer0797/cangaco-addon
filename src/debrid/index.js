'use strict';
/**
 * debrid/index.js
 * IntegraÃ§Ã£o com Real-Debrid, TorBox, AllDebrid, Premiumize.
 * Converte infoHash em link HTTP direto.
 */

const { http } = require('../utils/http');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// â”€â”€â”€ Real-Debrid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function resolveRD(infoHash, apiKey) {
  try {
    const magnet = 'magnet:?xt=urn:btih:' + infoHash;
    const add = await http.post(
      'https://api.real-debrid.com/rest/1.0/torrents/addMagnet',
      new URLSearchParams({ magnet }),
      { headers: { Authorization: 'Bearer ' + apiKey } }
    );
    const id = add.data?.id;
    if (!id) return null;

    await http.post(
      'https://api.real-debrid.com/rest/1.0/torrents/selectFiles/' + id,
      new URLSearchParams({ files: 'all' }),
      { headers: { Authorization: 'Bearer ' + apiKey } }
    );

    await sleep(2000);

    const info = await http.get(
      'https://api.real-debrid.com/rest/1.0/torrents/info/' + id,
      { headers: { Authorization: 'Bearer ' + apiKey } }
    );
    const links = info.data?.links || [];
    if (!links.length) return null;

    const unlock = await http.post(
      'https://api.real-debrid.com/rest/1.0/unrestrict/link',
      new URLSearchParams({ link: links[0] }),
      { headers: { Authorization: 'Bearer ' + apiKey } }
    );
    return unlock.data?.download || null;
  } catch (err) {
    console.warn('[RD] Erro:', err.message);
    return null;
  }
}

// â”€â”€â”€ TorBox â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function resolveTorBox(infoHash, apiKey) {
  try {
    const magnet = 'magnet:?xt=urn:btih:' + infoHash;
    const add = await http.post(
      'https://api.torbox.app/v1/api/torrents/createtorrent',
      { magnet },
      { headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' } }
    );
    const torrentId = add.data?.data?.torrent_id;
    if (!torrentId) return null;

    await sleep(3000);

    const list = await http.get(
      'https://api.torbox.app/v1/api/torrents/mylist?id=' + torrentId,
      { headers: { Authorization: 'Bearer ' + apiKey } }
    );
    const files = list.data?.data?.files || [];
    const video = files
      .filter(f => /\.(mkv|mp4|avi|mov)$/i.test(f.name))
      .sort((a, b) => b.size - a.size)[0];
    if (!video) return null;

    const link = await http.get(
      'https://api.torbox.app/v1/api/torrents/requestdl?token=' + apiKey + '&torrent_id=' + torrentId + '&file_id=' + video.id,
      { headers: { Authorization: 'Bearer ' + apiKey } }
    );
    return link.data?.data || null;
  } catch (err) {
    console.warn('[TorBox] Erro:', err.message);
    return null;
  }
}

// â”€â”€â”€ AllDebrid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function resolveAD(infoHash, apiKey) {
  try {
    const magnet = 'magnet:?xt=urn:btih:' + infoHash;
    const add = await http.get(
      'https://api.alldebrid.com/v4/magnet/upload?agent=dubra&apikey=' + apiKey + '&magnets[]=' + encodeURIComponent(magnet)
    );
    const magnetId = add.data?.data?.magnets?.[0]?.id;
    if (!magnetId) return null;

    await sleep(3000);

    const status = await http.get(
      'https://api.alldebrid.com/v4/magnet/status?agent=dubra&apikey=' + apiKey + '&id=' + magnetId
    );
    const links = status.data?.data?.magnets?.links || [];
    if (!links.length) return null;

    const unlock = await http.get(
      'https://api.alldebrid.com/v4/link/unlock?agent=dubra&apikey=' + apiKey + '&link=' + encodeURIComponent(links[0].link)
    );
    return unlock.data?.data?.link || null;
  } catch (err) {
    console.warn('[AllDebrid] Erro:', err.message);
    return null;
  }
}

// â”€â”€â”€ Premiumize â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function resolvePM(infoHash, apiKey) {
  try {
    const magnet = 'magnet:?xt=urn:btih:' + infoHash;
    const res = await http.post(
      'https://www.premiumize.me/api/transfer/directdl',
      new URLSearchParams({ apikey: apiKey, src: magnet })
    );
    const content = res.data?.content || [];
    const video = content
      .filter(f => /\.(mkv|mp4|avi)$/i.test(f.path))
      .sort((a, b) => b.size - a.size)[0];
    return video?.link || null;
  } catch (err) {
    console.warn('[Premiumize] Erro:', err.message);
    return null;
  }
}

// â”€â”€â”€ Interface pÃºblica â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const resolvers = { rd: resolveRD, torbox: resolveTorBox, ad: resolveAD, pm: resolvePM };

async function enrichWithDebrid(streams, debridCfg) {
  if (!debridCfg?.service || !debridCfg?.apiKey) return streams;
  const resolver = resolvers[debridCfg.service];
  if (!resolver) return streams;

  return Promise.all(streams.map(async s => {
    try {
      const url = await resolver(s.infoHash, debridCfg.apiKey);
      if (!url) return s;
      return {
        ...s,
        url,
        name: s.name + ' [' + debridCfg.service.toUpperCase() + ']',
        behaviorHints: { ...s.behaviorHints, notWebReady: false },
      };
    } catch { return s; }
  }));
}

module.exports = { enrichWithDebrid };

