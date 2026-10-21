/**
 * Nosso "banco vetorial": um arquivo JSON (data/index.json) carregado em memória.
 *
 * Para alguns milhares de chunks isso é rápido o suficiente. Em produção, você trocaria
 * por um banco vetorial de verdade — pgvector (Postgres), Qdrant, Pinecone, Chroma...
 * A ideia é exatamente a mesma: guardar { texto, fonte, vetor } e buscar por similaridade.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { z } from 'zod'

// O índice vem de um ARQUIVO: validamos o formato em vez de confiar cegamente no JSON.parse.
const vectorIndexSchema = z.object({
  /** Modelo de embedding que gerou os vetores. */
  model: z.string(),
  /** Quantos números tem cada vetor. */
  dimensions: z.number().int().positive(),
  createdAt: z.string(),
  chunks: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      section: z.string(),
      text: z.string(),
      embedding: z.array(z.number()),
    }),
  ),
})

export type VectorIndex = z.infer<typeof vectorIndexSchema>
export type IndexedChunk = VectorIndex['chunks'][number]

/** Caminho do índice, relativo a ESTE arquivo (funciona de qualquer pasta onde o comando for rodado). */
export const INDEX_PATH = new URL('../../data/index.json', import.meta.url)

export async function saveIndex(index: VectorIndex, path: URL = INDEX_PATH): Promise<void> {
  // Arredondar para 6 casas decimais reduz bastante o tamanho do arquivo sem perder qualidade.
  const compact = {
    ...index,
    chunks: index.chunks.map((chunk) => ({ ...chunk, embedding: chunk.embedding.map((n) => Number(n.toFixed(6))) })),
  }
  await writeFile(path, JSON.stringify(compact))
}

/**
 * Carrega e valida o índice.
 *
 * Se ele foi gerado com OUTRO modelo de embedding, a busca daria resultados errados
 * sem nenhum erro aparente (os números simplesmente não seriam comparáveis).
 * Por isso conferimos o modelo e as dimensões e falhamos alto, explicando o que fazer.
 */
export async function loadIndex(
  expected: { model: string; dimensions: number },
  path: URL = INDEX_PATH,
): Promise<VectorIndex> {
  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch {
    throw new Error('Índice não encontrado. Rode primeiro:  pnpm ingest')
  }

  const index = vectorIndexSchema.parse(JSON.parse(raw))

  if (index.model !== expected.model || index.dimensions !== expected.dimensions) {
    throw new Error(
      `O índice foi gerado com ${index.model} (${index.dimensions} dimensões), ` +
        `mas o app usa ${expected.model} (${expected.dimensions}). Rode:  pnpm ingest`,
    )
  }
  if (index.chunks.some((chunk) => chunk.embedding.length !== index.dimensions)) {
    throw new Error('Índice corrompido: há vetores com dimensão diferente da declarada. Rode:  pnpm ingest')
  }
  return index
}
