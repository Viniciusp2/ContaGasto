"use client";

import { useActionState, useState } from "react";
import { Check, LoaderCircle, Plus, X } from "lucide-react";
import { salvarLancamento, type EstadoForm } from "@/app/lancamentos/actions";
import { diaCurto } from "@/lib/datas";
import { centavosDeDigitos, formatarCentavos } from "@/lib/dinheiro";
import { liquidoDoHolerite, MAX_DESCONTOS, type Holerite } from "@/lib/holerite";
import { dataEfetiva } from "@/lib/recorrencias";
import { MAX_DIA_UTIL, MAX_PARCELAS, type Repetir } from "@/lib/validar-lancamento";

type Categoria = { id: string; nome: string; emoji: string; cor: string; tipo: "gasto" | "entrada" };
type Forma = {
  id: string;
  nome: string;
  tipo: string;
  diaFechamento: number | null;
  diaVencimento: number | null;
};

const opcoesRepetir: { valor: Repetir; rotulo: string; soGasto?: boolean }[] = [
  { valor: "unico", rotulo: "Só dessa vez" },
  { valor: "fixa", rotulo: "Todo mês" },
  { valor: "fixa_variavel", rotulo: "Todo mês, valor muda" },
  { valor: "temporaria", rotulo: "Parcelado", soGasto: true },
];

export type LancamentoInicial = {
  id: string;
  tipo: "gasto" | "entrada";
  valor: number;
  data: string;
  descricao: string;
  categoriaId: string;
  formaPagamentoId: string | null;
  obs: string | null;
  estimado: boolean;
  holerite: Holerite | null;
};

type Quando = "dia" | "util" | "ultimo_util";

const inicialVazio = { erro: undefined } satisfies EstadoForm;

