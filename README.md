# HR Barber Shop

PWA de gestão para barbearia: agendamentos, clientes, barbeiros, serviços, financeiro e insights.
Feito com **Next.js (App Router) + TypeScript + Tailwind + Recharts + Lucide**.

> **Esta versão roda 100% em modo demonstração.**
> Não há banco de dados, API externa nem variáveis de ambiente: todos os dados ficam
> no `localStorage` do navegador e o app já abre com dados fictícios cadastrados.

---

## 1. Rodando o projeto

```bash
npm install          # instala dependências
npm run dev          # ambiente de desenvolvimento -> http://localhost:3000
# ou
npm run build && npm run start   # produção (o service worker/PWA só ativa em produção)
```

Abra **http://localhost:3000**. Não é preciso configurar nada.

### Acesso de demonstração

A tela de login é apenas demonstrativa (nenhuma rota do app fica bloqueada):

| Campo  | Valor                    |
|--------|--------------------------|
| E-mail | `admin@hrbarbershop.com` |
| Senha  | `123456`                 |

Também existe o botão **“Entrar na demonstração”**, que entra direto.

### Gerar os ícones do PWA (já vêm gerados)

```bash
npm run icons
```

---

## 2. Como funciona o armazenamento local

Toda a camada de dados é local e centralizada — nenhum componente fala direto com o
`localStorage`:

| Arquivo                        | Papel                                                              |
|--------------------------------|--------------------------------------------------------------------|
| `src/lib/data/demo-data.ts`    | dados iniciais (barbeiros, serviços, clientes, agendamentos, horários) |
| `src/lib/data/demo-storage.ts` | leitura/gravação no `localStorage` + cache em memória + reset       |
| `src/lib/data/repository.ts`   | CRUD e regras de negócio (a única API usada pelas telas)            |
| `src/lib/data/analytics.ts`    | métricas derivadas (dashboard, financeiro, insights)                |

- Chave usada: `hr-barber-shop:demo:v1`.
- Na primeira abertura os dados iniciais são gerados relativos à data de hoje e gravados.
- Toda alteração (criar, editar, excluir) é persistida e sobrevive ao recarregar a página.
- O acesso é sempre protegido por checagem de ambiente, então a renderização no servidor
  nunca toca o `localStorage` (sem erro de hidratação).
- Em **Configurações → Dados da demonstração** há o botão
  **“Restaurar dados de demonstração”**, que pede confirmação antes de apagar as alterações
  locais e voltar ao estado inicial.

---

## 3. Instalar como app no celular (PWA)

> O service worker só é registrado em **produção**. Faça o deploy (ex.: Vercel) ou rode
> `npm run build && npm run start` e acesse pelo IP da máquina no celular.

- **Android (Chrome):** menu (⋮) → **Instalar app / Adicionar à tela inicial**.
- **iPhone (Safari):** botão **Compartilhar** → **Adicionar à Tela de Início**.

O app instala como **HR Barber Shop**, em tela cheia e tema escuro.

---

## 4. Estrutura do projeto

```
src/
  app/
    layout.tsx              # root (AuthProvider, metadata PWA, fontes)
    page.tsx                # redireciona para /dashboard
    login/page.tsx          # tela de login (demonstração)
    (app)/                  # área do app (sidebar + bottom nav + header)
      layout.tsx            # AppShell (sem bloqueio de rota)
      dashboard/page.tsx
      agenda/page.tsx       # views dia / semana / mês + filtros
      clientes/page.tsx
      barbeiros/page.tsx
      servicos/page.tsx
      financeiro/page.tsx   # gráficos Recharts
      insights/page.tsx
      configuracoes/page.tsx
  components/
    brand/                  # Logo e monograma "HR"
    ui/                     # Button, Card, Field, Modal, ConfirmDialog, Misc
    layout/                 # Sidebar (recolhível no mobile), Header, BottomNav, AppShell, nav
    dashboard/              # StatCard
    agenda/                 # AppointmentModal, AppointmentCard, AppointmentDetail, RecurrenceSection
    clients/                # ClientModal, ClientDetail
    barbers/                # BarberModal
    services/               # ServiceModal
    charts/                 # Charts (área, barras, pizza)
    WhatsAppButton.tsx
  lib/
    auth/AuthProvider.tsx   # sessão local de demonstração
    data/                   # demo-data, demo-storage, repository, analytics
    utils/                  # format, whatsapp, cn, error, recurrence
    constants.ts            # marca, status, dias da semana
    hooks.ts / events.ts    # fetch + refetch reativo
  types/index.ts            # tipos do domínio
public/
  manifest.webmanifest      # PWA
  sw.js                     # service worker (offline + cache)
  icons/                    # ícones "HR" gerados
docs/supabase/              # SQL da versão antiga (documentação, não é usado pelo app)
scripts/generate-icons.mjs  # gerador de ícones PNG
```

---

## 5. Funcionalidades

- **Dashboard**: agendamentos de hoje, concluídos, pendentes, cancelamentos, faturamento do dia
  (somente concluídos) e do mês, próximos atendimentos, serviços mais realizados e desempenho
  por barbeiro — tudo calculado a partir dos dados locais.
- **Agenda**: visões **dia / semana / mês**, navegação por data, além de filtros por
  **cliente (busca)**, **barbeiro** e **status**.
- **Agendamento**: criar, editar, cancelar, excluir, alterar status, escolher cliente, barbeiro,
  serviço, data, horário e observação. O cliente é criado automaticamente se ainda não existir e
  duração/valor são preenchidos pelo serviço.
- **Conflito de horário**: um barbeiro não pode ter dois atendimentos sobrepostos. A validação
  considera a duração do serviço e exibe
  *“Este barbeiro já possui um atendimento nesse horário.”*
- **Agendamento recorrente**: semanal / quinzenal / mensal / personalizado, com prévia,
  detecção de conflitos (opção de criar apenas os horários livres) e escolha entre
  **“apenas este”** ou **“toda a série”** ao editar/excluir.
- **Clientes**: busca, CRUD, histórico de atendimentos, total gasto, última visita e serviço
  mais frequente.
- **Barbeiros**: CRUD, ativar/desativar, telefone, especialidade, horário de atendimento e
  desempenho individual.
- **Serviços**: CRUD, preço, duração, descrição e ativo/inativo.
- **Financeiro**: faturamento dia/semana/mês, ticket médio, contadores por status, gráficos e
  rankings por serviço, por barbeiro e por cliente.
- **Insights** automáticos (melhor dia, horário de pico, serviço campeão, barbeiro destaque,
  cancelamentos, ticket médio, cliente sumido, crescimento vs. mês anterior).
- **WhatsApp**: mensagens prontas de confirmação e retorno via `wa.me`.
- **Responsivo**: sidebar fixa no desktop, menu lateral recolhível e bottom nav no celular.

---

## 6. Status de agendamento

| Status           | Cor      |
|------------------|----------|
| Agendado         | azul     |
| Confirmado       | verde    |
| Em atendimento   | roxo     |
| Concluído        | dourado  |
| Cancelado        | cinza    |

O faturamento considera **somente** atendimentos concluídos.

---

## 7. Scripts

| Comando             | O que faz                        |
|---------------------|----------------------------------|
| `npm run dev`       | desenvolvimento (hot reload)     |
| `npm run build`     | build de produção                |
| `npm run start`     | servidor de produção (ativa PWA) |
| `npm run lint`      | lint                             |
| `npm run typecheck` | checagem de tipos (`tsc --noEmit`) |
| `npm run icons`     | regera os ícones do PWA          |
