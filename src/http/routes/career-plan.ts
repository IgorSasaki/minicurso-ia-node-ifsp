/**
 * Rota POST /career-plan — transforma texto livre em um plano de carreira ESTRUTURADO.
 *
 * Corpo esperado:
 *   { "aboutMe": "Sou o Lucas, 17 anos, gosto de CSS e preciso trabalhar de dia..." }
 * Resposta: um objeto `CareerPlan` (veja src/schemas/career-plan.ts), validado pelo zod.
 *
 * É a IA funcionando como uma FUNÇÃO: entra texto, sai dado. Esse é o uso mais comum
 * de IA em empresas (ler notas fiscais, classificar chamados, extrair dados de currículos).
 */
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import type { Llm } from '../../ai/llm.ts'
import { CAREER_PLAN_INSTRUCTIONS } from '../../ai/prompts.ts'
import { careerPlanSchema } from '../../schemas/career-plan.ts'
import { AI_RATE_LIMIT } from '../rate-limit.ts'

export const careerPlanBodySchema = z.object({
  aboutMe: z.string().trim().min(20, 'Conte um pouco mais sobre você (mínimo 20 caracteres)').max(1500),
})
type CareerPlanBody = z.infer<typeof careerPlanBodySchema>

export const careerPlanRoutes: FastifyPluginAsync<{ llm: Llm }> = async (app, { llm }) => {
  const routeOptions = { schema: { body: careerPlanBodySchema }, config: { rateLimit: AI_RATE_LIMIT } }

  app.post<{ Body: CareerPlanBody }>('/career-plan', routeOptions, async (request) => {
    // O retorno já é um objeto tipado (CareerPlan): dá para salvar no banco, mandar por
    // e-mail, mostrar num dashboard... É dado, não é texto.
    return llm.chatJson(
      [{ role: 'user', text: `Monte um plano de carreira para este estudante:\n\n${request.body.aboutMe}` }],
      careerPlanSchema,
      { system: CAREER_PLAN_INSTRUCTIONS },
    )
  })
}