export function FormLancamento({
  categorias,
  formas,
  hoje,
  inicial,
}: {
  categorias: Categoria[];
  formas: Forma[];
  hoje: string;
  inicial?: LancamentoInicial;
}) {
  const [estado, acao, salvando] = useActionState(salvarLancamento, inicialVazio);
  const [tipo, setTipo] = useState<"gasto" | "entrada">(inicial?.tipo ?? "gasto");
  const [centavos, setCentavos] = useState(inicial?.valor ?? 0);
  const [categoriaId, setCategoriaId] = useState(inicial?.categoriaId ?? "");
  const [formaId, setFormaId] = useState(inicial?.formaPagamentoId ?? "");
  // Controlados: o React 19 limpa campos soltos depois da action, e um erro não pode apagar o que foi digitado
  const [data, setData] = useState(inicial?.data ?? hoje);
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [obs, setObs] = useState(inicial?.obs ?? "");
  const [repetir, setRepetir] = useState<Repetir>("unico");
  const [parcelas, setParcelas] = useState("2");
  const [quando, setQuando] = useState<Quando>("dia");
  const [diaUtil, setDiaUtil] = useState("5");
  const [sabadoUtil, setSabadoUtil] = useState(true);
  const [holerite, setHolerite] = useState<Holerite>(inicial?.holerite ?? { bruto: 0, descontos: [] });

  const daCategoria = categorias.filter((c) => c.tipo === tipo);
  const parcelado = repetir === "temporaria";
  const repeteTodoMes = repetir === "fixa" || repetir === "fixa_variavel";
  const parcelasOk = !parcelado || (Number(parcelas) >= 2 && Number(parcelas) <= MAX_PARCELAS);
  const diaUtilOk = !repeteTodoMes || quando !== "util" || (Number(diaUtil) >= 1 && Number(diaUtil) <= MAX_DIA_UTIL);

  // Holerite: só no salário lançado mês a mês. Preenchido, o valor vira bruto - descontos (4.2).
  const categoria = categorias.find((c) => c.id === categoriaId);
  const podeHolerite = tipo === "entrada" && categoria?.nome === "Salário" && repetir === "unico";
  const usandoHolerite = podeHolerite && holerite.bruto > 0;
  const valor = usandoHolerite ? liquidoDoHolerite(holerite) : centavos;
  const podeSalvar = valor > 0 && categoriaId !== "" && parcelasOk && diaUtilOk && !salvando;

  // Aviso de fatura: no crédito com dias configurados, o gasto sai no vencimento
  const forma = formas.find((f) => f.id === formaId);
  const cartao = tipo === "gasto" && forma?.tipo === "credito" ? forma : null;
  const vencimento = cartao && data ? dataEfetiva(data, cartao) : null;

  function trocarTipo(novo: "gasto" | "entrada") {
    if (novo === tipo) return;
    setTipo(novo);
    setCategoriaId(""); // categoria de gasto não serve pra entrada
    if (novo === "entrada" && repetir === "temporaria") setRepetir("unico");
  }

  return (
    <form action={acao} className="flex flex-col gap-5">
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="valor" value={valor} />
      <input type="hidden" name="categoriaId" value={categoriaId} />
      <input type="hidden" name="formaPagamentoId" value={formaId} />
      <input type="hidden" name="repetir" value={repetir} />
      <input type="hidden" name="quando" value={quando} />
      <input type="hidden" name="diaUtil" value={diaUtil} />
      <input type="hidden" name="sabadoUtil" value={sabadoUtil ? "sim" : "nao"} />
      {usandoHolerite && <input type="hidden" name="holerite" value={JSON.stringify(holerite)} />}

      <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-2 gap-2 rounded-card bg-lavanda p-1.5">
        {(["gasto", "entrada"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tipo === t}
            onClick={() => trocarTipo(t)}
            className={`min-h-11 rounded-2xl font-semibold capitalize transition-colors ${
              tipo === t ? (t === "gasto" ? "bg-coral shadow-suave" : "bg-menta shadow-suave") : "text-tinta-suave"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        <label
          htmlFor="valor-visivel"
          className={parcelado ? "mb-2 block text-center text-sm font-semibold" : "sr-only"}
        >
          {parcelado ? "Valor de cada parcela" : "Valor"}
        </label>
        <input
          id="valor-visivel"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={!inicial}
          value={formatarCentavos(valor)}
          readOnly={usandoHolerite}
          onChange={(e) => setCentavos(centavosDeDigitos(e.target.value))}
          className="w-full rounded-card bg-cartao px-4 py-4 text-center text-4xl font-bold tabular-nums shadow-suave outline-none focus:ring-2 focus:ring-lavanda read-only:bg-fundo"
        />
        {usandoHolerite && (
          <p className="mt-1 text-center text-sm text-tinta-suave">Líquido, calculado pelo holerite</p>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Categoria</legend>
        <div className="grid grid-cols-3 gap-2">
          {daCategoria.map((c) => {
            const escolhida = c.id === categoriaId;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={escolhida}
                onClick={() => setCategoriaId(c.id)}
                style={escolhida ? { backgroundColor: c.cor } : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-1 text-center text-xs leading-tight transition-colors ${
                  escolhida ? "border-tinta font-semibold" : "border-transparent bg-cartao"
                }`}
              >
                <span className="text-xl" aria-hidden>
                  {c.emoji}
                </span>
                {c.nome}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">
          Forma de pagamento <span className="font-normal text-tinta-suave">(opcional)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {/* VA só paga gasto; o VA recebido é a categoria Vale alimentação (4.13) */}
          {formas.filter((f) => tipo === "gasto" || f.tipo !== "beneficio").map((f) => {
            const escolhida = f.id === formaId;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={escolhida}
                onClick={() => setFormaId(escolhida ? "" : f.id)}
                className={`min-h-11 rounded-full border-2 px-4 text-sm transition-colors ${
                  escolhida ? "border-tinta bg-lavanda font-semibold" : "border-transparent bg-cartao"
                }`}
              >
                {f.nome}
              </button>
            );
          })}
        </div>
      </fieldset>

      {!inicial && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Repete?</legend>
          <div className="flex flex-wrap gap-2">
            {opcoesRepetir
              .filter((o) => tipo === "gasto" || !o.soGasto)
              .map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  aria-pressed={repetir === o.valor}
                  onClick={() => setRepetir(o.valor)}
                  className={`min-h-11 rounded-full border-2 px-4 text-sm transition-colors ${
                    repetir === o.valor ? "border-tinta bg-lavanda font-semibold" : "border-transparent bg-cartao"
                  }`}
                >
                  {o.rotulo}
                </button>
              ))}
          </div>
          {parcelado && (
            <div className="mt-3 flex items-center gap-3">
              <label htmlFor="parcelas" className="text-sm font-semibold">
                Quantas vezes?
              </label>
              <input
                id="parcelas"
                name="parcelas"
                type="number"
                inputMode="numeric"
                min={2}
                max={MAX_PARCELAS}
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value)}
                className="min-h-11 w-20 rounded-2xl bg-cartao px-3 text-center font-bold outline-none focus:ring-2 focus:ring-lavanda"
              />
              {parcelasOk && centavos > 0 && (
                <span className="text-sm text-tinta-suave">
                  Total {formatarCentavos(centavos * Number(parcelas))}
                </span>
              )}
            </div>
          )}
          {repetir === "fixa_variavel" && (
            <p className="mt-2 text-sm text-tinta-suave">
              {tipo === "gasto" ? "Tipo luz e água" : "Tipo salário com hora extra"}: cada mês entra estimado pela
              média e só conta no saldo quando você confirmar o valor.
            </p>
          )}

          {repeteTodoMes && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold">Que dia cai?</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["dia", `Dia ${Number(data.slice(8, 10)) || ""} todo mês`],
                    ["util", "Nº dia útil"],
                    ["ultimo_util", "Último dia útil"],
                  ] as [Quando, string][]
                ).map(([v, rotulo]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={quando === v}
                    onClick={() => setQuando(v)}
                    className={`min-h-11 rounded-full border-2 px-4 text-sm transition-colors ${
                      quando === v ? "border-tinta bg-lavanda font-semibold" : "border-transparent bg-cartao"
                    }`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
              {quando === "util" && (
                <div className="mt-3 flex items-center gap-3">
                  <input
                    aria-label="Qual dia útil"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_DIA_UTIL}
                    value={diaUtil}
                    onChange={(e) => setDiaUtil(e.target.value)}
                    className="min-h-11 w-20 rounded-2xl bg-cartao px-3 text-center font-bold outline-none focus:ring-2 focus:ring-lavanda"
                  />
                  <span className="text-sm">º dia útil do mês</span>
                </div>
              )}
              {quando !== "dia" && (
                <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={sabadoUtil}
                    onChange={(e) => setSabadoUtil(e.target.checked)}
                    className="size-5 accent-tinta"
                  />
                  Sábado conta como dia útil
                </label>
              )}
            </div>
          )}
        </fieldset>
      )}

      {podeHolerite && <CamposHolerite holerite={holerite} setHolerite={setHolerite} />}

      <div>
        <label htmlFor="data" className="mb-2 block text-sm font-semibold">
          {cartao
            ? "Data da compra"
            : repetir === "unico"
              ? "Data"
              : repeteTodoMes && quando !== "dia"
                ? "A partir de"
                : "Primeira vez"}
        </label>
        <input
          id="data"
          name="data"
          type="date"
          required
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="min-h-11 w-full rounded-2xl bg-cartao px-4 outline-none focus:ring-2 focus:ring-lavanda"
        />
        {cartao && vencimento && vencimento !== data && (
          <p className="mt-2 rounded-2xl bg-limao px-4 py-2 text-sm">
            Entra na fatura que vence <strong>{diaCurto(vencimento)}</strong>
            {parcelado ? " (parcela 1)" : ""}.
          </p>
        )}
        {cartao && !cartao.diaFechamento && (
          <p className="mt-2 text-sm text-tinta-suave">
            Configure o fechamento do cartão em Mais, Cartões, pra ele seguir a fatura.
          </p>
        )}
      </div>

      <details className="rounded-2xl bg-cartao px-4 py-1" open={Boolean(inicial)}>
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">
          Descrição e observação
        </summary>
        <div className="flex flex-col gap-3 pb-3">
          <input
            name="descricao"
            maxLength={80}
            placeholder="Descrição (se vazio, usa a categoria)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="min-h-11 rounded-2xl bg-fundo px-4 outline-none focus:ring-2 focus:ring-lavanda"
          />
          <textarea
            name="obs"
            maxLength={500}
            rows={3}
            placeholder="Observação"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            className="rounded-2xl bg-fundo px-4 py-3 outline-none focus:ring-2 focus:ring-lavanda"
          />
        </div>
      </details>

      {estado.erro && (
        <p role="alert" className="rounded-2xl bg-coral/30 px-4 py-3 text-sm font-semibold">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={!podeSalvar}
        className="flex min-h-14 items-center justify-center gap-2 rounded-card bg-coral text-lg font-bold shadow-suave transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {salvando ? <LoaderCircle className="animate-spin" aria-hidden /> : <Check aria-hidden />}
        {inicial
          ? inicial.estimado
            ? "Confirmar valor"
            : "Salvar alterações"
          : repetir !== "unico"
            ? "Salvar e repetir"
            : tipo === "gasto"
              ? "Salvar gasto"
              : "Salvar entrada"}
      </button>
    </form>
  );
}

