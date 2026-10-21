// Testa as funções puras do front-end (public/js/format.js) — inclusive a proteção contra XSS.
import { describe, expect, it } from 'vitest'
import { escapeHtml, relevanceWidth, withCitations } from '../../public/js/format.js'

describe('escapeHtml', () => {
  it('neutraliza HTML vindo de fora (proteção contra XSS)', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
  })

  it('aceita qualquer valor, não só texto', () => {
    expect(escapeHtml(42)).toBe('42')
  })
})

describe('withCitations', () => {
  it('transforma [n] em botões de citação', () => {
    expect(withCitations('ADS é matutino [1].')).toBe(
      'ADS é matutino <button class="citation" type="button" data-ref="1" aria-label="Ver fonte 1">1</button>.',
    )
  })

  it('escapa o texto ANTES de criar os botões', () => {
    expect(withCitations('<script>x</script> [2]')).toContain('&lt;script&gt;')
    expect(withCitations('<script>x</script> [2]')).not.toContain('<script>')
  })
})

describe('relevanceWidth', () => {
  it('mapeia o score para a largura da barra, entre 6% e 100%', () => {
    expect(relevanceWidth(0.9)).toBe(100)
    expect(relevanceWidth(0.7)).toBeCloseTo(50)
    expect(relevanceWidth(0.1)).toBe(6)
  })
})
