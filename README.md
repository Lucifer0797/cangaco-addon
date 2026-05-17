# Dubra

Addon para Stremio/Nuvio focado em torrents com áudio PT-BR (dublado/dual).

## Fontes ativas

| Fonte | Método | Cobertura |
|---|---|---|
| Torrentio Brazuca | API | Principal |
| Brazuca Torrents | API | Conteúdo BR |
| BeTor | Prowlarr (recomendado) | Conteúdo BR |
| Torrent Indexer | API | BluDV, Comando, Starck, TorrentDosFilmes, VacaTorrent |
| TorrentsDB | API | Fallback secundário (fonte mista) |

## Regra de idioma

- Fontes BR (Brazuca, BeTor, Indexer e derivados BR): filtro mais leve.
- Fontes mistas (Torrentio/TorrentsDB): filtro PT-BR quando `Idioma original` estiver desligado.

## Interface `/configure`

- Preferências de qualidade/codec/fonte de vídeo com ordenação.
- Fontes ativas.
- Debrid.
- Limites e timeout.
- Status por fonte: `online`, `instável`, `offline`.

## Rodar localmente

```bash
npm install
npm start
```

### URLs locais

- Manifest: `http://localhost:7000/manifest.json`
- Configuração: `http://localhost:7000/configure`
- Status: `http://localhost:7000/status`

## Deploy (genérico)

Você pode subir em qualquer plataforma que rode Node.js.

Configuração mínima:

- Build: `npm install`
- Start: `npm start`
- Porta: usar a variável `PORT` da plataforma.

## Deploy no Railway (recomendado no plano free)

1. Suba o repositório no GitHub.
2. Crie um serviço Web no Railway para o Dubra.
3. Build: `npm install`.
4. Start: `npm start`.
5. Configure as variáveis de ambiente (seção abaixo).

## Prowlarr (opcional, recomendado para BeTor)

Se quiser usar BeTor via Prowlarr:

1. Suba o Prowlarr em serviço separado.
2. Configure volume persistente montado em `/config`.
3. Adicione o indexador `Catálogo BeTor`.
4. No Dubra, configure:
   - `PROWLARR_URL`
   - `PROWLARR_API_KEY`
   - `PROWLARR_INDEXER_ID` (ex.: `1`)

## Variáveis de ambiente (Dubra)

| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta HTTP do servidor | `7000` |
| `BRAZUCA_URL` | URL da fonte Brazuca | padrão interno |
| `TORRENT_INDEXER_URL` | URL do Torrent Indexer | instância pública |
| `TORRENTSDB_URL` | URL do TorrentsDB | `https://torrentsdb.com` |
| `PROWLARR_URL` | URL pública do Prowlarr | vazio |
| `PROWLARR_API_KEY` | API key do Prowlarr | vazio |
| `PROWLARR_INDEXER_ID` | ID do indexador no Prowlarr | vazio |
| `TMDB_API_KEY` | Chave TMDB (opcional) | vazio |

## Verificação

```bash
npm run check
```
