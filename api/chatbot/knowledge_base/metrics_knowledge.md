# Base de Conhecimento — Métricas do HealthyEnv

Este documento é a base de conhecimento usada pelo chatbot RAG do HealthyEnv.
Ele descreve cada métrica de saúde de repositórios GitHub monitorada pelo sistema,
seu significado, como interpretar os valores e quais ações podem ser tomadas.

---

## O que é o HealthyEnv?

O HealthyEnv é uma ferramenta de análise contínua da saúde de repositórios GitHub.
Ele coleta métricas automáticas de projetos open source e as organiza em categorias
temáticas para ajudar desenvolvedores, gestores e contribuidores a entenderem
o estado de saúde de um projeto de software.

---

## Categorias de Métricas

As métricas estão organizadas nas seguintes categorias:
- **Code Changes (Mudanças de Código):** Atividade de desenvolvimento e commits
- **Issues:** Gerenciamento de problemas e demandas
- **Community (Comunidade):** Engajamento e colaboração de contribuidores
- **Risk (Risco):** Indicadores de risco e sustentabilidade do projeto

---

## Métricas de Mudanças de Código (Code Changes)

### code_changes_commits
- **Nome:** Número de Commits
- **Descrição:** Quantidade total de commits realizados no repositório em um período.
- **Como interpretar:** Um número alto de commits indica alta atividade de desenvolvimento. Um valor muito baixo pode indicar que o projeto está estagnado ou em manutenção mínima. Projetos saudáveis geralmente têm commits frequentes e regulares.
- **Valor ideal:** Depende do tamanho do projeto. Para projetos ativos, espera-se ao menos alguns commits por semana.
- **Ação sugerida se baixo:** Investigar se o projeto está em manutenção, abandonado ou se a equipe está trabalhando em outra branch.

### code_changes_lines_added
- **Nome:** Linhas Adicionadas
- **Descrição:** Total de linhas de código adicionadas ao repositório em um período.
- **Como interpretar:** Indica o volume de código novo sendo produzido. Valores muito altos podem indicar uma grande feature sendo adicionada ou refatoração. Valores muito baixos indicam pouca evolução do código.
- **Valor ideal:** Consistente ao longo do tempo, com picos relacionados a novas funcionalidades.
- **Ação sugerida:** Comparar com linhas removidas para entender se é crescimento líquido de código.

### code_changes_lines_removed
- **Nome:** Linhas Removidas
- **Descrição:** Total de linhas de código removidas do repositório em um período.
- **Como interpretar:** Remoção de código pode ser positiva (limpeza de dívida técnica, refatoração) ou negativa (exclusão de funcionalidades). Uma taxa alta de remoção associada a uma taxa alta de adição sugere refatoração ativa.
- **Valor ideal:** Saudável quando há remoções regulares indicando limpeza do código.

### code_changes_lines_avg_lines_commit
- **Nome:** Média de Linhas por Commit
- **Descrição:** Média do número de linhas modificadas (adicionadas + removidas) por commit.
- **Como interpretar:** Commits pequenos e focados (baixa média) são considerados boa prática de engenharia de software, pois facilitam revisão de código e identificação de bugs. Commits muito grandes (alta média) são difíceis de revisar e aumentam o risco de introduzir bugs.
- **Valor ideal:** Entre 10 e 100 linhas por commit é considerado saudável. Acima de 500 linhas por commit é preocupante.
- **Ação sugerida se alto:** Incentivar commits menores e mais atômicos na equipe.

### code_changes_lines_avg_files_commit
- **Nome:** Média de Arquivos por Commit
- **Descrição:** Média do número de arquivos modificados por commit.
- **Como interpretar:** Similar à média de linhas por commit. Commits que tocam muitos arquivos ao mesmo tempo são mais difíceis de revisar e têm maior chance de causar conflitos em equipes grandes.
- **Valor ideal:** Entre 1 e 5 arquivos por commit é considerado saudável.
- **Ação sugerida se alto:** Dividir commits grandes em commits menores e mais focados.

---

## Métricas de Issues

### avg_time_to_close
- **Nome:** Tempo Médio para Fechar Issue
- **Descrição:** Tempo médio (em dias) entre a abertura e o fechamento de uma issue.
- **Como interpretar:** Um tempo muito alto indica que o projeto demora para resolver problemas reportados, o que pode frustrar contribuidores e usuários. Um tempo muito baixo pode indicar que issues são fechadas prematuramente sem resolução adequada.
- **Valor ideal:** Depende do tipo de projeto. Para projetos bem mantidos, espera-se menos de 14 dias para issues simples.
- **Ação sugerida se alto:** Priorizar triagem de issues, distribuir melhor o trabalho ou aumentar o número de mantenedores.

