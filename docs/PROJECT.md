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
