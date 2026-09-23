# Fase 5 — Edição visual avançada do Modelar Quiz

## Escopo

Evoluir somente a edição visual do Modelar Quiz, preservando publicação, URL pública, navegação, respostas, captura de leads, CTA, analytics, UTM, templates e autosave existentes. Não haverá mudança de banco: as novas propriedades continuarão salvas no JSON `settings` de cada elemento, mantendo quizzes antigos compatíveis.

## Implementação

### 1. Modelo visual compatível

- Definir opções e valores seguros para fonte, tamanho, peso, estilo, alinhamento, cor, altura de linha, espaçamento entre letras e animação.
- Manter os campos antigos (`size`, `weight`, `align`, `color`, `spacing`) e acrescentar apenas os novos campos necessários.
- Centralizar a leitura dos estilos e animações para que editor, visualização interativa e página pública renderizem o mesmo resultado.
- Aplicar defaults somente na leitura, sem exigir atualização manual de quizzes existentes.

### 2. Seleção e edição direta no preview

- Tornar textos selecionáveis apenas no preview de edição.
- Exibir contorno discreto no elemento selecionado e permitir editar o conteúdo diretamente, sem modal.
- Enviar cada alteração para o estado atual do editor, reutilizando o autosave e seus estados existentes.
- Clicar fora remove a seleção; trocar seção também limpa a seleção.
- A página pública e o modo de teste completo não receberão atributos editáveis, contornos ou controles do editor.

### 3. Propriedades contextuais

- Quando nada estiver selecionado, manter as configurações atuais da seção e da aparência.
- Quando um texto estiver selecionado, mostrar grupos de Tipografia, Cor, Espaçamento e Animação.
- Quando um botão estiver selecionado, manter integralmente CTA/link/WhatsApp/checkout/nova aba e acrescentar somente os controles visuais e de animação.
- Oferecer as 12 fontes solicitadas, tamanho com campo e incremento/decremento, seis pesos, normal/negrito/itálico/sublinhado, três alinhamentos, seletor hexadecimal e atalhos para as cores do quiz.
- Limitar duração e atraso a intervalos razoáveis e incluir um comando para reexecutar a animação no preview.

### 4. Renderização responsiva e animações

- Aplicar tamanho responsivo com limite baseado no tamanho configurado e no espaço disponível, preservando quebra de linha e largura do conteúdo em Desktop, Tablet e Mobile.
- Implementar em CSS, sem biblioteca pesada: Nenhuma, Fade In/Up/Down/Left/Right, Zoom In/Out, Bounce e Pulse.
- Executar uma vez quando o elemento entra em cena; no editor, reexecutar sob comando.
- Respeitar `prefers-reduced-motion`, desabilitando efeitos não essenciais.
- Aplicar animações a textos e botões sem alterar cliques, avanço, CTA ou estados de carregamento.

### 5. Fontes

- Carregar Poppins, Inter, Montserrat, Roboto, Open Sans, Lato, Nunito, Raleway, Oswald, Playfair Display, Merriweather e Bebas Neue por uma única folha otimizada com `display=swap` e preconnect já existente.
- Preservar a fonte global atual como fallback e permitir sobrescrita individual por elemento.

## Arquivos previstos

- `src/lib/quiz-types.ts`: tipos/opções/defaults dos novos estilos, sem alterar o formato persistente existente.
- Novo módulo visual compartilhado do quiz: normalização de estilos, limites e classes de animação.
- `src/components/quiz/quiz-preview.tsx`: seleção, edição direta, contorno e reprodução de animação no editor.
- `src/components/quiz/quiz-panels.tsx`: painel contextual de texto/botão e controles agrupados.
- `src/components/quiz/quiz-runner.tsx`: mesma tipografia e animações no teste completo e na página pública, sem mudar a lógica funcional.
- `src/routes/modelar-quiz.$id.tsx`: estado de elemento selecionado e integração com o autosave atual.
- `src/styles.css`: keyframes isolados do quiz e redução de movimento.
- `src/routes/__root.tsx`: ampliar somente a folha de fontes no cabeçalho.

## Validação

- Verificar TypeScript e o build automático sem erros.
- Abrir um quiz antigo e confirmar defaults, edição direta e autosave.
- Alterar fonte, tamanho, peso, estilo, cor, alinhamento, line-height, letter-spacing, animação, duração e atraso; salvar, recarregar e confirmar persistência.
- Testar animação de texto e botão, inclusive reexecução no editor.
- Conferir editor nos modos Desktop, Tablet e Mobile e o layout por abas em telas menores.
- Testar o fluxo completo no preview: respostas, voltar, captura e CTA.
- Publicar/abrir um quiz de teste e confirmar ausência total de interface editável, animação única e preservação de CTA, leads, analytics e UTM já existentes.
- Corrigir somente regressões diretamente ligadas à Fase 5.
