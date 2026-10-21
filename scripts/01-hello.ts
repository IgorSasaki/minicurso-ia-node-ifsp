/**
 * Etapa 1 — Primeira chamada a uma LLM via API.
 * Rode com:  pnpm hello
 *
 * Objetivo: ver o que existe por trás de um "chat de IA": uma chamada HTTP
 * com um modelo, uma mensagem e algumas configurações.
 */
import { gemini, llm } from '../src/ai/gemini.ts'
import { config } from '../src/config/config.ts'

console.log(`🧠 Modelo: ${config.GEMINI_MODEL}\n`)

// 1) A chamada "crua": veja tudo o que a API devolve (não só o texto!)
const response = await gemini.models.generateContent({
  model: config.GEMINI_MODEL,
  // "contents" = a conversa. Aqui, uma única mensagem do usuário.
  contents: 'Explique o que é uma API para um aluno do ensino médio.',
  config: {
    // "systemInstruction" = regras de comportamento (o "contrato" do assistente).
    systemInstruction: 'Você é um professor de tecnologia animado. Responda em no máximo 2 frases.',
    temperature: 0.7,
  },
})

console.log('📝 Resposta:', response.text)
// usageMetadata = a "conta": quantos tokens entraram e saíram. Em produção, registre isso sempre.
console.log('📊 Tokens usados:', response.usageMetadata)

// 2) Temperatura: mesma pergunta, criatividade diferente.
//    Repare que até a temperatura 0 pode variar: ela REDUZ a aleatoriedade, não elimina.
console.log('\n🌡️  Temperatura 0 vs 2 — "Dê um nome criativo para uma startup de IA":')
for (const temperature of [0, 0, 2, 2]) {
  const name = await llm.chat(
    [{ role: 'user', text: 'Dê UM nome criativo para uma startup de IA brasileira. Responda só o nome.' }],
    { temperature },
  )
  console.log(`   temperatura ${temperature}: ${name.trim()}`)
}
