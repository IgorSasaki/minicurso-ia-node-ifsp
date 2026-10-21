/**
 * Tela "Meu plano" — o JSON estruturado da etapa 3 vira interface.
 * Usa a rota POST /career-plan.
 *
 * A mensagem desta tela: como a IA devolve DADOS (e não texto solto), o front consegue
 * montar cards, etiquetas e listas. Isso seria impossível com uma resposta em texto livre.
 */
import { errorMessage, postJson } from './api.js'
import { $, icon, showError } from './dom.js'
import { AREA_LABELS, escapeHtml, PATH_LABELS } from './format.js'

/** Mesmos limites do schema zod no back-end: o usuário vê o limite antes de errar. */
const MIN_LENGTH = 20
const MAX_LENGTH = 1500

const EXAMPLES = {
  lucas:
    'Sou o Lucas, 17 anos, 3º ano do integrado. Amo fazer sites e mexer com CSS, odeio matemática. Preciso começar a trabalhar logo pra ajudar em casa, então só poderia estudar à noite.',
  bia: 'Sou a Bia, 16 anos. Curto muito banco de dados e lógica, ganhei medalha na OBMEP. Não tenho pressa de trabalhar e posso estudar de manhã.',
}

export function setupCareerPlan() {
  const input = $('#plan-input')

  input.addEventListener('input', updateCounter)

  // Os chips de exemplo preenchem o campo com um perfil pronto.
  $('#plan-examples').addEventListener('click', (event) => {
    const key = event.target.closest('[data-example]')?.dataset.example
    if (!key) return
    input.value = EXAMPLES[key]
    updateCounter()
    input.focus()
  })

  $('#plan-form').addEventListener('submit', (event) => {
    event.preventDefault()
    generatePlan()
  })
}

/** Atualiza o contador de caracteres e habilita o botão só quando o texto é válido. */
function updateCounter() {
  const length = $('#plan-input').value.trim().length
  const counter = $('#plan-counter')
  counter.textContent = `${length} / ${MAX_LENGTH}${length < MIN_LENGTH ? ` · mínimo ${MIN_LENGTH}` : ''}`
  // data-warning muda a cor do contador (veja o CSS)
  if (length > 0 && length < MIN_LENGTH) counter.dataset.warning = ''
  else delete counter.dataset.warning
  $('#plan-submit').disabled = length < MIN_LENGTH
}

async function generatePlan() {
  const result = $('#plan-result')
  const button = $('#plan-submit')
  button.disabled = true
  button.textContent = 'Gerando…'
  result.innerHTML = renderSkeleton()

  try {
    const plan = await postJson('/career-plan', { aboutMe: $('#plan-input').value.trim() })
    result.innerHTML = renderPlan(plan)
    $('#copy-json').addEventListener('click', async (event) => {
      event.preventDefault() // o botão fica dentro do <summary>: sem isso, abriria/fecharia o JSON
      await navigator.clipboard?.writeText(JSON.stringify(plan, null, 2))
      event.currentTarget.lastChild.textContent = 'Copiado'
    })
  } catch (error) {
    showError(result, errorMessage(error), generatePlan)
  } finally {
    button.textContent = 'Gerar meu plano'
    updateCounter()
  }
}

/** Esqueleto com o mesmo formato do resultado: o carregamento parece mais rápido. */
function renderSkeleton() {
  return `
    <div class="result" aria-busy="true">
      <div class="card highlight">
        <div class="skeleton" style="height:14px;width:160px"></div>
        <div class="skeleton" style="height:34px;width:55%;margin:14px 0 10px"></div>
        <div class="skeleton" style="height:14px;width:90%"></div>
        <div class="skeleton" style="height:14px;width:70%;margin-top:8px"></div>
      </div>
      <div class="grid-2">
        <div class="card block"><div class="skeleton" style="height:120px"></div></div>
        <div class="card block"><div class="skeleton" style="height:120px"></div></div>
      </div>
    </div>`
}

/** Monta o HTML do plano. TODO texto vindo da API passa por escapeHtml (proteção contra XSS). */
function renderPlan(plan) {
  const path = PATH_LABELS[plan.recommendedPath] ?? { title: plan.recommendedPath, detail: '' }

  const areas = plan.interestAreas.map((area) => `<span class="tag">${escapeHtml(AREA_LABELS[area] ?? area)}</span>`)

  const steps = plan.studyPath.map(
    (step, i) => `
      <li>
        <span class="step-number">${i + 1}</span>
        <div><strong>${escapeHtml(step.topic)}</strong><span>${escapeHtml(step.reason)}</span></div>
      </li>`,
  )

  const technologies = plan.portfolioProject.technologies.map(
    (technology) => `<span class="tag neutral">${escapeHtml(technology)}</span>`,
  )

  return `
    <div class="result fade-in">
      <p style="margin:0;color:var(--muted)">${escapeHtml(plan.profileSummary)}</p>

      <div class="card highlight">
        <span class="eyebrow">Caminho recomendado</span>
        <h3>${escapeHtml(path.title)}</h3>
        <p class="detail">${escapeHtml(path.detail)} · <span class="mono">${escapeHtml(plan.recommendedPath)}</span></p>
        <p class="rationale">${escapeHtml(plan.rationale)}</p>
        <div class="tags">${areas.join('')}</div>
      </div>

      <div class="grid-2">
        <div class="card block">
          <span class="eyebrow">Trilha de estudos</span>
          <h4>O que estudar, nesta ordem</h4>
          <ol class="timeline">${steps.join('')}</ol>
        </div>
        <div class="card block">
          <span class="eyebrow">Projeto de portfólio</span>
          <h4>${escapeHtml(plan.portfolioProject.title)}</h4>
          <p style="margin:0 0 14px;color:var(--muted)">${escapeHtml(plan.portfolioProject.description)}</p>
          <div class="tags">${technologies.join('')}</div>
        </div>
      </div>

      <div class="next-step">
        ${icon('flag')}
        <div>
          <span class="eyebrow">Próximo passo · esta semana</span>
          <p>${escapeHtml(plan.nextStepThisWeek)}</p>
        </div>
      </div>

      <details class="card json">
        <summary>
          <span>Ver o JSON que a API devolveu</span>
          <button class="link-button" type="button" id="copy-json">${icon('copy')}Copiar</button>
        </summary>
        <pre>${escapeHtml(JSON.stringify(plan, null, 2))}</pre>
      </details>
    </div>`
}