### avg_time_to_first_response
- **Nome:** Tempo Médio para Primeira Resposta
- **Descrição:** Tempo médio (em dias) entre a abertura de uma issue e o primeiro comentário ou resposta de um mantenedor.
- **Como interpretar:** Esta métrica é crítica para a percepção de saúde do projeto pela comunidade. Usuários que reportam problemas e não recebem resposta tendem a abandonar o projeto. Um tempo alto aqui pode afastar contribuidores potenciais.
- **Valor ideal:** Menos de 3 dias é considerado excelente. Mais de 7 dias começa a ser preocupante.
- **Ação sugerida se alto:** Configurar automações de triagem, distribuir responsabilidades de resposta entre mantenedores, ou usar bots de triagem.

### issues_active
- **Nome:** Issues Ativas
- **Descrição:** Número de issues abertas e com atividade recente (comentários, atualizações).
- **Como interpretar:** Um número saudável de issues ativas indica engajamento da comunidade. Um número muito alto pode indicar que o projeto não consegue acompanhar as demandas. Um número muito baixo pode indicar falta de engajamento.
- **Valor ideal:** Proporcional ao tamanho da equipe de mantenedores.

### issues_age_avg
- **Nome:** Idade Média das Issues
- **Descrição:** Idade média (em dias) das issues abertas atualmente.
- **Como interpretar:** Issues muito antigas que continuam abertas indicam problemas de manutenção. Pode significar que são issues complexas, de baixa prioridade, ou que o projeto não tem recursos para resolvê-las.
- **Valor ideal:** Menos de 30 dias para projetos bem mantidos.
- **Ação sugerida se alto:** Revisar e fechar issues desatualizadas ou sem relevância atual.

### issues_age_max
- **Nome:** Idade Máxima das Issues
- **Descrição:** Idade (em dias) da issue aberta mais antiga no repositório.
- **Como interpretar:** Uma issue aberta há muito tempo (meses ou anos) pode indicar um problema conhecido mas não resolvido, o que é um sinal de alerta para o projeto.
- **Valor ideal:** Nenhuma issue deveria ficar aberta por mais de 1 ano sem atualização.

### issues_age_median
- **Nome:** Mediana da Idade das Issues
- **Descrição:** Mediana da idade das issues abertas (valor do meio quando ordenadas por idade).
- **Como interpretar:** A mediana é mais robusta que a média pois não é distorcida por issues extremamente antigas. Indica a "idade típica" das issues abertas.
- **Valor ideal:** Menos de 14 dias para projetos ativos.

### issues_closed
- **Nome:** Issues Fechadas
- **Descrição:** Número de issues fechadas em um período.
- **Como interpretar:** Junto com o número de issues abertas, indica a taxa de resolução de problemas. Se mais issues são abertas do que fechadas, o backlog cresce indefinidamente.
- **Valor ideal:** Deve ser pelo menos igual ao número de novas issues abertas no mesmo período.

### median_time_to_close
- **Nome:** Mediana do Tempo para Fechar Issue
- **Descrição:** Mediana do tempo (em dias) para fechar uma issue.
- **Como interpretar:** Similar à média, mas mais robusta para valores extremos. Indica o tempo "típico" de resolução de issues.
- **Valor ideal:** Menos de 7 dias para projetos bem mantidos.

### median_time_to_first_response
- **Nome:** Mediana do Tempo para Primeira Resposta
- **Descrição:** Mediana do tempo (em dias) para a primeira resposta a uma issue.
- **Como interpretar:** Indica o tempo "típico" de resposta. Compará-la com a média ajuda a identificar se há issues específicas com tempo de resposta muito alto distorcendo a média.
- **Valor ideal:** Menos de 2 dias.

---

## Métricas de Comunidade (Community)

### contributors
- **Nome:** Número de Contribuidores
- **Descrição:** Número total de pessoas que contribuíram com o repositório (commits, pull requests, etc.) em um período.
- **Como interpretar:** Um número crescente de contribuidores indica que o projeto está atraindo colaboradores. Um número muito baixo (1-2 pessoas) indica alta concentração de conhecimento e risco elevado se essas pessoas saírem.
- **Valor ideal:** Depende do tipo de projeto. Para projetos open source saudáveis, espera-se pelo menos 5-10 contribuidores ativos.
- **Ação sugerida se baixo:** Melhorar documentação para novos contribuidores, criar issues marcadas como "good first issue", participar de eventos como Hacktoberfest.

