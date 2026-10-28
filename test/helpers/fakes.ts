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
import type { CareerPlan } from '../../src/schemas/career-plan.ts'

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

/** Um plano de carreira completo e VÁLIDO segundo o schema (base para os testes do plano). */
export function samplePlan(): CareerPlan {
  return {
    profileSummary: 'Lucas, 17 anos, gosta de CSS e precisa trabalhar de dia.',
    recommendedPath: 'spi_degree',
    rationale: 'O SPI é noturno e combina com o gosto por sites.',
    alternativePath: { path: 'job_market', whenItFits: 'Se a renda for urgente, um estágio vem primeiro.' },
    interestAreas: ['front-end'],
    studyPath: [
      { order: 1, topic: 'HTML e CSS', reason: 'Base de tudo.', howToStart: 'Refazer uma página que você usa.' },
      { order: 2, topic: 'JavaScript', reason: 'Dá vida à página.', howToStart: 'Criar uma lista de tarefas.' },
      { order: 3, topic: 'Git', reason: 'Todo time usa.', howToStart: 'Subir o projeto no GitHub.' },
    ],
    skillsToDevelop: [
      { skill: 'CSS responsivo', kind: 'technical', why: 'Sites precisam funcionar no celular.' },
      { skill: 'Comunicação', kind: 'soft', why: 'Explicar o seu trabalho conta na entrevista.' },
      { skill: 'Organização', kind: 'soft', why: 'Estudar à noite exige rotina.' },
    ],
    milestones: [
      { horizon: '3_months', goal: 'Publicar o portfólio.' },
      { horizon: '6_months', goal: 'Terminar um projeto em JavaScript.' },
      { horizon: '12_months', goal: 'Conseguir o primeiro estágio.' },
    ],
    portfolioProject: { title: 'Portfólio Pessoal', description: 'Um site sobre você.', technologies: ['HTML', 'CSS'] },
    resources: [
      { name: 'Documentação da MDN', kind: 'docs', why: 'Referência de HTML, CSS e JS.' },
      { name: 'Curso em Vídeo', kind: 'course', why: 'Aulas gratuitas em português.' },
    ],
    exploreNext: [
      'Acessibilidade: como pessoas cegas navegam na web.',
      'Animações em CSS: dá para fazer jogos só com CSS.',
    ],
    reflectionQuestions: ['O que você faria se tivesse uma tarde livre?', 'Que site você gostaria de ter criado?'],
    nextStepThisWeek: 'Criar uma conta no GitHub.',
  }
}

/** Busca falsa que sempre devolve os resultados informados. */
export const fakeRetriever = (results: SearchResult[] = []): Retriever => vi.fn(async () => results)
