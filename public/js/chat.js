/**
 * Tela "Conversar" — chat com o mentor, com a resposta chegando em STREAMING (etapa 7).
 * Usa a rota POST /chat/stream.
 */
import { errorMessage, RequestError } from './api.js'
import { $, showError } from './dom.js'

/** A API da IA não tem memória: é o FRONT quem guarda o histórico e reenvia a cada mensagem. */
const history = []
/** Limite de mensagens aceito pela API (o mesmo do schema zod no back-end). */
const MAX_HISTORY = 20

export function setupChat() {
  const input = $('#chat-input')
  const form = $('#chat-form')

  // O campo cresce conforme o texto, até um limite (definido no CSS).
  input.addEventListener('input', () => autoResize(input))

  // Enter envia; Shift+Enter quebra a linha (o padrão dos apps de chat).
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      form.requestSubmit()
    }
  })

  $('#new-chat').addEventListener('click', () => {
    history.length = 0
    $('#messages').innerHTML = ''
    $('#messages').hidden = true
    $('#chat-empty').hidden = false
    $('#chat-error').innerHTML = ''
    updateHistoryCounter()
    input.focus()
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault() // impede o navegador de recarregar a página
    const text = input.value.trim()
    const sendButton = form.querySelector('button[type=submit]')
    if (!text || sendButton.disabled) return

    input.value = ''
    autoResize(input)
    $('#chat-error').innerHTML = ''
    history.push({ role: 'user', text })
    addMessage('user', text)

    // Bolha vazia da IA + indicador "digitando" até o primeiro pedaço chegar.
    const message = addMessage('model', '')
    const bubble = message.querySelector('.text')
    const typing = document.createElement('div')
    typing.className = 'typing-indicator'
    typing.setAttribute('aria-label', 'Rota Tech está digitando')
    typing.innerHTML = '<span></span><span></span><span></span>'
    message.append(typing)
    sendButton.disabled = true

    try {
      const response = await fetch('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-MAX_HISTORY) }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new RequestError(response.status, data.error)
      }

      // Lemos a resposta pedaço por pedaço, conforme chega.
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        typing.remove()
        bubble.classList.add('streaming') // cursor piscando
        // `stream: true` lida com letras acentuadas que chegam divididas entre dois pedaços.
        bubble.textContent += decoder.decode(value, { stream: true })
        scrollToBottom()
      }
      history.push({ role: 'model', text: bubble.textContent })
    } catch (error) {
      // Desfazemos a tentativa: tiramos a bolha e a pergunta do histórico.
      message.remove()
      history.pop()
      showError($('#chat-error'), errorMessage(error))
    } finally {
      typing.remove()
      bubble.classList.remove('streaming')
      sendButton.disabled = false
      updateHistoryCounter()
      input.focus()
    }
  })
}

/** Adiciona uma bolha de mensagem na conversa. `textContent` (e não innerHTML) = sem risco de XSS. */
function addMessage(role, text) {
  $('#chat-empty').hidden = true
  $('#messages').hidden = false

  const message = document.createElement('div')
  message.className = `message fade-in ${role}`
  const author = document.createElement('span')
  author.className = 'author'
  author.textContent = role === 'user' ? 'Você' : 'Rota Tech'
  const bubble = document.createElement('div')
  bubble.className = 'text'
  bubble.textContent = text
  message.append(author, bubble)

  $('#messages').append(message)
  scrollToBottom()
  return message
}

function autoResize(textarea) {
  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight}px`
}

function scrollToBottom() {
  const messages = $('#messages')
  messages.scrollTop = messages.scrollHeight
}

function updateHistoryCounter() {
  $('#history-counter').textContent = `${Math.min(history.length, MAX_HISTORY)}/${MAX_HISTORY}`
}
