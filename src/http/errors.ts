/**
 * Tratamento CENTRAL de erros da API.
 *
 * Regra de ouro: o cliente recebe uma mensagem útil e segura; os detalhes técnicos
 * (chave inválida, resposta bruta do provedor, stack trace) ficam SÓ no log do servidor.
 * Vazar esses detalhes ajuda atacantes e confunde usuários.
 *
 * Cada tipo de falha vira o status HTTP que melhor a descreve:
 *   400 — o cliente mandou algo inválido
 *   429 — limite de uso atingido
 *   502 — o provedor de IA respondeu algo que não conseguimos usar
 *   503 — o provedor de IA está fora do ar
 *   504 — o provedor de IA demorou demais
 *   500 — erro inesperado do nosso lado
 */
import { ApiError } from '@google/genai'
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

/** Erro com status HTTP e uma mensagem que PODE ser mostrada ao usuário. */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export function handleError(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  // 400 · o corpo da requisição não passou no schema zod da rota (veja validation.ts)
  if (error.validationContext) {
    const details =
      error instanceof ZodError
        ? error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
        : []
    return reply.status(400).send({ error: 'Requisição inválida', details })
  }

  // Erros que nós mesmos criamos com uma mensagem segura para o usuário
  if (error instanceof HttpError) {
    return reply.status(error.statusCode).send({ error: error.message })
  }

  // Erros vindos do provedor de IA (Gemini)
  if (error instanceof ApiError) {
    request.log.warn({ status: error.status, err: error }, 'falha na API do Gemini')
    if (error.status === 429) {
      return reply.status(429).send({ error: 'Limite gratuito da IA atingido. Aguarde 1 minuto e tente de novo.' })
    }
    if (error.status >= 500) {
      return reply.status(503).send({ error: 'O provedor de IA está instável. Tente de novo em instantes.' })
    }
    // 400/401/403 do provedor = problema de configuração do SERVIDOR (ex.: chave inválida),
    // não do usuário. Por isso respondemos 502 ("o serviço do qual dependo falhou").
    return reply.status(502).send({ error: 'Não foi possível falar com o provedor de IA.' })
  }

  // O cliente HTTP do Gemini desistiu depois de LLM_TIMEOUT_MS
  if (error.name === 'TimeoutError' || error.name === 'AbortError') {
    return reply.status(504).send({ error: 'A IA demorou demais para responder. Tente de novo.' })
  }

  // Outros erros 4xx do próprio Fastify (JSON malformado, corpo grande demais, content-type errado).
  // As mensagens do Fastify para esses casos são seguras para exibir.
  if (error.statusCode && error.statusCode < 500) {
    return reply.status(error.statusCode).send({ error: error.message })
  }

  // Qualquer outra coisa: registramos tudo no log e devolvemos uma mensagem genérica.
  request.log.error({ err: error }, 'erro inesperado')
  return reply.status(500).send({ error: 'Erro interno. Tente de novo em instantes.' })
}
