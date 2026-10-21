/**
 * Montagem da aplicação HTTP (Fastify).
 *
 * `buildApp()` MONTA o app, mas não o coloca no ar. Quem chama decide:
 *   - o servidor (server.ts) faz `app.listen()`;
 *   - os testes fazem `app.inject()`, simulando requisições sem abrir porta nenhuma.
 *
 * Todas as dependências externas (a IA e a busca nos documentos) chegam por parâmetro. Nos testes,
 * passamos versões falsas: sem chave, sem internet, sem gastar cota.
 */
import { fileURLToPath } from 'node:url'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import Fastify, { type FastifyServerOptions } from 'fastify'
import type { Llm } from './ai/llm.ts'
import { HttpError, handleError } from './http/errors.ts'
import { askRoutes } from './http/routes/ask.ts'
import { careerPlanRoutes } from './http/routes/career-plan.ts'
import { chatRoutes } from './http/routes/chat.ts'
import { zodValidatorCompiler } from './http/validation.ts'
import type { Retriever } from './rag/retriever.ts'

export type AppDependencies = {
  llm: Llm
  /** Busca nos documentos (RAG). */
  retrieve: Retriever
  /** Nome do modelo, só para exibir no /health. */
  modelName: string
  logger?: FastifyServerOptions['logger']
}

export async function buildApp({ llm, retrieve, modelName, logger = true }: AppDependencies) {
  // bodyLimit: recusamos corpos maiores que 64 KB (nenhuma rota precisa de mais que isso).
  const app = Fastify({ logger, bodyLimit: 64 * 1024 })

  app.setValidatorCompiler(zodValidatorCompiler)

  // ⚠️ O tratador de erros PRECISA ser registrado ANTES das rotas.
  // No Fastify, cada plugin herda o tratador que estava ativo no momento do registro.
  // Registrado depois, ele simplesmente não é usado pelas rotas.
  app.setErrorHandler(handleError)

  // Etapa 7 — Rate limit. `global: false` = só vale nas rotas que pedirem (as de IA, via
  // `config.rateLimit`). Ao estourar, lançamos um HttpError com mensagem amigável.
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: () => new HttpError(429, 'Calma! Muitas perguntas em pouco tempo. Aguarde 1 minuto.'),
  })

  // Etapa 7 — Front-end: os arquivos da pasta public/ são servidos em http://localhost:3333/
  await app.register(fastifyStatic, { root: fileURLToPath(new URL('../public', import.meta.url)) })

  // Rota de saúde: usada pelo front (e por ferramentas de monitoramento) para saber se a API está no ar.
  app.get('/health', async () => ({ status: 'ok', model: modelName }))

  await app.register(chatRoutes, { llm })
  await app.register(careerPlanRoutes, { llm })
  await app.register(askRoutes, { llm, retrieve })

  return app
}
