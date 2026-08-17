# B300 Dashboard — Documentação Completa do Projeto

---

## Visão Geral

Aplicação web interna para gerenciamento e visualização de campanhas de mídia paga.
Permite criar clientes, vincular contas de Google Ads (e futuramente Meta Ads) e visualizar
métricas de campanha por período com gráficos e tabelas detalhadas.

- **Usuário:** Pablo (pablodavi@gmail.com)
- **Uso:** ~5 clientes internos
- **Hospedagem:** Local (Windows 11, Alienware)
- **Repositório:** `C:\Users\pablo\OneDrive\Desktop\B300\_B300\DASHBOARD CC\ads-dashboard`

---

## Schema do Banco de Dados

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String?  // bcrypt hash
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  googleConnections GoogleConnection[]
  clients           Client[]
}

model GoogleConnection {
  id           String   @id @default(cuid())
  userId       String
  googleEmail  String
  accessToken  String   @db.Text
  refreshToken String   @db.Text
  expiresAt    DateTime
  scope        String
  // Relacionamentos: user, adAccounts
}

model Client {
  id        String   @id @default(cuid())
  userId    String
  name      String
  logo      String?
  notes     String?
  // Relacionamentos: user, googleAdAccounts
}

model GoogleAdAccount {
  id               String   @id @default(cuid())
  clientId         String
  connectionId     String
  customerId       String   // ID numérico Google Ads (ex: 8601115683)
  descriptiveName  String   // Nome real (vazio com token de teste)
  alias            String?  // Nome manual definido pelo usuário
  currencyCode     String?
  timeZone         String?
  isManagerAccount Boolean  @default(false)
  @@unique([clientId, customerId])
}
```

**Migrations aplicadas:**
- `20260507202949_init` — criação de todas as tabelas
- `20260507225113_add_alias_to_ad_account` — campo alias na tabela google_ad_accounts

---

## Rotas da Aplicação

### Páginas

| Rota | Tipo | Descrição |
|---|---|---|
| `/` | Redirect | Redireciona para `/dashboard` |
| `/login` | Public | Login com email/senha |
| `/register` | Public | Cadastro de usuário |
| `/dashboard` | Protected | Painel principal com KPIs gerais |
| `/onboarding` | Protected | Conectar conta Google Ads via OAuth |
| `/clients` | Protected | Listagem de clientes com cards |
| `/clients/new` | Protected | Criar cliente + selecionar contas Google Ads |
| `/clients/[id]/dashboard` | Protected | Dashboard de campanhas por cliente |
| `/clients/[id]/edit` | Protected | Renomear contas vinculadas (alias) |

### APIs

| Rota | Método | Descrição |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | Handler NextAuth v5 |
| `/api/auth/register` | POST | Criar usuário `{name, email, password}` |
| `/api/clients` | GET | Listar clientes do usuário logado |
| `/api/clients` | POST | Criar cliente `{name, notes, accounts[]}` |
| `/api/clients/[id]/campaigns` | GET | Métricas Google Ads `?year=&month=` |
| `/api/clients/[id]/accounts/[accountId]` | PATCH | Atualizar alias `{alias}` |
| `/api/google-ads/connect` | GET | Inicia fluxo OAuth (redirect para Google) |
| `/api/google-ads/accounts` | GET | Lista contas acessíveis pelo usuário |
| `/api/google-ads/callback` | GET | Recebe code OAuth, troca por tokens, salva |

---

## Fluxo OAuth Google Ads

```
[Usuário clica "Autorizar com Google"]
        ↓
GET /api/google-ads/connect
  → monta URL OAuth com scopes adwords + userinfo
  → redirect para accounts.google.com/o/oauth2/v2/auth
        ↓
[Usuário autoriza no Google]
        ↓
GET /api/google-ads/callback?code=XXX
  → POST oauth2.googleapis.com/token (troca code por tokens)
  → GET googleapis.com/oauth2/v2/userinfo (pega email)
  → prisma.googleConnection.upsert (salva/atualiza tokens)
  → redirect /onboarding?success=connected
```

**Scopes solicitados:**
- `https://www.googleapis.com/auth/adwords`
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`

**Token Storage:** access_token e refresh_token salvos em texto no banco.
> TODO (segurança futura): criptografar com AES usando ENCRYPTION_KEY do .env

---

## Google Ads API — Detalhes Técnicos

### Versão atual: v25
Definida em **um único lugar**: `GOOGLE_ADS_API_VERSION` em `src/lib/google-ads.ts`, que exporta
também `GOOGLE_ADS_BASE_URL`. `google-ads-campaigns.ts` e `api/clients/[id]/campaigns/all/route.ts`
importam daí — nunca redeclarar a versão localmente. Pode ser sobrescrita pela env `GOOGLE_ADS_API_VERSION`.

Cada versão tem vida útil de ~9 meses. Script para detectar versão ativa:
```javascript
for (const v of ['v19','v20','v21','v22','v23','v24','v25']) {
  const r = await fetch(`https://googleads.googleapis.com/${v}/customers:listAccessibleCustomers`, {
    headers: { Authorization: `Bearer ${token}`, 'developer-token': DEV_TOKEN }
  });
  console.log(v, r.status);
  if (r.status !== 404) break;
}
```

### Endpoints utilizados

| Endpoint | Método | Função |
|---|---|---|
| `/customers:listAccessibleCustomers` | GET | Lista IDs de contas acessíveis |
| `/customers/{id}/googleAds:search` | POST | GAQL query para métricas |

### Queries GAQL implementadas

**Métricas por campanha (período):**
```sql
SELECT campaign.id, campaign.name,
       metrics.impressions, metrics.clicks,
       metrics.cost_micros, metrics.conversions
FROM campaign
WHERE segments.date BETWEEN 'YYYY-MM-DD' AND 'YYYY-MM-DD'
  AND metrics.impressions > 0
ORDER BY metrics.cost_micros DESC
```

**Métricas diárias (para o gráfico):**
```sql
SELECT segments.date,
       metrics.impressions, metrics.clicks,
       metrics.cost_micros, metrics.conversions
