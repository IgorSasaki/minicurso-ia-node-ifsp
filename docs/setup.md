# Preparação do ambiente — leia antes da aula (ou nos primeiros 15 minutos)

Você **não precisa instalar nada** no computador do laboratório. Vamos programar no navegador, com o GitHub Codespaces.

## O que você precisa
- [ ] Uma conta no **GitHub** (gratuita) — <https://github.com/signup>
- [ ] Uma conta **Google** com **18 anos ou mais**, para criar a chave do Gemini (regra dos termos de uso do Google)
- [ ] Menor de 18? Sem problema: faça em **dupla** com um colega maior de idade, que cria a chave e roda o projeto; vocês programam juntos.

## Passo 1 — Abrir o projeto no Codespaces (≈ 3 min)
1. Acesse **github.com/IgorSasaki/minicurso-ia-node-ifsp** (QR code no slide).
2. Clique em **Code → Codespaces → Create codespace on main**.
3. Espere o VS Code abrir no navegador. O `pnpm install` roda sozinho e o arquivo `.env` é criado automaticamente.

> 💡 O GitHub dá horas gratuitas de Codespaces por mês para contas pessoais — mais que suficiente para a aula. Ao terminar, pare o codespace em <https://github.com/codespaces>.

## Passo 2 — Criar a chave do Gemini (≈ 3 min)
1. Acesse <https://aistudio.google.com/apikey> e entre com sua conta Google.
2. Clique em **Create API key** (aceite os termos se for o primeiro acesso).
3. Copie a chave (começa com `AIza...`).

> 💳 Não pede cartão de crédito. O plano gratuito tem limite de requisições por minuto e por dia — se aparecer erro **429**, espere 1 minuto.
> 🔒 A chave é **sua senha** para a API: não poste em grupos, prints ou no GitHub.

## Passo 3 — Colar a chave no `.env` (≈ 1 min)
No Codespaces, abra o arquivo `.env` (na raiz do projeto) e troque:
```
GEMINI_API_KEY=cole_sua_chave_aqui
```
pela sua chave. Salve (Ctrl+S).

## Passo 4 — Testar (≈ 1 min)
No terminal do Codespaces:
```bash
git checkout etapa-01
pnpm hello
```
Se aparecer uma explicação sobre APIs com 📝 e 📊 — **pronto!** Levante a mão ✋.

## Deu erro?
| Mensagem | Solução |
|---|---|
| `GEMINI_API_KEY ... Você esqueceu de colar sua chave` | Abra `.env`, cole a chave e salve |
| `API key not valid` | A chave foi copiada pela metade — copie de novo |
| `429` / `RESOURCE_EXHAUSTED` | Limite por minuto: aguarde 60 segundos |
| `.env` não existe | Rode `cp .env.example .env` |
| Codespaces não abre | Use o Plano B: veja com o professor |

## Navegando entre as etapas
```bash
git checkout etapa-03     # pula para o código pronto da etapa 3
git checkout main         # versão final completa
```
Se você editou arquivos e o checkout reclamar: `git stash` (guarda suas mudanças) e tente de novo.
