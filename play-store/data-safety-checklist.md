# Checklist — Segurança dos dados

Revisar no Play Console antes do envio final, porque as respostas devem refletir a versão publicada.

Dados tratados pela versão atual:
- E-mail da conta: autenticação e gerenciamento de conta.
- Nome informado no cadastro: identificação da conta/interface.
- Dados financeiros inseridos pelo usuário: lançamentos, valores, categorias, descrições, datas, formas de pagamento e metas.

Finalidades:
- Funcionalidade do aplicativo.
- Gerenciamento de conta.
- Sincronização entre dispositivos.

Compartilhamento:
- Infraestrutura Supabase atua como provedor técnico para Auth/banco/sincronização.
- Não há venda de dados nem publicidade na versão atual.

Controles:
- Exportação/backup disponível.
- Exclusão de conta dentro do app e em página externa.

Antes da publicação, conferir a definição oficial de “coleta” e “compartilhamento” no formulário atual do Play Console e responder com base no comportamento real da build enviada.