FROM campaign
WHERE segments.date BETWEEN 'YYYY-MM-DD' AND 'YYYY-MM-DD'
ORDER BY segments.date ASC
```

**Conversão de custo:** `cost_micros / 1_000_000 = valor em BRL`

### Limitações do Token de Teste
- `listAccessibleCustomers` → funciona (retorna IDs)
- `customers/{id}` GET detalhes → 404 (endpoint diferente em v20)
- GAQL queries em contas reais → 403 `DEVELOPER_TOKEN_NOT_APPROVED`
- **Solução:** aplicar Basic Access em `ads.google.com/aw/apicenter` (pendente)
- **Fallback atual:** dados de demonstração gerados em `google-ads-campaigns.ts`

---

## Componentes e Libs Principais

### `src/lib/google-ads.ts`
- `getValidAccessToken(tokens)` — retorna token válido, renova se expirar em < 5min
- `listAccessibleAccounts(tokens)` — lista contas com detalhes (fallback para ID formatado)
- `formatCustomerId(id)` — formata `8601115683` → `860-111-5683`

### `src/lib/google-ads-campaigns.ts`
- `fetchCampaignData(tokens, customerId, startDate, endDate)` — busca via GAQL, fallback para mock
- `generateSampleData(startDate, endDate)` — dados de demonstração realistas
- Tipos exportados: `CampaignMetric`, `DailyMetric`, `CampaignData`

### `src/lib/prisma.ts`
- Singleton com `globalThis` para evitar múltiplas instâncias em dev
- Usa `PrismaPg` adapter (obrigatório no Prisma 7)

### `src/lib/auth.ts`
- NextAuth v5 com provider `Credentials`
- Callbacks `jwt` e `session` injetam `user.id`
- Páginas: `signIn: "/login"`

### `src/components/toast.tsx`
- Context `ToastContext` + hook `useToast()` + provider `ToastProvider`
- `addToast(message, type)` — tipos: `success | error | warning | info`
- Auto-dismiss em 4.5s, animação CSS `toastIn` (slide from right)
- Container fixo top-right, z-index 9999

### `src/components/providers.tsx`
- Wrapper client-side que encapsula o `ToastProvider`
- Usado em `app/layout.tsx` para disponibilizar toast em toda a app

### `src/components/dashboard-shell.tsx`
- Client component que gerencia estado `sidebarOpen` para mobile
- Renderiza Sidebar + Header + `InactivityLogout` + children
- Sidebar: `fixed` no mobile (drawer), `static` no desktop (lg+)
- Overlay escuro ao abrir sidebar no mobile

### `src/components/inactivity-logout.tsx`
- Monitora eventos: `mousemove, mousedown, keydown, touchstart, scroll, click`
- Chama `signOut` após 30 minutos sem atividade
- Retorna `null` (sem UI)

---

## Dashboard de Campanhas (`/clients/[id]/dashboard`)

### Funcionalidades
- **Filtro de mês:** dropdown com últimos 12 meses
- **Filtro de campanhas:** multiselect com busca por nome + selecionar todas
- **KPIs:** Valor Gasto, Conversões, Cliques, Impressões, CTR, CPC Médio
- **Gráfico de linhas:** 4 linhas togglávels por botão
  - Azul `#3B82F6` = Valor Gasto (eixo Y: money/direita)
  - Verde `#10B981` = Conversões (eixo Y: small/oculto)
  - Laranja `#F59E0B` = Cliques (eixo Y: volume/esquerda)
  - Roxo `#8B5CF6` = Impressões (eixo Y: volume/esquerda)
- **Tabela:** campanhas com impressões no período + linha de totais
- **Badge** "Dados de demonstração" quando `isSampleData: true`

### Fluxo de dados
```
Usuário muda mês
  → fetchData() → GET /api/clients/[id]/campaigns?year=&month=
  → API busca GoogleConnections do usuário
  → Para cada GoogleAdAccount do cliente:
      → fetchCampaignData() → GAQL query (ou mock se falhar)
  → Agrega campanhas + dailyMetrics de todas as contas
  → Retorna { isSampleData, campaigns[], dailyMetrics[] }
```

---

## Histórico de Decisões Técnicas

### Por que Next.js 16 com App Router?
SSR nativo facilita proteção de rotas no servidor, API routes integradas,
sem necessidade de backend separado para a escala do projeto.

### Por que Prisma 7 + @prisma/adapter-pg?
Prisma 7 removeu o engine binário nativo e migrou para adapters por plataforma.
Obrigatório instalar `@prisma/adapter-pg` e configurar no construtor do PrismaClient.

### Por que não usar cache (Redis)?
Volume pequeno (~5 clientes), dados em tempo real são preferidos pelo usuário.
Cache pode ser adicionado na Fase 5 se latência da API do Google for problema.

### Por que dados de demonstração em vez de bloquear?
Permite testar o fluxo completo da UI enquanto o Basic Access está pendente.
Garante que o produto está visualmente pronto para quando os dados reais chegarem.

---

## Problemas Conhecidos e Soluções

| Problema | Causa | Solução aplicada |
|---|---|---|
| `middleware.ts` ignorado | Next.js 16 deprecou o nome | Renomeado para `proxy.ts` |
| Prisma `url` no schema dá erro | Prisma 7 breaking change | URL vai em `prisma.config.ts` |
| `params` não é objeto | Next.js 16: params virou Promise | `const { id } = await params` |
| `err.errors` undefined | Zod v4 breaking change | Usar `err.issues` |
| Google Ads 404 HTML | Versão da API sunset | Detectar versão ativa (script acima) |
| Texto input transparente | Tailwind v4 reset | `globals.css`: `input { color: #333333 }` |
| Token OAuth expirado | 1h de vida do access_token | `getValidAccessToken()` renova automático |

---

## Próximas Fases

### Fase 5 — Polish
- [ ] Skeleton screens em todas as páginas com loading
- [ ] Tratamento visual de erros (toast notifications)
- [ ] Responsividade mobile completa
- [ ] Logout automático por inatividade
- [ ] Criptografia dos tokens no banco

### Fase 6 — Meta Ads
- [ ] OAuth via Facebook Login (Meta for Developers)
- [ ] Vincular Ad Accounts do Meta ao cliente
- [ ] Dashboard Meta com mesmas métricas
- [ ] Dashboard unificado Google + Meta por cliente

### Fase 7 — Deploy (futuro)
- Frontend: Vercel
- Banco: Supabase ou Railway PostgreSQL
- Atualizar OAuth redirect URIs no Google Cloud Console
- Atualizar `NEXTAUTH_URL` e `.env` de produção

---

## Configuração do Ambiente Local

```bash
# 1. Instalar dependências
npm install

# 2. Garantir PostgreSQL rodando
sc.exe query "postgresql-x64-16"

# 3. Criar banco (se necessário)
psql -U postgres -c "CREATE DATABASE ads_dashboard;"

# 4. Aplicar migrations
npx prisma migrate dev

# 5. Gerar cliente Prisma
npx prisma generate

# 6. Subir servidor
npm run dev
```

**Portas:** App → 3000 | PostgreSQL → 5432

---

## Log de Sessões

### Sessão 1 — 2026-05-07
- Setup completo do projeto (Next.js 16, Prisma 7, NextAuth v5)
- Descoberta e correção de breaking changes (proxy.ts, adapter pg, params Promise, Zod v4)
- Login, cadastro, layout com sidebar e header funcionando
- OAuth Google Ads completo com salvar tokens no banco
- CRUD de clientes com vínculo de contas Google Ads
- Campo alias para renomear contas (contorna limitação do token de teste)
- Dashboard de campanhas: filtros, gráfico de linhas (Recharts), tabela, KPIs
- Detecção automática de versão da Google Ads API (v20 em mai/2026)
- Fallback de dados de demonstração enquanto Basic Access está pendente
- Documentação criada (CLAUDE.md + docs/PROJECT.md)

