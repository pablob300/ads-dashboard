# B300 Dashboard — CLAUDE.md

Arquivo carregado automaticamente em toda sessão Claude Code neste projeto.
Leia antes de qualquer ação. Atualize sempre que houver mudança relevante.

---

## O que é este projeto

Dashboard interno para gerenciamento de campanhas **Google Ads** (fase atual) e **Meta Ads** (fase futura).
Uso: ~5 clientes. Hospedagem: local (Windows 11). Dono: pablodavi@gmail.com

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
npm run build
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
GOOGLE_ADS_DEVELOPER_TOKEN  (token de teste — Basic Access pendente)
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
│   ├── (auth)/login/          Tela de login
│   ├── (auth)/register/       Tela de cadastro
│   ├── (dashboard)/
│   │   ├── layout.tsx         Layout protegido (auth check)
│   │   ├── dashboard/         Painel principal
│   │   ├── clients/           Listagem de clientes
│   │   ├── clients/new/       Criar cliente + vincular contas
│   │   ├── clients/[id]/dashboard/  Dashboard por cliente ← FASE 4
│   │   ├── clients/[id]/edit/ Renomear contas vinculadas
│   │   └── onboarding/        Conectar Google Ads (OAuth)
│   └── api/
│       ├── auth/[...nextauth]/  NextAuth handler
│       ├── auth/register/       Cadastro de usuário
│       ├── clients/             GET lista / POST criar
│       ├── clients/[id]/campaigns/  GET métricas Google Ads
│       ├── clients/[id]/accounts/[accountId]/  PATCH alias
│       ├── google-ads/connect/  Inicia OAuth Google Ads
│       └── google-ads/callback/ Recebe token OAuth
├── components/
│   ├── sidebar.tsx            Nav lateral (B300 Dashboard)
│   └── header.tsx             Topo com user + logout
├── lib/
│   ├── auth.ts                Config NextAuth
│   ├── prisma.ts              Singleton Prisma + adapter pg
│   ├── utils.ts               cn() helper
│   ├── google-ads.ts          OAuth tokens + listAccessibleAccounts
│   └── google-ads-campaigns.ts  GAQL queries (dados reais, sem fallback)
├── types/
│   └── next-auth.d.ts         Augmentation session.user.id
└── generated/prisma/          Cliente Prisma gerado (não editar)
```

---

## Google Ads API — estado atual

| Item | Valor |
|---|---|
| Versão API | **v20** (v18 e v19 já sunset em mai/2026) |
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
- `clients` — clientes gerenciados
- `google_ad_accounts` — contas Google Ads por cliente (campo `alias` para renomear)

---

## Gotchas / armadilhas já encontradas

1. **`proxy.ts`** — Next.js 16 deprecou `middleware.ts`. Renomear para `proxy.ts`.
2. **Prisma 7** — `url` sai do `schema.prisma` e vai para `prisma.config.ts`. Precisa de `@prisma/adapter-pg`.
3. **`params` como Promise** — em route handlers e pages do Next.js 16, sempre `await params`.
4. **Zod v4** — `err.errors[0]` virou `err.issues[0]`.
5. **Google Ads API versão** — verificar versão ativa. Em mai/2026 é v20. Script de detecção em `docs/PROJECT.md`.
6. **Token expirado** — `getValidAccessToken()` renova automaticamente se expirar em < 5 min.
7. **Texto inputs** — Tailwind v4 + globals.css: `input, textarea, select { color: #333333 }`.

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

---

## Próximos passos imediatos

- Configurar app Meta: criar em `developers.facebook.com`, adicionar `META_APP_ID` e `META_APP_SECRET` no `.env`, URI de callback: `http://localhost:3000/api/meta-ads/callback`

---

> Documentação detalhada em `docs/PROJECT.md`