---

## Métricas de Risco

### truck_factor (Bus Factor)
- **Nome:** Truck Factor (Bus Factor)
- **Descrição:** Número mínimo de desenvolvedores que, se "atropelados por um caminhão" (deixassem o projeto subitamente), fariam o projeto parar de funcionar. Indica a concentração de conhecimento crítico.
- **Como interpretar:** Esta é uma das métricas de risco mais importantes. Um truck factor de 1 significa que apenas uma pessoa detém conhecimento crítico — se ela sair, o projeto fica comprometido. Valores maiores indicam maior distribuição de conhecimento e menor risco.
- **Valor ideal:** Truck factor maior ou igual a 3 é considerado saudável para projetos em produção. Acima de 5 é excelente.
- **Ação sugerida se baixo (1-2):** Promover pair programming, documentar partes críticas do sistema, incentivar rotação de tarefas entre desenvolvedores, criar documentação técnica detalhada.
- **Atenção:** Um truck factor baixo é um risco operacional sério para organizações que dependem do projeto.

### max_change_set
- **Nome:** Tamanho Máximo do Change Set
- **Descrição:** O maior número de arquivos modificados em um único commit no período analisado.
- **Como interpretar:** Change sets muito grandes em um único commit indicam commits não atômicos, que são difíceis de revisar, testar e reverter em caso de problemas.
- **Valor ideal:** Nenhum commit deveria modificar mais de 20-30 arquivos ao mesmo tempo.
- **Ação sugerida se alto:** Revisar práticas de commits na equipe.

### avg_change_set
- **Nome:** Tamanho Médio do Change Set
- **Descrição:** Média do número de arquivos modificados por commit.
- **Como interpretar:** Indica o padrão geral de commits da equipe. Valores consistentemente altos indicam que a equipe não está seguindo boas práticas de commits atômicos.
- **Valor ideal:** Entre 1 e 5 arquivos por commit em média.

### avg_highest_contributor_experience
- **Nome:** Experiência Média do Principal Contribuidor
- **Descrição:** Medida da experiência (baseada em tempo de contribuição e volume de código) do contribuidor que mais contribuiu com o repositório.
- **Como interpretar:** Indica se o projeto depende de contribuidores experientes ou se tem uma base de contribuidores mais distribuída. Combinado com o truck factor, ajuda a avaliar o risco de dependência de pessoas.
- **Valor ideal:** Alta experiência do principal contribuidor é boa, desde que não seja o único contribuidor.

---

## Como Usar Este Chatbot

Você pode fazer perguntas como:
- "O que significa truck factor?"
- "Como interpretar um avg_time_to_first_response alto?"
- "Meu repositório tem truck factor 1, o que devo fazer?"
- "Quais métricas indicam que um projeto está abandonado?"
- "O que significa issues_age_max de 365 dias?"
- "Como melhorar a saúde do meu repositório?"
- "Explique a métrica code_changes_lines_avg_lines_commit"

---

## Dicas Gerais de Saúde de Repositórios

### Sinais de um repositório saudável:
- Commits frequentes e regulares (pelo menos semanal)
- Tempo de resposta a issues abaixo de 3 dias
- Truck factor acima de 3
- Número crescente de contribuidores
- Issues sendo resolvidas na mesma taxa em que são abertas
- Commits pequenos e atômicos (poucos arquivos por commit)

### Sinais de alerta em um repositório:
- Último commit há mais de 6 meses
- Truck factor igual a 1
- Issues abertas há mais de 1 ano sem resposta
- Tempo médio de resposta a issues acima de 14 dias
- Um único contribuidor responsável por mais de 80% do código
- Crescimento descontrolado de issues abertas sem fechamento

### O que fazer se o repositório estiver em má saúde:
1. **Documentação:** Melhorar README, guias de contribuição e documentação técnica
2. **Triagem:** Revisar e fechar issues antigas e irrelevantes
3. **Comunidade:** Engajar novos contribuidores com issues marcadas como "good first issue"
4. **Processos:** Implementar revisão de código (pull requests obrigatórios)
5. **Automação:** Usar CI/CD, bots de triagem de issues, templates de issues e PRs