### Sessão 2 — 2026-05-07 (Fase 5 — Polish)
- Toast notifications, sidebar mobile, skeleton screens, logout por inatividade, toast nos formulários

### Sessão 3 — 2026-05-08 (Fase 6 — Meta Ads + Reestruturação)
- **Filtro de datas:** substituído dropdown de mês por dois date inputs (De / até) em `/clients/[id]/dashboard`; API `campaigns` agora aceita `?startDate=&endDate=`
- **Schema:** novos modelos `MetaConnection` e `MetaAdAccount` (tabelas `meta_connections`, `meta_ad_accounts`); relações adicionadas em `User` e `Client`; migration `20260508020023_add_meta_ads`
- **Lib `meta-ads.ts`:** `exchangeLongLivedToken`, `getMetaUserInfo`, `listMetaAdAccounts` (Graph API v21.0)
- **Lib `meta-ads-campaigns.ts`:** `fetchMetaCampaignData` (Insights API) + `generateMetaSampleData`; mesmos tipos `MetaCampaignMetric`, `MetaDailyMetric`, `MetaCampaignData`
- **API routes Meta:** `GET /api/meta-ads/connect`, `GET /api/meta-ads/callback`, `GET /api/meta-ads/accounts`, `GET /api/clients/[id]/meta-campaigns`, `PATCH /api/clients/[id]/meta-accounts/[accountId]`
- **Integrações na sidebar:** item "Google Ads" substituído por "Integrações" collapsible com subitems Google Ads (`/integrations/google`) e Meta Ads (`/integrations/meta`); auto-abre quando path começa com `/integrations`
- **Páginas de integração:** `/integrations/google` (reutiliza componente onboarding); `/integrations/meta` com fluxo OAuth Meta, badge de configuração pendente se `META_APP_ID` não estiver no `.env`
- **Dashboard com abas:** `client-dashboard.tsx` agora tem abas "Google Ads" e "Meta Ads" no topo; aba Meta renderiza `meta-dashboard.tsx` (componente completo com filtros, KPIs, gráfico, tabela — idêntico ao Google mas usando `spend` em vez de `costBRL`); aba Meta mostra prompt de vínculo quando não há contas Meta no cliente
- **Novo cliente:** formulário atualizado para mostrar seções separadas Google Ads e Meta Ads; validação aceita ao menos 1 conta de qualquer plataforma; API `POST /api/clients` aceita `googleAccounts[]` e `metaAccounts[]`
- **Editar cliente:** seções separadas para aliases Google e Meta; PATCH correto para cada plataforma; fix de `params` como Promise no `page.tsx`
- **Env vars novas:** `META_APP_ID`, `META_APP_SECRET` (configurar em `developers.facebook.com`; callback URI: `http://localhost:3000/api/meta-ads/callback`)
- **Toast notifications:** `src/components/toast.tsx` — context + hook `useToast()` + provider com auto-dismiss e animação slide-in
- **Providers wrapper:** `src/components/providers.tsx` — encapsula ToastProvider, adicionado em `app/layout.tsx`
- **Mobile sidebar:** `src/components/dashboard-shell.tsx` — client component com estado `sidebarOpen`, drawer overlay no mobile, hamburger no header
- **Sidebar atualizada:** botão fechar (×) no mobile, fecha ao clicar em link de nav, aceita prop `onClose`
- **Header atualizado:** hambúrguer visível só no mobile (lg:hidden), nome do usuário oculto em telas xs
- **Logout por inatividade:** `src/components/inactivity-logout.tsx` — 30 min sem atividade → signOut automático
- **Skeleton screens:** `loading.tsx` para `/dashboard` e `/clients` — exibidos pelo App Router enquanto server components carregam
- **Toast nos formulários:** sucesso ao criar cliente, ao salvar alias; erro em falhas de API no dashboard e no form de novo cliente
- **Build verificado:** zero erros TypeScript, todas as 17 rotas compilando

### Sessão 4 — 2026-05-xx (Fase 7 — Sub-relatórios + Links Compartilháveis)
- **Sub-relatórios (Google + Meta):** criação, edição e exclusão de filtros nomeados por campanhas; chips de seleção rápida no topo do dashboard; modal com busca e toggle de campanhas
- **Links compartilháveis:** modelo `ShareLink` (token UUID, label, expiry opcional); API pública `/api/share/[token]/*`; página `/share/[token]` sem auth (proxy.ts atualizado); `SharedDashboard` somente-leitura com filtros, gráfico, funil e tabela; `ShareModal` para gerar, copiar e revogar links
- **Proteção de rotas:** `proxy.ts` substitui `middleware.ts` (Next.js 16 deprecou); `/share/*` liberado sem login

### Sessão 5 — 2026-06-16 (Fase 8 — Dados reais por campanha + URL routing)
- **Métricas diárias por campanha:** adicionado campo `campaignId: string` em `DailyMetric` (Google) e `MetaDailyMetric` (Meta); chave do mapa diário alterada para `campaignId:date`; GAQL atualizado com `campaign.id`; Meta API com `level=campaign`
- **Filtro de gráficos/KPIs preciso:** sub-relatório ativo filtra `dailyMetrics` pelos `campaignIds` exatos — eliminou a aproximação por proporção que antes distorcia os dados
- **URL única por sub-relatório:** selecionar sub-relatório navega para `?tab=google&sub=<id>` (ou `meta`); link é compartilhável e carrega já com filtro ativo; trocar aba ou desselecionar limpa o parâmetro
- **effectiveCampaigns:** `useMemo` derivado diretamente de `activeSubReport.campaignIds` — evita dessincronização de estado entre `router.push` e `setSelectedCampaigns`; aplicado em `chartData`, `totals`, `tableCampaigns` nos três dashboards (Google, Meta, compartilhado)
- **EditSubReportModal corrigido:** prop `knownCampaigns` (campanhas já carregadas no dashboard) como fallback quando API `/all` falha; `mergedCampaigns` garante que campanhas selecionadas sempre aparecem independente de status; novo layout "Selecionadas" + "Disponíveis" (removido grupo "Pausadas")
- **Google Ads API v21:** upgrade de v20 (sunset jun/2026)
- **Suspense boundary:** `page.tsx` do dashboard envolve `ClientDashboard` em `<Suspense>` para suportar `useSearchParams`

### Sessão 6 — 2026-06-17 (Visual — Funil de Performance)
- **FunnelMetrics redesenhado:** substituído `FunnelChart` do Recharts (afunilava proporcionalmente aos dados → virava agulha com impressões 2.5M vs conversões 15k) por SVG puro com triângulo equilátero fixo (300×260px ≈ 300×√3/2); três bandas horizontais iguais com separadores brancos; cada seção exibe número em destaque + label abaixo; legenda com percentuais mantida abaixo
- **Rotina de commit:** a partir desta sessão, cada commit deve incluir atualização deste log com descrição completa do que foi feito, para facilitar pesquisas futuras no histórico git

