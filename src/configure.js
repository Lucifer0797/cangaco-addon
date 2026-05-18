'use strict';

function configurePage(baseUrl) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dubra Configuração</title>
  <style>
    :root{--bg:#090d1c;--panel:#121a31;--panel2:#0e1530;--border:#2a3a69;--text:#ecf1ff;--muted:#9ba8cc;--accent:#33d4ff;--accent2:#7f63ff;--ok:#2fd9a2;--warn:#efb85f;--err:#ff6f8f}
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:radial-gradient(1100px 620px at 10% -10%,#132553 0%,transparent 62%),radial-gradient(920px 500px at 95% -5%,#35206a 0%,transparent 62%),var(--bg);color:var(--text);font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;min-height:100vh;padding:2rem 1.25rem}
    .wrap{max-width:980px;margin:0 auto}
    .hdr{display:flex;align-items:center;gap:14px;margin-bottom:1.3rem;padding-bottom:.9rem;border-bottom:1px solid var(--border)}
    .logo{width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#151f4c,#2f1d64);box-shadow:0 0 0 1px #3b4d8b inset,0 0 20px rgba(54,213,255,.22);display:flex;align-items:center;justify-content:center;font-size:24px}
    .tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:rgba(14,21,48,.8);border-radius:14px;padding:5px;margin-bottom:1.1rem;border:1px solid var(--border)}
    .tab{padding:11px 10px;border-radius:10px;border:1px solid transparent;background:transparent;color:var(--muted);font-size:12px;font-weight:700;cursor:pointer}
    .tab.active{background:linear-gradient(135deg,rgba(54,213,255,.16),rgba(127,99,255,.14));color:var(--text);border-color:#3c4f8b}
    .pane{display:none}.pane.active{display:block}
    .sec{margin-bottom:1.1rem}
    .lbl{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:.55rem}
    .card{background:linear-gradient(180deg,rgba(18,26,49,.9),rgba(12,18,40,.92));border:1px solid var(--border);border-radius:14px;padding:1rem;box-shadow:0 0 0 1px rgba(54,213,255,.05) inset}
    .chips{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px}
    .chip{border:1px solid #3a5396;border-radius:9px;padding:7px 13px;cursor:pointer;background:#0d1737;font-size:12px;font-weight:600;color:#b3c4ef}
    .chip.on{border:1px solid var(--accent);background:rgba(54,213,255,.17);color:#d8f8ff;box-shadow:0 0 10px rgba(54,213,255,.18) inset}
    .divider{border:none;border-top:1px solid var(--border);margin:10px 0}
    .olbl{font-size:11px;color:var(--muted);margin-bottom:6px}
    .olist{display:flex;flex-direction:column;gap:5px;min-height:16px}
    .oitem{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #34508f;border-radius:9px;background:#0d1735;cursor:grab}
    .onum{font-size:10px;color:#6f79a0;width:14px;text-align:center}
    .oname{font-size:12px;font-weight:500;color:var(--text);flex:1}
    .osub{font-size:10px;color:var(--muted)}
    .oempty{font-size:11px;color:#666;padding:4px 0;font-style:italic}
    .row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #232b47}
    .row:last-child{border-bottom:none;padding-bottom:0}
    .rn{font-size:13px;font-weight:500;color:var(--text)}
    .rs{font-size:11px;color:var(--muted);margin-top:1px}
    .tog{position:relative;width:36px;height:20px;flex-shrink:0;margin-left:12px}
    .tog input{opacity:0;width:0;height:0;position:absolute}
    .togslider{position:absolute;cursor:pointer;inset:0;background:#2a3355;border-radius:20px;transition:.2s}
    .togslider:before{content:"";position:absolute;height:14px;width:14px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s}
    .tog input:checked + .togslider{background:linear-gradient(135deg,var(--accent),var(--accent2))}
    .tog input:checked + .togslider:before{transform:translateX(16px)}
    .sg{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:1rem}
    .si{border:1px solid #35508f;border-radius:8px;padding:9px 10px;display:flex;align-items:center;gap:7px;background:#0d1735}
    .sdot{width:7px;height:7px;border-radius:50%}.dok{background:var(--ok)}.dwarn{background:var(--warn)}.doff{background:var(--err)}
    .sn{font-size:12px;font-weight:500;color:var(--text);flex:1}.sms{font-size:10px;color:var(--muted)}
    .dg{display:grid;grid-template-columns:1fr 1fr;gap:6px}
    .dbtn{border:1px solid #35508f;border-radius:8px;padding:10px;cursor:pointer;background:#0d1735;color:var(--muted)}
    .dbtn.on{border:2px solid var(--accent);background:rgba(57,208,255,.12);color:#bff0ff}
    .tarea{margin-top:10px;display:none;flex-direction:column;gap:6px}.tarea.vis{display:flex}
    .trow{display:flex;gap:6px}.trow input{flex:1;font-size:12px;padding:8px 9px;border:1px solid #35508f;border-radius:8px;background:#0d1735;color:var(--text);font-family:monospace}
    .tbtn{font-size:11px;padding:6px 10px;border:1px solid var(--border);border-radius:7px;background:var(--panel2);color:var(--muted);cursor:pointer}
    .tbtn.ok{border-color:var(--ok);color:var(--ok)}.tbtn.fail{border-color:var(--err);color:var(--err)}
    .srow{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #232b47}
    .srow:last-child{border-bottom:none;padding-bottom:0}
    .slbl{font-size:12px;font-weight:500;color:var(--text);width:110px;flex-shrink:0}
    .ssub{font-size:10px;color:var(--muted);margin-top:1px}
    .swrap{flex:1;display:flex;align-items:center;gap:8px}
    .swrap input[type=range]{flex:1;accent-color:var(--accent)}
    .sval{font-size:12px;font-weight:500;color:var(--accent);width:26px;text-align:right}
    select{background:#0d1735;border:1px solid #35508f;border-radius:8px;color:var(--text);font-size:12px;padding:7px 10px}
    .urlbox{background:#0d1735;border:1px solid #35508f;border-radius:11px;padding:11px 12px;font-family:monospace;font-size:10px;color:var(--muted);word-break:break-all;margin-bottom:9px;line-height:1.7}
    .urlbox span{color:#a8e9ff}
    .brow{display:flex;gap:6px}
    .binstall{flex:1;padding:11px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer}
    .bicon{padding:11px 13px;border:1px solid #35508f;border-radius:10px;background:var(--panel2);color:var(--muted);cursor:pointer;font-size:15px}
    @media (max-width:820px){body{padding:1rem .8rem}.sg{grid-template-columns:1fr}.slbl{width:92px}}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr">
      <div class="logo">&#128293;</div>
      <div>
        <div style="font-size:18px;font-weight:700">Dubra</div>
        <div style="font-size:12px;color:#7f8db3;margin-top:1px">Audio em portugues primeiro · Stremio & Nuvio</div>
      </div>
    </div>

    <div class="tabs">
      <button class="tab active" data-pane="q">Qualidade</button>
      <button class="tab" data-pane="f">Fontes</button>
      <button class="tab" data-pane="d">Debrid</button>
      <button class="tab" data-pane="a">Avançado</button>
    </div>

    <div class="pane active" id="pane-q">
      <div class="sec">
        <div class="lbl">Resolução</div>
        <div class="card">
          <div class="chips" id="chips-res"></div>
          <div class="divider"></div>
          <div class="olbl">Ordem de preferência - arraste para reordenar</div>
          <div class="olist" id="order-res"></div>
          <div class="divider"></div>
          <div class="row">
            <div><div class="rn">Resoluções não preferidas</div><div class="rs">Quando não há a resolução escolhida</div></div>
            <select id="sel-behavior">
              <option value="all">Mostrar todas</option>
              <option value="fallback">Fallback automático</option>
              <option value="strict">Bloquear</option>
            </select>
          </div>
        </div>
      </div>
      <div class="sec">
        <div class="lbl">Codec</div>
        <div class="card"><div class="chips" id="chips-codec"></div><div class="divider"></div><div class="olbl">Ordem de preferência</div><div class="olist" id="order-codec"></div></div>
      </div>
      <div class="sec">
        <div class="lbl">Fonte de vídeo</div>
        <div class="card"><div class="chips" id="chips-src"></div><div class="divider"></div><div class="olbl">Ordem de preferência</div><div class="olist" id="order-src"></div></div>
      </div>
    </div>

    <div class="pane" id="pane-f">
      <div class="sec"><div class="lbl">Status em tempo real</div><div class="sg" id="health-grid"><div class="si"><div class="sdot dwarn"></div><div class="sn">Carregando...</div></div></div></div>
      <div class="sec">
        <div class="lbl">Ativar / desativar</div>
        <div class="card">
          <div class="row"><div><div class="rn">Prowlarr</div><div class="rs">Fontes usadas: BeTor e ThepirataFilmes</div></div><label class="tog"><input type="checkbox" id="src-betor" checked><span class="togslider"></span></label></div>
          <div class="row"><div><div class="rn">Torrentio Brazuca</div><div class="rs">Maior cobertura PT-BR</div></div><label class="tog"><input type="checkbox" id="src-torrentio" checked><span class="togslider"></span></label></div>
          <div class="row"><div><div class="rn">Brazuca Torrents</div><div class="rs">ApacheTorrent, RedeTorrent, VacaTorrent</div></div><label class="tog"><input type="checkbox" id="src-brazuca" checked><span class="togslider"></span></label></div>
          <div class="row"><div><div class="rn">TorrentsDB</div><div class="rs">Fallback secundário multi-provedor</div></div><label class="tog"><input type="checkbox" id="src-torrentsdb"><span class="togslider"></span></label></div>
        </div>
      </div>
    </div>

    <div class="pane" id="pane-d">
      <div class="sec">
        <div class="lbl">Serviço de debrid</div>
        <div class="card">
          <div class="dg">
            <button class="dbtn" data-svc="rd">Real-Debrid</button>
            <button class="dbtn" data-svc="torbox">TorBox</button>
            <button class="dbtn" data-svc="ad">AllDebrid</button>
            <button class="dbtn" data-svc="pm">Premiumize</button>
          </div>
          <div class="tarea" id="tarea">
            <div class="trow">
              <input type="password" id="tk" placeholder="Cole seu API token...">
              <button class="tbtn" id="tbtn">Testar</button>
            </div>
            <div style="font-size:10px;color:#7f8db3;margin-top:4px">Token salvo apenas no link de instalação.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="pane" id="pane-a">
      <div class="sec">
        <div class="lbl">Limites</div>
        <div class="card">
          <div class="srow"><div class="slbl">Por fonte<div class="ssub">streams por scraper</div></div><div class="swrap"><input type="range" min="1" max="15" value="5" id="r1"><span class="sval" id="v1">5</span></div></div>
          <div class="srow"><div class="slbl">Total<div class="ssub">streams retornados</div></div><div class="swrap"><input type="range" min="5" max="40" value="20" id="r2"><span class="sval" id="v2">20</span></div></div>
          <div class="srow"><div class="slbl">Timeout<div class="ssub">por fonte</div></div><div class="swrap"><input type="range" min="3" max="15" value="8" id="r3"><span class="sval" id="v3">8s</span></div></div>
        </div>
      </div>
      <div class="sec">
        <div class="lbl">Comportamento</div>
        <div class="card">
          <div class="row"><div><div class="rn">Cache</div><div class="rs">Filmes 24h - séries ativas 30min - encerradas 12h</div></div><label class="tog"><input type="checkbox" id="opt-cache" checked><span class="togslider"></span></label></div>
          <div class="row"><div><div class="rn">Prefetch de episódios</div><div class="rs">Pré-carrega próximo episódio em background</div></div><label class="tog"><input type="checkbox" id="opt-prefetch"><span class="togslider"></span></label></div>
          <div class="row"><div><div class="rn">Deduplicação por tamanho</div><div class="rs">Remove torrents iguais com hash diferente</div></div><label class="tog"><input type="checkbox" id="opt-dedupsize" checked><span class="togslider"></span></label></div>
          <div class="row"><div><div class="rn">Idioma original</div><div class="rs">Permite streams sem áudio PT-BR</div></div><label class="tog"><input type="checkbox" id="opt-original"><span class="togslider"></span></label></div>
          <div class="row"><div><div class="rn">Modo debug</div><div class="rs">Libera diagnósticos para suporte neste link</div></div><label class="tog"><input type="checkbox" id="opt-debug"><span class="togslider"></span></label></div>
          <div class="row"><div><div class="rn">Ordenação</div><div class="rs">Como organizar os resultados</div></div><select id="sel-sort"><option value="balanced">Balanceado</option><option value="quality">Qualidade</option><option value="seeds">Seeds</option><option value="size_asc">Tamanho (menor)</option><option value="size_desc">Tamanho (maior)</option></select></div>
        </div>
      </div>
    </div>

    <div style="margin-top:1.25rem">
      <div class="lbl" style="margin-bottom:.5rem">Link de instalação</div>
      <div class="urlbox" id="urlbox"></div>
      <div class="brow">
        <button class="binstall" id="btn-install">Instalar no Stremio</button>
        <button class="bicon" id="btn-copy" title="Copiar">&#128203;</button>
        <button class="bicon" id="btn-qr" title="QR Code">&#128241;</button>
      </div>
      <div id="qrmodal" style="display:none;margin-top:10px;text-align:center">
        <div style="font-size:10px;color:#7f8db3;margin-bottom:6px">Escaneie com a câmera da TV ou celular</div>
        <canvas id="qrcanvas" style="border-radius:8px;background:white;padding:8px"></canvas>
      </div>
      <div style="font-size:10px;color:#7f8db3;text-align:center;margin-top:6px">Use o QR code para instalar direto na TV</div>
    </div>
  </div>

  <script>
    (function () {
      const BASE_URL = "${baseUrl}";
      const GROUPS = {
        res: { items: [
          { k: "4k", label: "4K", sub: "2160p", on: true },
          { k: "1440p", label: "2K", sub: "1440p", on: true },
          { k: "1080p", label: "1080p", sub: "Full HD", on: true },
          { k: "720p", label: "720p", sub: "HD", on: true },
          { k: "480p", label: "480p", sub: "SD", on: false },
          { k: "360p", label: "360p", sub: "Baixa", on: false },
          { k: "any", label: "Sem info", sub: "Desconhecida", on: true },
        ]},
        codec: { items: [
          { k: "h265", label: "HEVC/H.265", sub: "+ eficiente", on: true },
          { k: "h264", label: "H.264/AVC", sub: "+ compatível", on: true },
          { k: "av1", label: "AV1", sub: "nova geração", on: false },
          { k: "xvid", label: "XviD/DivX", sub: "legado", on: false },
          { k: "mpeg2", label: "MPEG-2", sub: "muito legado", on: false },
        ]},
        src: { items: [
          { k: "remux", label: "REMUX", sub: "sem compressão", on: true },
          { k: "bluray", label: "BluRay", sub: "alta qualidade", on: true },
          { k: "webdl", label: "WEB-DL", sub: "menor tamanho", on: true },
          { k: "webrip", label: "WEBRip", sub: "re-encode web", on: false },
          { k: "bdrip", label: "BDRip", sub: "do disco", on: false },
          { k: "hdrip", label: "HDRip", sub: "re-encode HD", on: false },
          { k: "hdtv", label: "HDTV", sub: "broadcast", on: false },
          { k: "dvdrip", label: "DVDRip", sub: "legado", on: false },
          { k: "cam", label: "CAM/TS", sub: "baixa qualidade", on: false },
        ]},
      };

      const state = {};
      Object.keys(GROUPS).forEach((g) => {
        state[g] = GROUPS[g].items.filter((i) => i.on).map((i) => i.k);
      });

      let activeDebrid = null;
      let debridRef = null;
      let lastDebridSig = "";
      let debridRefTimer = null;
      let dragSrc = null;

      function initTabs() {
        document.querySelectorAll(".tab").forEach((tab) => {
          tab.addEventListener("click", () => {
            const pid = "pane-" + tab.getAttribute("data-pane");
            document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
            document.querySelectorAll(".pane").forEach((p) => p.classList.remove("active"));
            tab.classList.add("active");
            document.getElementById(pid).classList.add("active");
          });
        });
      }

      function renderOrder(groupKey) {
        const el = document.getElementById("order-" + groupKey);
        el.innerHTML = "";
        if (!state[groupKey].length) {
          el.innerHTML = '<div class="oempty">Nenhuma selecionada</div>';
          return;
        }

        state[groupKey].forEach((k, i) => {
          const item = GROUPS[groupKey].items.find((x) => x.k === k);
          if (!item) return;
          const div = document.createElement("div");
          div.className = "oitem";
          div.draggable = true;
          div.innerHTML = '<span class="onum">' + (i + 1) + '</span><span style="color:#6378aa;margin-right:2px">&#9783;</span><span class="oname">' + item.label + '</span><span class="osub">' + item.sub + "</span>";

          div.addEventListener("dragstart", () => { dragSrc = div; });
          div.addEventListener("dragover", (e) => {
            e.preventDefault();
            if (!dragSrc || dragSrc === div) return;
            const items = Array.from(el.querySelectorAll(".oitem"));
            const fi = items.indexOf(dragSrc);
            const ti = items.indexOf(div);
            if (fi < 0 || ti < 0) return;
            state[groupKey].splice(ti, 0, state[groupKey].splice(fi, 1)[0]);
            renderOrder(groupKey);
            buildUrl();
          });
          el.appendChild(div);
        });
      }

      function renderChips(groupKey) {
        const el = document.getElementById("chips-" + groupKey);
        el.innerHTML = "";
        GROUPS[groupKey].items.forEach((item) => {
          const div = document.createElement("div");
          div.className = "chip" + (state[groupKey].includes(item.k) ? " on" : "");
          div.textContent = item.label;
          div.addEventListener("click", () => {
            const idx = state[groupKey].indexOf(item.k);
            if (idx >= 0) state[groupKey].splice(idx, 1);
            else state[groupKey].push(item.k);
            renderChips(groupKey);
            renderOrder(groupKey);
            buildUrl();
          });
          el.appendChild(div);
        });
      }

      function renderSimpleTemplate(tpl, ctx) {
        return String(tpl || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => String(ctx[key] ?? '')).replace(/\s{2,}/g, ' ').trim();
      }

      function renderAioLikeTemplate(tpl, ctx) {
        const text = String(tpl || "");
        // Preview local para AIO avançado: retorna visão simplificada limpa
        // em vez de tentar interpretar toda a DSL.
        if (text.includes("::")) {
          return [ctx.source, ctx.size + " • " + ctx.seeds + " seeds • " + ctx.lang, ctx.title].join("\\n");
        }
        return text;
      }

      function renderFormatterPreview() {
        const preset = document.getElementById("sel-fmt").value;
        const ctx = {
          source: "Torrentio",
          title: "Jujutsu Kaisen S02E03 WEB-DL 1080p",
          res: "1080P",
          src: "WEB-DL",
          codec: "HEVC",
          lang: "PT-BR",
          size: "1.8 GB",
          seeds: "92",
        };

        const nameTplByPreset = {
          compact: "{res} {src} {codec}",
          detailed: "{res} {src} {codec} {lang}",
          technical: "{res} {src} {codec} S:{seeds} SZ:{size}",
        };
        const descTplByPreset = {
          compact: "{source}\\n{size} • {seeds} seeds\\n{title}",
          detailed: "{source}\\n{size} • {seeds} seeds • {lang}\\n{title}",
          technical: "{source}\\nRES:{res} SRC:{src} CODEC:{codec}\\n{size} • {seeds} seeds\\n{title}",
        };

        const nameTpl = preset === "custom"
          ? (document.getElementById("fmt-name").value.trim() || "{res} {src} {codec}")
          : (nameTplByPreset[preset] || nameTplByPreset.compact);
        const descTpl = preset === "custom"
          ? (document.getElementById("fmt-desc").value.trim() || "{source}\\n{size} • {seeds} seeds\\n{title}")
          : (descTplByPreset[preset] || descTplByPreset.compact);

        const isAioLike = preset === "custom" && (nameTpl.includes("::") || descTpl.includes("::"));
        if (isAioLike) {
          document.getElementById("fmt-preview-name").textContent = "Preview avançado";
          document.getElementById("fmt-preview-desc").textContent =
            "Template AIO-like detectado.\\nNão é possível exibir preview fiel aqui.\\nA renderização final acontece no stream real.";
          return;
        }

        const previewName = renderSimpleTemplate(nameTpl, ctx) || "Preview";
        const previewDesc = renderSimpleTemplate(descTpl, ctx) || "Preview";
        document.getElementById("fmt-preview-name").textContent = previewName;
        document.getElementById("fmt-preview-desc").textContent = previewDesc;
      }

      function updateHealth() {
        fetch(BASE_URL + "/status").then((r) => r.json()).then((data) => {
          if (!data || !data.health) return;
          const grid = document.getElementById("health-grid");
          const srcs = [["Torrentio","Torrentio"],["BrazucaTorrents","Brazuca"],["BeTor","Prowlarr (BeTor)"],["ThepirataFilmes","Prowlarr (ThepirataFilmes)"],["TorrentsDB","TorrentsDB"]];
          grid.innerHTML = srcs.map((p) => {
            const h = data.health[p[0]];
            const st = h && h.state ? h.state : (h && h.online ? "online" : "unstable");
            const cls = st === "online" ? "dok" : (st === "offline" ? "doff" : "dwarn");
            const info = h && h.ms ? (h.ms + "ms") : (st === "offline" ? "offline" : "instável");
            return '<div class="si"><div class="sdot ' + cls + '"></div><div class="sn">' + p[1] + '</div><div class="sms">' + info + "</div></div>";
          }).join("");
        }).catch(() => {});
      }

      function ensureDebridRef() {
        const token = document.getElementById("tk").value.trim();
        if (!activeDebrid || !token) {
          debridRef = null;
          return Promise.resolve(null);
        }

        const sig = activeDebrid + "|" + token;
        if (debridRef && sig === lastDebridSig) return Promise.resolve(debridRef);

        return fetch(BASE_URL + "/debrid-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ service: activeDebrid, key: token }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data && data.ok && data.ref) {
              debridRef = data.ref;
              lastDebridSig = sig;
              buildUrl();
              return debridRef;
            }
            return null;
          })
          .catch(() => null);
      }

      function buildUrl() {
        const q = state.res.filter((k) => k !== "any").join(",");
        const codec = state.codec.join(",");
        const src = state.src.join(",");
        const beh = document.getElementById("sel-behavior").value;
        const sort = document.getElementById("sel-sort").value;
        const ls = document.getElementById("r1").value;
        const lt = document.getElementById("r2").value;
        const to = document.getElementById("r3").value;

        const activeSrc = [];
        if (document.getElementById("src-betor").checked) {
          activeSrc.push("betor", "thepirata");
        }
        if (document.getElementById("src-torrentio").checked) activeSrc.push("torrentio");
        if (document.getElementById("src-brazuca").checked) activeSrc.push("brazuca");
        if (document.getElementById("src-torrentsdb").checked) activeSrc.push("torrentsdb");

        let path = "";
        if (q) path += "/quality~" + q;
        if (beh !== "all") path += "/behavior~" + beh;
        if (sort !== "balanced") path += "/sort~" + sort;
        if (codec) path += "/codec~" + codec;
        if (src) path += "/src~" + src;
        if (ls !== "5" || lt !== "20") path += "/limit~" + ls + "," + lt;
        if (to !== "8") path += "/timeout~" + to;

        const def = ["betor", "thepirata", "torrentio", "brazuca"];
        const isDef = activeSrc.length === def.length && def.every((k) => activeSrc.includes(k));
        if (!isDef) path += "/sources~" + activeSrc.join(",");

        if (activeDebrid && document.getElementById("tk").value.trim() && debridRef) {
          path += "/dref~" + debridRef;
        }

        const flags = [];
        if (!document.getElementById("opt-cache").checked) flags.push("cache0");
        if (!document.getElementById("opt-prefetch").checked) flags.push("prefetch0");
        if (!document.getElementById("opt-dedupsize").checked) flags.push("dedupsize0");
        if (document.getElementById("opt-original").checked) flags.push("original1");
        if (document.getElementById("opt-debug").checked) flags.push("debug1");
        if (flags.length) path += "/flags~" + flags.join(",");

        const full = BASE_URL + path + "/manifest.json";
        document.getElementById("urlbox").innerHTML = full.replace(
          /((?:quality|behavior|sort|codec|src|limit|sources|timeout|flags|dref)~[^/]+)/g,
          "<span>$1</span>"
        );
      }

      function bindEvents() {
        ["r1", "r2", "r3"].forEach((id) => {
          document.getElementById(id).addEventListener("input", () => {
            document.getElementById("v1").textContent = document.getElementById("r1").value;
            document.getElementById("v2").textContent = document.getElementById("r2").value;
            document.getElementById("v3").textContent = document.getElementById("r3").value + "s";
            buildUrl();
          });
        });
        ["betor","torrentio","brazuca","torrentsdb"].forEach((k) => {
          document.getElementById("src-" + k).addEventListener("change", buildUrl);
        });
        ["opt-cache","opt-prefetch","opt-dedupsize","opt-original","opt-debug","sel-behavior","sel-sort"].forEach((id) => {
          document.getElementById(id).addEventListener("change", buildUrl);
        });

        document.querySelectorAll(".dbtn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const svc = btn.getAttribute("data-svc");
            const ta = document.getElementById("tarea");
            if (activeDebrid === svc) {
              activeDebrid = null;
              debridRef = null;
              document.querySelectorAll(".dbtn").forEach((b) => b.classList.remove("on"));
              ta.classList.remove("vis");
            } else {
              activeDebrid = svc;
              debridRef = null;
              document.querySelectorAll(".dbtn").forEach((b) => b.classList.remove("on"));
              btn.classList.add("on");
              ta.classList.add("vis");
              document.getElementById("tk").value = "";
            }
            buildUrl();
          });
        });

        document.getElementById("tk").addEventListener("input", () => {
          debridRef = null;
          if (debridRefTimer) clearTimeout(debridRefTimer);
          debridRefTimer = setTimeout(() => ensureDebridRef(), 350);
          buildUrl();
        });

        document.getElementById("tbtn").addEventListener("click", function () {
          this.textContent = "Testando...";
          fetch(BASE_URL + "/debrid-test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ service: activeDebrid, key: document.getElementById("tk").value.trim() }),
          })
            .then((r) => r.json())
            .then((data) => {
              this.className = "tbtn " + (data.ok ? "ok" : "fail");
              this.textContent = data.ok ? "Válido" : "InVálido";
            })
            .catch(() => { this.className = "tbtn fail"; this.textContent = "Erro"; });
        });

        document.getElementById("btn-install").addEventListener("click", () => {
          ensureDebridRef().finally(() => {
            window.location.href = "stremio://" + document.getElementById("urlbox").textContent.replace(/^https?:\\/\\//, "");
          });
        });

        document.getElementById("btn-copy").addEventListener("click", () => {
          ensureDebridRef().finally(() => {
            navigator.clipboard.writeText(document.getElementById("urlbox").textContent).then(() => {
              const b = document.getElementById("btn-copy");
              b.textContent = "OK";
              setTimeout(() => { b.innerHTML = "&#128203;"; }, 1200);
            });
          });
        });

        document.getElementById("btn-qr").addEventListener("click", () => {
          ensureDebridRef().finally(() => {
            const m = document.getElementById("qrmodal");
            const btn = document.getElementById("btn-qr");
            if (m.style.display === "block") {
              m.style.display = "none";
              btn.innerHTML = "&#128241;";
              return;
            }
            m.style.display = "block";
            btn.textContent = "X";
            const canvas = document.getElementById("qrcanvas");
            const img = new Image();
            img.onload = () => {
              canvas.width = img.width;
              canvas.height = img.height;
              canvas.getContext("2d").drawImage(img, 0, 0);
            };
            img.src = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" +
              encodeURIComponent(document.getElementById("urlbox").textContent);
          });
        });
      }

      initTabs();
      Object.keys(GROUPS).forEach((g) => { renderChips(g); renderOrder(g); });
      updateHealth();
      bindEvents();
      buildUrl();
    })();
  </script>
</body>
</html>`;
}

module.exports = { configurePage };




