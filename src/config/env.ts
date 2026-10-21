/**
 * Schema das variáveis de ambiente (o arquivo .env).
 *
 * Por que validar o .env?
 * Se a chave da API estiver faltando, queremos descobrir AGORA, ao iniciar o app,
 * com uma mensagem clara — e não minutos depois, no meio de uma requisição,
 * com um erro misterioso vindo da API do Google.
 *
 * Este arquivo é "puro": só declara regras, não lê nada do sistema.
 * Isso permite testá-lo com qualquer objeto, sem depender do .env real.
 */
import { z } from 'zod'

export const envSchema = z.object({
  // Obrigatória. Criada em https://aistudio.google.com/apikey
  GEMINI_API_KEY: z
    .string({ error: 'GEMINI_API_KEY não encontrada — você criou o arquivo .env?' })
    .min(1, 'GEMINI_API_KEY está vazia')
    // O .env.example vem com um texto de exemplo; avisamos se ele não foi trocado.
    .refine((value) => value !== 'cole_sua_chave_aqui', 'Você esqueceu de colar sua chave no .env'),

  // `.default()` = valor usado quando a variável não existe no .env.
  GEMINI_MODEL: z.string().default('gemini-3.5-flash-lite'),

  // Quanto o modelo "pensa" antes de responder. Vazio = padrão do modelo.
  // O `.transform()` converte a string vazia em `undefined` para o resto do código.
  GEMINI_THINKING_LEVEL: z
    .enum(['MINIMAL', 'LOW', 'MEDIUM', 'HIGH', ''])
    .optional()
    .transform((value) => value || undefined),

  GEMINI_EMBEDDING_MODEL: z.string().default('gemini-embedding-2'),

  // Variáveis de ambiente são sempre texto. `z.coerce.number()` converte "30000" → 30000.
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  PORT: z.coerce.number().int().default(3333),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
})

/** O tipo TypeScript da configuração é gerado automaticamente a partir do schema. */
export type Config = z.infer<typeof envSchema>

/**
 * Valida um conjunto de variáveis e devolve o resultado do zod:
 * `{ success: true, data }` ou `{ success: false, error }` — sem lançar exceção.
 */
export function parseEnv(env: Record<string, string | undefined>) {
  return envSchema.safeParse(env)
}
