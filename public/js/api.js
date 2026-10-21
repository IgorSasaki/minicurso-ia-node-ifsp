/**
 * Comunicação com a API (back-end). Toda chamada HTTP do front passa por aqui.
 */

/** Erro de uma requisição à nossa API, com o status HTTP (ex.: 400, 429, 502). */
export class RequestError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'RequestError'
    this.status = status
  }
}

/**
 * Faz um POST com corpo JSON e devolve a resposta já convertida em objeto.
 * Se o status não for 2xx, lança um RequestError com a mensagem que a API mandou.
 */
export async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  // `.catch(() => ({}))`: se a resposta não for JSON válido, seguimos com um objeto vazio.
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new RequestError(response.status, data.error ?? `Erro ${response.status}`)
  return data
}

/** Converte qualquer erro numa frase que faça sentido para quem está usando a página. */
export function errorMessage(error) {
  if (error?.status === 429) return 'Limite gratuito por minuto atingido. Aguarde uns 60 segundos e tente de novo.'
  // `fetch` lança TypeError quando nem consegue falar com o servidor (servidor parado, sem rede).
  if (error instanceof TypeError) return 'Não consegui falar com a API. O servidor está rodando (pnpm dev)?'
  return error?.message || 'Algo deu errado. Tente de novo.'
}

/** Consulta o GET /health. Devolve `{ status, model }` ou lança erro se a API estiver fora do ar. */
export async function fetchHealth() {
  const response = await fetch('/health')
  if (!response.ok) throw new RequestError(response.status, 'API indisponível')
  return response.json()
}
