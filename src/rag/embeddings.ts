/**
 * Embeddings: transformam texto em uma lista de números (um vetor).
 *
 * Textos com significado parecido viram vetores que "apontam para o mesmo lado".
 * É isso que permite buscar por SIGNIFICADO, e não por palavras exatas:
 * "qual curso é de noite?" encontra "o curso funciona no período noturno".
 *
 * Mesmo padrão de llm.ts: fábrica que recebe o cliente por parâmetro (testável).
 */
import type { GeminiClient } from '../ai/llm.ts'

/** 768 números por texto: bom equilíbrio entre qualidade da busca e tamanho do índice. */
export const EMBEDDING_DIMENSIONS = 768

/** Recebe N textos e devolve N vetores, na mesma ordem. */
export type Embedder = (texts: string[]) => Promise<number[][]>

export function createEmbedder(client: GeminiClient, model: string): Embedder {
  return async function embed(texts) {
    const response = await client.models.embedContent({
      model,
      // ⚠️ Pegadinha real: cada texto precisa ir como um "Content" SEPARADO.
      // Se mandar uma lista de strings, o gemini-embedding-2 junta tudo em UM vetor só!
      contents: texts.map((text) => ({ parts: [{ text }] })),
      config: { outputDimensionality: EMBEDDING_DIMENSIONS },
    })

    const vectors = response.embeddings?.map((embedding) => embedding.values ?? []) ?? []

    // Valide suas suposições sobre APIs externas: conferimos se veio um vetor por texto.
    if (vectors.length !== texts.length) {
      throw new Error(`Esperava ${texts.length} embeddings, recebi ${vectors.length}`)
    }
    return vectors
  }
}
