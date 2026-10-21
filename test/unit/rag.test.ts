// Testa as peças do RAG: similaridade, chunking, busca e o índice vetorial.
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { CHUNK_OVERLAP, chunkMarkdown, MAX_CHUNK_SIZE, slidingWindows } from '../../src/rag/chunker.ts'
import { createRetriever } from '../../src/rag/retriever.ts'
import { cosineSimilarity } from '../../src/rag/similarity.ts'
import { loadIndex, type VectorIndex } from '../../src/rag/vector-store.ts'

describe('cosineSimilarity', () => {
  it('vale 1 na mesma direção, 0 em direções perpendiculares e -1 em direções opostas', () => {
    expect(cosineSimilarity([1, 2], [2, 4])).toBeCloseTo(1)
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1)
  })

  it('não devolve NaN para vetor nulo', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
  })

  it('falha alto quando as dimensões não batem', () => {
    expect(() => cosineSimilarity([1, 2, 3], [1, 2])).toThrow(/dimensões diferentes/)
  })
})

describe('chunkMarkdown', () => {
  const markdown = '# Curso X\n\nFonte: PPC\n\n## Turno\nMatutino.\n\n## Vagas\n40 por ano.\n'

  it('cria um chunk por seção, com o título do documento e da seção no texto', () => {
    const chunks = chunkMarkdown('x.md', markdown)
    expect(chunks.map((chunk) => chunk.section)).toEqual(['Turno', 'Vagas'])
    expect(chunks[0]).toEqual({ id: 'x.md#0', source: 'x.md', section: 'Turno', text: 'Curso X\nTurno\n\nMatutino.' })
  })

  it('não perde documentos sem seções "##"', () => {
    const chunks = chunkMarkdown('loose.md', '# Solto\n\nTexto sem seções.')
    expect(chunks).toHaveLength(1)
    expect(chunks[0]?.text).toContain('Texto sem seções.')
  })

  it('ignora seções vazias', () => {
    expect(chunkMarkdown('v.md', '# V\n## Vazia\n\n## Cheia\nconteúdo')).toHaveLength(1)
  })
})

describe('slidingWindows', () => {
  it('devolve textos curtos inteiros', () => {
    expect(slidingWindows('curto')).toEqual(['curto'])
  })

  it('quebra textos longos em janelas com sobreposição, sem perder conteúdo', () => {
    const lines = Array.from({ length: 80 }, (_, i) => `linha ${String(i).padStart(2, '0')} ${'x'.repeat(30)}`)
    const pieces = slidingWindows(lines.join('\n'))

    expect(pieces.length).toBeGreaterThan(1)
    for (const piece of pieces) expect(piece.length).toBeLessThanOrEqual(MAX_CHUNK_SIZE)
    // Nenhuma linha pode sumir no corte
    for (const line of lines) expect(pieces.some((piece) => piece.includes(line))).toBe(true)
    // Sobreposição: o final de uma janela reaparece na seguinte
    expect(pieces[1]).toContain((pieces[0] ?? '').slice(-40).trim())
    expect(CHUNK_OVERLAP).toBeLessThan(MAX_CHUNK_SIZE / 2) // garante que o laço sempre avança
  })
})

const index: VectorIndex = {
  model: 'emb',
  dimensions: 2,
  createdAt: '2026-01-01',
  chunks: [
    { id: 'a#0', source: 'a.md', section: 'Noite', text: 'noturno', embedding: [1, 0] },
    { id: 'b#0', source: 'b.md', section: 'Manhã', text: 'matutino', embedding: [0.8, 0.6] },
    { id: 'c#0', source: 'c.md', section: 'Bolo', text: 'receita', embedding: [0, 1] },
  ],
}

describe('createRetriever', () => {
  it('ordena por similaridade, descarta o que está abaixo do score mínimo e respeita o topK', async () => {
    const embed = vi.fn(async () => [[1, 0]])
    const retrieve = createRetriever(index, embed, 0.5)

    const results = await retrieve('qual curso é de noite?', 5)
    expect(results.map((result) => result.id)).toEqual(['a#0', 'b#0']) // o bolo (score 0) ficou de fora
    expect(results[0]?.score).toBeCloseTo(1)
    expect(await retrieve('x', 1)).toHaveLength(1)
  })

  it('devolve lista vazia quando nada é relevante', async () => {
    const retrieve = createRetriever(index, async () => [[-1, 0]])
    expect(await retrieve('copa de 2002')).toEqual([])
  })
})

describe('loadIndex', () => {
  /** Grava um índice num arquivo temporário e devolve o caminho. */
  async function writeTempIndex(content: unknown) {
    const dir = await mkdtemp(join(tmpdir(), 'rota-tech-'))
    const file = join(dir, 'index.json')
    await writeFile(file, JSON.stringify(content))
    return pathToFileURL(file)
  }

  it('carrega um índice válido', async () => {
    expect(await loadIndex({ model: 'emb', dimensions: 2 }, await writeTempIndex(index))).toEqual(index)
  })

  it('recusa índice gerado com outro modelo de embedding', async () => {
    await expect(loadIndex({ model: 'outro', dimensions: 2 }, await writeTempIndex(index))).rejects.toThrow(
      /pnpm ingest/,
    )
  })

  it('recusa índice com formato inválido', async () => {
    await expect(loadIndex({ model: 'emb', dimensions: 2 }, await writeTempIndex({ chunks: 'x' }))).rejects.toThrow()
  })

  it('explica o que fazer quando o índice não existe', async () => {
    await expect(loadIndex({ model: 'emb', dimensions: 2 }, pathToFileURL('/nao/existe.json'))).rejects.toThrow(
      /pnpm ingest/,
    )
  })
})
