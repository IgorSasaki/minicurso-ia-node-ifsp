/**
 * Pequenos utilitários de DOM (a árvore de elementos da página) usados por todas as telas.
 */
import { escapeHtml } from './format.js'

/** Atalho para `document.querySelector`. */
export const $ = (selector) => document.querySelector(selector)

/** HTML de um ícone SVG declarado no topo do index.html (ex.: icon('send')). */
export const icon = (name) => `<svg class="icon"><use href="#i-${name}" /></svg>`

/**
 * localStorage pode falhar (aba anônima, cookies bloqueados). Envolvemos em try/catch:
 * se falhar, a página funciona normalmente — só não lembra a preferência.
 */
export const storage = {
  get(key) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch {
      // sem armazenamento disponível: ignoramos
    }
  },
}

/**
 * Mostra um alerta de erro dentro de `container`.
 * Se `retry` for informado, aparece também um botão "Tentar de novo".
 */
export function showError(container, message, retry) {
  container.innerHTML = `
    <div class="alert" role="alert">
      ${icon('alert')}
      <p>${escapeHtml(message)}</p>
      ${retry ? '<button class="button button-secondary" type="button">Tentar de novo</button>' : ''}
    </div>`
  if (retry) container.querySelector('button').addEventListener('click', retry)
}
