/**
 * Rota POST /chat — conversa com o mentor de carreira.
 *
 * Corpo esperado:
 *   { "messages": [{ "role": "user", "text": "Vale mais a pena estágio ou faculdade?" }] }
 * Resposta:
 *   { "answer": "..." }
 */
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import type { Llm } from '../../ai/llm.ts'
import { MENTOR_PERSONA } from '../../ai/prompts.ts'

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
  app.post<{ Body: ChatBody }>('/chat', { schema: { body: chatBodySchema } }, async (request) => {
    // Quando chegamos aqui, `request.body` já foi validado e está tipado.
    const answer = await llm.chat(request.body.messages, { system: MENTOR_PERSONA })
    return { answer }
  })
}
