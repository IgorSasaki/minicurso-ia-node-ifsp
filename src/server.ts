/**
 * Ponto de entrada do servidor: junta as peças reais e coloca a API no ar.
 * Rode com:  pnpm dev   (recarrega sozinho ao salvar)   ou   pnpm start
 */
import { embed, llm } from './ai/gemini.ts'
import { buildApp } from './app.ts'
import { config } from './config/config.ts'
import { EMBEDDING_DIMENSIONS } from './rag/embeddings.ts'
import { createRetriever } from './rag/retriever.ts'
import { loadIndex } from './rag/vector-store.ts'

// O índice é carregado e validado na SUBIDA: se estiver faltando ou tiver sido gerado com
// outro modelo de embedding, o erro aparece agora — e não na primeira pergunta de um usuário.
const index = await loadIndex({ model: config.GEMINI_EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS })

const app = await buildApp({
  llm,
  retrieve: createRetriever(index, embed),
  modelName: config.GEMINI_MODEL,
  logger: { level: config.LOG_LEVEL },
})

// Encerramento limpo: ao receber Ctrl+C (SIGINT) ou um aviso de desligamento (SIGTERM,
// usado por Docker e plataformas de deploy), terminamos as requisições em andamento antes de sair.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    app.log.info(`${signal} recebido, encerrando…`)
    await app.close()
    process.exit(0)
  })
}

// host 0.0.0.0 = aceita conexões de fora do container (necessário no Codespaces e no Docker).
await app.listen({ port: config.PORT, host: '0.0.0.0' })
