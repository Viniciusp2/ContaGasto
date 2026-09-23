import { Plus } from "lucide-react";
import { EmBreve } from "@/components/em-breve";

export default function NovoLancamento() {
  return (
    <EmBreve
      titulo="Novo lançamento"
      texto="O formulário rápido de gasto e entrada chega no Sprint 1.3."
      Icone={Plus}
    />
  );
}
