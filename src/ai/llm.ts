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

/** Uma mensagem da conversa. No Gemini, os papéis são "user" (pessoa) e "model" (IA). */
export type Message = { role: 'user' | 'model'; text: string }

export type ChatOptions = {
  /** Instruções de comportamento (a "persona"). O usuário não vê, mas o modelo obedece. */
  system?: string
  /** 0 = previsível · 2 = muito criativo. */
  temperature?: number
}

export type LlmConfig = {
  model: string
  thinkingLevel?: keyof typeof ThinkingLevel
}

/** Só precisamos da parte `models` do cliente — isso facilita criar um cliente falso nos testes. */
export type GeminiClient = Pick<GoogleGenAI, 'models'>

/** Converte o nosso formato simples de mensagem para o formato que a API do Gemini espera. */
export function toContents(messages: Message[]): Content[] {
  return messages.map((message) => ({ role: message.role, parts: [{ text: message.text }] }))
}

export function createLlm(client: GeminiClient, { model, thinkingLevel }: LlmConfig) {
  /** Monta as opções comuns a todas as chamadas de geração de texto. */
  function generationConfig({ system, temperature = 0.7 }: ChatOptions) {
    return {
      systemInstruction: system,
      temperature,
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

  return { chat }
}

/** O tipo do objeto devolvido por createLlm — usado por quem recebe a IA como dependência. */
export type Llm = ReturnType<typeof createLlm>
