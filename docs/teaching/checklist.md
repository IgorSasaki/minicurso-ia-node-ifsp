# Checklist do ministrante

## D-7 (até 21/10)
- [ ] Publicar o repositório **público** em `github.com/IgorSasaki/minicurso-ia-node-ifsp` (com as tags: `git push --tags`).
- [ ] Abrir um Codespace novo do zero e cronometrar o setup completo (meta: < 10 min).
- [ ] Confirmar com a coordenação/organização da Semana:
  - [ ] Faixa etária da turma e como tratar os **menores de 18** (termos do Gemini exigem 18+; plano atual: duplas com maiores).
  - [ ] Os PCs do laboratório abrem `github.com`, `*.github.dev` (Codespaces) e `aistudio.google.com` (firewall/proxy do campus).
  - [ ] Projetor com HDMI/USB-C, tomada, Wi-Fi para o notebook do ministrante.
- [ ] Enviar à organização o link do `docs/setup.md` para divulgar: "venha com conta GitHub e Google criadas".

## D-1 (27/10)
- [ ] Conferir no **AI Studio → Rate limits** a cota gratuita atual do `gemini-3.5-flash-lite` e do `gemini-embedding-2`.
- [ ] Rodar todas as etapas na sua máquina (`git checkout etapa-0N`) e o roteiro de `requests.http`.
- [ ] Rodar `pnpm ingest` uma vez para garantir que o `index.json` está atualizado.
- [ ] Gerar uma **chave de API nova só para a aula** (e revogar depois — a chave usada na preparação foi compartilhada em chat).
- [ ] Gravar um vídeo curto de cada demo (Plano B se a internet cair).
- [ ] Exportar os slides em PDF (Plano B se o projetor não abrir o navegador).
- [ ] Ensaio cronometrado do roteiro com os slides (metas: sessão 1 em 65 min; sessões 2 e 3 em 80 min cada).

## Dia (28/10) — chegar às 12h15 (início 13h00; intervalos 14h05–14h30 e 15h50–16h30; fim 17h50)
- [ ] Testar internet do lab: abrir um Codespace em um PC do laboratório.
- [ ] Servidor `pnpm dev` rodando na versão `main` para a demo de abertura.
- [ ] Abas abertas: slides · VS Code (fonte grande, tema claro para projetor) · `http://localhost:3333` · AI Studio.
- [ ] Zoom do terminal/editor ≥ 150% — teste do fundo da sala.
- [ ] Notificações do sistema desligadas; `.env` **fechado** (não projetar a chave!).
- [ ] QR code do repositório impresso/colado na lousa.

## Depois da aula
- [ ] Revogar a chave usada na aula em <https://aistudio.google.com/apikey>.
- [ ] Postar o link do repositório e dos slides para os participantes.
- [ ] Pedir feedback rápido (3 perguntas) — melhora a próxima edição.
