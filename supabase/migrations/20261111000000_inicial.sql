-- Fixer — estrutura inicial do banco (MVP)
-- Tabelas, regras de acesso (RLS), funções de negócio e buckets de arquivos.

create extension if not exists postgis with schema extensions;

-- ============================================================
-- Tipos
-- ============================================================
create type public.tipo_usuario as enum ('cliente', 'prestador', 'loja', 'admin');
create type public.modalidade as enum ('cpf', 'mei');
create type public.status_aprovacao as enum ('pendente', 'aprovado', 'recusado');
create type public.tipo_documento as enum ('rg', 'cnh', 'ccmei');
create type public.status_documento as enum ('enviado', 'aprovado', 'recusado');
create type public.tipo_pedido as enum ('frete', 'montagem', 'frete_montagem');
create type public.status_pedido as enum (
  'aberto', 'com_propostas', 'aceito', 'em_andamento',
  'aguardando_confirmacao', 'concluido', 'cancelado', 'em_contestacao'
);
create type public.veiculo as enum ('carro', 'utilitario', 'van', 'caminhao_pequeno');
create type public.status_proposta as enum ('enviada', 'aceita', 'recusada', 'retirada');
create type public.momento_foto as enum ('pedido', 'antes', 'depois');
create type public.status_pagamento as enum (
  'reserva_pendente', 'reservado', 'cobrado', 'repassado', 'liberado', 'falhou'
);

-- ============================================================
-- Tabelas
-- ============================================================
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  telefone text,
  tipo public.tipo_usuario not null default 'cliente',
  foto_url text,
  criado_em timestamptz not null default now()
);

create table public.prestadores (
  id uuid primary key references public.perfis (id) on delete cascade,
  modalidade public.modalidade not null default 'cpf',
  cnpj text,
  status_aprovacao public.status_aprovacao not null default 'pendente',
  categorias public.tipo_pedido[] not null default '{montagem}',
  cidade text,
  localizacao extensions.geography (point),
  raio_km integer not null default 15 check (raio_km between 1 and 100),
  criado_em timestamptz not null default now()
);

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  prestador_id uuid not null references public.prestadores (id) on delete cascade,
  tipo public.tipo_documento not null,
  arquivo text not null, -- caminho no bucket "documentos"
  status public.status_documento not null default 'enviado',
  motivo_recusa text,
  criado_em timestamptz not null default now()
);

create table public.lojas (
  id uuid primary key default gen_random_uuid(),
  responsavel_id uuid references public.perfis (id),
  cnpj text not null unique,
  nome text not null,
  endereco text,
  quem_paga_montagem text not null default 'cliente' check (quem_paga_montagem in ('loja', 'cliente')),
  comissao_percentual numeric(5, 2) not null default 0,
  criado_em timestamptz not null default now()
);

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.perfis (id),
  loja_id uuid references public.lojas (id),
  prestador_id uuid references public.prestadores (id), -- preenchido no aceite
  tipo public.tipo_pedido not null,
  descricao text not null check (char_length(descricao) between 10 and 1000),
  endereco text not null,             -- endereço do serviço (montagem) ou de destino (frete)
  cidade text,
  localizacao extensions.geography (point),
  data_desejada date not null,
  periodo text not null default 'manha' check (periodo in ('manha', 'tarde', 'noite')),
  status public.status_pedido not null default 'aberto',
  valor_aceito numeric(10, 2),
  prazo_confirmacao timestamptz,      -- fim da revisão de 6h
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index pedidos_status_idx on public.pedidos (status);
create index pedidos_cliente_idx on public.pedidos (cliente_id);
create index pedidos_localizacao_idx on public.pedidos using gist (localizacao);
create index prestadores_localizacao_idx on public.prestadores using gist (localizacao);

create table public.detalhes_frete (
  pedido_id uuid primary key references public.pedidos (id) on delete cascade,
  origem text not null,
  origem_localizacao extensions.geography (point),
  destino text not null,
  distancia_km numeric(7, 2),
  veiculo public.veiculo not null default 'utilitario',
  ajudantes integer not null default 0 check (ajudantes between 0 and 3),
  andares_sem_elevador integer not null default 0 check (andares_sem_elevador between 0 and 30),
  preco_sugerido numeric(10, 2)
);

