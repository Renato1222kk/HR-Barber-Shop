# Bruno Samad Agenda

PWA premium de gestao para barbearia: agendamentos, clientes, servicos, financeiro e insights.
Feito com **Next.js (App Router) + TypeScript + Tailwind + Supabase + Recharts + Lucide**.

> O app ja roda **sem configurar nada** usando dados de demonstracao (mock).
> Ao preencher as variaveis do Supabase, ele passa a usar dados reais automaticamente.

---

## 1. Rodando o projeto

```bash
npm install          # instala dependencias
npm run dev          # ambiente de desenvolvimento  -> http://localhost:3000
# ou
npm run build && npm run start   # producao (PWA/service worker so ativa em producao)
```

Abra **http://localhost:3000** e clique em **Entrar** (no modo demo qualquer login funciona).

### Gerar os icones do PWA (ja vem gerados, rode so se quiser regerar)
```bash
node scripts/generate-icons.mjs
```

---

## 2. Configurar o Supabase (dados reais)

1. Crie um projeto em https://supabase.com.
2. Em **SQL Editor**, cole e rode todo o arquivo [`supabase/schema.sql`](supabase/schema.sql).
   Ele cria as tabelas, o RLS por usuario e um trigger que ja semeia servicos/horarios
   padrao quando um usuario novo se cadastra.
   > Ja inclui as tabelas de **agendamento recorrente**. Se voce rodou o schema antes
   > dessa funcionalidade existir, rode tambem [`supabase/migrations/001_recurring.sql`](supabase/migrations/001_recurring.sql).
3. Em **Authentication > Providers**, mantenha **Email** ativo. Crie seu usuario em
   **Authentication > Users > Add user** (email + senha) — esse sera o login do barbeiro.
4. Em **Project Settings > API**, copie a **Project URL** e a **anon public key**.
5. Crie o arquivo `.env.local` na raiz (copie de `.env.local.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

6. Reinicie o servidor (`npm run dev`). Pronto: agora o login usa o Supabase Auth e todos
   os dados sao persistidos com seguranca por usuario (RLS).

---

## 3. Instalar como app no celular (PWA)

> O service worker so e registrado em **producao**. Faca o deploy (ex.: Vercel) ou rode
> `npm run build && npm run start` e acesse pelo IP da maquina no celular.

- **Android (Chrome):** abra o site > menu (⋮) > **Adicionar a tela inicial / Instalar app**.
- **iPhone (Safari):** abra o site > botao **Compartilhar** > **Adicionar a Tela de Inicio**.

O app abre em tela cheia, tema escuro, com icone proprio — com cara de aplicativo nativo.

---

## 4. Estrutura do projeto

```
src/
  app/
    layout.tsx              # root (AuthProvider, metadata PWA, fontes)
    page.tsx                # redireciona p/ login ou dashboard
    login/page.tsx          # tela de login
    (app)/                  # area autenticada (sidebar + bottom nav + header)
      layout.tsx            # gate de autenticacao + AppShell
      dashboard/page.tsx
      agenda/page.tsx       # views dia / semana / mes
      clientes/page.tsx
      servicos/page.tsx
      financeiro/page.tsx   # graficos Recharts
      insights/page.tsx
      configuracoes/page.tsx
  components/
    ui/                     # Button, Card, Field, Modal, ConfirmDialog, Misc (badges, estados)
    layout/                 # Sidebar, Header, BottomNav, AppShell, nav
    dashboard/              # StatCard
    agenda/                 # AppointmentModal, AppointmentCard, AppointmentDetail, RecurrenceSection
    clients/                # ClientModal, ClientDetail
    services/               # ServiceModal
    charts/                 # Charts (area, barras, pizza)
    WhatsAppButton.tsx
  lib/
    supabase/client.ts      # cliente Supabase (null se nao configurado)
    auth/AuthProvider.tsx   # contexto de auth (Supabase ou demo)
    data/
      repository.ts         # CRUD unico (Supabase OU store em memoria)
      analytics.ts          # dashboard, financeiro e insights
      mock.ts / store.ts    # dados de demonstracao
    utils/                  # format, whatsapp, cn, recurrence (generateRecurringDates / findConflicts)
    constants.ts            # cores/labels de status, dias da semana
    hooks.ts / events.ts    # fetch + refetch reativo
  types/index.ts            # tipos do dominio
public/
  manifest.webmanifest      # PWA
  sw.js                     # service worker (offline + cache)
  icons/                    # icones gerados
supabase/schema.sql         # banco + RLS + seed
scripts/generate-icons.mjs  # gerador de icones PNG
```

---

## 5. Funcionalidades

- **Login** elegante com Supabase Auth (e modo demo).
- **Dashboard**: agendamentos do dia, faturamento previsto, proximo cliente, horarios livres,
  total de clientes, faturamento do mes e lista da agenda de hoje.
- **Agenda**: visoes **dia / semana / mes**, criar / editar / excluir / mudar status,
  cores por status (azul, verde, dourado, vermelho, cinza).
- **Novo agendamento**: cria o cliente automaticamente se ainda nao existir; auto-preenche
  duracao/valor pelo servico e calcula o termino.
- **Agendamento recorrente**: repetir toda semana / a cada 2 semanas / todo mes / personalizado,
  escolhendo um ou mais dias da semana e terminando em uma data ou apos X ocorrencias.
  Mostra **previa** antes de salvar, **detecta conflitos** (sem sobrescrever — opcao de criar
  apenas horarios livres) e, ao editar/excluir, pergunta **"apenas este" ou "toda a serie"**.
- **Clientes**: busca, CRUD, historico, total gasto, ultimo atendimento, servico mais frequente
  e botao de "chamar de volta" para clientes sumidos.
- **Servicos**: CRUD + ativar/desativar.
- **Financeiro**: faturamento dia/semana/mes, ticket medio, atendidos/faltas/cancelamentos,
  graficos (faturamento por dia, servicos mais vendidos, status) e ranking de clientes.
- **Insights** automaticos (melhor dia, horario de pico, servico campeao, faltas, ticket medio,
  cliente sumido, crescimento vs. mes anterior).
- **Configuracoes**: dados da barbearia, WhatsApp, intervalo, tema e horario por dia da semana.
- **WhatsApp**: botoes com mensagem pronta (confirmacao e retorno) via `wa.me`.
- **PWA** instalavel, responsivo mobile-first, sidebar no desktop e bottom nav no celular.

---

## 6. Status de agendamento

| Status     | Cor      |
|------------|----------|
| agendado   | azul     |
| confirmado | verde    |
| atendido   | dourado  |
| faltou     | vermelho |
| cancelado  | cinza    |

---

## 7. Scripts

| Comando             | O que faz                          |
|---------------------|------------------------------------|
| `npm run dev`       | desenvolvimento (hot reload)       |
| `npm run build`     | build de producao                  |
| `npm run start`     | servidor de producao (ativa PWA)   |
| `npm run lint`      | lint                               |
| `node scripts/generate-icons.mjs` | regera os icones do PWA |
