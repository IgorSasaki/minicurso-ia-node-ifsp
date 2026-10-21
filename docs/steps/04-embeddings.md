# Etapa 4 — Embeddings: significado vira número

> 🏷️ tag `etapa-04` · ▶️ `pnpm similarity`

## Objetivo
Entender a peça que torna o RAG possível: transformar texto em um **vetor** e comparar vetores para achar textos com **significado** parecido — não apenas palavras iguais.

## Conceitos
| Conceito | Em uma frase |
|---|---|
| **Embedding** | Uma lista de números (aqui, 768) que representa o significado de um texto. |
| **Espaço vetorial** | Imagine um mapa: textos sobre o mesmo assunto ficam perto uns dos outros. |
| **Similaridade de cosseno** | Mede o ângulo entre dois vetores: 1 = mesma direção (mesmo sentido), 0 = nada a ver. |
| **Busca semântica** | "Qual curso é de noite?" encontra "funciona no período **noturno**" sem a palavra "noite". |
| **O que importa é o ranking** | O valor absoluto (0,73) não diz muito; o que importa é quem ficou **acima** de quem. |

## Arquivos
```
src/rag/embeddings.ts   # createEmbedder(): textos → vetores (gemini-embedding-2, 768 dimensões)
src/rag/similarity.ts   # cosineSimilarity(): o cosseno escrito à mão (são 10 linhas!)
src/ai/gemini.ts        # agora também exporta `embed`, o embedder real
scripts/04-similarity.ts
```

## O código-chave
```ts
// src/rag/embeddings.ts
const response = await client.models.embedContent({
  model,
  contents: texts.map((text) => ({ parts: [{ text }] })), // um Content por texto!
  config: { outputDimensionality: EMBEDDING_DIMENSIONS },
})
```
```ts
// src/rag/similarity.ts — cos(θ) = (a · b) / (|a| × |b|)
for (let i = 0; i < a.length; i++) {
  dotProduct += x * y
  normA += x * x
  normB += y * y
}
return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
```

## Resultado esperado
```
🔢 "cachorro" virou 768 números:
   [ 0.0172, -0.0256, -0.0104, 0.0122, 0.0231, 0.0161 , ... ]

🐶 cachorro ~ cão        = 0.946
💻 cachorro ~ computador = 0.726

🔎 Pergunta: "Qual curso é de noite?"
   0.728  O curso de Sistemas para Internet (SPI) funciona no período noturno.
   0.678  O curso de Análise e Desenvolvimento de Sistemas (ADS) funciona no período matutino.
   0.618  O estágio é opcional nos cursos de ADS e SPI.
   0.476  Receita de bolo de cenoura com cobertura de chocolate.
```

## ⚠️ Pegadinha real (que aconteceu preparando este curso)
No `gemini-embedding-2`, se você mandar `contents: ['a', 'b', 'c']`, a API devolve **um único** embedding (ela entende como um conteúdo só, com 3 partes). Para ter um vetor por texto, mande cada texto como um `Content` separado. Por isso o `embed()` confere se a quantidade de vetores bate com a de textos — **valide as suposições sobre APIs externas**.

## Código defensivo
`cosineSimilarity()` também se protege:
- vetores de tamanhos diferentes → **erro** (comparar vetores de modelos diferentes daria um número sem sentido);
- vetor só de zeros → devolve **0** em vez de `NaN`.

## Para discutir com a turma
- Onde mais isso é usado? Recomendação ("quem viu isto também viu..."), detecção de duplicatas, busca em lojas, agrupamento de reclamações.
- Por que não usar só `texto.includes('noite')`? Teste a pergunta "Quero estudar depois do trabalho" — nenhuma palavra em comum, e mesmo assim o SPI deve ganhar.

## Desafio (5 min)
Troque a pergunta por "Quero estudar depois do trabalho" e depois por "Preciso fazer estágio para me formar?". O ranking faz sentido? Invente uma frase "pegadinha" que deveria vencer — e outra que não deveria.
