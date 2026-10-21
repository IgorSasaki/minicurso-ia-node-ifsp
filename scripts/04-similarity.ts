/**
 * Etapa 4 — Embeddings: transformando significado em números.
 * Rode com:  pnpm similarity
 */
import { embed } from '../src/ai/gemini.ts'
import { cosineSimilarity } from '../src/rag/similarity.ts'

// 1) Como é um embedding?
// `= []` é um valor padrão: se a API não devolver nada, seguimos com um vetor vazio em vez de quebrar.
const [dogVector = []] = await embed(['cachorro'])
console.log(`🔢 "cachorro" virou ${dogVector.length} números:`)
console.log(
  '   [',
  dogVector
    .slice(0, 6)
    .map((n) => n.toFixed(4))
    .join(', '),
  ', ... ]\n',
)

// 2) Palavras: significado parecido → vetores parecidos
const [dog = [], hound = [], computer = []] = await embed(['cachorro', 'cão', 'computador'])
console.log('🐶 cachorro ~ cão        =', cosineSimilarity(dog, hound).toFixed(3))
console.log('💻 cachorro ~ computador =', cosineSimilarity(dog, computer).toFixed(3), '\n')

// 3) Busca semântica: qual frase responde melhor à pergunta?
const question = 'Qual curso é de noite?'
const sentences = [
  'O curso de Análise e Desenvolvimento de Sistemas (ADS) funciona no período matutino.',
  'O curso de Sistemas para Internet (SPI) funciona no período noturno.',
  'O estágio é opcional nos cursos de ADS e SPI.',
  'Receita de bolo de cenoura com cobertura de chocolate.',
]

// Uma única chamada para todos os textos: a pergunta primeiro, depois as frases.
const [questionVector = [], ...sentenceVectors] = await embed([question, ...sentences])
const ranking = sentences
  .map((sentence, i) => ({ sentence, score: cosineSimilarity(questionVector, sentenceVectors[i] ?? []) }))
  .sort((a, b) => b.score - a.score) // maior similaridade primeiro

console.log(`🔎 Pergunta: "${question}"`)
for (const { sentence, score } of ranking) {
  console.log(`   ${score.toFixed(3)}  ${sentence}`)
}
console.log('\n💡 Repare: a frase vencedora não tem a palavra "noite" — tem "noturno". Isso é busca por SIGNIFICADO.')