create table public.detalhes_montagem (
  pedido_id uuid primary key references public.pedidos (id) on delete cascade,
  tipo_movel text not null,
  quantidade integer not null default 1 check (quantidade between 1 and 50),
  loja_compra text
);

create table public.propostas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  prestador_id uuid not null references public.prestadores (id),
  valor numeric(10, 2) not null check (valor > 0),
  mensagem text check (char_length(mensagem) <= 500),
  status public.status_proposta not null default 'enviada',
  criado_em timestamptz not null default now(),
  unique (pedido_id, prestador_id)
);

create table public.fotos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  autor_id uuid not null references public.perfis (id),
  momento public.momento_foto not null,
  arquivo text not null unique, -- caminho no bucket "fotos"
  criado_em timestamptz not null default now()
);

create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null unique references public.pedidos (id) on delete cascade,
  valor numeric(10, 2) not null,
  comissao_fixer numeric(10, 2),
  comissao_loja numeric(10, 2),
  gateway_id text, -- id da transação no Mercado Pago
  status public.status_pagamento not null default 'reserva_pendente',
  atualizado_em timestamptz not null default now()
);

create table public.avaliacoes (
  pedido_id uuid primary key references public.pedidos (id) on delete cascade,
  prestador_id uuid not null references public.prestadores (id),
  nota integer not null check (nota between 1 and 5),
  comentario text check (char_length(comentario) <= 500),
  criado_em timestamptz not null default now()
);

-- Campos públicos de qualquer perfil (sem telefone). A view roda com o dono,
-- então só expõe estas colunas.
create view public.perfis_publicos as
  select p.id, p.nome, p.foto_url, p.tipo from public.perfis p;

-- ============================================================
-- Funções auxiliares
-- ============================================================
create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and tipo = 'admin');
$$;

create or replace function public.eh_prestador_aprovado()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from prestadores where id = auth.uid() and status_aprovacao = 'aprovado');
$$;

-- Quem pode ver um pedido: o cliente, o prestador escolhido, prestador aprovado
-- (se o pedido ainda está aberto) e o admin.
create or replace function public.pode_ver_pedido(p_pedido uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from pedidos pd
    where pd.id = p_pedido
      and (
        pd.cliente_id = auth.uid()
        or pd.prestador_id = auth.uid()
        or (pd.status in ('aberto', 'com_propostas') and eh_prestador_aprovado())
        or eh_admin()
      )
  );
$$;

-- Cria o perfil quando alguém se cadastra. O tipo vem do app, mas nunca vira admin.
create or replace function public.criar_perfil_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tipo tipo_usuario := case when new.raw_user_meta_data ->> 'tipo' = 'prestador'
                              then 'prestador' else 'cliente' end;
begin
  insert into perfis (id, nome, telefone, tipo)
  values (new.id,
          coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), 'Sem nome'),
          new.raw_user_meta_data ->> 'telefone',
          v_tipo);
  if v_tipo = 'prestador' then
    insert into prestadores (id, modalidade)
    values (new.id, case when new.raw_user_meta_data ->> 'modalidade' = 'mei' then 'mei'::modalidade else 'cpf'::modalidade end);
  end if;
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_novo_usuario();

create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger pedidos_atualizado_em before update on public.pedidos
  for each row execute function public.tocar_atualizado_em();

-- Primeira proposta muda o pedido para "com_propostas".
create or replace function public.marcar_pedido_com_propostas()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update pedidos set status = 'com_propostas' where id = new.pedido_id and status = 'aberto';
  return new;
end;
$$;

create trigger proposta_criada after insert on public.propostas
  for each row execute function public.marcar_pedido_com_propostas();

-- ============================================================
-- Funções de negócio (chamadas pelo app com supabase.rpc)
-- ============================================================

