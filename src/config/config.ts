/**
 * Configuração do app, lida do .env UMA única vez.
 *
 * Qualquer arquivo que fizer `import { config } from './config/config.ts'` recebe
 * valores já validados e tipados (ex.: `config.PORT` é number, não string).
 *
 * Atenção: importar este arquivo LÊ o process.env e encerra o processo se algo
 * estiver errado. Por isso os testes nunca o importam — eles usam `parseEnv()`.
 */
import { type Config, parseEnv } from './env.ts'

// O `tsx --env-file-if-exists=.env` (veja package.json) já carregou o .env no process.env.
const parsed = parseEnv(process.env)

if (!parsed.success) {
  console.error('\n❌ Configuração inválida no arquivo .env:\n')
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.')}: ${issue.message}`)
  }
  console.error('\n   Dica: rode  cp .env.example .env  e preencha os valores.\n')
  // Código de saída diferente de 0 = "terminou com erro" (convenção de todo sistema operacional).
  process.exit(1)
}

export const config: Config = parsed.data
