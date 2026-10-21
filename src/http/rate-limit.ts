/**
 * Proteção de CUSTO: limite de chamadas de IA por usuário.
 *
 * Cada IP pode fazer no máximo 15 chamadas de IA por minuto. Sem isso, um único usuário
 * (ou um robô) pode esgotar a sua cota da API em segundos.
 *
 * O limite vale SÓ para as rotas que chamam a IA (é lá que está o custo). Arquivos do
 * front-end e o /health não contam — senão recarregar a página bloquearia o usuário.
 */
export const AI_RATE_LIMIT = { max: 15, timeWindow: '1 minute' }
