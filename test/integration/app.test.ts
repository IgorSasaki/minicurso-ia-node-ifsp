/**
 * Testes de integração da API: montamos o app inteiro com `buildApp()` e simulamos
 * requisições HTTP com `app.inject()` — sem abrir porta, sem internet, sem gastar cota.
 *
 * Vários testes aqui existem porque o bug aconteceu de verdade durante o desenvolvimento
 * (veja docs/steps/08-production.md). Um teste que protege contra um bug real é o melhor teste.
 */
import { ApiError } from '@google/genai'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InvalidResponseError } from '../../src/ai/llm.ts'
import { CAREER_PLAN_INSTRUCTIONS, NOT_FOUND_ANSWER, RAG_RULES } from '../../src/ai/prompts.ts'
import { type AppDependencies, buildApp } from '../../src/app.ts'
import { careerPlanSchema } from '../../src/schemas/career-plan.ts'
import { fakeLlm, fakeRetriever, samplePlan, searchResult } from '../helpers/fakes.ts'

let app: Awaited<ReturnType<typeof buildApp>> | undefined

/** Monta o app com dependências falsas; cada teste sobrescreve só o que precisa. */
async function createApp(deps: Partial<AppDependencies> = {}) {
  app = await buildApp({ llm: fakeLlm(), retrieve: fakeRetriever(), modelName: 'modelo-teste', logger: false, ...deps })
  return app
}

/** O app do teste atual (falha com mensagem clara se createApp() não foi chamado). */
function currentApp() {
  if (!app) throw new Error('Chame createApp() antes de usar o app no teste')
  return app
}

const post = (url: string, payload: object) => currentApp().inject({ method: 'POST', url, payload })
const validChat = { messages: [{ role: 'user', text: 'Estágio ou faculdade?' }] }

// Fecha o app depois de cada teste (libera recursos e zera o rate limit).
afterEach(async () => {
  await app?.close()
  app = undefined
})

describe('rotas básicas', () => {
  it('GET /health informa o modelo', async () => {
    await createApp()
    const response = await currentApp().inject('/health')
    expect(response.json()).toEqual({ status: 'ok', model: 'modelo-teste' })
  })

  it('serve o front-end, e recarregar a página não consome o limite das rotas de IA', async () => {
    await createApp()
    for (let i = 0; i < 20; i++) expect((await currentApp().inject('/')).statusCode).toBe(200)
  })
})

describe('validação de entrada', () => {
  it('responde 400 com os detalhes de cada campo inválido', async () => {
    await createApp()
    const response = await post('/chat', { messages: [] })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: 'Requisição inválida', details: [{ field: 'messages' }] })
  })

  it('responde 400 para JSON malformado', async () => {
    await createApp()
    const response = await currentApp().inject({
      method: 'POST',
      url: '/chat',
      headers: { 'content-type': 'application/json' },
      payload: '{quebrado',
    })
    expect(response.statusCode).toBe(400)
  })
})

describe('POST /chat e /chat/stream', () => {
  it('devolve a resposta da IA usando a persona do mentor', async () => {
    const llm = fakeLlm()
    await createApp({ llm })
    const response = await post('/chat', validChat)
    expect(response.json()).toEqual({ answer: 'resposta da IA' })
    expect(llm.chat).toHaveBeenCalledWith(validChat.messages, expect.objectContaining({ system: expect.any(String) }))
  })

  it('faz streaming do texto em pedaços', async () => {
    await createApp()
    const response = await post('/chat/stream', validChat)
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toMatch(/text\/plain/)
    expect(response.body).toBe('Olá, mundo!')
  })

  it('se a IA falhar antes do 1º pedaço, responde erro JSON (e não 200 com texto cortado)', async () => {
    const llm = fakeLlm({
      // biome-ignore lint/correctness/useYield: o gerador falha antes de produzir qualquer pedaço
      chatStream: vi.fn(async function* () {
        throw new ApiError({ message: 'quota', status: 429 })
      }),
    })
    await createApp({ llm })
    const response = await post('/chat/stream', validChat)
    expect(response.statusCode).toBe(429)
    expect(response.json().error).toMatch(/Limite gratuito/)
  })

  it('aplica o limite de 15 chamadas de IA por minuto', async () => {
    await createApp()
    const statuses: number[] = []
    for (let i = 0; i < 16; i++) statuses.push((await post('/chat', validChat)).statusCode)
    expect(statuses.slice(0, 15).every((status) => status === 200)).toBe(true)
    expect(statuses[15]).toBe(429)
  })
})

