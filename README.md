# HR Barber Shop

PWA de gestão para barbearia: agenda, clientes, barbeiros, serviços,
financeiro, insights e configurações.
Feito com **Next.js (App Router) + TypeScript + Tailwind + Supabase**.

Os dados ficam em um projeto **Supabase** (PostgreSQL + Auth + Realtime).
Atualizar a página não apaga nada, e abrir o sistema em outro computador
mostra exatamente os mesmos dados.

---

## 1. Requisitos

| Item | Versão |
| --- | --- |
| Node.js | 18.17 ou superior |
| npm | 9 ou superior |
| Conta no Supabase | o plano gratuito serve |

---

## 2. Instalação

```bash
npm install
```

---

## 3. Criar o projeto no Supabase

1. Acesse <https://supabase.com/dashboard> e clique em **New project**.
2. Dê um nome (ex.: `hr-barber-shop`), escolha uma senha forte para o
   banco e a região **South America (São Paulo)**.
3. Aguarde alguns minutos até o projeto ficar pronto.

> A senha do banco **não** é usada pelo aplicativo. Guarde-a com você e
> nunca coloque em nenhum arquivo do projeto.

---

## 4. Onde pegar a Project URL

No painel do projeto: **Settings → Data API → Project URL**.

É algo como `https://abcdefghijklm.supabase.co`.

---

## 5. Onde pegar a Publishable Key

No painel do projeto: **Settings → API Keys → Publishable key**.

Começa com `sb_publishable_...`. É uma chave **pública**: ela vai para o
navegador, e quem protege os dados são as políticas de RLS do banco.

> Projetos mais antigos mostram **anon public** no lugar. Nesse caso use
> `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Se as duas existirem, o aplicativo dá
> prioridade à publishable key.

> **Nunca** use a `service_role` / `secret key` no aplicativo: ela ignora
> todas as políticas de segurança.

---

## 6. Configurar o `.env.local`

Copie o modelo e preencha:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklm.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxx
```

O arquivo `.env.local` já está no `.gitignore` e **não** deve ir para o
GitHub. Se as variáveis faltarem, o aplicativo mostra uma tela explicando
o que preencher em vez de quebrar com um erro indefinido.

---

## 7. Executar o `schema.sql`

1. No painel do Supabase abra **SQL Editor → New query**.
2. Copie **todo** o conteúdo de `supabase/schema.sql`.
3. Cole e clique em **Run**.

O script é idempotente: pode ser executado de novo sem quebrar nada.

Ele cria:

- as tabelas `profiles`, `barbers`, `services`, `clients`,
  `recurring_groups`, `appointments`, `financial_entries`, `settings` e
  `working_hours`;
- índices, chaves estrangeiras e constraints;
- trigger de `updated_at` em todas as tabelas;
- trigger que cria `profiles`, `settings` e o horário de funcionamento
  padrão quando um usuário novo é criado no Auth;
- Row Level Security com políticas separadas de SELECT, INSERT, UPDATE e
  DELETE;
- a constraint que impede dois atendimentos simultâneos do mesmo
  barbeiro;
- o Realtime das tabelas `appointments` e `financial_entries`.

---

## 8. Criar o usuário administrador

O aplicativo **não** tem cadastro aberto: o acesso é criado no painel.

1. Vá em **Authentication → Users → Add user → Create new user**.
2. Preencha e-mail e senha.
3. Marque **Auto Confirm User** (senão o login pede confirmação por
   e-mail).
4. Clique em **Create user**.

O trigger `on_auth_user_created` cria automaticamente o perfil, as
configurações e o horário de funcionamento padrão dessa conta.

---

## 9. Executar o seed (opcional)

`supabase/seed.sql` cria alguns barbeiros, serviços, clientes,
agendamentos e lançamentos para testar as telas. Ele **não** cria
usuários.

1. Copie o UUID do usuário em **Authentication → Users** (coluna `UID`).
2. Abra `supabase/seed.sql` e troque o UUID na linha marcada com
   `<<< TROQUE AQUI >>>`:

   ```sql
   v_owner uuid := 'cole-aqui-o-uuid-do-seu-usuario';
   ```

