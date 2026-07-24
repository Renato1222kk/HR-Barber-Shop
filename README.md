# HR Barber Shop

PWA de gestão para barbearia: agendamentos, clientes, barbeiros, serviços, financeiro e insights.
Feito com **Next.js 14 (App Router) + TypeScript + Tailwind + Recharts + Lucide** e
**Supabase** (Postgres + Auth + Realtime) como banco de dados.

---

## 1. Requisitos

- **Node.js 18.17+** (recomendado 20+).
- Uma conta gratuita no **[Supabase](https://supabase.com)**.
- (Opcional) Conta na **[Vercel](https://vercel.com)** para o deploy.

---

## 2. Instalação

```bash
npm install
```

Depois configure o Supabase (seções 3 a 8) e rode:

```bash
npm run dev          # http://localhost:3000
```

---

## 3. Criar o projeto no Supabase

1. Acesse **https://supabase.com/dashboard** → **New project**.
2. Escolha nome, senha do banco (guarde só para você) e região (ex.: *South America (São Paulo)*).
3. Aguarde o provisionamento (~2 min).

---

## 4. Onde pegar a Project URL e a Publishable Key

No painel do projeto, vá em **Project Settings → API**:

- **Project URL** → variável `NEXT_PUBLIC_SUPABASE_URL`
  (ex.: `https://abcdefgh.supabase.co`).
- **Publishable key** (chave pública nova) → variável `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  - Se o seu projeto ainda mostra a **anon key** clássica, use-a em
    `NEXT_PUBLIC_SUPABASE_ANON_KEY` (o app aceita as duas; a Publishable tem prioridade).

> ⚠️ **Nunca** use no app a *service_role key*, a *secret key*, a senha do banco ou a
> connection string. Elas são administrativas e não podem chegar ao navegador.

---

## 5. Configurar o `.env.local`

Crie um arquivo `.env.local` na raiz (não commitado — já está no `.gitignore`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua_publishable_key
# (opcional) NEXT_PUBLIC_SITE_URL=https://seu-dominio.com
```

Há um modelo pronto em **`.env.example`**. Sem essas variáveis o app mostra uma mensagem
amigável de configuração em vez de quebrar.

---

## 6. Executar o `schema.sql`

1. No painel Supabase, abra **SQL Editor → New query**.
2. Copie **todo** o conteúdo de **`supabase/schema.sql`** e cole.
3. Clique em **Run**.

Isso cria as tabelas, índices, triggers de `updated_at`, o trigger que gera o `profile`
automaticamente, as políticas de **RLS**, a **proteção de conflito de horário** no banco
(exclusion constraint) e adiciona `appointments`/`financial_entries` ao **Realtime**.

---

## 7. Criar o usuário administrador

O usuário **não** é criado por SQL. Use uma destas opções:

- **Painel:** **Authentication → Users → Add user** (informe e-mail e senha).
  Marque *Auto Confirm User* para poder entrar na hora.
- **Pelo app:** se você habilitar cadastro no Supabase Auth, use o fluxo de cadastro.

Ao criar o usuário, o trigger `handle_new_user` já cria a linha correspondente em `profiles`.

---

## 8. (Opcional) Executar o `seed.sql`

Para dados de teste:

1. Copie o **UUID do seu usuário** em **Authentication → Users**.
2. Abra **`supabase/seed.sql`** e substitua `REPLACE_WITH_YOUR_USER_UUID` por esse UUID.
3. Cole no **SQL Editor** e **Run**.

O seed respeita `owner_id` e **não** cria usuários.

---

## 9. Rodar localmente

```bash
npm run dev
```

Abra **http://localhost:3000**, faça login com o usuário criado no passo 7.
As rotas privadas (`/dashboard`, `/agenda`, `/clientes`, `/barbeiros`, `/servicos`,
`/financeiro`, `/insights`, `/configuracoes`) exigem sessão válida.

---

## 10. A logo da marca

A logo oficial fica em **`public/hr-barber-shop-logo.jpeg`** e é usada (via `next/image`,
com proporção preservada / `object-contain`) no login, sidebar, cabeçalho mobile e
configurações. O favicon e os ícones do PWA usam o monograma **HR** em dourado
(`public/icons/`, regeneráveis com `npm run icons`).

> O arquivo incluído hoje é um **placeholder** com o monograma HR. Para usar a arte real,
> basta **substituir** `public/hr-barber-shop-logo.jpeg` pela imagem definitiva
> (mesmo nome e caminho). Se preferir manter o nome original `Logo Vitinho.jpeg`, rode:
> `git mv "public/Logo Vitinho.jpeg" public/hr-barber-shop-logo.jpeg`.

---

## 11. Deploy na Vercel

1. Suba o repositório para o GitHub.
2. Na Vercel: **New Project → Import** o repositório (framework detectado: Next.js).
3. Em **Settings → Environment Variables**, adicione as variáveis (seção 12).
4. **Deploy**.

### 12. Variáveis necessárias na Vercel

| Variável                                | Obrigatória | Descrição                         |
|-----------------------------------------|:-----------:|-----------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`              | ✅          | Project URL do Supabase           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | ✅*         | Publishable key                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`         | ✅*         | Alternativa à Publishable (compat)|
| `NEXT_PUBLIC_SITE_URL`                  | ➖          | URL pública (metatags de compart.)|

\* informe **uma** das duas chaves públicas.

No Supabase, em **Authentication → URL Configuration**, adicione a URL da Vercel em
**Site URL** e em **Redirect URLs** (ex.: `https://seu-app.vercel.app/redefinir-senha`)
para que a recuperação de senha funcione em produção.

---

## 13. Ativação do Realtime

O `schema.sql` já adiciona `appointments` e `financial_entries` à publicação
`supabase_realtime`. Se quiser conferir/ativar manualmente: **Database → Replication →
`supabase_realtime`** e marque as tabelas. No app, o hook `useRealtimeSync` assina
INSERT/UPDATE/DELETE e atualiza agenda, dashboard e financeiro **sem recarregar a página**.

---

## 14. Política de segurança (RLS)

- **RLS ativado em todas as tabelas.**
- Cada registro tem `owner_id` (default `auth.uid()`); em `profiles`, a chave é o próprio `id`.
- Políticas separadas de **SELECT / INSERT / UPDATE / DELETE**, sempre `auth.uid() = owner_id`
  (ou `auth.uid() = id` em `profiles`). **Nenhuma** política pública/`anon` ou `using (true)`.
- A regra de **conflito de horário** é garantida também no banco por uma *exclusion constraint*
  (`appointments_no_overlap`), o que elimina condição de corrida entre usuários simultâneos.
- No cliente usa-se apenas a **chave pública**; segredos administrativos nunca são expostos.

---

## 15. Migração dos dados do `localStorage`

Versões anteriores guardavam tudo no `localStorage` (modo demonstração). Se houver dados
antigos no navegador, a página **Configurações** mostra o cartão
**“Migrar dados da demonstração”**, que:

1. detecta e conta barbeiros, serviços, clientes e agendamentos antigos;
2. pede confirmação;
3. importa na ordem correta preservando os relacionamentos e evitando duplicados;
4. mostra o resultado e, só então, remove a base local antiga (marcando a migração como feita).

O `localStorage` passa a ser usado **apenas** para estado visual/preferências e para esse
importador único — **o banco principal é o Supabase**.

---

## 16. Estrutura do projeto

```
middleware.ts                 # renova a sessão e protege as rotas privadas
supabase/
  schema.sql                  # tabelas, RLS, triggers, conflito, realtime (rodar 1x)
  seed.sql                    # dados de teste opcionais (trocar o UUID)
src/
  app/
    layout.tsx                # root (AuthProvider, metadata + Open Graph, PWA)
    login/ recuperar-senha/ redefinir-senha/   # fluxo de autenticação
    (app)/                    # área privada (AuthGate + AppShell)
      dashboard agenda clientes barbeiros servicos financeiro insights configuracoes
  components/                 # brand (Logo), ui, layout, agenda, clients, barbers, services, charts, auth
  lib/
    supabase/                 # client.ts, server.ts, middleware.ts, env.ts
    auth/AuthProvider.tsx     # Supabase Auth (login, logout, recuperação, sessão)
    data/                     # repository (fachada), conflict, analytics, demo-migration
    realtime.ts               # assinatura Realtime
    utils/                    # format, whatsapp, cn, error, recurrence
  services/                   # camada de dados (client, barber, service, appointment, financial, settings, working-hours)
  types/                      # index.ts (domínio) + database.ts (schema)
public/
  hr-barber-shop-logo.jpeg    # logo da marca
  manifest.webmanifest sw.js icons/
```

---

## 17. Scripts

| Comando             | O que faz                          |
|---------------------|------------------------------------|
| `npm run dev`       | desenvolvimento (hot reload)       |
| `npm run build`     | build de produção                  |
| `npm run start`     | servidor de produção (ativa PWA)   |
| `npm run lint`      | lint                               |
| `npm run typecheck` | checagem de tipos (`tsc --noEmit`) |
| `npm run icons`     | regera os ícones do PWA            |
