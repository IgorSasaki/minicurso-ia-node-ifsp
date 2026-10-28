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

// Declarado à parte porque aparece duas vezes: no caminho recomendado e no alternativo.
const pathSchema = z.enum(['ads_degree', 'spi_degree', 'job_market'])

export const careerPlanSchema = z.object({
  profileSummary: z.string().describe('Resumo do perfil do estudante em 2 ou 3 frases, em português'),

  // `enum` limita os valores possíveis: o código pode fazer `if (plan.recommendedPath === 'spi_degree')`.
  recommendedPath: pathSchema.describe(
    'Principal caminho após o técnico integrado: graduação em ADS, graduação em SPI ou mercado de trabalho',
  ),

  rationale: z
    .string()
    .describe('Por que esse caminho combina com o perfil, em 3 a 5 frases, citando detalhes que o estudante contou'),

  // Um bom mentor mostra que existe plano B — e em que situação ele seria melhor.
  alternativePath: z.object({
    path: pathSchema.describe('Outro caminho possível, DIFERENTE do recomendado'),
    whenItFits: z.string().describe('Em que situação esse caminho seria a melhor escolha, em 1 ou 2 frases'),
  }),

  interestAreas: z
    .array(z.enum(['front-end', 'back-end', 'mobile', 'data', 'infrastructure', 'security', 'ux-ui', 'games', 'ai']))
    .min(1)
    .max(3),

  studyPath: z
    .array(
      z.object({
        order: z.number().int(),
        topic: z.string().describe('Tema de estudo, em português'),
        reason: z.string().describe('Por que estudar isso agora, em uma frase'),
        howToStart: z.string().describe('Primeira atividade prática para começar esse tema, em uma frase'),
      }),
    )
    .min(3)
    .max(6),

  // Habilidades técnicas E comportamentais: comunicação também se treina.
  skillsToDevelop: z
    .array(
      z.object({
        skill: z.string().describe('Habilidade, em português'),
        kind: z.enum(['technical', 'soft']).describe('technical = técnica; soft = comportamental'),
        why: z.string().describe('Por que ela importa para esse caminho, em uma frase'),
      }),
    )
    .min(3)
    .max(6),

  // Metas com prazo transformam o plano em algo que dá para acompanhar.
  milestones: z
    .array(
      z.object({
        horizon: z.enum(['3_months', '6_months', '12_months']),
        goal: z.string().describe('Meta verificável para esse prazo, em uma frase'),
      }),
    )
    .length(3)
    .describe('Exatamente uma meta para cada prazo: 3, 6 e 12 meses, nessa ordem'),

  portfolioProject: z.object({
    title: z.string().describe('Nome do projeto, em português'),
    description: z.string().describe('O que o projeto faz e o que ele demonstra, em até 3 frases'),
    technologies: z.array(z.string()).min(1).max(5),
  }),

  // Só o NOME do recurso: URLs inventadas pela IA são um erro clássico (e vergonhoso).
  resources: z
    .array(
      z.object({
        name: z.string().describe('Nome de um recurso GRATUITO e conhecido, sem link'),
        kind: z.enum(['course', 'docs', 'community', 'practice', 'event']),
        why: z.string().describe('Para que serve esse recurso no plano, em uma frase'),
      }),
    )
    .min(2)
    .max(5),

  // Para alunos curiosos: temas que vão além do plano, só pelo prazer de explorar.
  exploreNext: z
    .array(z.string().describe('Tema curioso para explorar, com uma frase dizendo por que é interessante'))
    .min(2)
    .max(3),

  reflectionQuestions: z
    .array(z.string().describe('Pergunta para o estudante pensar sobre a própria escolha, em português'))
    .min(2)
    .max(3),

  nextStepThisWeek: z.string().describe('Uma ação concreta e pequena para os próximos 7 dias, em português'),
})

export type CareerPlan = z.infer<typeof careerPlanSchema>
