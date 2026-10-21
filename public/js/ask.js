/**
 * Tela "Perguntar aos documentos" — RAG com fontes (etapa 6).
 * Usa a rota POST /ask.
 */
import { errorMessage, postJson } from './api.js'
import { $, icon, showError } from './dom.js'
import { escapeHtml, relevanceWidth, withCitations } from './format.js'

export function setupAsk() {
  $('#ask-form').addEventListener('submit', (event) => {
    event.preventDefault()
    ask()
  })

  // Clicar numa citação [n] destaca a fonte correspondente na lista.
  // Um único "ouvinte" no container atende todos os botões, inclusive os criados depois
  // (técnica chamada "delegação de eventos").
  $('#ask-result').addEventListener('click', (event) => {
    const ref = event.target.closest('.citation')?.dataset.ref
    if (!ref) return
    const source = document.getElementById(`source-${ref}`)
    if (!source) return
    source.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    source.classList.add('highlighted')
    setTimeout(() => source.classList.remove('highlighted'), 1600)
  })
}

async function ask() {
  const result = $('#ask-result')
  const question = $('#ask-input').value.trim()
  if (question.length < 3) return // mesmo mínimo do schema zod no back-end

  result.innerHTML = `
    <div class="result" aria-busy="true">
      <div class="card answer">
        <div class="skeleton" style="height:14px;width:120px"></div>
        <div class="skeleton" style="height:16px;width:95%;margin-top:14px"></div>
        <div class="skeleton" style="height:16px;width:80%;margin-top:8px"></div>
      </div>
    </div>`

  try {
    result.innerHTML = renderAnswer(await postJson('/ask', { question }))
  } catch (error) {
    showError(result, errorMessage(error), ask)
  }
}

function renderAnswer({ answer, sources }) {
  // Sem fontes = nenhum trecho passou do score mínimo. É um resultado válido, não um erro.
  if (sources.length === 0) {
    return `
      <div class="result">
        <div class="card not-found fade-in">
          ${icon('search-off')}
          <div>
            <h3>Não encontrei isso nos documentos</h3>
            <p>Nenhum trecho passou do score mínimo de relevância, então a IA nem foi chamada. Melhor assim do que inventar.</p>
          </div>
        </div>
      </div>`
  }

  const sourceItems = sources.map((source) => {
    // Number(): mesmo vindo da nossa API, nada entra no HTML sem ser tratado.
    const ref = Number(source.ref)
    return `
      <li class="source" id="source-${ref}">
        <span class="ref">${ref}</span>
        <div>
          <div class="file">${escapeHtml(source.file)}</div>
          <div class="section">${escapeHtml(source.section)}</div>
        </div>
        <div class="relevance">
          <span>${Number(source.score).toFixed(3)}</span>
          <div class="bar"><span style="width:${relevanceWidth(Number(source.score))}%"></span></div>
        </div>
      </li>`
  })

  return `
    <div class="result fade-in">
      <div class="card answer">
        <span class="eyebrow">Resposta</span>
        <p>${withCitations(answer)}</p>
      </div>
      <div class="card sources">
        <div class="sources-header">
          <span class="eyebrow">Fontes consultadas</span>
          <span class="eyebrow">relevância · cosseno</span>
        </div>
        <ol>${sourceItems.join('')}</ol>
      </div>
    </div>`
}
