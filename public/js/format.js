/**
 * Funções PURAS de formatação: recebem dados e devolvem texto/HTML, sem mexer na página.
 * Por serem puras, são fáceis de testar (veja test/unit/front-format.test.ts).
 */

/**
 * Escapa caracteres especiais de HTML.
 *
 * ⚠️ SEGURANÇA: todo texto vindo da API (ou do usuário) passa por aqui antes de entrar
 * em `innerHTML`. Sem isso, uma resposta contendo `<img src=x onerror=...>` executaria
 * código na página (ataque de XSS — Cross-Site Scripting).
 */
export function escapeHtml(value) {
  const replacements = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return String(value).replace(/[&<>"']/g, (char) => replacements[char])
}

/**
 * Transforma as citações "[1]", "[2]"... da resposta do RAG em botões clicáveis.
 * Escapamos ANTES de inserir os botões: assim só o HTML que nós criamos é interpretado.
 */
export function withCitations(text) {
  return escapeHtml(text).replace(
    /\[(\d+)\]/g,
    '<button class="citation" type="button" data-ref="$1" aria-label="Ver fonte $1">$1</button>',
  )
}

/**
 * Converte o score de similaridade em largura da barra de relevância (6% a 100%).
 * Na prática, os scores de cosseno deste projeto ficam entre ~0,5 e ~0,9;
 * esticamos esse intervalo para a barra mostrar bem as diferenças.
 */
export function relevanceWidth(score) {
  const percent = ((score - 0.5) / 0.4) * 100
  return Math.max(6, Math.min(100, percent))
}

/** Rótulos legíveis para os valores `enum` do plano de carreira (o JSON usa identificadores). */
export const PATH_LABELS = {
  ads_degree: { title: 'Graduação em ADS', detail: 'Análise e Desenvolvimento de Sistemas · matutino' },
  spi_degree: { title: 'Graduação em SPI', detail: 'Sistemas para Internet · noturno' },
  job_market: { title: 'Mercado de trabalho', detail: 'Estágio ou primeiro emprego' },
}

export const AREA_LABELS = {
  'front-end': 'Front-end',
  'back-end': 'Back-end',
  mobile: 'Mobile',
  data: 'Dados',
  infrastructure: 'Infraestrutura',
  security: 'Segurança',
  'ux-ui': 'UX/UI',
  games: 'Games',
  ai: 'IA',
}

export const HORIZON_LABELS = {
  '3_months': 'Em 3 meses',
  '6_months': 'Em 6 meses',
  '12_months': 'Em 12 meses',
}

export const SKILL_KIND_LABELS = {
  technical: 'Técnica',
  soft: 'Comportamental',
}

export const RESOURCE_KIND_LABELS = {
  course: 'Curso',
  docs: 'Documentação',
  community: 'Comunidade',
  practice: 'Prática',
  event: 'Evento',
}
