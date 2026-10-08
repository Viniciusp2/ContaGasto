// Ponto de entrada da IA: lê a configuração e devolve o provedor certo.
import { provedorAnthropic } from "./anthropic";
import { provedorCompativel } from "./compativel";
import type { ConfigIA } from "./config";
import type { ProvedorIA } from "./tipos";

export function criarProvedor(config: ConfigIA): ProvedorIA {
  return config.formato === "anthropic" ? provedorAnthropic(config) : provedorCompativel(config);
}

export { descreverIA, descreverReserva, lerConfigEscolhida, lerConfigIA, lerConfigReserva, listarIAs, type OpcaoIA } from "./config";
export * from "./tipos";
