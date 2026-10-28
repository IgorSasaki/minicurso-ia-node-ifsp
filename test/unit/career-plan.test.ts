// Testa o "contrato" do plano de carreira (src/schemas/career-plan.ts) e os prompts do mentor.
// Se alguém afrouxar o schema sem querer, estes testes avisam antes da aula.
import { describe, expect, it } from 'vitest'
import { CAREER_PLAN_INSTRUCTIONS, MENTOR_PERSONA, RAG_RULES } from '../../src/ai/prompts.ts'
import { careerPlanSchema } from '../../src/schemas/career-plan.ts'
import { samplePlan } from '../helpers/fakes.ts'

describe('careerPlanSchema', () => {
  it('aceita um plano completo', () => {
    expect(careerPlanSchema.safeParse(samplePlan()).success).toBe(true)
  })

  it('recusa um plano no formato antigo, sem metas, recursos e perguntas', () => {
    const { milestones, resources, reflectionQuestions, ...oldPlan } = samplePlan()
    expect(careerPlanSchema.safeParse(oldPlan).success).toBe(false)
  })

  it('exige exatamente 3 metas (3, 6 e 12 meses)', () => {
    const plan = samplePlan()
    plan.milestones = plan.milestones.slice(0, 2)
    expect(careerPlanSchema.safeParse(plan).success).toBe(false)
  })

  it('limita o tamanho das listas para a resposta não explodir', () => {
    const plan = samplePlan()
    plan.reflectionQuestions = ['1?', '2?', '3?', '4?']
    expect(careerPlanSchema.safeParse(plan).success).toBe(false)
  })
})

describe('prompts do mentor', () => {
  it('o /chat segue o método do mentor; o /ask, não', () => {
    expect(MENTOR_PERSONA).toContain('o método do mentor')
    expect(RAG_RULES).not.toContain('o método do mentor')
  })

  it('todas as rotas proíbem inventar links e dados', () => {
    for (const prompt of [MENTOR_PERSONA, CAREER_PLAN_INSTRUCTIONS, RAG_RULES]) {
      expect(prompt).toContain('Nunca invente')
    }
  })
})
