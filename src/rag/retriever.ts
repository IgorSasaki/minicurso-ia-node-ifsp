/**
 * Retrieval (o "R" do RAG): encontrar os trechos mais parecidos com a pergunta.
 *
 * Passo a passo:
 *   1) transformar a pergunta em vetor (embedding);
 *   2) calcular a similaridade dela com CADA chunk do índice;
 *   3) descartar o que estiver abaixo do score mínimo ("nada a ver");
 *   4) ordenar do mais parecido para o menos e ficar com os K primeiros.
 *
 * Com poucos milhares de chunks, comparar com todos (busca "força bruta") é rápido.
 * Bancos vetoriais usam índices especiais (HNSW, IVF) para fazer isso com milhões.
 */
import type { Embedder } from './embeddings.ts'
import { cosineSimilarity } from './similarity.ts'
import type { IndexedChunk, VectorIndex } from './vector-store.ts'

export type SearchResult = IndexedChunk & { score: number }
export type Retriever = (question: string, topK?: number) => Promise<SearchResult[]>

/**
 * Abaixo deste score consideramos que o trecho "não tem nada a ver" com a pergunta.
 * Valor CALIBRADO testando perguntas dentro e fora do assunto (veja o guia da etapa 6).
 * Cada modelo de embedding tem sua própria escala: recalibre se trocar de modelo.
 */
export const MIN_SCORE = 0.58

/** Cria a função de busca. O índice é carregado UMA vez (na subida do servidor) e chega pronto aqui. */
export function createRetriever(index: VectorIndex, embed: Embedder, minScore = MIN_SCORE): Retriever {
  return async function retrieve(question, topK = 4) {
    const [questionVector] = await embed([question])
    if (!questionVector) throw new Error('O embedding da pergunta não foi gerado')

    return index.chunks
      .map((chunk) => ({ ...chunk, score: cosineSimilarity(questionVector, chunk.embedding) }))
      .filter((result) => result.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  }
}