-- Cliente aceita uma proposta: as outras são recusadas e o pedido fica "aceito".
-- A reserva no cartão (Mercado Pago) entra aqui na fase 3.
create or replace function public.aceitar_proposta(p_proposta uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_pedido pedidos;
  v_prop propostas;
begin
  select * into v_prop from propostas where id = p_proposta and status = 'enviada';
  if not found then raise exception 'Proposta não encontrada ou já respondida'; end if;

  select * into v_pedido from pedidos where id = v_prop.pedido_id for update;
  if v_pedido.cliente_id <> auth.uid() then raise exception 'Este pedido não é seu'; end if;
  if v_pedido.status not in ('aberto', 'com_propostas') then
    raise exception 'Este pedido não aceita mais propostas';
  end if;

  update propostas set status = 'aceita' where id = v_prop.id;
  update propostas set status = 'recusada' where pedido_id = v_prop.pedido_id and id <> v_prop.id and status = 'enviada';
  update pedidos set status = 'aceito', prestador_id = v_prop.prestador_id, valor_aceito = v_prop.valor
    where id = v_prop.pedido_id;
  insert into pagamentos (pedido_id, valor) values (v_prop.pedido_id, v_prop.valor);
end;
$$;

-- Prestador começa o serviço.
create or replace function public.iniciar_servico(p_pedido uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update pedidos set status = 'em_andamento'
    where id = p_pedido and prestador_id = auth.uid() and status = 'aceito';
  if not found then raise exception 'Não é possível iniciar este serviço'; end if;
end;
$$;

-- Prestador envia a conclusão: começa a revisão de 6h do cliente.
create or replace function public.enviar_conclusao(p_pedido uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from fotos where pedido_id = p_pedido and momento = 'depois') then
    raise exception 'Envie pelo menos uma foto de depois';
  end if;
  update pedidos set status = 'aguardando_confirmacao', prazo_confirmacao = now() + interval '6 hours'
    where id = p_pedido and prestador_id = auth.uid() and status = 'em_andamento';
  if not found then raise exception 'Não é possível concluir este serviço'; end if;
end;
$$;

-- Cliente confirma a conclusão. A cobrança e o repasse entram aqui na fase 3.
create or replace function public.confirmar_conclusao(p_pedido uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update pedidos set status = 'concluido'
    where id = p_pedido and cliente_id = auth.uid() and status = 'aguardando_confirmacao';
  if not found then raise exception 'Não é possível confirmar este serviço'; end if;
end;
$$;

-- Cliente contesta dentro do prazo: vai para análise do admin.
create or replace function public.contestar_conclusao(p_pedido uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update pedidos set status = 'em_contestacao'
    where id = p_pedido and cliente_id = auth.uid() and status = 'aguardando_confirmacao'
      and prazo_confirmacao > now();
  if not found then raise exception 'O prazo de contestação terminou ou o pedido não pode ser contestado'; end if;
end;
$$;

-- Cliente cancela antes de alguém ser escolhido.
create or replace function public.cancelar_pedido(p_pedido uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update pedidos set status = 'cancelado'
    where id = p_pedido and cliente_id = auth.uid() and status in ('aberto', 'com_propostas');
  if not found then raise exception 'Este pedido não pode mais ser cancelado pelo app'; end if;
  update propostas set status = 'recusada' where pedido_id = p_pedido and status = 'enviada';
end;
$$;

-- Pedidos abertos dentro do raio do prestador, mais perto primeiro.
create or replace function public.pedidos_proximos()
returns table (
  id uuid, tipo tipo_pedido, descricao text, cidade text, data_desejada date,
  periodo text, status status_pedido, distancia_km numeric, criado_em timestamptz
)
language sql stable security definer set search_path = public, extensions as $$
  select pd.id, pd.tipo, pd.descricao, pd.cidade, pd.data_desejada, pd.periodo, pd.status,
         round((st_distance(pd.localizacao, pr.localizacao) / 1000)::numeric, 1) as distancia_km,
         pd.criado_em
  from pedidos pd
  join prestadores pr on pr.id = auth.uid() and pr.status_aprovacao = 'aprovado'
  where pd.status in ('aberto', 'com_propostas')
    and pd.tipo = any (pr.categorias || case when pd.tipo = 'frete_montagem'
                                             and 'frete' = any (pr.categorias)
                                             and 'montagem' = any (pr.categorias)
                                        then array['frete_montagem'::tipo_pedido] else '{}' end)
    and (pr.localizacao is null or pd.localizacao is null
         or st_dwithin(pd.localizacao, pr.localizacao, pr.raio_km * 1000))
    and not exists (select 1 from propostas p where p.pedido_id = pd.id and p.prestador_id = pr.id)
  order by distancia_km nulls last, pd.criado_em desc
  limit 50;
$$;

-- ============================================================
-- Regras de acesso (RLS)
-- ============================================================
alter table public.perfis enable row level security;
alter table public.prestadores enable row level security;
alter table public.documentos enable row level security;
alter table public.lojas enable row level security;
alter table public.pedidos enable row level security;
alter table public.detalhes_frete enable row level security;
alter table public.detalhes_montagem enable row level security;
alter table public.propostas enable row level security;
alter table public.fotos enable row level security;
alter table public.pagamentos enable row level security;
alter table public.avaliacoes enable row level security;

-- perfis: cada um vê e edita o seu; admin vê todos. Os outros veem perfis_publicos.
create policy "perfil: ver o meu" on public.perfis for select using (id = auth.uid() or public.eh_admin());
create policy "perfil: editar o meu" on public.perfis for update using (id = auth.uid());
revoke update on public.perfis from authenticated;
grant update (nome, telefone, foto_url) on public.perfis to authenticated;

-- prestadores: dono vê e edita dados de atendimento; qualquer usuário vê os aprovados.
create policy "prestador: ver" on public.prestadores for select
  using (id = auth.uid() or status_aprovacao = 'aprovado' or public.eh_admin());
create policy "prestador: editar o meu" on public.prestadores for update using (id = auth.uid());
create policy "prestador: admin aprova" on public.prestadores for update using (public.eh_admin());
revoke update on public.prestadores from authenticated;
grant update (modalidade, cnpj, categorias, cidade, localizacao, raio_km) on public.prestadores to authenticated;
-- status_aprovacao só muda pelo painel admin (service role).

-- documentos: prestador envia e vê os seus; admin vê todos.
create policy "documento: enviar" on public.documentos for insert with check (prestador_id = auth.uid());
create policy "documento: ver" on public.documentos for select using (prestador_id = auth.uid() or public.eh_admin());

-- lojas: leitura para usuários logados (fase 2 ganha o painel da loja).
create policy "loja: ver" on public.lojas for select using (auth.uid() is not null);

-- pedidos
create policy "pedido: criar" on public.pedidos for insert
  with check (cliente_id = auth.uid() and status = 'aberto' and prestador_id is null);
-- cliente_id = auth.uid() vem primeiro: no "insert ... returning" a função ainda não enxerga a linha nova.
create policy "pedido: ver" on public.pedidos for select
  using (cliente_id = auth.uid() or prestador_id = auth.uid() or public.pode_ver_pedido(id));
-- mudanças de status só pelas funções acima.

-- detalhes: mesma visibilidade do pedido; só o cliente cria.
create policy "frete: ver" on public.detalhes_frete for select using (public.pode_ver_pedido(pedido_id));
create policy "frete: criar" on public.detalhes_frete for insert
  with check (exists (select 1 from public.pedidos p where p.id = pedido_id and p.cliente_id = auth.uid()));
create policy "montagem: ver" on public.detalhes_montagem for select using (public.pode_ver_pedido(pedido_id));
create policy "montagem: criar" on public.detalhes_montagem for insert
  with check (exists (select 1 from public.pedidos p where p.id = pedido_id and p.cliente_id = auth.uid()));

-- propostas: prestador aprovado envia em pedido aberto; cliente do pedido vê todas.
create policy "proposta: enviar" on public.propostas for insert
  with check (
    prestador_id = auth.uid()
    and status = 'enviada'
    and public.eh_prestador_aprovado()
    and exists (select 1 from public.pedidos p
                where p.id = pedido_id and p.status in ('aberto', 'com_propostas') and p.cliente_id <> auth.uid())
  );
create policy "proposta: ver" on public.propostas for select
  using (
    prestador_id = auth.uid()
    or exists (select 1 from public.pedidos p where p.id = pedido_id and p.cliente_id = auth.uid())
    or public.eh_admin()
  );
create policy "proposta: retirar a minha" on public.propostas for update
  using (prestador_id = auth.uid() and status = 'enviada')
  with check (status = 'retirada');

-- fotos: cliente envia fotos do pedido; prestador escolhido envia antes/depois.
create policy "foto: ver" on public.fotos for select using (public.pode_ver_pedido(pedido_id));
create policy "foto: enviar" on public.fotos for insert
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from public.pedidos p where p.id = pedido_id
        and ((momento = 'pedido' and p.cliente_id = auth.uid())
             or (momento in ('antes', 'depois') and p.prestador_id = auth.uid()
                 and p.status in ('aceito', 'em_andamento')))
    )
  );

-- pagamentos: só leitura para as partes; escrita pelas Edge Functions (service role).
create policy "pagamento: ver" on public.pagamentos for select
  using (exists (select 1 from public.pedidos p where p.id = pedido_id
                 and (p.cliente_id = auth.uid() or p.prestador_id = auth.uid() or public.eh_admin())));

-- avaliações: cliente avalia o próprio pedido concluído; todos leem.
create policy "avaliacao: ver" on public.avaliacoes for select using (auth.uid() is not null);
create policy "avaliacao: criar" on public.avaliacoes for insert
  with check (exists (select 1 from public.pedidos p
                      where p.id = pedido_id and p.cliente_id = auth.uid()
                        and p.status = 'concluido' and p.prestador_id = avaliacoes.prestador_id));

-- Privacidade: endereços ficam fora da leitura direta. Prestadores veem só bairro/cidade
-- e distância enquanto o pedido está aberto; endereço e telefone saem por
-- dados_privados_do_pedido, que só responde para o cliente e o prestador escolhido.
revoke select on public.pedidos from anon, authenticated;
grant select (id, cliente_id, loja_id, prestador_id, tipo, descricao, cidade, data_desejada, periodo,
              status, valor_aceito, prazo_confirmacao, criado_em, atualizado_em)
  on public.pedidos to authenticated;
revoke select on public.detalhes_frete from anon, authenticated;
grant select (pedido_id, distancia_km, veiculo, ajudantes, andares_sem_elevador, preco_sugerido)
  on public.detalhes_frete to authenticated;

create or replace function public.dados_privados_do_pedido(p_pedido uuid)
returns table (endereco text, origem text, destino text,
               cliente_nome text, cliente_telefone text, prestador_nome text, prestador_telefone text)
language sql stable security definer set search_path = public as $$
  select pd.endereco, df.origem, df.destino,
         c.nome, c.telefone,
         case when pd.prestador_id is not null then pr.nome end,
         case when pd.prestador_id is not null then pr.telefone end
  from pedidos pd
  join perfis c on c.id = pd.cliente_id
  left join perfis pr on pr.id = pd.prestador_id
  left join detalhes_frete df on df.pedido_id = pd.id
  where pd.id = p_pedido
    and (pd.cliente_id = auth.uid() or pd.prestador_id = auth.uid() or eh_admin());
$$;

grant execute on function public.dados_privados_do_pedido,
  public.aceitar_proposta, public.iniciar_servico, public.enviar_conclusao,
  public.confirmar_conclusao, public.contestar_conclusao, public.cancelar_pedido,
  public.pedidos_proximos to authenticated;
revoke all on public.perfis_publicos from anon;
grant select on public.perfis_publicos to authenticated;

-- Tempo real: o app escuta propostas e mudanças de status.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.propostas, public.pedidos;
  end if;
end $$;

-- ============================================================
-- Arquivos (Storage): tudo privado. Caminho começa pelo id de quem enviou.
--   fotos/<usuario>/<pedido>/<arquivo>.jpg
--   documentos/<usuario>/<arquivo>.jpg
-- ============================================================
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false), ('documentos', 'documentos', false)
  on conflict (id) do nothing;

create policy "fotos: enviar na minha pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos: ver se vejo o pedido" on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and exists (select 1 from public.fotos f where f.arquivo = name));
create policy "documentos: enviar na minha pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "documentos: ver os meus" on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and ((storage.foldername(name))[1] = auth.uid()::text or public.eh_admin()));