### Sessão 7 — 2026-06-27 (Debug — Investigação do saldo Meta)
- **Log de campos de saldo Meta:** `meta-ads-campaigns.ts` passou a logar os campos brutos retornados pela API para identificar qual continha o valor correto (saldo Meta estava vindo errado)
- **Endpoint temporário de inspeção:** `/api/debug/meta-balance` criado para inspecionar o retorno bruto da API Meta balance direto no navegador (removido depois, substituído pela página de Debug permanente)
- **Página de Debug — Meta Balance:** nova seção "Debug" (collapsible) na sidebar, após "Integrações", com item "Meta Balance"
  - Página `/debug/meta-balance`: tabela com histórico de chamadas à API do Meta — horário, cliente, conta, HTTP status, valor bruto (API), valor exibido e JSON expandível
  - Botões "Atualizar" (refresh via server) e "Limpar Logs"
  - API `GET/DELETE /api/debug/logs?endpoint=meta-balance`
  - `fetchMetaAdsBalance` passou a retornar também `rawData` e `httpStatus`, além do `balance`
  - Toda chamada de saldo Meta grava um log em `debug_api_logs` (falha silenciosa se o log não puder ser gravado)
  - **Novo modelo Prisma `DebugApiLog`** → tabela `debug_api_logs`; migration `20260627000000_add_debug_api_logs`

### Sessão 8 — 2026-06-28 (Fix — Migration pendente + saldo Meta correto)
- **Página Debug tolera migration pendente:** como o banco de produção (Supabase) não aplica migrations automaticamente ([[project-db-prod]]), a página `/debug/meta-balance` agora captura o erro de tabela inexistente e exibe um card com instrução visual + o SQL exato (`CREATE TABLE "debug_api_logs" ...`) para colar no Supabase SQL Editor, em vez de quebrar a página
- **Fix no saldo Meta:** o campo `balance` da API do Meta retornava valor incorreto para contas em BRL. O valor real está em `funding_source_details.display_string` (ex: `"Saldo disponível (R$1.042,37 BRL)"`), extraído via regex `R\$[\d.,]+`. Fallback para `balance` em centavos ÷ 100 quando `display_string` não existir
- Página Debug atualizada para mostrar `display_string` diretamente na coluna de valor

### Sessão 9 — 2026-06-29 (Feature — Sugestões de aumento de verba)
- **`fetchBudgetRecommendations()`** em `google-ads-campaigns.ts`: consulta GAQL no recurso `recommendation` do tipo `CAMPAIGN_BUDGET`, retornando orçamento atual, orçamento sugerido e impacto estimado em impressões
- **`GET /api/clients/[id]/recommendations`:** busca recomendações de todas as contas Google do cliente (exclui a MCC)
- **Dashboard:** botão lazy "Ver sugestões de aumento de verba" em `client-dashboard.tsx` — ao clicar, carrega e exibe cards com campanha, orçamento atual vs sugerido (+X%) e impacto esperado em impressões; seção fica oculta quando não há sugestões

### Sessão 10 — 2026-07-29 (Fix — Meta Ads exibindo dados de teste/demonstração)
- **Sintoma reportado:** usuário percebeu que o dashboard Meta Ads estava mostrando dados de demonstração em vez dos dados reais das contas vinculadas
- **Causa raiz:** `fetchMetaCampaignData` (`meta-ads-campaigns.ts`) tinha um `catch` genérico que caía silenciosamente em `generateMetaSampleData()` (5 campanhas fake hardcoded) sempre que a chamada à Graph API falhava por qualquer motivo, ou quando o período consultado retornava 0 campanhas reais. Diferente do Google Ads, esse fallback nunca tinha sido removido
- **Gatilho mais provável:** o token de acesso do Meta é long-lived mas expira em 60 dias e **não tem refresh token** (diferente do Google, que tem `getValidAccessToken()` renovando automaticamente). Passados os 60 dias sem reconectar, toda chamada à API falhava e caía no fallback fake — sem nenhum aviso visível além de uma tag âmbar discreta "Dados de demonstração". A página `/integrations/meta` também sempre mostrava badge verde "Ativo" independente do estado real do token
- **Correção aplicada:**
  - `generateMetaSampleData()` removida; `fetchMetaCampaignData` agora checa `expiresAt` antes de chamar a API e lança erro se expirado; erros da Graph API (incluindo código `190` = token inválido/expirado) são propagados com mensagem legível em vez de mascarados
  - `/api/clients/[id]/meta-campaigns` e `/api/share/[token]/meta-campaigns` retornam `{ error }` com status 502 em caso de falha, em vez de dados fake
  - `meta-dashboard.tsx` trata o erro real e mostra via toast (mesmo padrão já usado no Google Ads)
  - `/integrations/meta`: badge "Ativo" agora reflete `expiresAt` de verdade; conexão expirada mostra badge vermelho "Expirado — reconectar" com link direto para `/api/meta-ads/connect`
- **Como diagnosticar no futuro:** a página `/debug/meta-balance` já loga HTTP status + JSON bruto de cada chamada de saldo Meta (mesmo token/conta usado nas campanhas) — útil para confirmar rapidamente se o erro é token expirado (código 190)

### Sessão 11 — 2026-07-29 (Feature — Renovação automática de tokens Meta + hardening Google)
- **Pergunta do usuário:** existe forma de os tokens Meta/Google nunca expirarem, com renovação automática antes do vencimento?
- **Google:** já resolvido estruturalmente — `google-ads.ts` usa `access_type=offline`+`prompt=consent`, o Google emite `refresh_token` que não expira por tempo, e `getValidAccessToken()` já renova o access token automaticamente a cada chamada. Única ressalva fora do código: se a tela de consentimento OAuth no Google Cloud Console estiver em status "Testing" (não "In production"), o Google força expiração do refresh_token em 7 dias — não verificável via código, só no painel do Google Cloud
- **Hardening Google:** `callback/route.ts` corrigido — no `upsert.update`, `refreshToken` só é sobrescrito se o Google devolver um novo (`...(refresh_token ? { refreshToken: refresh_token } : {})`); antes, se por algum motivo o Google não devolvesse um refresh_token na reconexão, o código sobrescrevia com string vazia e quebrava a renovação automática
- **Meta:** não tem refresh_token nativo, mas a Graph API permite trocar um token long-lived **ainda válido** por um novo com mais 60 dias via o mesmo endpoint de troca (`fb_exchange_token`), sem o usuário reautorizar — desde que isso aconteça antes do vencimento
- **Implementado:** `GET /api/cron/refresh-meta-tokens` — rota protegida por `CRON_SECRET` (header `Authorization: Bearer`), busca `MetaConnection` com `expiresAt` a menos de 10 dias, renova via `exchangeLongLivedToken` (`meta-ads.ts`, já existia, reaproveitada) e persiste novo `accessToken`+`expiresAt`
- **`vercel.json`** criado com `crons: [{ path: "/api/cron/refresh-meta-tokens", schedule: "0 3 * * *" }]` — roda 1x/dia às 3h UTC
- **`CRON_SECRET`** adicionado ao `.env` local; **precisa ser configurado manualmente nas Environment Variables do projeto na Vercel** (Production) — não foi possível fazer via CLI nesta sessão porque o `vercel whoami` retornou token inválido (usuário não estava logado)
- Se o token de alguma conta já tiver expirado antes do cron rodar pela primeira vez, a renovação falha (Meta exige token ainda válido) e a única saída continua sendo reconectar manualmente em `/integrations/meta`

