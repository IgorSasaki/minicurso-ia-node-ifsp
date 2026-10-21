/**
 * Similaridade de cosseno: o quanto dois vetores "apontam para o mesmo lado".
 *
 *    1  → mesmo significado
 *    0  → nada a ver
 *   -1  → opostos
 *
 * Fórmula:  cos(θ) = (a · b) / (|a| × |b|)
 *   a · b  = produto escalar  (soma de a[i] × b[i])
 *   |a|    = norma do vetor   (raiz da soma de a[i]²)
 *
 * É matemática do ensino médio — e é a base de toda busca semântica.
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    // Vetores de modelos (ou dimensões) diferentes não são comparáveis: melhor falhar alto
    // do que devolver um número sem sentido.
    throw new Error(`Vetores com dimensões diferentes: ${a.length} e ${b.length}`)
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    // `as number`: o laço garante que o índice existe (o TypeScript não consegue provar sozinho).
    const x = a[i] as number
    const y = b[i] as number
    dotProduct += x * y
    normA += x * x
    normB += y * y
  }

  // Um vetor só de zeros não tem direção; evitamos a divisão por zero (que daria NaN).
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