3. Cole o arquivo inteiro no **SQL Editor** e execute.

Rodar duas vezes não duplica nada.

---

## 10. Rodar localmente

```bash
npm run dev
```

Abra <http://localhost:3000>. Sem sessão, você cai em
<http://localhost:3000/login>; com sessão, a entrada é a agenda
(<http://localhost:3000/agenda>).

Outros comandos:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run build       # build de produção
npm start           # roda o build
npm run icons       # regenera os ícones do PWA (public/icons/)
```

---

## 11. Deploy na Vercel

1. Suba o projeto para o GitHub (o `.env.local` não vai junto).
2. Em <https://vercel.com/new>, importe o repositório.
3. Framework: **Next.js** (detectado automaticamente).
4. Preencha as variáveis de ambiente (próxima seção).
5. Clique em **Deploy**.

Depois do primeiro deploy, volte ao Supabase em
**Authentication → URL Configuration** e ajuste:

- **Site URL**: `https://seu-projeto.vercel.app`
- **Redirect URLs**: `https://seu-projeto.vercel.app/auth/callback`

Sem isso, o link de recuperação de senha volta para `localhost`.

---

## 12. Variáveis necessárias na Vercel

Em **Settings → Environment Variables**, para os ambientes
Production, Preview e Development:

| Nome | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `NEXT_PUBLIC_SITE_URL` | *(opcional)* endereço final, usado nas prévias de compartilhamento |

Nenhuma chave secreta é necessária. Não adicione `SUPABASE_SECRET_KEY`
nem `SUPABASE_SERVICE_ROLE_KEY`.

---

## 13. Ativar o Realtime

O `schema.sql` já adiciona `appointments` e `financial_entries` à
publicação `supabase_realtime` e liga o `replica identity full`.

Para conferir no painel: **Database → Publications → supabase_realtime**.
As duas tabelas devem estar marcadas.

Com isso, criar ou alterar um agendamento em um aparelho atualiza a
agenda, os clientes, o financeiro e os insights nos demais, sem
recarregar a página.

---

## 14. Política de segurança

- **RLS ligada em todas as tabelas.** Nenhuma política é concedida ao
  papel `anon`: só usuários autenticados leem ou gravam.
- Cada registro tem `owner_id`, e a regra é `auth.uid() = owner_id`
  (em `profiles`, `auth.uid() = id`).
- Políticas separadas para SELECT, INSERT, UPDATE e DELETE — nada de
  `using (true)`.
- O navegador recebe apenas a chave publishable. Chaves administrativas,
  senha do banco e connection string nunca entram no código.
- As rotas privadas (`/agenda`, `/clientes`, `/barbeiros`,
  `/servicos`, `/financeiro`, `/insights`, `/configuracoes`) passam por
  duas barreiras: o `src/middleware.ts` e a checagem de sessão no layout do
  grupo `(app)`.
- **Conflito de horário** é garantido no banco por uma constraint de
  exclusão (`appointments_no_barber_overlap`), não só na tela. Se duas
  pessoas gravarem o mesmo horário ao mesmo tempo, uma passa e a outra
  recebe *"Este barbeiro já possui um atendimento nesse horário."*

---

## 15. Migração dos dados do localStorage

Quem usou a versão de demonstração tem dados salvos no navegador. Para
trazê-los:

1. Entre com o usuário criado no passo 8.
2. Vá em **Configurações**.
3. O cartão **"Migrar dados da demonstração"** aparece automaticamente,
   mostrando quantos barbeiros, serviços, clientes e agendamentos foram
   encontrados.
4. Clique em **Importar** e confirme.

A importação:

- respeita a ordem (barbeiros → serviços → clientes → agendamentos);
- preserva os vínculos entre os registros;
- não duplica o que já existe;
- mostra o resultado de cada tipo ao final;
- só apaga os dados antigos do navegador **depois** de terminar sem erro.

Concluída a importação, uma marca local impede que o cartão volte a
aparecer. O cartão só existe enquanto houver dados antigos.

---

## Estrutura do projeto

```
supabase/
  schema.sql                Schema completo (tabelas, RLS, triggers, realtime)
  seed.sql                  Dados de teste opcionais
public/
  hr-barber-shop-logo.jpeg  Logo oficial
  icons/                    Ícones do PWA (fundo branco)
  manifest.webmanifest      Manifesto de instalação
src/
  middleware.ts             Renova a sessão e protege as rotas privadas
  app/                      Rotas (App Router)
  components/               Interface
  hooks/use-realtime.ts     Assinatura do Realtime
  lib/supabase/             client / server / middleware / validação do env
  lib/data/analytics.ts     Financeiro, clientes e insights (cálculos)
  lib/data/migrate-demo.ts  Importador único do localStorage antigo
  services/                 Acesso ao banco (list/getById/create/update/remove)
  types/                    Tipos do domínio e do banco
```

Nenhum componente chama `.from()` direto: todo acesso ao banco passa por
`src/services`.

---

## Status dos agendamentos

| Banco | Interface |
| --- | --- |
| `agendado` | Agendado |
| `confirmado` | Confirmado |
| `em_atendimento` | Em atendimento |
| `concluido` | Concluído |
| `cancelado` | Cancelado |

O faturamento considera **apenas atendimentos concluídos** e os
lançamentos financeiros registrados. Agendamento cancelado nunca entra
como receita.

Todo agendamento novo nasce como `agendado`: o status não é escolhido no
formulário, muda pelos botões da tela de detalhes do atendimento
(confirmar, iniciar, concluir, cancelar).

O sistema atende **um único barbeiro**, então o formulário também não
pede essa escolha: `barber_id` e `barber_name` são preenchidos com o
primeiro barbeiro ativo (ordem por `created_at`). Sem nenhum barbeiro
ativo cadastrado o agendamento não é gravado — a tela pede o cadastro em
`/barbeiros`. Na edição, o barbeiro já vinculado ao agendamento é
mantido.

---

## A logo e o tema

A arte oficial fica em `public/hr-barber-shop-logo.jpeg` (1254×1254) e é
carregada com o componente `Image` do Next.js (`src/components/brand/Logo.tsx`).
Ela aparece no login, no menu lateral, no cabeçalho mobile, na tela de
carregamento, nas configurações e nas prévias de compartilhamento
(Open Graph / WhatsApp).

A imagem usa `object-contain` dentro de um quadro quadrado: nunca é
esticada nem cortada. `LogoMark` é a versão compacta (monograma), usada
onde não há espaço para o nome por extenso.

### Tema

A aplicação tem um único tema oficial: **claro**, predominantemente
branco. Os tokens ficam em `tailwind.config.ts`:

| Token | Cor | Uso |
| --- | --- | --- |
| `ink-50` | `#f8f9fa` | fundo das páginas |
| `white` | `#ffffff` | cards, sidebar, cabeçalho, modais |
| `ink-100` | `#f3f4f6` | hover e áreas secundárias |
| `ink-200` | `#e5e7eb` | bordas |
| `ink-500` | `#6b7280` | texto secundário |
| `ink-900` | `#111827` | texto principal |
| `ink-950` | `#111111` | botão primário, destaques |
| `gold` | `#c59b3d` | detalhes discretos (ícones, filetes) |

A coluna `settings.theme` continua existindo por compatibilidade e é
sempre gravada como `light`. Bancos criados antes desta versão precisam
da migração `supabase/migrations/001_theme_light.sql` — o check antigo só
aceitava `dark` e `gold`.

### Ícones do PWA

`npm run icons` regenera `public/icons/`. Sem dependências, o script
desenha o monograma **HR** em preto sobre branco, com um filete dourado.
Com `npm i -D sharp` instalado, ele passa a recortar a própria arte
oficial sobre fundo branco, com margem interna.
