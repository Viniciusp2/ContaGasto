"use client";

import { useActionState, useState } from "react";
import { Check, LoaderCircle, Repeat, Trash2 } from "lucide-react";
import { apagarFixo, editarFixo, virarFixo, type EstadoFixo } from "@/app/fixos/actions";
import { IconeCategoria } from "@/components/icone-categoria";
import { SeloConta } from "@/components/selo-conta";
import { TIPOS_CONTA } from "@/lib/contas";
import { centavosDeDigitos, formatarCentavos } from "@/lib/dinheiro";
import { MAX_DIA_UTIL, MAX_PARCELAS } from "@/lib/validar-lancamento";

type Categoria = { id: string; nome: string; icone: string; cor: string };
type Forma = { id: string; nome: string; tipo: string };
type Conta = { id: string; nome: string; sigla: string; cor: string; corTexto: string };
export type FixoInicial = {
  id: string;
  tipo: "fixa" | "fixa_variavel" | "temporaria";
  descricao: string;
  valor: number;
  categoriaId: string;
  formaPagamentoId: string | null;
  contaId: string | null;
  diaDoMes: number;
  diaUtil: number | null;
  sabadoUtil: boolean;
  totalParcelas: number | null;
  tipoConta: string | null;
  automatico: boolean;
  gasto: boolean;
};

const chip = (ativo: boolean) =>
  `min-h-11 rounded-full border-2 px-3 text-sm transition-colors ${ativo ? "border-tinta bg-lavanda font-semibold" : "border-transparent bg-cartao"}`;
const campo = "mt-1 min-h-11 w-full rounded-2xl bg-cartao px-3 outline-none focus:ring-2 focus:ring-lavanda";

