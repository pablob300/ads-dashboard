# B300 Dashboard — CLAUDE.md

Arquivo carregado automaticamente em toda sessão Claude Code neste projeto.
Leia antes de qualquer ação. Atualize sempre que houver mudança relevante.

---

## O que é este projeto

Dashboard interno para gerenciamento de campanhas **Google Ads** e **Meta Ads**.
Uso: ~5 clientes. Hospedagem: Vercel (produção) + local Windows 11 (dev). Dono: pablodavi@gmail.com

---

## Stack

| Camada | Tecnologia | Versão | Observações críticas |
|---|---|---|---|
| Framework | Next.js | **16.2.6** | App Router. `middleware.ts` → **`proxy.ts`**. `params` nas rotas é **Promise** (await obrigatório) |
| UI | React | 19.2.4 | |
| Tipos | TypeScript | 5.x | |
| Estilo | Tailwind CSS | **v4** | `@import "tailwindcss"` no globals.css |
| Banco | PostgreSQL | 16 | Serviço: `postgresql-x64-16`. Senha: `postgres` |
| ORM | Prisma | **7.8** | URL no `prisma.config.ts`, NÃO no schema. Adapter: `@prisma/adapter-pg` |
| Auth | NextAuth.js | v5 beta | `src/lib/auth.ts`. Sessão JWT. Augmentation em `src/types/next-auth.d.ts` |
| Validação | Zod | **v4** | `.errors` virou **`.issues`** |
| Gráficos | Recharts | 3.x | |
| Gerador cliente | Prisma Client | output: `src/generated/prisma` | |

---

## Comandos essenciais

```bash
# Dev (manter aberto no terminal)
cd "C:\Users\pablo\OneDrive\Desktop\B300\_B300\DASHBOARD CC\ads-dashboard"
npm run dev           # → http://localhost:3000

# Banco
npx prisma migrate dev --name <nome>
npx prisma generate

# Build (verificar antes de cada fase)
npm run build   # apenas next build — sem prisma migrate deploy
```

PostgreSQL service: `sc.exe query "postgresql-x64-16"`

---

## Variáveis de ambiente (.env — nunca commitar)

```
DATABASE_URL            postgresql://postgres:postgres@localhost:5432/ads_dashboard
NEXTAUTH_URL            http://localhost:3000
NEXTAUTH_SECRET         ads-dashboard-secret-key-change-in-production-32chars
GOOGLE_CLIENT_ID        570110895293-q5io4v0gqactjcq9pd4mmio97fbeuqts.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET    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
GOOGLE_ADS_DEVELOPER_TOKEN  (Basic Access aprovado)
GOOGLE_ADS_CLIENT_ID    igual ao GOOGLE_CLIENT_ID
GOOGLE_ADS_CLIENT_SECRET    igual ao GOOGLE_CLIENT_SECRET
ENCRYPTION_KEY          ads-dashboard-encryption-key-32c
META_APP_ID             (Facebook App ID — developers.facebook.com)
META_APP_SECRET         (Facebook App Secret)
```

---

## Estrutura de pastas (resumo)

```
src/
├── app/
│   ├── (auth)/login/              Tela de login
│   ├── (auth)/register/           Tela de cadastro
│   ├── (dashboard)/
│   │   ├── layout.tsx             Layout protegido (auth check)
│   │   ├── dashboard/             Painel principal
│   │   ├── clients/               Listagem de clientes
│   │   ├── clients/new/           Criar cliente + vincular contas
│   │   ├── clients/[id]/dashboard/  Dashboard por cliente
│   │   ├── clients/[id]/edit/     Renomear contas vinculadas
│   │   ├── onboarding/            Conectar Google Ads (OAuth)
│   │   └── integrations/          Integrações Google e Meta
│   ├── (shared)/share/[token]/    Dashboard público compartilhado
│   └── api/
│       ├── auth/                  NextAuth + register + change-password + forgot-password
│       ├── clients/               GET lista / POST criar
│       ├── clients/[id]/campaigns/      GET métricas Google Ads
│       ├── clients/[id]/meta-campaigns/ GET métricas Meta Ads
│       ├── clients/[id]/balance/        GET saldo Google + Meta por conta
│       ├── clients/[id]/accounts/       GET/POST/PATCH contas Google
│       ├── clients/[id]/meta-accounts/  GET/POST/PATCH contas Meta
│       ├── clients/[id]/sub-reports/    GET/POST/PATCH/DELETE sub-relatórios
│       ├── clients/[id]/share/          GET/POST/DELETE links de compartilhamento
│       ├── google-ads/            connect + callback + accounts
│       ├── meta-ads/              connect + callback + accounts
│       └── share/[token]/         Rotas públicas para dashboard compartilhado
├── components/
│   ├── sidebar.tsx                Nav lateral
│   ├── header.tsx                 Topo com user, avatar Gravatar e logout
│   ├── dashboard-shell.tsx        Layout wrapper (sidebar + header)
│   ├── inactivity-logout.tsx      Auto-logout após 30 min
│   ├── providers.tsx              Context providers
│   ├── toast.tsx                  Sistema de notificações
│   ├── ShareModal.tsx             Modal de links de compartilhamento
│   ├── ClientBalanceTooltip.tsx   Ícone "i" com saldo das contas no hover
│   └── sub-reports/               Componentes de sub-relatórios
│       ├── CreateSubReportModal.tsx
│       ├── EditSubReportModal.tsx
│       ├── DeleteConfirmDialog.tsx
│       ├── SubReportChips.tsx
│       ├── FunnelMetrics.tsx
│       └── MonthYearPicker.tsx
├── lib/
│   ├── auth.ts                    Config NextAuth
│   ├── prisma.ts                  Singleton Prisma + adapter pg
│   ├── utils.ts                   cn() helper
│   ├── email.ts                   Nodemailer + sendTempPasswordEmail
│   ├── share-token.ts             Validação e dados de links públicos
│   ├── google-ads.ts              OAuth tokens + listAccessibleAccounts + formatCustomerId
│   ├── google-ads-campaigns.ts    GAQL queries + fetchGoogleAdsBalance
│   ├── meta-ads.ts                OAuth Meta + listMetaAdAccounts
│   └── meta-ads-campaigns.ts      Graph API queries + fetchMetaAdsBalance
├── types/
│   └── next-auth.d.ts             Augmentation session.user.id
└── generated/prisma/              Cliente Prisma gerado (não editar)
```