// Holerite só pra consulta: bruto e descontos. O saldo usa o líquido (CLAUDE.md 4.2).
function CamposHolerite({
  holerite,
  setHolerite,
}: {
  holerite: Holerite;
  setHolerite: (h: Holerite) => void;
}) {
  const campo = "min-h-11 rounded-2xl bg-fundo px-3 outline-none focus:ring-2 focus:ring-lavanda";
  const mudarDesconto = (i: number, novo: Partial<Holerite["descontos"][number]>) =>
    setHolerite({
      ...holerite,
      descontos: holerite.descontos.map((d, j) => (j === i ? { ...d, ...novo } : d)),
    });

  return (
    <details className="rounded-2xl bg-cartao px-4 py-1" open={holerite.bruto > 0}>
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">
        Detalhar holerite <span className="ml-1 font-normal text-tinta-suave">(opcional)</span>
      </summary>
      <div className="flex flex-col gap-3 pb-3">
        <label className="text-sm">
          Salário bruto
          <input
            inputMode="numeric"
            value={formatarCentavos(holerite.bruto)}
            onChange={(e) => setHolerite({ ...holerite, bruto: centavosDeDigitos(e.target.value) })}
            className={`mt-1 w-full text-lg font-bold tabular-nums ${campo}`}
          />
        </label>

        <p className="text-sm font-semibold">Descontos</p>
        {holerite.descontos.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              aria-label="Nome do desconto"
              placeholder="INSS, IR, plano..."
              maxLength={40}
              value={d.nome}
              onChange={(e) => mudarDesconto(i, { nome: e.target.value })}
              className={`min-w-0 flex-1 ${campo}`}
            />
            <input
              aria-label={`Valor de ${d.nome || "desconto"}`}
              inputMode="numeric"
              value={formatarCentavos(d.valor)}
              onChange={(e) => mudarDesconto(i, { valor: centavosDeDigitos(e.target.value) })}
              className={`w-32 text-right tabular-nums ${campo}`}
            />
            <button
              type="button"
              aria-label={`Tirar ${d.nome || "desconto"}`}
              onClick={() => setHolerite({ ...holerite, descontos: holerite.descontos.filter((_, j) => j !== i) })}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-fundo"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        ))}
        {holerite.descontos.length < MAX_DESCONTOS && (
          <button
            type="button"
            onClick={() => setHolerite({ ...holerite, descontos: [...holerite.descontos, { nome: "", valor: 0 }] })}
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-lavanda text-sm font-semibold"
          >
            <Plus size={18} aria-hidden /> Adicionar desconto
          </button>
        )}

        {holerite.bruto > 0 && (
          <p className="flex justify-between rounded-2xl bg-menta px-4 py-2 font-semibold">
            <span>Líquido</span>
            <span className="tabular-nums">{formatarCentavos(liquidoDoHolerite(holerite))}</span>
          </p>
        )}
        {holerite.bruto > 0 && (
          <button
            type="button"
            onClick={() => setHolerite({ bruto: 0, descontos: [] })}
            className="min-h-11 text-sm text-tinta-suave"
          >
            Tirar o holerite
          </button>
        )}
      </div>
    </details>
  );
}
