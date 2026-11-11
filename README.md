# Fixer

**Seu serviço, a um clique.** Aplicativo de celular (Android e iPhone) que conecta quem precisa de **frete pequeno** ou **montagem de móveis** a prestadores aprovados — e junta os dois no mesmo pedido.

> Documento do projeto (arquitetura, escopo do MVP, fases e decisões pendentes):
> https://claude.ai/artifact/T5HCbAna97MWVkaZDEeVGT

---

## O que já funciona (base do MVP)

| Parte | Cliente | Prestador |
| --- | --- | --- |
| Conta | Cadastro e login com e-mail e senha | Cadastro como CPF ou MEI, envio de RG/CNH/CCMEI, aprovação pela equipe |
| Pedido | Frete, montagem ou frete + montagem, com fotos, data e período | Vê pedidos abertos perto dele (raio em km), só das categorias que faz |
| Frete | Distância aproximada e faixa de preço sugerida | Vê veículo, ajudantes, andares e preço de referência |
| Propostas | Compara e aceita uma; as outras são recusadas | Envia valor e mensagem |
| Execução | Recebe a conclusão, tem 6h para confirmar ou contestar | Fotos de antes e depois, inicia e conclui o serviço |
| Privacidade | Endereço e telefone só aparecem para o prestador escolhido | Idem, ao contrário |

**Ainda não** (próximas fases, ver o documento): pagamento com reserva no cartão (Mercado Pago), código por SMS, notificações push, rota real pelo Google Maps, reagendamento, painel da loja parceira e painel admin.

## Tecnologias

Tudo em **TypeScript**.

- **App:** [Expo](https://expo.dev) (React Native) SDK 58 + Expo Router — `apps/mobile`
- **Banco, login, fotos e tempo real:** [Supabase](https://supabase.com) (Postgres + PostGIS) — `supabase/`
- **Tipos e regras compartilhadas** (status, cálculo do frete): `packages/shared`

```
fixer/
├── apps/mobile/            App Expo (cliente e prestador)
│   └── src/
│       ├── app/            Telas (cada arquivo é uma rota)
│       │   ├── (auth)/     entrar, cadastro
│       │   ├── cliente/    início, novo pedido, meus pedidos, detalhe do pedido
│       │   └── prestador/  pedidos perto, meus serviços, detalhe, documentos
│       ├── components/     botões, campos, cartões (visual Fixer)
│       ├── lib/            Supabase, login, pedidos
│       └── theme/          cores (#2563EB) e fonte Plus Jakarta Sans
├── packages/shared/        tipos, textos e estimativa de frete
├── supabase/migrations/    tabelas, regras de acesso (RLS) e funções
└── docs/                   arquitetura
```

## Como rodar

### 1. Pré-requisitos

- [Node.js](https://nodejs.org) 20 ou mais novo
- App **Expo Go** no celular (Play Store ou App Store)
- Uma conta grátis no [Supabase](https://supabase.com)

### 2. Criar o banco no Supabase

1. Crie um projeto novo no Supabase (região **São Paulo**).
2. Abra **SQL Editor**, cole o conteúdo de `supabase/migrations/20261111000000_inicial.sql` e clique em **Run**.
   (Ou, com a [CLI do Supabase](https://supabase.com/docs/guides/cli): `supabase link` e `supabase db push`.)
3. Para testar mais rápido, em **Authentication → Providers → Email**, desligue **Confirm email**.

### 3. Ligar o app ao banco

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
```

Preencha `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` com os dados de **Project Settings → API**.
Use só a chave **anon**; a **service_role** nunca vai para o app.

### 4. Abrir no celular

```bash
npm install
npm run mobile
```

Escaneie o QR code com a câmera (iPhone) ou com o Expo Go (Android).

### 5. Aprovar um prestador (enquanto não existe o painel admin)

Cadastre-se no app como prestador e, no **SQL Editor** do Supabase, rode:

```sql
update prestadores set status_aprovacao = 'aprovado'
where id = (select id from auth.users where email = 'email-do-prestador@exemplo.com');
```

Para ver os documentos enviados: **Storage → documentos**.

## Testar o fluxo completo

1. No celular 1, crie uma conta de **cliente** e faça um pedido de frete + montagem com foto.
2. No celular 2 (ou no mesmo, saindo da conta), crie uma conta de **prestador**, aprove pelo SQL acima e toque em **Usar minha localização**.
3. O prestador vê o pedido, envia uma proposta.
4. O cliente aceita. Os dois passam a ver endereço e telefone um do outro.
5. O prestador fotografa antes, inicia, fotografa depois e envia a conclusão.
6. O cliente confirma (ou contesta) em até 6h.

## Regras importantes no banco

- Ninguém vira **admin** pelo cadastro; isso só se muda direto no banco.
- O prestador **não consegue se aprovar** sozinho.
- Mudanças de status só acontecem pelas funções (`aceitar_proposta`, `iniciar_servico`, `enviar_conclusao`, `confirmar_conclusao`, `contestar_conclusao`, `cancelar_pedido`), que conferem quem está pedindo e em que etapa o pedido está.
- **Endereços e telefones** não podem ser lidos direto das tabelas; saem só por `dados_privados_do_pedido`, que responde apenas para o cliente e o prestador escolhido.
- Fotos e documentos ficam em pastas **privadas** no Storage.

## Comandos úteis

```bash
npm run mobile                              # abre o servidor do Expo
npm run typecheck                           # confere os tipos de todo o projeto
cd apps/mobile && npx expo export -p android  # gera o pacote do app (teste de build)
```

## Valores provisórios

A tabela de preço do frete em `packages/shared/src/index.ts` (`TABELA_FRETE`) é só um ponto de partida. A regra definitiva é uma das decisões pendentes no documento do projeto.
