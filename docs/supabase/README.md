# SQL histórico (versão Supabase)

Estes arquivos são **documentação** da versão antiga do app, quando os dados
ficavam em um projeto Supabase (hoje apagado).

**O app atual não usa nada daqui.** A versão em modo demonstração guarda tudo no
`localStorage` do navegador, através de:

- `src/lib/data/demo-data.ts` — dados iniciais
- `src/lib/data/demo-storage.ts` — leitura/gravação no navegador
- `src/lib/data/repository.ts` — camada única de acesso aos dados

Nenhum arquivo em `src/` importa este diretório. Ele é mantido apenas como
referência caso um backend volte a ser adotado no futuro.

| Arquivo | Conteúdo |
| --- | --- |
| `schema.sql` | Tabelas, RLS e triggers da versão Supabase |
| `migrations/001_recurring.sql` | Migração de agendamento recorrente |
