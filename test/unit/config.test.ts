// Testa as regras do .env (src/config/env.ts) sem tocar no .env real.
import { describe, expect, it } from 'vitest'
import { parseEnv } from '../../src/config/env.ts'

describe('parseEnv', () => {
  it('aplica os valores padrão quando só a chave é informada', () => {
    const result = parseEnv({ GEMINI_API_KEY: 'abc' })
    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({
      GEMINI_MODEL: 'gemini-3.5-flash-lite',
      GEMINI_EMBEDDING_MODEL: 'gemini-embedding-2',
      PORT: 3333,
      LLM_TIMEOUT_MS: 30_000,
    })
  })

  it('converte números que chegam como texto', () => {
    expect(parseEnv({ GEMINI_API_KEY: 'abc', PORT: '8080' }).data?.PORT).toBe(8080)
  })

  it('recusa a ausência da chave', () => {
    expect(parseEnv({}).success).toBe(false)
  })

  it('recusa a chave de exemplo do .env.example', () => {
    expect(parseEnv({ GEMINI_API_KEY: 'cole_sua_chave_aqui' }).success).toBe(false)
  })

  it('trata GEMINI_THINKING_LEVEL vazio como "padrão do modelo"', () => {
    expect(parseEnv({ GEMINI_API_KEY: 'abc', GEMINI_THINKING_LEVEL: '' }).data?.GEMINI_THINKING_LEVEL).toBeUndefined()
  })
})
