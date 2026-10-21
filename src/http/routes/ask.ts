/**
 * Rota POST /ask — responde perguntas usando SOMENTE os documentos (RAG), citando as fontes.
 *
 * Corpo esperado:   { "question": "Qual o turno do curso de ADS?" }
 * Resposta:
 *   {
 *     "answer": "O curso de ADS é oferecido no turno matutino [1].",
 *     "sources": [{ "ref": 1, "file": "ads-ifsp-araraquara.md", "section": "Dados gerais...", "score": 0.814 }]
 *   }
 */
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import type { Llm } from '../../ai/llm.ts'
import { buildRagPrompt, NOT_FOUND_ANSWER, RAG_RULES } from '../../ai/prompts.ts'
import type { Retriever } from '../../rag/retriever.ts'

export const askBodySchema = z.object({
  question: z.string().trim().min(3).max(500),
})
type AskBody = z.infer<typeof askBodySchema>

export type AskResponse = {
  answer: string
  sources: { ref: number; file: string; section: string; score: number }[]
}

export const askRoutes: FastifyPluginAsync<{ llm: Llm; retrieve: Retriever }> = async (app, { llm, retrieve }) => {
  app.post<{ Body: AskBody }>(
    '/ask',
    { schema: { body: askBodySchema } },
    async (request): Promise<AskResponse> => {
      const { question } = request.body

      // 1) RETRIEVAL — buscar os trechos mais relevantes
      const passages = await retrieve(question)

      // Nada relevante? Nem chamamos a LLM: resposta honesta e zero tokens gastos.
      if (passages.length === 0) return { answer: NOT_FOUND_ANSWER, sources: [] }

      // 2) AUGMENTED — regras no system, dados na mensagem
      // 3) GENERATION — o modelo responde com base nos trechos
      const answer = await llm.chat([{ role: 'user', text: buildRagPrompt(question, passages) }], {
        system: RAG_RULES,
        temperature: 0.2, // pouca criatividade: queremos fidelidade aos documentos
      })

      return {
        answer,
        // `ref` é o número que o modelo usa nas citações: [1] = primeiro trecho, [2] = segundo...
        sources: passages.map((passage, i) => ({
          ref: i + 1,
          file: passage.source,
          section: passage.section,
          score: Number(passage.score.toFixed(3)),
        })),
      }
    },
  )
}
