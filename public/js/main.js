/**
 * Ponto de entrada do front-end: liga as partes comuns (status, tema, abas, sugestões)
 * e inicializa cada tela.
 *
 * Por ser carregado com type="module", este script só roda depois de o HTML ser lido —
 * então todos os elementos já existem quando o código abaixo executa.
 */
import { fetchHealth } from './api.js'
import { setupAsk } from './ask.js'
import { setupCareerPlan } from './career-plan.js'
import { setupChat } from './chat.js'
import { $, icon, storage } from './dom.js'
import { escapeHtml } from './format.js'

const HEALTH_CHECK_INTERVAL_MS = 30_000

setupStatus()
setupTheme()
setupTabs()
setupSuggestions()
setupChat()
setupCareerPlan()
setupAsk()

/** Indicador "online/offline" no topo, consultando GET /health a cada 30 segundos. */
function setupStatus() {
  const status = $('#status')
  async function check() {
    try {
      const { model } = await fetchHealth()
      status.dataset.state = 'online'
      status.innerHTML = `<span>online<span class="status-model"> · ${escapeHtml(model)}</span></span>`
    } catch {
      status.dataset.state = 'offline'
      status.textContent = 'API offline'
    }
  }
  check()
  setInterval(check, HEALTH_CHECK_INTERVAL_MS)
}

/** Botão de tema claro/escuro. A escolha fica salva no navegador. */
function setupTheme() {
  const button = $('#theme-toggle')
  const currentTheme = () =>
    document.documentElement.dataset.theme ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
  // O ícone mostra o tema para o qual o botão vai trocar.
  const updateIcon = () => {
    button.innerHTML = icon(currentTheme() === 'dark' ? 'sun' : 'moon')
  }

  button.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    storage.set('rota-theme', next)
    updateIcon()
  })
  updateIcon()
}

/**
 * Abas acessíveis (padrão ARIA "tablist"): além do clique, funcionam pelo teclado
 * com as setas ←/→, Home e End. A aba escolhida fica salva no navegador.
 */
function setupTabs() {
  const tabs = [...document.querySelectorAll('.tab')]

  function activate(tab, focus = false) {
    for (const other of tabs) {
      const active = other === tab
      other.setAttribute('aria-selected', String(active))
      other.tabIndex = active ? 0 : -1 // só a aba ativa entra na ordem do Tab
      document.getElementById(other.dataset.tab).hidden = !active
    }
    if (focus) tab.focus()
    storage.set('rota-tab', tab.dataset.tab)
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab))
    tab.addEventListener('keydown', (event) => {
      const target = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 }[event.key]
      if (target === undefined) return
      event.preventDefault()
      // O "% length" faz a navegação dar a volta (da última aba para a primeira).
      activate(tabs[(target + tabs.length) % tabs.length], true)
    })
  })

  const savedTab = tabs.find((tab) => tab.dataset.tab === storage.get('rota-tab'))
  if (savedTab) activate(savedTab)
}

/** Chips de sugestão: preenchem o campo indicado em `data-target` e já enviam o formulário. */
function setupSuggestions() {
  for (const group of document.querySelectorAll('.suggestions[data-target]')) {
    group.addEventListener('click', (event) => {
      const suggestion = event.target.closest('.suggestion')
      if (!suggestion) return
      const field = document.getElementById(group.dataset.target)
      field.value = suggestion.textContent
      field.form.requestSubmit()
    })
  }
}