// Editar tudo de um fixo ou parcelado (1.6.5)
export function FormFixo({
  fixo,
  categorias,
  formas,
  contas,
  abertas,
  parcelasGeradas,
}: {
  fixo: FixoInicial;
  categorias: Categoria[];
  formas: Forma[];
  contas: Conta[];
  abertas: number;
  parcelasGeradas: number;
}) {
  const [estado, salvar, salvando] = useActionState(editarFixo, {} as EstadoFixo);
  const [descricao, setDescricao] = useState(fixo.descricao);
  const [valor, setValor] = useState(fixo.valor);
  const [categoriaId, setCategoriaId] = useState(fixo.categoriaId);
  const [formaId, setFormaId] = useState(fixo.formaPagamentoId ?? "");
  const [contaId, setContaId] = useState(fixo.contaId ?? "");
  const [quando, setQuando] = useState(fixo.diaUtil === null ? "dia" : fixo.diaUtil === -1 ? "ultimo_util" : "util");
  const [diaDoMes, setDiaDoMes] = useState(String(fixo.diaDoMes));
  const [diaUtil, setDiaUtil] = useState(String(fixo.diaUtil && fixo.diaUtil > 0 ? fixo.diaUtil : 5));
  const [sabadoUtil, setSabadoUtil] = useState(fixo.sabadoUtil);
  const [totalParcelas, setTotalParcelas] = useState(String(fixo.totalParcelas ?? 2));
  const [tipoConta, setTipoConta] = useState(fixo.tipoConta ?? "");
  const [automatico, setAutomatico] = useState(fixo.automatico);
  const [aplicar, setAplicar] = useState(true);
  const parcelado = fixo.tipo === "temporaria";

  return (
    <form action={salvar} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={fixo.id} />
      <input type="hidden" name="valor" value={valor} />
      <input type="hidden" name="categoriaId" value={categoriaId} />
      <input type="hidden" name="formaPagamentoId" value={formaId} />
      <input type="hidden" name="contaId" value={contaId} />
      <input type="hidden" name="quando" value={quando} />
      <input type="hidden" name="sabadoUtil" value={sabadoUtil ? "sim" : "nao"} />
      <input type="hidden" name="tipoConta" value={tipoConta} />
      <input type="hidden" name="automatico" value={automatico ? "sim" : "nao"} />
      <input type="hidden" name="aplicarNasAbertas" value={aplicar ? "sim" : "nao"} />

      <label className="text-sm font-semibold">
        {parcelado ? "Valor de cada parcela" : fixo.tipo === "fixa_variavel" ? "Valor estimado (até ter histórico)" : "Valor"}
        <input
          inputMode="numeric"
          value={formatarCentavos(valor)}
          onChange={(e) => setValor(centavosDeDigitos(e.target.value))}
          className={`${campo} text-2xl font-bold tabular-nums`}
        />
      </label>

      <label className="text-sm font-semibold">
        Descrição
        <input name="descricao" maxLength={80} value={descricao} onChange={(e) => setDescricao(e.target.value)} className={`${campo} font-normal`} />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Categoria</legend>
        <div className="grid grid-cols-3 gap-2">
          {categorias.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === categoriaId}
              onClick={() => setCategoriaId(c.id)}
              style={c.id === categoriaId ? { backgroundColor: c.cor } : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-1 text-center text-xs leading-tight ${
                c.id === categoriaId ? "sobre-pastel border-[#3a2e3f] font-semibold" : "border-transparent bg-cartao"
              }`}
            >
              <IconeCategoria nome={c.icone} size={22} />
              {c.nome}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Forma de pagamento</legend>
        <div className="flex flex-wrap gap-2">
          {formas.map((f) => (
            <button key={f.id} type="button" aria-pressed={f.id === formaId} onClick={() => setFormaId(f.id === formaId ? "" : f.id)} className={chip(f.id === formaId)}>
              {f.nome}
            </button>
          ))}
        </div>
      </fieldset>

      {contas.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Banco</legend>
          <div className="flex flex-wrap gap-2">
            {contas.map((c) => (
              <button key={c.id} type="button" aria-pressed={c.id === contaId} onClick={() => setContaId(c.id === contaId ? "" : c.id)} className={`flex items-center gap-2 ${chip(c.id === contaId)}`}>
                <SeloConta nome={c.nome} sigla={c.sigla} cor={c.cor} corTexto={c.corTexto} /> {c.nome}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {parcelado ? (
        <label className="text-sm font-semibold">
          Quantas parcelas no total
          <input
            name="totalParcelas"
            type="number"
            inputMode="numeric"
            min={Math.max(2, parcelasGeradas)}
            max={MAX_PARCELAS}
            value={totalParcelas}
            onChange={(e) => setTotalParcelas(e.target.value)}
            className={`${campo} w-28 text-center font-bold`}
          />
          <span className="mt-1 block text-xs font-normal text-tinta-suave">Já caíram {parcelasGeradas}. O dia segue o da compra.</span>
        </label>
      ) : (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Que dia cai?</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["dia", "Dia do mês"],
                ["util", "Nº dia útil"],
                ["ultimo_util", "Último dia útil"],
              ] as const
            ).map(([v, r]) => (
              <button key={v} type="button" aria-pressed={quando === v} onClick={() => setQuando(v)} className={chip(quando === v)}>
                {r}
              </button>
            ))}
          </div>
          {quando === "dia" && (
            <input
              aria-label="Dia do mês"
              name="diaDoMes"
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              value={diaDoMes}
              onChange={(e) => setDiaDoMes(e.target.value)}
              className={`${campo} w-24 text-center font-bold`}
            />
          )}
          {quando === "util" && (
            <span className="mt-2 flex items-center gap-2 text-sm">
              <input
                aria-label="Qual dia útil"
                name="diaUtil"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_DIA_UTIL}
                value={diaUtil}
                onChange={(e) => setDiaUtil(e.target.value)}
                className="min-h-11 w-20 rounded-2xl bg-cartao px-3 text-center font-bold outline-none focus:ring-2 focus:ring-lavanda"
              />
              º dia útil do mês
            </span>
          )}
          {quando !== "dia" && (
            <label className="mt-2 flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" checked={sabadoUtil} onChange={(e) => setSabadoUtil(e.target.checked)} className="size-5 accent-tinta" />
              Sábado conta como dia útil
            </label>
          )}
          {quando !== "dia" && <input type="hidden" name="diaDoMes" value={diaDoMes} />}
        </fieldset>
      )}

      {fixo.gasto && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">
            Que conta é? <span className="font-normal text-tinta-suave">(opcional)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {TIPOS_CONTA.map((t) => (
              <button key={t.valor} type="button" aria-pressed={tipoConta === t.valor} onClick={() => setTipoConta(tipoConta === t.valor ? "" : t.valor)} className={`flex items-center gap-1.5 ${chip(tipoConta === t.valor)}`}>
                <IconeCategoria nome={t.icone} size={16} /> {t.rotulo}
              </button>
            ))}
          </div>
          <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={automatico} onChange={(e) => setAutomatico(e.target.checked)} className="size-5 accent-tinta" />
            Débito automático (sai sozinho, não preciso marcar que paguei)
          </label>
        </fieldset>
      )}

      {abertas > 0 && (
        <label className="flex min-h-11 items-start gap-3 rounded-2xl bg-limao px-3 py-2 text-sm">
          <input type="checkbox" checked={aplicar} onChange={(e) => setAplicar(e.target.checked)} className="mt-0.5 size-5 accent-tinta" />
          <span>
            Aplicar também nas {abertas} que ainda estão a pagar (o que já foi pago fica como estava)
          </span>
        </label>
      )}

      {estado.erro && (
        <p role="alert" className="rounded-2xl bg-coral px-4 py-3 text-sm font-semibold">
          {estado.erro}
        </p>
      )}
      <button
        type="submit"
        disabled={salvando || valor <= 0 || !descricao.trim()}
        className="flex min-h-14 items-center justify-center gap-2 rounded-card bg-coral text-lg font-bold shadow-suave disabled:opacity-50"
      >
        {salvando ? <LoaderCircle className="animate-spin" aria-hidden /> : <Check aria-hidden />} Salvar alterações
      </button>
    </form>
  );
}

// Apagar de vez, escolhendo o que fazer com o que o fixo já gerou
export function ApagarFixo({ id, total, abertas }: { id: string; total: number; abertas: number }) {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState("manter");
  const [estado, apagar, apagando] = useActionState(apagarFixo, {} as EstadoFixo);
  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-tinta-suave underline">
        <Trash2 size={16} aria-hidden /> Apagar este fixo
      </button>
    );
  }
  const opcoes = [
    ["manter", `Manter o que já foi lançado (${total}) no histórico`, "Recomendado: só para de repetir e some daqui."],
    ["abertos", `Apagar também os ${abertas} que ainda estão a pagar`, "O que já foi pago fica."],
    ["tudo", `Apagar tudo que ele gerou (${total}), inclusive o já pago`, "Some do saldo e dos gráficos de todos os meses."],
  ] as const;
  return (
    <form action={apagar} className="flex flex-col gap-3 rounded-card bg-cartao p-4 shadow-suave">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="modo" value={modo} />
      <p className="font-semibold">Apagar de vez. O que fazer com o que ele já lançou?</p>
      {opcoes.map(([v, rotulo, dica]) => (
        <label key={v} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl p-3 text-sm ${modo === v ? "bg-lavanda" : "bg-fundo"}`}>
          <input type="radio" name="modo-visivel" checked={modo === v} onChange={() => setModo(v)} className="mt-0.5 size-5 accent-tinta" />
          <span>
            <span className="block font-semibold">{rotulo}</span>
            <span className="block text-xs text-tinta-suave">{dica}</span>
          </span>
        </label>
      ))}
      <label className="text-sm font-semibold">
        Digite APAGAR pra confirmar
        <input name="confirmacao" autoComplete="off" className={campo} />
      </label>
      {estado.erro && <p role="alert" className="rounded-2xl bg-coral px-3 py-2 text-sm font-semibold">{estado.erro}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAberto(false)} className="min-h-11 rounded-2xl bg-fundo text-sm font-semibold">
          Cancelar
        </button>
        <button type="submit" disabled={apagando} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-coral text-sm font-semibold disabled:opacity-50">
          <Trash2 size={16} aria-hidden /> Apagar
        </button>
      </div>
    </form>
  );
}

// Virar fixo: um lançamento que já existe passa a repetir todo mês (ele mesmo é a primeira vez)
export function BotaoVirarFixo({ lancamentoId, compacto = false }: { lancamentoId: string; compacto?: boolean }) {
  const [estado, agir, agindo] = useActionState(virarFixo, {} as EstadoFixo);
  return (
    <form action={agir} className="flex flex-col gap-2">
      <input type="hidden" name="lancamentoId" value={lancamentoId} />
      <div className={compacto ? "flex gap-2" : "grid grid-cols-2 gap-2"}>
        <button type="submit" name="tipo" value="fixa" disabled={agindo} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-lavanda px-3 text-sm font-semibold disabled:opacity-50">
          {agindo ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <Repeat size={16} aria-hidden />} {compacto ? "Virar fixo" : "Todo mês"}
        </button>
        {!compacto && (
          <button type="submit" name="tipo" value="fixa_variavel" disabled={agindo} className="min-h-11 rounded-2xl bg-cartao px-3 text-sm font-semibold disabled:opacity-50">
            Todo mês, valor muda
          </button>
        )}
      </div>
      {estado.erro && <p role="alert" className="text-sm font-semibold">{estado.erro}</p>}
    </form>
  );
}
