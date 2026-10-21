# Etapa 1 — Primeira chamada a uma LLM

> 🏷️ tag `etapa-01` · ▶️ `pnpm hello`

## Objetivo
Fazer o Node.js conversar com o Gemini **por código**, entendendo o que existe por trás de um "chat de IA".

## Conceitos
| Conceito | Em uma frase |
|---|---|
| **LLM** | Modelo que prevê o próximo pedaço de texto (token) com base em tudo o que veio antes. |
| **API vs. chat** | O chat é um *produto*; a API é a *matéria-prima* que você usa para construir o seu produto. |
| **Token** | Pedaço de palavra (~4 caracteres). É a unidade de cobrança e de limite. |
| **systemInstruction** | As regras do jogo: persona, tom, formato. O usuário não vê. |
| **contents** | A conversa em si (mensagens de `user` e `model`). |
| **temperature** | 0 = mais previsível · 2 = mais criativo/aleatório. |

## Passo a passo
1. Crie sua chave em <https://aistudio.google.com/apikey> (conta Google, sem cartão).
2. `cp .env.example .env` e cole a chave em `GEMINI_API_KEY`.
3. Leia os arquivos nesta ordem:
   - `src/config/env.ts` — as regras do `.env`, escritas com **zod**.
   - `src/config/config.ts` — lê o `.env` uma vez e falha cedo com mensagem amigável.
   - `src/ai/llm.ts` — a fábrica `createLlm()` com a função `chat()`.
   - `src/ai/gemini.ts` — o cliente real do Gemini (único arquivo que conhece a chave).
   - `scripts/01-hello.ts` — a primeira chamada.
4. Rode `pnpm hello`.

## Por que tantos arquivos para "só uma chamada"?
Porque cada arquivo tem **uma responsabilidade**:

```
src/config/   →  o QUE o app precisa para rodar (e validar isso cedo)
src/ai/       →  COMO falar com a IA
scripts/      →  programas de linha de comando (não fazem parte do servidor)
```

A separação entre `llm.ts` (lógica) e `gemini.ts` (cliente real com a chave) é o que permite, na etapa 8, testar tudo com um cliente falso — sem internet e sem gastar cota.

## O código-chave
```ts
const response = await gemini.models.generateContent({
  model: config.GEMINI_MODEL,
  contents: 'Explique o que é uma API para um aluno do ensino médio.',
  config: {
    systemInstruction: 'Você é um professor de tecnologia animado. Responda em no máximo 2 frases.',
    temperature: 0.7,
  },
})
console.log(response.text)
console.log(response.usageMetadata) // tokens de entrada e de saída
```

## Resultado esperado
```
📝 Resposta: Imagine que uma API é como o garçom de um restaurante...
📊 Tokens usados: { promptTokenCount: 35, candidatesTokenCount: 62, totalTokenCount: 97, ... }

🌡️  Temperatura 0 vs 2:
   temperatura 0: Lumia
   temperatura 0: Emexa
   temperatura 2: Inteligix
   temperatura 2: Cérebra
```
> 💡 Mesmo com temperatura 0 os nomes podem mudar. Temperatura baixa **reduz** a aleatoriedade, mas **não garante** respostas idênticas. Nunca escreva um teste esperando a frase exata de uma LLM.

## Por que `GEMINI_THINKING_LEVEL=MINIMAL`?
Modelos recentes "pensam" (geram tokens internos de raciocínio) antes de responder. Isso melhora tarefas difíceis, mas deixa a resposta lenta. Para um chat de carreira, `MINIMAL` responde em ~1 s. Teste trocar para `HIGH` e compare o tempo.

## Boas práticas que já aparecem aqui
- **Timeout e novas tentativas** (`src/ai/gemini.ts`): nunca espere para sempre por uma API externa.
- **Falhar cedo** (`src/config/config.ts`): configuração errada é detectada ao iniciar, não no meio do uso.
- **Nomes em inglês, comentários em português**: o padrão de mercado é código em inglês; os comentários falam a língua do time.

## Erros comuns
| Sintoma | Causa | Solução |
|---|---|---|
| `❌ Configuração inválida... GEMINI_API_KEY` | `.env` não existe ou chave não colada | `cp .env.example .env` e cole a chave |
| `API key not valid` (400) | chave copiada pela metade / com espaço | copie de novo do AI Studio |
| `429 RESOURCE_EXHAUSTED` | limite gratuito por minuto atingido | espere 1 min; não rode em loop |
| `Thinking level MINIMAL is not supported` | trocou para um modelo que não aceita MINIMAL | use `LOW` ou deixe vazio |

## Desafio (3 min)
Mude o `systemInstruction` para "Você é um pirata" e rode de novo. O que muda? O que **não** muda?
