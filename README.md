# Dubra

Addon para Stremio/Nuvio focado em torrents com audio PT-BR (dublado/dual).

## Fontes ativas

| Fonte | Metodo | Cobertura |
|---|---|---|
| Torrentio Brazuca | API | Principal |
| Brazuca Torrents | API | Conteudo BR |
| BeTor | Prowlarr (recomendado) | Conteudo BR |
| Torrent Indexer | API | BluDV, Comando, Starck, TorrentDosFilmes, VacaTorrent |
| TorrentsDB | API | Fallback secundario (fonte mista) |

## Regra de idioma

- Fontes BR (Brazuca, BeTor, Indexer e derivados BR): filtro mais leve.
- Fontes mistas (Torrentio/TorrentsDB): filtro PT-BR quando `Idioma original` estiver desligado.

## Interface `/configure`

- Preferencias de qualidade/codec/fonte de video com ordenacao
- Fontes ativas
- Debrid
- Limites e timeout
- Status por fonte: `online`, `instavel`, `offline`

## Rodar local

```bash
npm install
npm start
```

URLs locais:

- Manifest: `http://localhost:7000/manifest.json`
- Configuracao: `http://localhost:7000/configure`
- Status: `http://localhost:7000/status`

## Deploy (generico)

Pode subir em qualquer plataforma que rode Node.js.

Configuracao minima:

- Build: `npm install`
- Start: `npm start`
- Porta: usar variavel `PORT` da plataforma

## Deploy no Railway (recomendado no free)

1. Suba o repositorio no GitHub.
2. Crie um servico Web no Railway para o Dubra.
3. Build: `npm install`
4. Start: `npm start`
5. Configure variaveis de ambiente (secao abaixo).

## Prowlarr (opcional, recomendado para BeTor)

Se quiser usar BeTor via Prowlarr:

1. Suba o Prowlarr em servico separado.
2. Configure volume persistente montado em `/config`.
3. Adicione o indexador `Catalogo BeTor`.
4. No Dubra, configure:
   - `PROWLARR_URL`
   - `PROWLARR_API_KEY`
   - `PROWLARR_INDEXER_ID` (ex.: `1`)

## Variaveis de ambiente (Dubra)

| Variavel | Descricao | Padrao |
|---|---|---|
| `PORT` | Porta HTTP do servidor | `7000` |
| `BRAZUCA_URL` | URL da fonte Brazuca | padrao interno |
| `TORRENT_INDEXER_URL` | URL do Torrent Indexer | instancia publica |
| `TORRENTSDB_URL` | URL do TorrentsDB | `https://torrentsdb.com` |
| `PROWLARR_URL` | URL publica do Prowlarr | vazio |
| `PROWLARR_API_KEY` | API key do Prowlarr | vazio |
| `PROWLARR_INDEXER_ID` | ID do indexador no Prowlarr | vazio |
| `TMDB_API_KEY` | Chave TMDB (opcional) | vazio |

## Verificacao

```bash
npm run check
```