---

## Google Ads API — estado atual

| Item | Valor |
|---|---|
| Versão API | **v21** (v20 foi sunset em jun/2026) |
| Developer Token | **Basic Access aprovado** — acessa contas reais |
| Basic Access | **✅ Aprovado** |
| OAuth Callback | `http://localhost:3000/api/google-ads/callback` |
| Scopes | `adwords`, `userinfo.email`, `userinfo.profile` |

**Dados reais ativos.** Fallback de demonstração removido de `google-ads-campaigns.ts`.
Erros da API são propagados e exibidos via toast no dashboard.

---

## Banco de dados — tabelas

- `users` — usuários do sistema
- `google_connections` — tokens OAuth por usuário (access + refresh + expiry)
- `meta_connections` — tokens OAuth Meta por usuário
- `clients` — clientes gerenciados
- `google_ad_accounts` — contas Google Ads por cliente (campo `alias` para renomear)
- `meta_ad_accounts` — contas Meta Ads por cliente
- `sub_reports` — relatórios filtrados por canal e campanhas
- `share_links` — links públicos de compartilhamento de dashboard

---

## Gotchas / armadilhas já encontradas

1. **`proxy.ts`** — Next.js 16 deprecou `middleware.ts`. Renomear para `proxy.ts`.
2. **Prisma 7** — `url` sai do `schema.prisma` e vai para `prisma.config.ts`. Precisa de `@prisma/adapter-pg`.
3. **Prisma 7 migrations** — `directUrl` NÃO é suportado em lugar nenhum (nem `schema.prisma` nem `prisma.config.ts`). Migrations são aplicadas manualmente via Supabase SQL Editor antes de cada deploy.
4. **`params` como Promise** — em route handlers e pages do Next.js 16, sempre `await params`.
5. **Zod v4** — `err.errors[0]` virou `err.issues[0]`.
6. **Google Ads API versão** — versão ativa é **v21** (v20 teve sunset em jun/2026).
7. **Token expirado** — `getValidAccessToken()` renova automaticamente se expirar em < 5 min.
8. **Texto inputs** — Tailwind v4 + globals.css: `input, textarea, select { color: #333333 }`.
9. **Supabase pooler porta 6543** — modo transaction, não suporta DDL. Nunca usar como DATABASE_URL para migrations.

---

## Fases do projeto

| Fase | Status | Descrição |
|---|---|---|
| 1 | ✅ Concluída | Login, cadastro, layout, banco, NextAuth |
| 2 | ✅ Concluída | OAuth Google Ads, salvar tokens, tela onboarding |
| 3 | ✅ Concluída | CRUD clientes, vincular contas, alias, listagem |
| 4 | ✅ Concluída | Dashboard por cliente: filtros, gráfico linhas, tabela campanhas |
| 5 | ✅ Concluída | Polish: toast notifications, sidebar mobile, skeleton screens, logout por inatividade |
| 6 | ✅ Concluída | Meta Ads: OAuth Facebook, vincular contas, dashboard com abas Google/Meta, Integrações na sidebar |
| 7 | ✅ Concluída | Sub-relatórios, links de compartilhamento público, funil de performance |
| 8 | ✅ Concluída | Tooltip de saldo por conta (Google + Meta), avatar Gravatar no header |

---

## Funcionalidades implementadas — detalhes técnicos

### Tooltip de saldo (`ClientBalanceTooltip`)
- Componente: `src/components/ClientBalanceTooltip.tsx`
- Props: `clientId: string`, `direction?: 'up' | 'down'` (padrão: `'up'`)
- Endpoint: `GET /api/clients/[id]/balance` → `{ googleAccounts, metaAccounts }`
- Aparece na listagem de clientes (`direction="up"`) e na dashboard interna (`direction="down"`)
- 1 conta por canal: `Google: R$ XX` / `Meta: R$ XX`
- Múltiplas contas: `Google - {nome}: R$ XX` / `Meta - {nome}: R$ XX`
- Google sem `account_budget` (pós-paga) → exibe "Pós-paga"
- Meta sem `balance` disponível → exibe `R$ 0,00`
- Google: consulta recurso `account_budget` via GAQL
- Meta: campo `balance` em `GET /v21.0/{accountId}?fields=balance` (valor já em BRL — não dividir por 100)

### Avatar Gravatar (`header.tsx`)
- Hash SHA-256 do email (minúsculo, sem espaços) via `crypto.subtle` — nativo do browser
- URL: `https://www.gravatar.com/avatar/{hash}?s=64&d=mp`
- `d=mp` exibe silhueta padrão para emails sem Gravatar cadastrado
- Fallback para círculo com iniciais enquanto hash é computado

---

> Documentação detalhada em `docs/PROJECT.md`
