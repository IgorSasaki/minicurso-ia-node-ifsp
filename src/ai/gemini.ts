/**
 * Instâncias REAIS da IA, configuradas a partir do .env.
 *
 * Este é o único arquivo que conhece a chave da API. Ele fica separado de `llm.ts`
 * justamente para que o resto do código (e os testes) não dependa dela.
 */
import { GoogleGenAI } from '@google/genai'
import { config } from '../config/config.ts'
import { createEmbedder } from '../rag/embeddings.ts'
import { createLlm } from './llm.ts'

// Um único cliente para o app inteiro, usando o SDK oficial do Google.
export const gemini = new GoogleGenAI({
  apiKey: config.GEMINI_API_KEY,
  httpOptions: {
    // Nunca espere para sempre por uma API externa: depois do tempo limite, desistimos.
    timeout: config.LLM_TIMEOUT_MS,
    // Falhas passageiras (instabilidade de rede, erro 503) são tentadas de novo automaticamente.
    retryOptions: { attempts: 3 },
  },
})

export const llm = createLlm(gemini, {
  model: config.GEMINI_MODEL,
  thinkingLevel: config.GEMINI_THINKING_LEVEL,
})

// Etapa 4: a função que transforma textos em vetores (usada pelo RAG).
export const embed = createEmbedder(gemini, config.GEMINI_EMBEDDING_MODEL)
