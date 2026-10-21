# Etapa 5 — Ingestão: preparando os documentos para o RAG

> 🏷️ tag `etapa-05` · ▶️ `pnpm ingest`

## Objetivo
Montar a "biblioteca" do nosso assistente: ler documentos que **o modelo nunca viu** (PPCs dos cursos de ADS e SPI do IFSP Araraquara, guia de estágio, guia de primeiro emprego, trajetória do ministrante), quebrá-los em pedaços e guardar o embedding de cada pedaço.

## Conceitos
| Conceito | Em uma frase |
|---|---|
| **RAG** | *Retrieval-Augmented Generation*: antes de responder, buscamos trechos relevantes e os entregamos ao modelo. É uma "prova com consulta". |
| **Documento privado** | Qualquer coisa que não está na internet pública ou é recente demais: manuais internos, contratos, PPCs. |
| **Chunk** | Pedaço de documento com sentido completo (aqui, uma seção `##`). |
| **Sobreposição (overlap)** | Ao cortar seções grandes, repetimos ~200 caracteres para não perder ideias no corte. |
| **Índice vetorial** | Lista de `{ text, source, embedding }`. Aqui é um JSON; em produção, pgvector/Qdrant/Pinecone. |
| **Ingestão é offline** | Roda uma vez (ou quando os documentos mudam), não a cada pergunta. |

## O pipeline
```
data/documents/*.md ──► chunkMarkdown() ──► embed() em lotes ──► data/index.json
      6 arquivos            37 chunks         37 vetores × 768        ~285 KB
```

## Arquivos
```
data/documents/*.md       # o corpus (resumos dos PPCs oficiais + guias, com fonte indicada)
src/rag/chunker.ts        # chunkMarkdown() e slidingWindows()
src/rag/vector-store.ts   # saveIndex() / loadIndex() — com validação do formato e do modelo
scripts/ingest.ts         # o script que junta tudo
```

## O código-chave
```ts
// cada chunk carrega a FONTE: é ela que vamos citar na resposta
chunks.push({
  id: `${source}#${chunks.length}`,
  source,
  section: title,
  text: `${documentTitle}\n${title}\n\n${piece}`, // título dá contexto ao embedding
})
```
```ts
for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
  const batch = chunks.slice(i, i + BATCH_SIZE)
  const vectors = await embed(batch.map((chunk) => chunk.text)) // 1 chamada por lote, não por chunk
  // ...
}
```

## O índice sabe com qual modelo foi gerado
```json
{ "model": "gemini-embedding-2", "dimensions": 768, "createdAt": "...", "chunks": [ ... ] }
```
Vetores de modelos diferentes **não são comparáveis**. Se alguém trocar `GEMINI_EMBEDDING_MODEL` e esquecer de rodar o `pnpm ingest`, a busca daria resultados errados sem nenhum erro aparente. Por isso o `loadIndex()` confere o modelo e as dimensões e falha com uma mensagem clara.

## Resultado esperado
```
📄 ads-ifsp-araraquara.md               → 8 chunks
📄 ads-vs-spi.md                        → 4 chunks
📄 estagio.md                           → 6 chunks
📄 primeiro-emprego-e-portfolio.md      → 6 chunks
📄 spi-ifsp-araraquara.md               → 7 chunks
📄 trajetoria-do-ministrante.md         → 6 chunks
🔢 embeddings 20/37
🔢 embeddings 37/37

✅ 37 chunks salvos em data/index.json
```

> 💡 O `data/index.json` já vem no repositório. Se a cota de embeddings acabar durante a aula, as próximas etapas continuam funcionando com ele.

## Boas práticas de chunking (para discutir)
- **Pedaço grande demais** → embedding "genérico", busca imprecisa, gasta mais tokens.
- **Pedaço pequeno demais** → perde contexto ("40 vagas" de qual curso?).
- Por isso colocamos o **título do documento e da seção** dentro de cada chunk.
- Documentos bem escritos (títulos claros, uma ideia por seção) melhoram o RAG mais do que qualquer truque de código.

## Erros comuns
| Sintoma | Causa | Solução |
|---|---|---|
| `Esperava 20 embeddings, recebi 1` | textos enviados como lista de strings | um `Content` por texto (veja a etapa 4) |
| `429` durante a ingestão | muitos lotes seguidos | diminua `BATCH_SIZE` ou aguarde 1 min; use o `index.json` do repositório |
| `O índice foi gerado com ...` | trocou o modelo de embedding | `pnpm ingest` |

## Desafio (10 min)
Crie `data/documents/semana-da-informatica.md` com duas seções sobre o evento (ex.: "Programação" e "Onde fica"), rode `pnpm ingest` de novo e confira a nova quantidade de chunks.