describe('tratamento de erros: mensagem útil para o usuário, detalhes só no log', () => {
  const cases = [
    {
      name: 'chave inválida no provedor',
      error: new ApiError({ message: 'API key not valid', status: 400 }),
      status: 502,
    },
    { name: 'cota do provedor', error: new ApiError({ message: 'RESOURCE_EXHAUSTED', status: 429 }), status: 429 },
    { name: 'provedor fora do ar', error: new ApiError({ message: 'backend 503', status: 503 }), status: 503 },
    { name: 'JSON fora do schema', error: new InvalidResponseError('campo x'), status: 502 },
    { name: 'erro inesperado', error: new Error('stack interno: senha=123'), status: 500 },
  ]

  for (const { name, error, status } of cases) {
    it(`${name} → ${status}, sem vazar a mensagem interna`, async () => {
      await createApp({ llm: fakeLlm({ chat: vi.fn(async () => Promise.reject(error)) }) })
      const response = await post('/chat', validChat)
      expect(response.statusCode).toBe(status)
      expect(response.body).not.toContain(error.message)
      expect(response.json().error).toEqual(expect.any(String))
    })
  }
})

describe('POST /ask (RAG)', () => {
  it('não chama a IA quando nenhum trecho é relevante', async () => {
    const llm = fakeLlm()
    await createApp({ llm, retrieve: fakeRetriever([]) })
    const response = await post('/ask', { question: 'Quem ganhou a Copa de 2002?' })
    expect(response.json()).toEqual({ answer: NOT_FOUND_ANSWER, sources: [] })
    expect(llm.chat).not.toHaveBeenCalled()
  })

  it('usa as regras do RAG no system e devolve as fontes numeradas', async () => {
    const llm = fakeLlm({ chat: vi.fn(async () => 'O ADS é matutino [1].') })
    await createApp({
      llm,
      retrieve: fakeRetriever([searchResult({ source: 'ads.md', section: 'Turno', score: 0.81449 })]),
    })

    const response = await post('/ask', { question: 'Qual o turno do ADS?' })
    expect(response.json()).toEqual({
      answer: 'O ADS é matutino [1].',
      sources: [{ ref: 1, file: 'ads.md', section: 'Turno', score: 0.814 }],
    })
    const [sentMessages, options] = vi.mocked(llm.chat).mock.calls[0] ?? []
    expect(options).toMatchObject({ system: RAG_RULES, temperature: 0.2 })
    expect(sentMessages?.[0]?.text).toContain('<pergunta>\nQual o turno do ADS?\n</pergunta>')
  })
})

describe('POST /career-plan', () => {
  it('devolve o plano gerado pela IA, pedido com o schema e as instruções de mentor', async () => {
    const plan = samplePlan()
    const llm = fakeLlm({ chatJson: vi.fn(async () => plan) as never })
    await createApp({ llm })
    const response = await post('/career-plan', { aboutMe: 'Sou o Lucas, gosto de CSS e preciso trabalhar de dia.' })
    expect(response.json()).toEqual(plan)

    const [, schema, options] = vi.mocked(llm.chatJson).mock.calls[0] ?? []
    expect(schema).toBe(careerPlanSchema)
    expect(options).toMatchObject({ system: CAREER_PLAN_INSTRUCTIONS })
  })

  it('recusa perfis curtos demais antes de gastar uma chamada de IA', async () => {
    const llm = fakeLlm()
    await createApp({ llm })
    const response = await post('/career-plan', { aboutMe: 'curto' })
    expect(response.statusCode).toBe(400)
    expect(llm.chatJson).not.toHaveBeenCalled()
  })
})
