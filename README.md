# Dubra

Addon para Stremio/Nuvio focado em torrents com áudio PT-BR (dublado/dual).

## 1) O que o Dubra faz

- Junta resultados de várias fontes.
- Prioriza conteúdo com áudio em português.
- Permite configurar qualidade, codec, fonte e ordenação em `/configure`.
- Suporta BeTor via Prowlarr (recomendado para estabilidade).

## 2) Fontes atuais

| Fonte | Método | Cobertura |
|---|---|---|
| Torrentio Brazuca | API | Principal |
| Brazuca Torrents | API | Conteúdo BR |
| BeTor | Prowlarr | Conteúdo BR |
| TorrentsDB | API | Fallback secundário (fonte mista) |

## 3) Regra de idioma

- Fontes BR (Brazuca, BeTor e ThepirataFilmes): filtro mais leve.
- Fontes mistas (Torrentio/TorrentsDB): filtro PT-BR quando `Idioma original` estiver desligado.

## 4) Segurança (importante)

- Não coloque API key fixa no código.
- Use sempre variáveis de ambiente para segredos.
- Segredos usados neste projeto:
  - `TMDB_API_KEY`
  - `PROWLARR_API_KEY`

## 5) Rodar local

```bash
npm install
npm start
```

URLs locais:

- Manifest: `http://localhost:7000/manifest.json`
- Configuracao: `http://localhost:7000/configure`
- Status: `http://localhost:7000/status`

## 6) Variáveis de ambiente do Dubra

| Variável | Obrigatória | Descrição | Padrão |
|---|---|---|---|
| `PORT` | nao | Porta HTTP do servidor | `7000` |
| `PUBLIC_URL` | recomendado em cloud | URL pública usada no `/configure` para gerar link correto | vazio |
| `RENDER_EXTERNAL_URL` | nao | Fallback de URL pública (compatibilidade) | vazio |
| `ENABLE_DIAGNOSTICS` | nao | Liga diagnóstico global (`/scrapers-test`) | `false` |
| `TMDB_API_KEY` | nao | Chave TMDB para metadados (título/idioma) | vazio |
| `BRAZUCA_URL` | nao | URL base do scraper Brazuca | padrão interno |
| `TORRENTSDB_URL` | nao | URL base do TorrentsDB | `https://torrentsdb.com` |
| `PROWLARR_URL` | sim para BeTor | URL pública do seu Prowlarr | vazio |
| `PROWLARR_API_KEY` | sim para BeTor | API key do Prowlarr | vazio |
| `PROWLARR_INDEXER_ID` | recomendado para BeTor | ID numérico do indexador BeTor dentro do Prowlarr (ex.: `1`) | vazio |
| `BETOR_CARDIGANN_YML` | nao | Referência da definição Cardigann BeTor | `https://catalogo.betor.top/static/catalogo-betor.yml` |

## 7) Deploy no Railway (Dubra)

### 7.1 Criar serviço

1. Suba este repo no GitHub.
2. No Railway, crie um **Web Service** apontando para este repo.
3. Build: `npm install`
4. Start: `npm start`

### 7.2 Variáveis mínimas no Railway (Dubra)

Adicione no serviço do Dubra:

- `PORT=7000`
- `NIXPACKS_NODE_VERSION=20.18.1` (recomendado)
- `PUBLIC_URL=https://SEU-DUBRA.up.railway.app`

Se for usar BeTor via Prowlarr, adicione também:

- `PROWLARR_URL=https://SEU-PROWLARR.up.railway.app`
- `PROWLARR_API_KEY=SUA_CHAVE`
- `PROWLARR_INDEXER_ID=1` (ou o ID real no seu Prowlarr)

Opcional:

- `TMDB_API_KEY=SUA_CHAVE_TMDB`
- `ENABLE_DIAGNOSTICS=true` (se quiser diagnóstico sempre ativo)

## 8) Tutorial completo: subir Prowlarr no Railway

> Objetivo: usar o BeTor por Prowlarr (mais estável que scraping HTML).

### 8.1 Criar serviço Prowlarr

1. No Railway, crie um novo serviço por **Docker Image**.
2. Use a imagem:
   - `ghcr.io/linuxserver/prowlarr:latest`
3. Deixe a porta pública apontando para `8080`.

### 8.2 Variáveis do Prowlarr

No serviço do Prowlarr, adicione:

- `PUID=1000`
- `PGID=1000`
- `TZ=America/Sao_Paulo`

### 8.3 Start Command para auto-carregar o BeTor (que usamos)

No serviço do Prowlarr, em **Start Command**, use:

```bash
sh -lc 'mkdir -p /config/Definitions/Custom; curl -fsSL --retry 5 --retry-delay 2 "https://catalogo.betor.top/static/catalogo-betor.yml" -o /config/Definitions/Custom/betor.yml || echo "falha ao baixar yml, seguindo boot"; exec /init'
```

Esse comando:
- cria a pasta de definições customizadas;
- baixa/atualiza o `betor.yml`;
- inicia o Prowlarr normalmente com `exec /init`.

### 8.4 Volume persistente (essencial)

1. Crie um volume persistente no serviço do Prowlarr.
2. Monte em:
   - `/config`

Sem volume, o Prowlarr perde configurações ao reiniciar.

### 8.5 Primeiro acesso

1. Abra: `https://SEU-PROWLARR.up.railway.app`
2. Configure login inicial.
3. Pegue a API key em:
   - `Settings -> General -> Security -> API Key`

### 8.6 Adicionar indexador BeTor no Prowlarr

1. `Indexers -> Add Indexer`
2. Procure por `Catalogo BeTor` / `BeTor`.
3. Salve com `Enable` ligado.
4. Observe o ID do indexador na lista (coluna `ID`) para usar no Dubra.

### 8.7 Ligar Dubra ao Prowlarr

No serviço do Dubra, configure:

- `PROWLARR_URL=https://SEU-PROWLARR.up.railway.app`
- `PROWLARR_API_KEY=SUA_API_KEY`
- `PROWLARR_INDEXER_ID=ID_NUMERICO` (ex.: `1`)

Depois, redeploy do Dubra.

## 9) Debug ON/OFF no `/configure`

- No painel Avançado existe `Modo debug`.
- Quando ligado, o link de instalação inclui `flags~debug1`.
- Esse modo libera diagnósticos para aquele link configurado.

Exemplo de teste:

`/scrapers-test?imdb=tt12637874&type=series&season=2&episode=1`

## 10) Verificação rápida

```bash
npm run check
```

## 11) Troubleshooting rápido

- **Build falha com erro de BOM no package.json**:
  - Salve `package.json` em UTF-8 sem BOM.
- **Railway usando Node antigo**:
  - Defina `NIXPACKS_NODE_VERSION=20.18.1`.
- **Sem resultado do BeTor**:
  - Verifique `PROWLARR_URL`, `PROWLARR_API_KEY`, `PROWLARR_INDEXER_ID`.
  - Teste no Dubra: `/scrapers-test?...`.
- **Sem resultado no Stremio, mas teste mostra resultados**:
  - Reinstale o addon usando o link novo do `/configure` (com as flags corretas).

## 12) Como evitar quebra de acentuação no README

Se aparecer texto como `ConfiguraÃ§Ã£o`, o arquivo foi salvo em encoding errado.

Use este padrão:
- encoding: **UTF-8 sem BOM**
- fim de linha: **LF**

No VS Code:
1. Abra o README.
2. Clique no canto inferior direito (encoding atual).
3. Selecione `Save with Encoding`.
4. Escolha `UTF-8`.
