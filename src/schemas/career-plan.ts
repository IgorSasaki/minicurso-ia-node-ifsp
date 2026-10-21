/**
 * O "contrato" da resposta do plano de carreira.
 *
 * O MESMO schema zod serve para três coisas:
 *   1) gerar o JSON Schema que mandamos ao Gemini (`responseJsonSchema`) — a IA é obrigada a seguir;
 *   2) validar o que voltou (a IA pode errar — a gente confere);
 *   3) gerar o tipo TypeScript `CareerPlan` de graça.
 * Uma única fonte da verdade: mudou o schema, mudou tudo junto.
 *
 * Os NOMES dos campos ficam em inglês (são identificadores de código).
 * Os VALORES de texto são em português (são conteúdo para o estudante) — o `.describe()` avisa a IA.
 * Cada `.describe()` vira uma instrução dentro do JSON Schema enviado ao modelo.
 */
import { z } from 'zod'

export const careerPlanSchema = z.object({
  profileSummary: z.string().describe('Resumo do perfil do estudante em 1 ou 2 frases, em português'),

  // `enum` limita os valores possíveis: o código pode fazer `if (plan.recommendedPath === 'spi_degree')`.
  recommendedPath: z
    .enum(['ads_degree', 'spi_degree', 'job_market'])
    .describe('Principal caminho após o técnico integrado: graduação em ADS, graduação em SPI ou mercado de trabalho'),

  rationale: z.string().describe('Por que esse caminho combina com o perfil, em até 3 frases, em português'),

  interestAreas: z
    .array(z.enum(['front-end', 'back-end', 'mobile', 'data', 'infrastructure', 'security', 'ux-ui', 'games', 'ai']))
    .min(1)
    .max(3),

  studyPath: z
    .array(
      z.object({
        order: z.number().int(),
        topic: z.string().describe('Tema de estudo, em português'),
        reason: z.string().describe('Motivo em uma frase, em português'),
      }),
    )
    .min(3)
    .max(5),

  portfolioProject: z.object({
    title: z.string().describe('Nome do projeto, em português'),
    description: z.string().describe('O que o projeto faz, em até 2 frases, em português'),
    technologies: z.array(z.string()).min(1).max(5),
  }),

  nextStepThisWeek: z.string().describe('Uma ação concreta e pequena para os próximos 7 dias, em português'),
})

export type CareerPlan = z.infer<typeof careerPlanSchema>
