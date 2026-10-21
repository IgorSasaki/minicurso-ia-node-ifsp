# Etapa 3 — Saída estruturada: `POST /career-plan`

> 🏷️ tag `etapa-03` · ▶️ `pnpm dev`

## Objetivo
Usar a LLM como uma **função**: entra texto livre ("sobre mim"), sai um **objeto JSON tipado e validado** com um plano de carreira. É isso que separa um "chatzinho" de uma aplicação que integra IA em sistemas reais.

## Conceitos
| Conceito | Em uma frase |
|---|---|
| **Saída estruturada** | Pedimos ao Gemini que responda obedecendo a um JSON Schema (`responseMimeType` + `responseJsonSchema`). |
| **Schema como contrato** | Um único schema zod gera o JSON Schema, valida a resposta e cria o tipo TypeScript. |
| **Confie, mas confira** | O modelo pode errar (campo faltando, lista longa demais). Validamos e, se falhar, pedimos correção mostrando o erro. |
| **Enum** | Limitar valores (`ads_degree`, `spi_degree`, `job_market`) torna a saída utilizável por código: dá para fazer `if`, filtrar, gravar no banco. |
| **`.describe()`** | As descrições dos campos viram instruções para o modelo dentro do schema. |
| **Erro tipado** | `InvalidResponseError` deixa o tratador central responder 502 com uma mensagem clara. |

## Arquivos
- `src/schemas/career-plan.ts` — o schema `careerPlanSchema` e o tipo `CareerPlan`.
- `src/ai/llm.ts` — nova função `chatJson(messages, schema)` com validação + 1 nova tentativa.
- `src/http/routes/career-plan.ts` — rota `POST /career-plan`.
- `src/http/errors.ts` — trata `InvalidResponseError` (502).

## Campos em inglês, conteúdo em português
```json
{ "recommendedPath": "spi_degree", "rationale": "Como você precisa trabalhar de dia..." }
```
Os **nomes** dos campos são identificadores de código (inglês, `camelCase`). Os **valores** de texto são conteúdo para o estudante (português). O `.describe('... em português')` de cada campo avisa o modelo.

## O código-chave
```ts
const response = await client.models.generateContent({
  model,
  contents,
  config: {
    responseMimeType: 'application/json',     // "responda em JSON..."
    responseJsonSchema: z.toJSONSchema(schema), // "...exatamente neste formato"
  },
})

const result = schema.safeParse(parseJson(response.text))
if (result.success) return result.data           // objeto tipado!
// senão: devolve o erro para o modelo e tenta de novo
```

## Testando
```bash
curl -s -X POST localhost:3333/career-plan -H 'Content-Type: application/json' -d '{
  "aboutMe": "Sou o Lucas, 17 anos, 3º ano do integrado. Amo fazer sites e mexer com CSS, odeio matemática. Preciso começar a trabalhar logo pra ajudar em casa, então só poderia estudar à noite."
}'
```

## Resultado esperado (resumido)
```json
{
  "profileSummary": "Lucas é um estudante de 17 anos do 3º ano do técnico integrado...",
  "recommendedPath": "spi_degree",
  "rationale": "Como você precisa trabalhar durante o dia, o SPI à noite é ideal...",
  "interestAreas": ["front-end", "ux-ui"],
  "studyPath": [
    { "order": 1, "topic": "JavaScript Avançado", "reason": "..." },
    { "order": 2, "topic": "React", "reason": "..." },
    { "order": 3, "topic": "Git e GitHub", "reason": "..." }
  ],
  "portfolioProject": { "title": "Portfólio Pessoal", "description": "...", "technologies": ["HTML5", "CSS3", "JavaScript"] },
  "nextStepThisWeek": "Criar um perfil no LinkedIn..."
}
```
> O caminho pode variar entre `spi_degree` e `job_market` — os dois fazem sentido para o Lucas. O que **não** varia é o formato.

## Para discutir com a turma
- **Onde isso aparece no mercado?** Extrair dados de notas fiscais, classificar chamados de suporte, ler currículos, transformar e-mail em pedido. É o uso de IA mais comum em empresas — e quase ninguém vê, porque não tem "chat".
- **Schema ≠ verdade.** O JSON pode estar perfeito no formato e errado no conteúdo. O schema garante a *forma*; a etapa 6 (RAG) ajuda com os *fatos*.

## Erros comuns
| Sintoma | Causa | Solução |
|---|---|---|
| `502 A IA não conseguiu gerar uma resposta válida` | schema muito restritivo (ex.: `min(5)` em lista curta) | relaxe as regras ou melhore os `.describe()` |
| Erro 400 do Gemini sobre o schema | recurso de JSON Schema não suportado | mantenha o schema simples: objetos, arrays, enums, strings, números |
| `400 aboutMe: Conte um pouco mais...` | texto com menos de 20 caracteres | escreva mais sobre você |

## Desafio (5 min)
Adicione o campo `urgencyLevel: z.enum(['low', 'medium', 'high'])`, que indica a urgência de o estudante conseguir renda. Rode com o perfil do Lucas e com um perfil de quem quer "fazer faculdade com calma".
