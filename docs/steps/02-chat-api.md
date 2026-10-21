# Etapa 2 — Uma API de verdade: `POST /chat`

> 🏷️ tag `etapa-02` · ▶️ `pnpm dev`

## Objetivo
Transformar a chamada da etapa 1 em uma **API HTTP** com Fastify, com uma persona (o mentor "Rota Tech"), validação de entrada e tratamento de erros profissional.

## Conceitos
| Conceito | Em uma frase |
|---|---|
| **Persona / system prompt** | O "contrato" do assistente: quem ele é, para quem fala, o que pode e o que não pode fazer. |
| **Stateless** | A LLM não lembra de nada entre chamadas. Quem guarda o histórico é o **cliente**, que reenvia tudo a cada pergunta. |
| **Validação de entrada** | Nunca confie no corpo da requisição — o schema zod define exatamente o que aceitamos. |
| **Tratamento central de erros** | Um único lugar decide o status HTTP e a mensagem segura de cada falha. |
| **Chave no servidor** | A chave do Gemini fica no back-end. No front-end, qualquer pessoa poderia copiá-la. |

## Arquivos novos
```
src/
├── app.ts                 # buildApp(): monta o Fastify (sem colocar no ar)
├── server.ts              # coloca no ar + encerramento limpo (Ctrl+C)
├── ai/prompts.ts          # a persona do mentor
└── http/
    ├── errors.ts          # tratamento central de erros
    ├── validation.ts      # ensina o Fastify a validar com zod
    └── routes/chat.ts     # POST /chat
requests.http              # requisições prontas (extensão REST Client)
```

## O código-chave
```ts
// src/http/routes/chat.ts
export const chatBodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'model']),
    text: z.string().trim().min(1).max(2000),
  })).min(1).max(20),
})

app.post<{ Body: ChatBody }>('/chat', { schema: { body: chatBodySchema } }, async (request) => {
  const answer = await llm.chat(request.body.messages, { system: MENTOR_PERSONA })
  return { answer }
})
```
Repare: a rota **não** tem `if (!valido) return 400`. O Fastify valida antes (graças ao `validation.ts`) e, se falhar, o tratador central responde 400 com os detalhes de cada campo.

## ⚠️ A ordem importa (bug clássico do Fastify)
```ts
// src/app.ts
app.setErrorHandler(handleError)      // 1º o tratador de erros...
await app.register(chatRoutes, { llm }) // ...depois as rotas
```
No Fastify, cada plugin herda o tratador de erros **ativo no momento em que foi registrado**. Se você inverter essas linhas, o seu tratador é ignorado e um erro do Gemini chega ao cliente com o JSON interno do Google — incluindo mensagens como "API key not valid".

## Testando
```bash
pnpm dev
# em outro terminal:
curl -s -X POST localhost:3333/chat -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","text":"Vale mais a pena estágio ou faculdade?"}]}'
```
Ou abra o `requests.http` no VS Code e clique em **Send Request**.

## Resultado esperado
| Requisição | Resposta |
|---|---|
| Pergunta de carreira | 200 · resposta curta e prática |
| Histórico com "Meu nome é Ana" | 200 · o modelo responde "Ana" (porque o histórico foi reenviado) |
| "Receita de bolo" | 200 · recusa educada |
| `{"messages":[]}` | 400 · `{"error":"Requisição inválida","details":[{"field":"messages",...}]}` |
| Chave do Gemini inválida | 502 · `{"error":"Não foi possível falar com o provedor de IA."}` — sem vazar detalhes |

## 🔍 Guarde esta pergunta para a etapa 6
Pergunte: **"Qual o turno do curso de ADS no IFSP Araraquara?"**
O modelo costuma responder com confiança — e errar (o ADS é **matutino**; o SPI é **noturno**). Ele nunca leu o PPC do curso. Esse é exatamente o problema que o **RAG** resolve.

## Erros comuns
| Sintoma | Causa | Solução |
|---|---|---|
| `EADDRINUSE :3333` | servidor já rodando em outro terminal | feche o outro ou mude `PORT` |
| `400 Body is not valid JSON` | JSON com aspas ou vírgulas erradas | confira o corpo |
| `502` | chave inválida no `.env` | confira a `GEMINI_API_KEY` |

## Desafio (7 min)
Crie uma segunda persona em `src/ai/prompts.ts` — um "recrutador exigente" que faz perguntas de entrevista — e uma rota `POST /interview` que a utilize.
