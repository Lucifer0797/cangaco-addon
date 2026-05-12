# Dubra

Addon Stremio/Nuvio para torrents dublados e dual Ã¡udio PT-BR.

## Fontes ativas

| Fonte | MÃ©todo | Cobertura |
|-------|--------|-----------|
| Torrentio Brazuca | API | Principal |
| Brazuca Torrents | API | ConteÃºdo BR |
| BeTor | Prowlarr (preferencial) + HTML fallback | ConteÃºdo BR |
| Torrent Indexer | API | BluDV, Comando, Starck, TorrentDosFilmes, VacaTorrent |
| TorrentsDB | API | Fallback secundÃ¡rio (fonte mista) |

## Idioma (regra atual)

- Fontes BR (Brazuca, BeTor, Indexer e derivados BR): sem filtro rÃ­gido.
- Fontes mistas (Torrentio/TorrentsDB): com filtro PT-BR quando `Idioma original` estÃ¡ desligado.

## Interface `/configure`

- Qualidade/codec/fonte de vÃ­deo com ordenaÃ§Ã£o.
- Fontes ativas.
- Debrid.
- Limites e timeout.
- Status por fonte: `online`, `instÃ¡vel` e `offline`.

## InstalaÃ§Ã£o local

```bash
npm install
npm start
```

Manifest:

`http://localhost:7000/manifest.json`

## Deploy no Render

1. Suba o repositÃ³rio no GitHub.
2. Crie um Web Service no Render.
3. Build command: `npm install`
4. Start command: `npm start`

## VariÃ¡veis de ambiente

| VariÃ¡vel | DescriÃ§Ã£o | PadrÃ£o |
|----------|-----------|--------|
| `PORT` | Porta do servidor | `7000` |
| `TMDB_API_KEY` | API key do TMDB (opcional) | â€” |
| `BRAZUCA_URL` | URL do Brazuca Torrents | URL padrÃ£o |
| `TORRENT_INDEXER_URL` | URL do torrent-indexer | InstÃ¢ncia pÃºblica |
| `TORRENTSDB_URL` | URL do TorrentsDB | `https://torrentsdb.com` |
| `PROWLARR_URL` | URL do Prowlarr (opcional) | â€” |
| `PROWLARR_API_KEY` | API Key do Prowlarr (opcional) | â€” |
| `PROWLARR_INDEXER_ID` | ID do indexador BeTor no Prowlarr (opcional) | â€” |
| `RENDER_EXTERNAL_URL` | URL pÃºblica no Render | â€” |

## VerificaÃ§Ã£o

```bash
npm run check
```

