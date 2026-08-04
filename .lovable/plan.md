# Revisão do aviso de segurança (função SECURITY DEFINER)

## O que a revisão função por função encontrou

Verifiquei, no banco, quem tem permissão de executar cada função `SECURITY DEFINER` do esquema público:

- Existem 24 funções `SECURITY DEFINER`.
- 23 delas só podem ser executadas pelo dono do banco e pelo papel de serviço (o servidor). Usuário logado no site **não** consegue chamar nenhuma dessas.
- Apenas **1** é executável por usuário logado: `mining_run_progress` — a função que alimenta a barra de progresso da mineração.
- `mining_run_progress` faz a checagem de permissão dentro dela mesma: se quem chama não for admin, ela recusa com "forbidden". Ela também só devolve números de andamento (fases, contadores, tempos), nada de dados de clientes.
- As funções que não são `SECURITY DEFINER` (`has_role`, `list_active_offer_pages`, `update_updated_at_column`) não entram nesse aviso.

Conclusão: o aviso é o comportamento esperado do verificador, não uma brecha. Não há função privilegiada aberta a usuário comum.

## O que fazer

1. Marcar o aviso como aceito/ignorado, registrando a justificativa (única função exposta, com checagem de admin interna e retorno apenas de métricas).
2. Atualizar a memória de segurança do projeto para que futuras varreduras e futuras alterações saibam que:
   - `mining_run_progress` é intencionalmente executável por logados e **deve** manter a checagem de admin interna;
   - nenhuma outra função de mineração pode receber permissão para `anon` ou `authenticated`.

Nenhuma alteração no banco, nas permissões ou no código do app.

## Próximo assunto: prompt de qualificação da mineração

Você mencionou querer que eu analise um prompt para melhorar a qualificação da mineração. Me envie o texto do prompt que você quer usar e eu analiso e proponho a versão ajustada num plano à parte.
