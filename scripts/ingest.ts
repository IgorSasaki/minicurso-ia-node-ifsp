/**
 * Etapa 5 — Ingestão: documentos → chunks → embeddings → data/index.json
 * Rode com:  pnpm ingest
 *
 * Este script roda UMA vez (ou sempre que os documentos mudarem) — não a cada pergunta.
 * Por isso ele fica em `scripts/` e não dentro do servidor.
 */
import { readdir, readFile } from 'node:fs/promises'
import { embed } from '../src/ai/gemini.ts'
import { config } from '../src/config/config.ts'
import { type Chunk, chunkMarkdown } from '../src/rag/chunker.ts'
import { EMBEDDING_DIMENSIONS } from '../src/rag/embeddings.ts'
import { type IndexedChunk, saveIndex } from '../src/rag/vector-store.ts'

const DOCUMENTS_DIR = new URL('../data/documents/', import.meta.url)
/** Quantos textos mandamos por chamada de embedding (menos chamadas = menos chance de bater no limite). */
const BATCH_SIZE = 20

// 1) Ler e quebrar os documentos.
// Ordenamos os arquivos para que o índice gerado seja sempre o mesmo, em qualquer sistema operacional.
const files = (await readdir(DOCUMENTS_DIR)).filter((file) => file.endsWith('.md')).sort()
const chunks: Chunk[] = []
for (const file of files) {
  const markdown = await readFile(new URL(file, DOCUMENTS_DIR), 'utf8')
  const fileChunks = chunkMarkdown(file, markdown)
  chunks.push(...fileChunks)
  console.log(`📄 ${file.padEnd(36)} → ${fileChunks.length} chunks`)
}

// 2) Gerar os embeddings em lotes.
const indexed: IndexedChunk[] = []
for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
  const batch = chunks.slice(i, i + BATCH_SIZE)
  const vectors = await embed(batch.map((chunk) => chunk.text))

  // `embed()` garante um vetor por texto, na mesma ordem: o j-ésimo vetor é do j-ésimo chunk.
  for (const [j, chunk] of batch.entries()) {
    const embedding = vectors[j]
    if (!embedding) throw new Error(`Embedding ausente para ${chunk.id}`)
    indexed.push({ ...chunk, embedding })
  }
  console.log(`🔢 embeddings ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length}`)
}

// 3) Salvar o índice, registrando qual modelo gerou os vetores (o servidor confere isso ao subir).
await saveIndex({
  model: config.GEMINI_EMBEDDING_MODEL,
  dimensions: EMBEDDING_DIMENSIONS,
  createdAt: new Date().toISOString(),
  chunks: indexed,
})
console.log(`\n✅ ${indexed.length} chunks salvos em data/index.json`)
