/**
 * Rotas de conversa com o mentor de carreira.
 *
 *   POST /chat         → resposta completa:  { "answer": "..." }
 *   POST /chat/stream  → resposta em pedaços (streaming), como no ChatGPT
 *
 * Corpo esperado (as duas rotas):
 *   { "messages": [{ "role": "user", "text": "Vale mais a pena estágio ou faculdade?" }] }
 */
import { Readable } from 'node:stream'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import type { Llm } from '../../ai/llm.ts'
import { MENTOR_PERSONA } from '../../ai/prompts.ts'
import { AI_RATE_LIMIT } from '../rate-limit.ts'

// Nunca confie no que chega pela rede: o schema define exatamente o que aceitamos.
export const chatBodySchema = z.object({
  // A API da IA não tem memória: é o CLIENTE quem manda o histórico a cada requisição.
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        // Limitar o tamanho também é proteção de CUSTO: cada caractere vira token pago.
        text: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20),
})
type ChatBody = z.infer<typeof chatBodySchema>

/**
 * Um "plugin" do Fastify é uma função que registra rotas.
 * As dependências (aqui, a IA) chegam pelo segundo parâmetro — injeção de dependência.
 */
export const chatRoutes: FastifyPluginAsync<{ llm: Llm }> = async (app, { llm }) => {
  // Opções comuns: validação do corpo + limite de chamadas por minuto.
  const routeOptions = { schema: { body: chatBodySchema }, config: { rateLimit: AI_RATE_LIMIT } }

  app.post<{ Body: ChatBody }>('/chat', routeOptions, async (request) => {
    // Quando chegamos aqui, `request.body` já foi validado e está tipado.
    const answer = await llm.chat(request.body.messages, { system: MENTOR_PERSONA })
    return { answer }
  })

  // Etapa 7 — Streaming: o texto aparece aos poucos.
  // O tempo total é o mesmo, mas o usuário vê a primeira palavra quase na hora.
  app.post<{ Body: ChatBody }>('/chat/stream', routeOptions, async (request, reply) => {
    // Se o cliente desistir no meio (fechou a aba), cancelamos a geração — e paramos de gastar cota.
    // `writableFinished` diferencia "o cliente foi embora" de "terminamos de responder".
    const cancel = new AbortController()
    reply.raw.on('close', () => {
      if (!reply.raw.writableFinished) cancel.abort()
    })

    const pieces = llm.chatStream(request.body.messages, { system: MENTOR_PERSONA, signal: cancel.signal })

    // Esperamos o 1º pedaço ANTES de começar a responder. Se a IA falhar logo de cara
    // (chave inválida, limite atingido), o erro ainda vira uma resposta JSON com o status
    // correto — em vez de um "200 OK" com o texto cortado.
    const first = await pieces.next()

    reply.type('text/plain; charset=utf-8')
    return Readable.from(prepend(first, pieces))
  })
}

/** Devolve um gerador que entrega primeiro o pedaço já lido e depois o resto do stream. */
async function* prepend(first: IteratorResult<string, void>, rest: AsyncGenerator<string, void>) {
  if (!first.done) yield first.value
  yield* rest
}
