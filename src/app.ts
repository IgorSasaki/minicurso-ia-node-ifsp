/**
 * Montagem da aplicação HTTP (Fastify).
 *
 * `buildApp()` MONTA o app, mas não o coloca no ar. Quem chama decide:
 *   - o servidor (server.ts) faz `app.listen()`;
 *   - os testes fazem `app.inject()`, simulando requisições sem abrir porta nenhuma.
 *
 * Todas as dependências externas (a IA) chegam por parâmetro. Nos testes,
 * passamos versões falsas: sem chave, sem internet, sem gastar cota.
 */
import Fastify, { type FastifyServerOptions } from 'fastify'
import type { Llm } from './ai/llm.ts'
import { handleError } from './http/errors.ts'
import { chatRoutes } from './http/routes/chat.ts'
import { zodValidatorCompiler } from './http/validation.ts'

export type AppDependencies = {
  llm: Llm
  /** Nome do modelo, só para exibir no /health. */
  modelName: string
  logger?: FastifyServerOptions['logger']
}

export async function buildApp({ llm, modelName, logger = true }: AppDependencies) {
  // bodyLimit: recusamos corpos maiores que 64 KB (nenhuma rota precisa de mais que isso).
  const app = Fastify({ logger, bodyLimit: 64 * 1024 })

  app.setValidatorCompiler(zodValidatorCompiler)

  // ⚠️ O tratador de erros PRECISA ser registrado ANTES das rotas.
  // No Fastify, cada plugin herda o tratador que estava ativo no momento do registro.
  // Registrado depois, ele simplesmente não é usado pelas rotas.
  app.setErrorHandler(handleError)

  // Rota de saúde: usada pelo front (e por ferramentas de monitoramento) para saber se a API está no ar.
  app.get('/health', async () => ({ status: 'ok', model: modelName }))

  await app.register(chatRoutes, { llm })

  return app
}
