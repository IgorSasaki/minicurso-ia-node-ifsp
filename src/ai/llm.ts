/**
 * Camada de IA: as funções que conversam com o modelo de linguagem (LLM).
 *
 * Padrão usado aqui: FÁBRICA + INJEÇÃO DE DEPENDÊNCIA.
 * `createLlm()` recebe o cliente do Gemini por parâmetro, em vez de importá-lo.
 * Vantagem: nos testes passamos um cliente FALSO — sem chave, sem internet e sem gastar cota.
 * O cliente REAL é criado em `gemini.ts`.
 */
import type { Content, GoogleGenAI } from '@google/genai'
import { ThinkingLevel } from '@google/genai'
import { z } from 'zod'

/** Uma mensagem da conversa. No Gemini, os papéis são "user" (pessoa) e "model" (IA). */
export type Message = { role: 'user' | 'model'; text: string }

export type ChatOptions = {
  /** Instruções de comportamento (a "persona"). O usuário não vê, mas o modelo obedece. */
  system?: string
  /** 0 = previsível · 2 = muito criativo. */
  temperature?: number
  /** Permite cancelar a geração no meio (ex.: o usuário fechou a aba). */
  signal?: AbortSignal
}

export type LlmConfig = {
  model: string
  thinkingLevel?: keyof typeof ThinkingLevel
}

/** A IA respondeu, mas fora do formato combinado — mesmo depois de uma nova tentativa. */
export class InvalidResponseError extends Error {
  constructor(public readonly details: string) {
    super('A IA não conseguiu gerar um JSON válido')
    this.name = 'InvalidResponseError'
  }
}

/** Só precisamos da parte `models` do cliente — isso facilita criar um cliente falso nos testes. */
export type GeminiClient = Pick<GoogleGenAI, 'models'>

/** Converte o nosso formato simples de mensagem para o formato que a API do Gemini espera. */
export function toContents(messages: Message[]): Content[] {
  return messages.map((message) => ({ role: message.role, parts: [{ text: message.text }] }))
}

export function createLlm(client: GeminiClient, { model, thinkingLevel }: LlmConfig) {
  /** Monta as opções comuns a todas as chamadas de geração de texto. */
  function generationConfig({ system, temperature = 0.7, signal }: ChatOptions) {
    return {
      systemInstruction: system,
      temperature,
      abortSignal: signal,
      // O spread condicional só adiciona `thinkingConfig` quando há um nível configurado.
      ...(thinkingLevel && { thinkingConfig: { thinkingLevel: ThinkingLevel[thinkingLevel] } }),
    }
  }

  /** Envia uma conversa e devolve só o texto da resposta. */
  async function chat(messages: Message[], options: ChatOptions = {}): Promise<string> {
    const response = await client.models.generateContent({
      model,
      contents: toContents(messages),
      config: generationConfig(options),
    })
    // `response.text` pode vir vazio (ex.: resposta bloqueada por segurança): devolvemos ''.
    return response.text ?? ''
  }

  /**
   * Pede uma resposta em JSON que siga o schema zod — e CONFERE se seguiu mesmo.
   * Se a validação falhar, tenta mais uma vez, mostrando o erro para o próprio modelo corrigir.
   *
   * O tipo de retorno vem do schema: `chatJson(msgs, careerPlanSchema)` devolve um `CareerPlan`.
   */
  async function chatJson<T extends z.ZodType>(
    messages: Message[],
    schema: T,
    options: ChatOptions = {},
  ): Promise<z.infer<T>> {
    const contents = toContents(messages)
    const responseJsonSchema = z.toJSONSchema(schema)
    let lastError = ''

    for (let attempt = 1; attempt <= 2; attempt++) {
      const response = await client.models.generateContent({
        model,
        contents,
        config: {
          // Temperatura mais baixa: queremos dados consistentes, não criatividade.
          ...generationConfig({ temperature: 0.4, ...options }),
          responseMimeType: 'application/json', // "responda em JSON..."
          responseJsonSchema, // "...exatamente neste formato"
        },
      })

      const text = response.text ?? ''
      const result = schema.safeParse(parseJson(text))
      if (result.success) return result.data

      // Confie, mas confira: mostramos o erro ao modelo e pedimos para corrigir.
      lastError = z.prettifyError(result.error)
      contents.push(
        { role: 'model', parts: [{ text }] },
        {
          role: 'user',
          parts: [{ text: `Seu JSON não passou na validação: ${lastError}. Corrija e responda apenas o JSON.` }],
        },
      )
    }

    throw new InvalidResponseError(lastError)
  }

  /**
   * Igual ao chat(), mas devolve a resposta em PEDAÇOS, conforme o modelo vai gerando.
   * `async function*` é um gerador assíncrono: quem chama consome com `for await (const pedaco of ...)`.
   */
  async function* chatStream(messages: Message[], options: ChatOptions = {}): AsyncGenerator<string, void> {
    const stream = await client.models.generateContentStream({
      model,
      contents: toContents(messages),
      config: generationConfig(options),
    })
    for await (const chunk of stream) {
      // Alguns pedaços chegam sem texto (só metadados): pulamos esses.
      if (chunk.text) yield chunk.text
    }
  }

  return { chat, chatJson, chatStream }
}

/** O tipo do objeto devolvido por createLlm — usado por quem recebe a IA como dependência. */
export type Llm = ReturnType<typeof createLlm>

/** `JSON.parse` lança exceção com texto inválido; aqui devolvemos `undefined` e deixamos o zod reclamar. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