### Sessão 12 — 2026-07-29 (Fix — EditSubReportModal só mostrava campanhas já selecionadas)
- **Sintoma reportado:** ao editar um sub-relatório, só apareciam as campanhas já vinculadas (dava pra remover), mas não dava pra adicionar novas
- **Causa raiz:** a seção "Disponíveis" filtrava `allCampaigns` (vindo de `/api/clients/[id]/campaigns/all` ou `/meta-campaigns/all`, que busca TODAS as campanhas ativas da conta, sem filtro de período) por `status === "ENABLED" || status === "ACTIVE"`. Se essa chamada falhasse silenciosamente (instabilidade da API, token) ou nenhuma campanha batesse o status esperado, a seção "Disponíveis" ficava vazia e só sobravam as selecionadas (via fallback `knownCampaigns`)
- **Correção:** a lista de "adicionar" agora usa `knownCampaigns` (= `data.campaigns` do dashboard, já filtrado pelo período de datas selecionado) em vez de `allCampaigns`/status — elimina a dependência da chamada externa para essa lista e alinha com o pedido: mostrar primeiro as selecionadas, depois as que têm impressão no período filtrado
- `allCampaigns`/`/all` continuam existindo só como fallback de nome/status para campanhas selecionadas que estejam fora do período filtrado atual (para nunca sumirem da seção "Selecionadas")
- Label da seção renomeado para "Disponíveis no período filtrado" para deixar claro a origem dos dados
- `CampaignRow` teve o tipo do prop `campaign` relaxado para `{ id, name }` (só o necessário para renderizar), já que a lista `addable` agora vem de `knownCampaigns` sem campo `status`

### Sessão 13 — 2026-08-01 (Feature — Controle de Orçamento)
- **Pedido:** botão "Controle de Orçamento" no cabeçalho do dashboard do cliente, para registrar verba mensal por sub-relatório e comparar com o gasto real (Google + Meta), com uma regra de imposto específica do Meta
- **Planejamento:** duas rodadas de esclarecimento com o usuário antes de implementar — confirmado que (1) cada linha representa um `SubReport` real (não um seletor de canal livre) e o canal exibido vem do próprio sub-relatório, (2) o fallback "Total {Canal}" vale por canal independentemente (não só quando o cliente não tem nenhum sub-relatório), (3) campanhas fora de sub-relatórios ficam fora de escopo, (4) página própria (não modal), (5) barra de progresso simples em vez de gráfico radial
- **Modelo novo:** `BudgetEntry` (tabela `budget_entries`) — `clientId`, `subReportId` (nullable, null = linha fallback), `channel`, `year`, `month`, `amount` (Float). `@@unique([clientId, subReportId, year, month])`; nome escolhido para não colidir com `BudgetRecommendation` (feature nativa de sugestão de verba do Google Ads, já existente e não relacionada)
- **`src/lib/budget.ts`** (novo): `META_TAX_GROSS_UP_DIVISOR = 0.8785` (imposto de 12,15% só sobre gasto Meta) + `grossUpMetaSpend()`, `monthRange()` (mesma convenção de "primeiro dia do mês / hoje se mês corrente" já usada 4x no projeto), e os tipos `BudgetRow`/`GetBudgetResponse` compartilhados entre a rota e o componente
- **`GET/POST /api/clients/[id]/budget`**: GET agrega gasto ao vivo (sem cache) de `fetchCampaignData`/`fetchMetaCampaignData` por conta, somando por campanha num `Map` (mesmo padrão de `dailyMetrics` das rotas existentes, só que sem sufixo de data); cada canal tem try/catch independente para erro num canal não derrubar o outro. POST valida com Zod e salva em lote dentro de `$transaction`, usando `findFirst`→`update`/`create` em vez de `upsert` (a constraint única não protege sozinha a linha fallback com `subReportId: null`, já que Postgres trata NULLs como distintos em índice único — aceitável pra essa escala de ~5 clientes)
- **Página `/clients/[id]/budget`**: mesmo padrão de `clients/[id]/edit/` (`page.tsx` server + `budget-control.tsx` client); trata migration pendente exatamente como `/debug/meta-balance` (tenta `prisma.budgetEntry.count()`, mostra card com SQL se falhar)
- **`BudgetRowCard.tsx`** (novo, `src/components/budget/`): nome + select de canal travado (não editável — motivo: `SubReport` não tem constraint único em `(clientId, channel, name)`, então a chave seríável é sempre o `subReportId` real) + input de verba + barra de progresso CSS pura (sem lib de gráfico) + "+ detalhes" expansível com gasto por campanha
- **Migration local aplicada** (`20260801013359_add_budget_entries`) — **ainda não aplicada em produção**, precisa rodar o SQL manualmente no Supabase SQL Editor antes do deploy (ver [[project-db-prod]])
- `npx tsc --noEmit` limpo; `npm run build` bateu no mesmo erro de ambiente já visto (`UNKNOWN: unknown error, read` no worker de TypeScript do Next, Windows/OneDrive) — não relacionado ao código desta feature

