import { Menu } from "lucide-react";
import { EmBreve } from "@/components/em-breve";

export default function Mais() {
  return (
    <EmBreve
      titulo="Mais"
      texto="Fixos, objetivos, empréstimos, resumo do ano e configurações vão morar aqui."
      Icone={Menu}
    />
  );
}
