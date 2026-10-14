// Modo demonstração (versão de portfólio): BOLSO_DEMO=1.
// O app abre sem login, com dados inventados num banco que vive só na memória do servidor.
// Nenhum banco de verdade é usado, mesmo que exista DATABASE_URL: não tem dado real pra vazar.
// Os dados voltam ao exemplo depois de um tempo sem uso, ou no botão "Restaurar exemplo".

export function modoDemo(env: Record<string, string | undefined> = process.env): boolean {
  return env.BOLSO_DEMO === "1" || env.BOLSO_DEMO === "true";
}

export const MODO_DEMO = modoDemo();

// Sem ninguém mexer por esse tempo, o próximo visitante já pega os dados de exemplo de novo
export const MINUTOS_SEM_USO_PRA_RESTAURAR = 30;

export function precisaRestaurar(ultimoUso: number, agora = Date.now()): boolean {
  return agora - ultimoUso > MINUTOS_SEM_USO_PRA_RESTAURAR * 60 * 1000;
}

// O que fica fechado na demonstração: mexe com o servidor ou não faz sentido sem dono
export const BLOQUEADO_NA_DEMO = {
  seguranca: "Na demonstração não tem login nem autenticador. No app de verdade, entrar pede senha e código do celular.",
  senha: "Na demonstração não tem senha.",
  restaurar: "Restaurar backup fica desligado na demonstração. Pra voltar aos dados de exemplo, use o botão Restaurar exemplo no topo.",
  notificacoes: "Notificações no celular ficam desligadas na demonstração.",
  dev: "A área Dev fica fechada na demonstração.",
} as const;