### Sessão 14 — 2026-08-01 (Redesign — Controle de Orçamento: cards animados + cadastro manual)
- **Pedido de ajuste:** a tela recém-criada estava errada — usuário queria (1) cards de resumo no topo (nome do sub-relatório + gráfico de barra Planejado vs. Executado, "só isso"), (2) abaixo, um cadastro que **não vem pré-montado**: botão "+" adiciona uma linha vazia com 3 campos independentes — sub-relatório, canal, valor — e mais um "+" adiciona outra linha; não pode cadastrar duas vezes o mesmo (sub-relatório, canal), e se tentar, a segunda linha fica destacada em vermelho com "Duplicado"; os cards do topo devem animar de 0 até o total (barra e número) usando **GSAP**
- **Mudança de mecânica:** isso reverteu a decisão da Sessão 13 de "canal travado, herdado do `SubReport`" — agora sub-relatório e canal são dois campos **livres** que o usuário combina manualmente. A resolução (nome, canal) → `subReportId` real acontece no client (`resolveSubReportId()` em `budget-control.tsx`), procurando em `data.subReports` (lista crua devolvida pelo GET). O vínculo salvo no banco continua sendo pelo `subReportId` real (nunca pelo par nome+canal — `SubReport` não tem constraint único nisso, gotcha #13 do CLAUDE.md)
- **`npm install gsap`** — nova dependência, usada só em `BudgetSummaryCard.tsx`
- **`BudgetRowCard.tsx` removido**, substituído por:
  - **`BudgetSummaryCard.tsx`** (cards do topo): duas barras (Planejado/Executado) + dois contadores numéricos, todos animando de 0 até o valor via `gsap.context()` + `gsap.fromTo` (barras, `height: 0% → X%`) e `gsap.to` num objeto `{budget, spent}` com `onUpdate` escrevendo direto em `textContent` via `ref` (evita re-render do React a cada frame). Sem "+ detalhes" — removido, já que o pedido foi "card só com nome + gráfico de barra, só isso"
  - **Editor manual em `budget-control.tsx`**: estado local `FormRow[]` (`{key, subReportName, channel, amount}`), começa vazio e é populado com uma linha por orçamento já salvo (pra permitir editar sem perder o que já existe) + "+" adiciona linha vazia; select de sub-relatório lista nomes distintos de `data.subReports` + opção `TOTAL_SENTINEL` ("Total (sem sub-relatório)"); select de canal é filtrado dinamicamente pelas opções válidas daquele nome (ou por `availableChannels` se for Total)
- **Detecção de duplicata**: client-side, a partir da 2ª ocorrência de uma chave `subReportId (ou "total") + canal` já vista nas linhas, marca a linha com badge vermelho "Duplicado" e desabilita o Salvar; validado de novo no servidor (400 se o payload tiver duplicata)
- **`GET/POST /api/clients/[id]/budget` reescritos**: GET agora retorna só o que **já foi salvo** naquele mês (`entries`), mais `subReports` (lista crua) e `availableChannels` pra montar os selects — não monta mais linhas automáticas por sub-relatório nem fallback "Total {Canal}" quando o canal não tem sub-relatório (isso virou uma opção manual, não automática). POST agora é **declarativo**: dentro da `$transaction`, primeiro apaga do banco qualquer entrada do mês que não esteja mais na lista enviada (permite remover linha pelo "✕" e refletir no banco), depois faz `findFirst`→`update`/`create` — o filtro do `findFirst` passou a incluir `channel` (antes só `clientId+subReportId+year+month`, o que confundia "Total Google" com "Total Meta" quando ambos têm `subReportId: null`)
- **`src/lib/budget.ts`**: `BudgetRow`/`BudgetCampaignBreakdown`/`GetBudgetResponse.totals` removidos (não são mais necessários sem o "+ detalhes" e sem os subtotais por canal); novos tipos `SubReportOption`, `BudgetEntryRow`, `TOTAL_SENTINEL`
- `npx tsc --noEmit` limpo. Não testado no navegador — sem credenciais de login local

### Sessão 15 — 2026-08-10 (Fix — Google Ads API v21 sunset, upgrade para v25)
- **Sintoma:** ao abrir a dashboard do Google, toda chamada falhava com `Request contains an invalid argument` e, no detalhe, `GoogleAdsFailure` → `requestError: UNSUPPORTED_VERSION` / `"Version v21 is deprecated. Requests to this version will be blocked."`
- **Causa:** **v21 fez sunset em 05/08/2026** (anunciado no Google Ads Developer Blog). Não é depreciação com aviso — a partir da data o endpoint simplesmente rejeita tudo, sem período de carência. A versão foi para v21 na Sessão 5 e ficou fixa desde então
- **Correção:** upgrade para **v25** (última estável, lançada em 22/07/2026 — dá o maior tempo de vida até o próximo sunset). Confirmado por probe HTTP que v22–v25 existem e v26 ainda não (404)
- **Versão centralizada:** a string `"v21"` estava **duplicada em 3 arquivos** (`src/lib/google-ads.ts`, `src/lib/google-ads-campaigns.ts`, `src/app/api/clients/[id]/campaigns/all/route.ts`), cada um montando seu próprio `BASE_URL`. Agora `google-ads.ts` exporta `GOOGLE_ADS_API_VERSION` e `GOOGLE_ADS_BASE_URL`, e os outros dois importam — o próximo sunset se resolve mudando **uma** linha
- **Override por env:** `GOOGLE_ADS_API_VERSION` no `.env` sobrescreve o default (`process.env.GOOGLE_ADS_API_VERSION ?? "v25"`), pra dar rollback rápido pra v24 se v25 quebrar algo sem precisar editar código
- **Verificação:** `npx tsc --noEmit` limpo. **Não validado com chamada real à API** — o `.env` local aponta pro Postgres local (sem `google_connections` cadastradas) e o `.env.vercel.local` vem com `DATABASE_URL`/`DIRECT_URL` vazios (Vercel não exporta valores sensíveis no pull), então não havia refresh token pra testar daqui. Confirmar abrindo a dashboard depois do deploy
- **`npm run build` falha localmente** com `UNKNOWN: unknown error, read` no passo "Running TypeScript" — **pré-existente**, reproduzido na árvore limpa via `git stash` antes de qualquer alteração. É flake do worker do Next no Windows/OneDrive, não do código

### Sessão 16 — 2026-08-11 (Controle de Orçamento: cards por canal + tipografia Sora/Roboto)
- **Cards de resumo agrupados por canal:** antes todos os `BudgetSummaryCard` saíam numa grade única, misturando Google e Meta. Agora `groupByChannel()` (`budget-control.tsx`) agrupa as `entries` por canal e cada grupo vira uma `<section>` com headline própria (`Google`, `Meta`). Ordem definida por `CHANNEL_ORDER = ["google","meta"]`; canal fora dessa lista vai para o fim, em ordem alfabética — nada quebra se aparecer um canal novo
- **Layout escolhido pelo usuário (entre duas opções apresentadas): lado a lado no desktop.** Grade externa `grid-cols-1 lg:grid-cols-2` — acima de `lg` Google fica à esquerda e Meta à direita; abaixo de `lg` empilha na ordem do DOM (Google em cima, Meta embaixo). Grade interna de cards `grid-cols-1 sm:grid-cols-2`
- **Canal único ocupa a largura toda:** quando só um canal tem orçamento cadastrado, a grade externa vira `grid-cols-1` e a interna `sm:grid-cols-2 lg:grid-cols-3`, para não deixar meia tela vazia
- **Container `max-w-4xl` → `max-w-6xl`**, necessário para as duas colunas caberem sem espremer os cards (medido: 564px por coluna a 1152px de container)
- **Skeleton de carregamento** atualizado para o novo formato (duas colunas com headline + 2 cards cada), em vez da fileira de 3 cards
- **Tipografia nova (aplicada no app inteiro, não só nesta tela):** `Sora` para headlines e `Roboto` para o corpo, ambas via `next/font/google` em `app/layout.tsx`. As duas são **variable fonts** (confirmado no metadata do next/font), então um arquivo por família cobre toda a faixa de peso — `font-semibold`/`font-bold` continuam funcionando sem download extra
  - `globals.css`: `body` recebe Roboto 400; `h1`–`h6` recebem Sora 700. A regra dos headings vem **depois** do `@import "tailwindcss"` de propósito, porque o preflight reseta heading para `font-weight: inherit`
  - `@theme inline` agora define `--font-sans` (Roboto) e `--font-display` (Sora); o segundo gera o utilitário `font-display` para headline que não é heading. Também removidas as referências mortas a `--font-geist-sans` / `--font-geist-mono` (sobras do create-next-app, apontavam para variáveis que não existiam — o `body` estava caindo em `Arial`)
  - **Pegadinha:** classe de peso explícita num heading vence a regra base. Um `<h2 className="font-semibold">` fica Sora 600, não 700. As headlines desta tela usam `font-bold` explícito
- **Verificação:** `npx tsc --noEmit` limpo + conferido no navegador com o banco **local** populado por script temporário (usuário/cliente/sub-relatórios/orçamentos de demonstração, removidos depois). Confirmado em runtime: `h1`/`h2` computando `Sora` 700, `body` computando `Roboto` 400, grade externa `564px 564px` e ordem do DOM Google (3 cards) → Meta (2 cards). O gasto aparece R$ 0,00 porque o banco local não tem contas de anúncio vinculadas — isso é do ambiente, não do código
- **Não conferido:** screenshot do empilhamento mobile — a janela do Chrome não aceitou `resize_window` (maximizada). O comportamento depende só do breakpoint `lg` padrão do Tailwind e da ordem do DOM, ambos verificados

### Sessão 17 — 2026-08-11 (Sub-relatórios comuns a todos os canais)
- **Problema:** `SubReport` tinha coluna `channel` e pertencia a um canal só, então "Sub1" precisava existir duas vezes — um registro no Google, outro no Meta, sem relação entre si e sem nada no banco impedindo a duplicação de nome. Não havia um lugar onde "Sub1" significasse a mesma coisa nos dois canais
- **Modelo novo:** `SubReport` perde `channel` e `campaignIds`, ganha `@@unique([clientId, name])`. Campanhas vão para a tabela nova **`sub_report_campaigns`** (`subReportId + channel + campaignId`, único nessa tripla). Escolhida tabela normalizada em vez de prefixar IDs num array (`"google:123"`) porque IDs de campanha de Google e Meta são strings decimais sem prefixo, de espaços independentes — um canal novo agora é só dado
- **Armadilha resolvida junto:** `BudgetEntry` tinha `@@unique([clientId, subReportId, year, month])` **sem `channel`**. Funcionava porque "Sub1 Google" e "Sub1 Meta" eram `subReportId` diferentes; com sub-relatório único os dois passam a compartilhar o id e colidiriam no mesmo mês. Índice virou `@@unique([clientId, subReportId, channel, year, month])`. A lógica da aplicação já estava certa (o `findFirst` do POST já incluía `channel`), só o banco estava atrás
- **Reset:** migration `20260811000000_subreport_channel_agnostic` começa com `DELETE FROM "sub_reports"`, que leva junto por cascata os `budget_entries` vinculados. As linhas "Total (sem sub-relatório)" (`subReportId NULL`) sobrevivem
- **Decisões do usuário:** (1) orçamento continua por (sub-relatório, canal) — Sub1 tem verba de Google e outra de Meta, e o layout de duas colunas da Sessão 16 fica intacto; (2) reset direto, sem backup; (3) as duas abas listam **todos** os sub-relatórios, mesmo os sem campanha do canal ativo (aparecem zerados)
- **Módulos novos:**
  - `src/lib/channels.ts` — registro único de canais (`key`, `label`, `taxDivisor`, `allCampaignsPath`), mais `channelLabel`, `grossUpSpend(valor, canal)` e `compareChannels`. O gross-up de imposto deixou de ser um `if (channel === "meta")` espalhado e virou lookup no registro. `budget.ts` re-exporta `channelLabel`/`grossUpSpend` porque os componentes de orçamento já importavam de lá
  - `src/lib/sub-reports.ts` — tipo `SubReport` (com `campaignsByChannel: Record<string, string[]>`) + `campaignIdsFor`, `groupCampaignsByChannel`, `flattenCampaignsByChannel`, `totalCampaignCount`. O tipo saiu de dentro de `CreateSubReportModal.tsx`, de onde todo mundo importava
  - `src/lib/sub-reports-schema.ts` — schemas Zod das rotas, separado de `sub-reports.ts` porque este é consumido por componentes client e não vale arrastar zod para o bundle
  - `src/components/sub-reports/CampaignChannelPicker.tsx` — seletor compartilhado pelos dois modais: busca os dois endpoints `/campaigns/all` e `/meta-campaigns/all`, uma seção por canal, seleção como `Record<canal, string[]>`
- **API:** as rotas de sub-relatório entregam `campaignsByChannel` em vez de `campaignIds`; o filtro `?channel=` sumiu das duas listagens (autenticada e pública); PATCH substitui as campanhas declarativamente dentro de `$transaction` (`deleteMany` + `createMany`); nome repetido devolve **409** tratando `P2002`. As duas listagens degradam para `{ subReports: [] }` em vez de 500 se a tabela ainda não existir, para a janela entre aplicar o SQL e o deploy
- **`knownCampaigns` → `knownCampaignsByChannel`:** o modal agora abrange dois canais mas o dashboard-pai só tem os dados de um. O picker faz a união de `/all` com o que o pai conhece; se o `/all` de um canal falhar, mostra um aviso naquela seção em vez de silenciar. Isso muda o comportamento da Sessão 12 (que usava só `knownCampaigns` como fonte de "disponíveis"): agora é união, senão o canal da aba inativa ficaria sem opções
- **Controle de Orçamento:** com nome único por cliente, o cascata (nome → canal) sumiu. `FormRow.subReportName` virou `subReportId`, `resolveSubReportId()` e `channelsForName()` foram deletadas, e o select de canal lista sempre `availableChannels`
- **Dois bugs encontrados na verificação em navegador** (que o `tsc` não pegaria): `z.record(z.enum([...]), ...)` no **Zod v4 é exaustivo** — exige todas as chaves de canal, então `{ google: [...] }` era rejeitado com "expected array, received undefined". Isso quebrava o 409 de nome duplicado e qualquer PATCH parcial. Trocado por `z.record(z.string(), ...)` + refine nas chaves (gotcha #14)
- **Verificação:** `npx tsc --noEmit` limpo. No banco local, com um cliente com conta Google e Meta: Sub1 com campanhas dos dois canais retorna `campaignsByChannel: { google: ["111","222"], meta: ["900111"] }`; o Controle de Orçamento mostra Sub1 na coluna Google (R$ 12.000) **e** na coluna Meta (R$ 6.000), salva sem erro, e no banco as duas linhas compartilham o mesmo `subReportId` diferindo só no canal. Testados também: nome duplicado → 409, canal desconhecido → 400, sem campanha → 400, PATCH trocando Google por Meta → 200 com substituição correta
- **Não verificado:** os chips de sub-relatório renderizados nas duas abas do dashboard — eles só aparecem depois que as campanhas carregam, e o banco local só tem tokens falsos. A lista em si foi conferida pela resposta da API, que é a mesma para as duas abas
- **Causa raiz do build local quebrado (registrada como gotcha #17):** não era flake do Next. O `node_modules` está numa pasta sincronizada do OneDrive com **39.287 arquivos (525 MB) só na nuvem**; Turbopack e tsc falham ao lê-los com `os error 426`. Contornado hidratando `react-is` e `recharts` à mão para destravar o `next dev`

### Sessão 18 — 2026-08-17 (Fix — Resultados do Meta de qualquer tipo + abas por canal)
- **Sintoma reportado:** cliente novo **Palazzo Murano** (criado só com Meta) aparecia com **0 conversões** no dashboard, enquanto o gerenciador mostrava **30 resultados em agosto** — resultados de **conversas iniciadas**, não de leads. Pedido: "listar a quantidade de resultados independente do tipo de resultado". Segundo pedido: como o cliente só tem Meta, a aba do Google não deveria aparecer (e vice-versa)
- **Causa raiz:** `extractConversions()` em `meta-ads-campaigns.ts` filtrava o array `actions` por três substrings hardcoded — `purchase`, `lead`, `complete_registration`. Campanha de mensagens devolve `onsite_conversion.messaging_conversation_started_7d`, que não bate nenhuma delas → 0. Era uma heurística que só reconhecia três famílias de resultado
- **Descoberta que resolveu:** a Graph API expõe o campo oficial **`results`** — literalmente a coluna "Resultados" do gerenciador, já resolvida pelo Meta a partir do objetivo de cada campanha, qualquer que seja o tipo. Validado empiricamente contra uma conta real antes de implementar: funciona nos níveis `campaign`/`adset`/`ad`/`ad_account`, funciona com `time_increment=1` (necessário para o gráfico diário), e devolve `{ indicator, values:[{ value }] }`. Sem resultado no período vem só o `indicator`, sem `values` → 0. **Isso elimina a necessidade de mapear objetivo → action_type à mão**
- **Implementação (`src/lib/meta-ads-campaigns.ts`):**
  - `results` adicionado ao `fields=` das duas chamadas de insights (campanha e diária)
  - `extractResults()` lê `results` como fonte primária (aceitando shape array **e** objeto, defensivo) e cai na heurística antiga de `actions` se o campo não vier
  - `META_RESULT_LABELS` traduz o `indicator` para pt-BR (`actions:onsite_conversion.messaging_conversation_started_7d` → "Conversas iniciadas", `actions:leadgen.other` → "Leads (form)", etc). Tipo desconhecido cai no fallback: mostra o indicator cru sem o prefixo `actions:`, nunca quebra
  - **`fetchInsights()`** — helper que pede `results` e, se a Graph API responder erro de campo inexistente (code 100 mencionando o campo), **repete a chamada sem ele**. Uma incompatibilidade de versão degrada para a contagem antiga em vez de derrubar a aba Meta inteira
  - **O campo numérico continua se chamando `conversions`** de propósito: é o contrato compartilhado com o Google Ads, `FunnelMetrics`, Controle de Orçamento e página de share. Só foi adicionado `resultType?: string` em `MetaCampaignMetric`. **Nenhuma rota precisou mudar** — o `flatMap` de `r.campaigns` propaga o campo novo sozinho
- **Rótulos na UI:** "Conversões" → **"Resultados"** e "Custo/Conv." → "Custo/Result." nas duas abas (KPI, gráfico, tabela, funil) e na página de share. Na tabela de campanhas do Meta, o tipo aparece como sub-linha discreta sob o nome (`↳ Conversas iniciadas`). `FunnelMetrics` ganhou prop `conversionLabel` (default "Resultados") — o rótulo deixou de estar espalhado, então voltar atrás é uma linha por dashboard. **O cálculo do Google não foi tocado** — ele já conta todas as conversões configuradas na conta
- **Abas por canal:** não existe coluna de "canais" no schema — o canal é derivado de haver linha em `google_ad_accounts` / `meta_ad_accounts`. A página de share (`shared-dashboard.tsx`) **já fazia isso certo desde sempre**; a dashboard interna nunca recebeu o mesmo tratamento e renderizava as duas abas hardcoded. Replicado o padrão em `client-dashboard.tsx`: `hasGoogle`/`hasMeta`, filtro do array de abas, e estado inicial que só respeita o `?tab=` se aquele canal existir
  - **Armadilha resolvida junto:** o `useEffect` de sub-relatório do Google abortava com `urlTab === "meta"`. Num cliente só-Meta a URL não traz `?tab=`, então a condição virou `activeTab === "meta"` — senão o efeito do Google rodaria indevidamente
  - `fetchData` do Google sai cedo quando `!hasGoogle`, evitando uma chamada vazia por render
  - Cliente sem nenhum canal ganhou estado vazio com link para `/clients/[id]/edit`
- **`CampaignChannelPicker`** ganhou prop opcional `channels` (default: todos), repassada por `CreateSubReportModal`/`EditSubReportModal` — sem isso um cliente só-Meta via uma seção "Google" permanentemente vazia no modal de sub-relatório. **Cuidado registrado no código:** a prop é array e alimenta um `useEffect` de fetch, então a comparação é feita por uma **string** (`channels.join(",")`), não pela identidade do array — o pai passa um literal novo a cada render e comparar por identidade daria loop infinito de requisições
- **Listagem de clientes (`clients/page.tsx`):** o `findMany` só fazia `include` de `googleAdAccounts`, então Palazzo Murano aparecia como **"0 contas"** com a lista vazia. Passou a incluir `metaAdAccounts` e listar os dois canais, com uma tag de canal por linha
- **Sem migration** — nenhuma mudança de schema
- **Verificação:** `npx tsc --noEmit` limpo. Lógica de parsing do `results` testada contra os 7 shapes reais da API (array, objeto, indicator sem values, campo ausente, tipo desconhecido) — todos passaram. `npx eslint` nos arquivos alterados dá **exatamente o mesmo resultado do baseline** (8 problemas, todos pré-existentes, confirmado com `git stash`) — zero regressão de lint
- **Não verificado no navegador:** o banco local está vazio (0 clientes, 0 conexões Meta) e o classificador de permissões bloqueou os scripts de seed, então as abas e os 30 resultados **precisam ser confirmados em produção depois do deploy** — que é onde o Palazzo Murano existe com dados reais de qualquer forma. Se a v21 rejeitar o campo `results`, o `fetchInsights` degrada sozinho para a contagem antiga (a dashboard não quebra, só volta a mostrar 0 para campanhas de mensagem)
