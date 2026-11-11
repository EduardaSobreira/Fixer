# Arquitetura do Fixer

Documento completo (com desenhos e cronograma): https://claude.ai/artifact/T5HCbAna97MWVkaZDEeVGT

## Camadas

1. **Apps** — falam só com o Supabase.
   - App Fixer (Expo): cliente e prestador. **MVP.**
   - Painel da loja parceira (Next.js): fase 5.
   - Painel admin (Next.js): fase 5. Até lá, aprovação pelo SQL Editor.
2. **Supabase** — servidores do Fixer.
   - Auth (login), Postgres + PostGIS (dados e distância), Storage (fotos e documentos privados), Realtime (status ao vivo).
   - Regras de acesso (RLS) e funções em `supabase/migrations`.
   - Edge Functions (fase 3): pagamentos, prazos e notificações.
3. **APIs externas** — chamadas só pelo servidor, nunca direto pelo app.
   - Mercado Pago (reserva e split), Google Maps (rota), Twilio (SMS), BrasilAPI (CEP e CNPJ), Expo Push.

## Ciclo de um pedido

```
aberto → com_propostas → aceito → em_andamento → aguardando_confirmacao (6h) → concluido
   └──────────┴→ cancelado                                    └→ em_contestacao
```

| Passo | Quem | Função no banco |
| --- | --- | --- |
| Publicar pedido | cliente | insert em `pedidos` + detalhes + fotos |
| Mandar proposta | prestador aprovado | insert em `propostas` |
| Aceitar | cliente | `aceitar_proposta` |
| Começar | prestador escolhido | `iniciar_servico` |
| Concluir (com foto de depois) | prestador escolhido | `enviar_conclusao` |
| Confirmar / contestar | cliente | `confirmar_conclusao` / `contestar_conclusao` |
| Cancelar antes do aceite | cliente | `cancelar_pedido` |

## Onde entra o pagamento (fase 3)

- `aceitar_proposta` → Edge Function cria a **reserva** no cartão (Mercado Pago) e grava em `pagamentos`.
- `confirmar_conclusao` (ou fim das 6h com consentimento) → Edge Function **cobra** e faz o **split**.
- `cancelar_pedido` / contestação aceita → Edge Function **libera** a reserva.
