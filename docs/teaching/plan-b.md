# Plano B — quando algo der errado

| Problema | Sinal | Ação imediata |
|---|---|---|
| **Internet do lab caiu** | Codespaces não carrega | Siga só no projetor com o notebook (hotspot do celular). Mostre os vídeos gravados no D-1. Os alunos acompanham pelo código nos slides e refazem em casa. |
| **Codespaces bloqueado pelo firewall** | `*.github.dev` não abre | Duplas em notebooks pessoais (se houver) com `git clone` + `pnpm install`; senão, aula demonstrativa no projetor. |
| **Cota gratuita do Gemini (429)** | Muitos alunos com "Limite gratuito atingido" | Cada aluno tem sua própria cota (por projeto do Google). Se for a sua: crie uma chave em **outro projeto** do AI Studio e troque no `.env`. Peça para a turma esperar 60 s entre testes. |
| **Embeddings falhando** | `pnpm ingest` com erro | Use o `data/index.json` já versionado — as etapas 6 e 7 funcionam sem rodar a ingestão. |
| **Modelo lento** | Respostas > 10 s | Confirme `GEMINI_THINKING_LEVEL=MINIMAL` e `GEMINI_MODEL=gemini-3.5-flash-lite`. |
| **Modelo descontinuado/renomeado** | Erro 404 `model not found` | Veja os modelos atuais em <https://ai.google.dev/gemini-api/docs/models> e troque `GEMINI_MODEL` no `.env` — nenhum código muda. |
| **Aluno muito atrasado** | Está na etapa 2 quando a turma está na 5 | `git stash && git checkout etapa-05`. Dupla com um colega. |
| **Projetor não funciona** | — | Slides em PDF no pen drive; aula com os alunos acompanhando o código no próprio Codespace. |
| **Pergunta que você não sabe** | — | "Ótima pergunta, não sei — vou pesquisar e posto junto com os slides." (Você está ensinando a IA a dizer "não sei"; faça o mesmo.) |
