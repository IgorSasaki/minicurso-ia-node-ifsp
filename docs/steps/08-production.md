# Etapa 8 — Código de produção: testes, lint e CI

> 🏷️ `main` · ▶️ `pnpm check` (tipos + lint + testes)

## Objetivo
As etapas 1 a 7 constroem o produto. Esta etapa responde à pergunta que todo time faz antes de colocar algo no ar: **"como eu sei que isto funciona — e que vai continuar funcionando quando alguém mudar o código?"**

## O que foi adicionado
```
test/
├── helpers/fakes.ts             # "dublês" da IA: sem chave, sem internet, sem custo
├── unit/                        # funções isoladas
│   ├── config.test.ts           # regras do .env
│   ├── ai.test.ts               # chat, chatJson (com nova tentativa), streaming, prompt do RAG
│   ├── rag.test.ts              # cosseno, chunking, busca, índice vetorial
│   └── front-format.test.ts     # escapeHtml (XSS), citações, barra de relevância
└── integration/app.test.ts      # a API inteira via app.inject()
biome.json                       # lint + formatação
.github/workflows/ci.yml         # roda tudo a cada push no GitHub
```

## Os comandos
| Comando | O que faz |
|---|---|
| `pnpm test` | roda os 54 testes (menos de 1 segundo) |
| `pnpm test:watch` | roda de novo a cada arquivo salvo — ótimo enquanto programa |
| `pnpm lint` | aponta erros comuns e código fora do padrão |
| `pnpm format` | corrige a formatação automaticamente |
| `pnpm check` | tipos + lint + testes: o mesmo que o CI roda |

## Por que a arquitetura das etapas anteriores permite testar
Três decisões tomadas lá atrás pagam a conta agora:

1. **Injeção de dependência** — `createLlm(client)` recebe o cliente do Gemini por parâmetro. No teste, passamos um falso:
   ```ts
   const { client, models } = fakeGeminiClient(['{"course":"Medicina"}', '{"course":"ADS"}'])
   const llm = createLlm(client, { model: 'm' })
   expect(await llm.chatJson(messages, schema)).toEqual({ course: 'ADS' }) // corrigiu na 2ª tentativa
   ```
2. **`buildApp()` separado de `listen()`** — o teste monta o app e simula requisições sem abrir porta:
   ```ts
   const app = await buildApp({ llm: fakeLlm(), retrieve: fakeRetriever(), modelName: 'teste', logger: false })
   const response = await app.inject({ method: 'POST', url: '/chat', payload: { messages: [] } })
   expect(response.statusCode).toBe(400)
   ```
3. **Arquivos sem efeitos colaterais** — `env.ts` só declara regras; quem lê o `.env` é o `config.ts`. Os testes importam o primeiro e nunca o segundo.

## Testes que existem porque o bug aconteceu de verdade
Durante o desenvolvimento deste projeto, três bugs passaram despercebidos — o código "funcionava" na demo:

| Bug | O que acontecia | Teste que protege |
|---|---|---|
| **Tratador de erros registrado depois das rotas** | Um erro do Gemini chegava ao usuário como `400` com o JSON interno do Google ("API key not valid...") | `tratamento de erros: ... sem vazar a mensagem interna` |
| **Rate limit global** | Recarregar a página 15 vezes bloqueava o próprio `index.html` | `recarregar a página não consome o limite das rotas de IA` |
| **Erro do Gemini no streaming** | O cliente recebia `200 OK` com texto cortado | `se a IA falhar antes do 1º pedaço, responde erro JSON` |

> 💡 **Teste de mutação manual:** coloque de propósito o `app.setErrorHandler(...)` depois das rotas em `src/app.ts` e rode `pnpm test`. Sete testes falham. É assim que você descobre se os seus testes realmente protegem alguma coisa.

## O que um teste NÃO deve fazer
- **Chamar a IA de verdade.** Fica lento, caro, exige chave e dá respostas diferentes a cada execução. Testamos a *nossa* lógica (validação, nova tentativa, tratamento de erro) com respostas programadas.
- **Conferir a frase exata da IA.** Lembra da etapa 1? Nem com temperatura 0 a resposta é garantida.

> Para avaliar a *qualidade* das respostas da IA, o caminho é outro: uma lista fixa de perguntas com o que se espera (como a tabela de calibração da etapa 6), rodada de tempos em tempos. Isso se chama **avaliação (evals)** — um ótimo próximo passo.

## Lint e formatação (Biome)
O Biome encontra problemas antes de você rodar o código (variável não usada, `!` que esconde um possível `undefined`, imports bagunçados) e padroniza a formatação. Quando uma regra precisa ser ignorada, o motivo fica escrito ao lado:
```css
/* biome-ignore lint/complexity/noImportantStyles: intencional, veja o comentário acima */
display: none !important;
```

## Integração contínua (CI)
O arquivo `.github/workflows/ci.yml` faz o GitHub rodar `typecheck`, `lint` e `test` a cada push. Se algo quebrar, o commit ganha um ❌ — e ninguém descobre o problema em produção.

## Padrões de código usados no projeto
| Padrão | Exemplo |
|---|---|
| Identificadores em **inglês**, `camelCase` | `createRetriever`, `chatJson`, `aboutMe` |
| Tipos e classes em `PascalCase` | `CareerPlan`, `InvalidResponseError` |
| Constantes em `UPPER_SNAKE_CASE` | `MIN_SCORE`, `AI_RATE_LIMIT` |
| Arquivos em `kebab-case` | `vector-store.ts`, `career-plan.ts` |
| **Comentários e mensagens ao usuário em português** | o código fala a língua do mercado; a explicação fala a língua do time |

## Desafio
1. Escreva um teste para o desafio da etapa 6 (`reliable: boolean`).
2. Faça um teste falhar de propósito, veja a mensagem e conserte.
3. Abra um pull request no seu fork e veja o CI rodar.
