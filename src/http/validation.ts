/**
 * Integração do zod com o Fastify.
 *
 * Por padrão o Fastify valida requisições com JSON Schema. Aqui ensinamos o Fastify
 * a usar schemas do zod: a rota declara `schema: { body: meuSchemaZod }` e o Fastify
 * valida o corpo ANTES de chamar o handler.
 *
 * Resultado: nenhuma rota precisa repetir `safeParse()` + `if (!success) return 400`.
 * Se o corpo for inválido, o erro vai para o tratador central (errors.ts), que responde 400.
 */
import type { FastifySchemaCompiler } from 'fastify'
import type { ZodType } from 'zod'

export const zodValidatorCompiler: FastifySchemaCompiler<ZodType> =
  ({ schema }) =>
  (data) => {
    const result = schema.safeParse(data)
    // `value` = dado já validado (e transformado, ex.: `.trim()`), que chega no handler.
    return result.success ? { value: result.data } : { error: result.error }
  }
