import { ListOrdered } from "lucide-react";
import { EmBreve } from "@/components/em-breve";

export default function Lancamentos() {
  return (
    <EmBreve
      titulo="Lançamentos"
      texto="A lista do mês chega no Sprint 1.3."
      Icone={ListOrdered}
    />
  );
}
