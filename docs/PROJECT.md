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

### Versão atual: v20
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
