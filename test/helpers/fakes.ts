/**
 * "Dublês" (fakes) usados nos testes no lugar das dependências reais.
 *
 * Testar com o Gemini de verdade seria lento, gastaria cota, exigiria chave e daria
 * resultados diferentes a cada execução. Com fakes, os testes são rápidos, gratuitos,
 * funcionam sem internet e sempre dão o mesmo resultado.
 *
 * `vi.fn()` cria uma função "espiã": além de devolver o que programamos, ela registra
 * como foi chamada — e o teste pode conferir (ex.: "a IA NÃO foi chamada").
 */
import { vi } from 'vitest'
import type { GeminiClient, Llm } from '../../src/ai/llm.ts'
import type { Retriever, SearchResult } from '../../src/rag/retriever.ts'

/** Cliente do Gemini falso: devolve as respostas programadas, em ordem. */
export function fakeGeminiClient(responses: string[] = [], streamPieces: string[] = []) {
  const models = {
    generateContent: vi.fn(async (_request: unknown) => ({ text: responses.shift() ?? '' })),
    generateContentStream: vi.fn(async (_request: unknown) =>
      (async function* () {
        for (const text of streamPieces) yield { text }
      })(),
    ),
  }
  // `models` fica exposto para os testes inspecionarem as chamadas recebidas.
  return { models, client: { models } as unknown as GeminiClient }
}

/** IA falsa para testar as rotas HTTP. Cada função pode ser substituída por teste. */
export function fakeLlm(overrides: Partial<Llm> = {}): Llm {
  return {
    chat: vi.fn(async () => 'resposta da IA'),
    chatJson: vi.fn(async () => ({})) as unknown as Llm['chatJson'],
    chatStream: vi.fn(async function* () {
      yield 'Olá, '
      yield 'mundo!'
    }),
    ...overrides,
  }
}

/** Um resultado de busca com valores padrão (sobrescreva só o que importa no teste). */
export function searchResult(partial: Partial<SearchResult> = {}): SearchResult {
  return {
    id: 'doc.md#0',
    source: 'doc.md',
    section: 'Seção',
    text: 'Texto do trecho',
    embedding: [1, 0],
    score: 0.8,
    ...partial,
  }
}

/** Busca falsa que sempre devolve os resultados informados. */
export const fakeRetriever = (results: SearchResult[] = []): Retriever => vi.fn(async () => results)
