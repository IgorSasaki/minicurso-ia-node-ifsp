/**
 * Chunking = quebrar documentos grandes em pedaços pequenos e com sentido completo.
 *
 * Por quê?
 *   1) O embedding de um texto curto é mais "focado" (um documento de 150 páginas
 *      viraria um vetor genérico, parecido com tudo e com nada).
 *   2) Na hora de responder, mandamos para a LLM só os pedaços relevantes — não o
 *      documento inteiro (mais barato, mais rápido e com menos ruído).
 *
 * Estratégia deste projeto: um chunk por seção "## " do markdown. Seções longas demais
 * são cortadas em "janelas" que se sobrepõem um pouco, para não partir uma ideia ao meio.
 */

export type Chunk = {
  /** Identificador único, ex.: "estagio.md#3" */
  id: string
  /** Arquivo de origem — é o que citamos como fonte na resposta. */
  source: string
  /** Título da seção (a linha "## ..."). */
  section: string
  /** Texto que vira embedding e que é enviado à LLM. */
  text: string
}

/** Tamanho máximo de um chunk, em caracteres. */
export const MAX_CHUNK_SIZE = 1200
/** Quantos caracteres do fim de uma janela se repetem no começo da próxima. */
export const CHUNK_OVERLAP = 200

/** Quebra um documento markdown em chunks (um por seção "## "). */
export function chunkMarkdown(source: string, markdown: string): Chunk[] {
  // O título do documento (linha "# ...") entra em todos os chunks, para dar contexto.
  const documentTitle = markdown.match(/^# (.+)$/m)?.[1]?.trim() ?? source
  const parts = markdown.split(/^## /m)

  // O que vem antes do 1º "## " é a introdução (título e fontes) e é descartado.
  // Se o documento não tiver nenhuma seção, ele inteiro vira uma seção: nada pode sumir do índice.
  const sections = parts.length > 1 ? parts.slice(1) : [`${documentTitle}\n${markdown.replace(/^# .+$/m, '')}`]

  const chunks: Chunk[] = []
  for (const section of sections) {
    // A primeira linha da seção é o título; o resto é o corpo.
    const [titleLine = '', ...lines] = section.split('\n')
    const title = titleLine.trim()
    const body = lines.join('\n').trim()
    if (!body) continue // seção vazia não gera chunk

    for (const piece of slidingWindows(body)) {
      chunks.push({
        id: `${source}#${chunks.length}`,
        source,
        section: title,
        // Título do documento + título da seção dentro do texto: sem isso, um trecho como
        // "40 vagas por ano" não saberia de qual curso está falando.
        text: `${documentTitle}\n${title}\n\n${piece}`,
      })
    }
  }
  return chunks
}

/**
 * Corta um texto longo em janelas de até MAX_CHUNK_SIZE caracteres, com CHUNK_OVERLAP
 * caracteres repetidos entre uma janela e a próxima. Textos curtos voltam inteiros.
 */
export function slidingWindows(text: string): string[] {
  if (text.length <= MAX_CHUNK_SIZE) return [text]

  const pieces: string[] = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + MAX_CHUNK_SIZE, text.length)

    // Tentamos terminar numa quebra de linha, para não cortar uma frase no meio.
    // (Só se a quebra não deixar a janela pequena demais.)
    const lineBreak = text.lastIndexOf('\n', end)
    if (end < text.length && lineBreak > start + MAX_CHUNK_SIZE / 2) end = lineBreak

    pieces.push(text.slice(start, end).trim())
    if (end >= text.length) break

    // A próxima janela começa um pouco ANTES do fim desta (a sobreposição).
    // Sempre avança, pois end > start + MAX_CHUNK_SIZE / 2 > CHUNK_OVERLAP.
    start = end - CHUNK_OVERLAP
  }
  return pieces
}
