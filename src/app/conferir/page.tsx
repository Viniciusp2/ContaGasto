import Link from "next/link";
import { ArrowLeft, CircleCheck, CopyX, Landmark, Receipt, SearchCheck, Unlink } from "lucide-react";
import { apagarRepetido, juntarPagamento, marcarCerto } from "@/app/conferir/actions";
import { BateComBanco, BotaoAcao } from "@/components/conferir-acoes";
import { lancamentosParaCalculo, listarEmprestimosParaCalculo } from "@/db/consultas";
import { dadosDaConferencia } from "@/db/conferir";
import { gerarRecorrencias } from "@/db/gerar-recorrencias";
import { compromissosDoMes, guardadoNoMes } from "@/db/painel";
import { saldosHoje } from "@/db/saldos";
import { resumoDoMes } from "@/lib/calculos";
import { atrasadasSemPagamento, contasQueParecemPagas, possiveisRepetidos, semBanco, type LancConferir } from "@/lib/conferir";
import { diaCurto, hojeISO, mesDe } from "@/lib/datas";
import { formatarCentavos } from "@/lib/dinheiro";
import { disponivelParaGastar } from "@/lib/painel";

export const dynamic = "force-dynamic";

const cartao = "flex flex-col gap-3 rounded-card bg-cartao p-4 shadow-suave";
const linha = "flex items-baseline justify-between gap-3";

function Linha({ l }: { l: LancConferir & { contaNome: string | null; categoriaNome: string } }) {
  return (
    <span className="block min-w-0">
      <Link href={`/lancamentos/${l.id}/editar`} className="font-semibold underline">
        {l.descricao}
      </Link>
      <span className="block text-xs text-tinta-suave">
        {diaCurto(l.data)} · {formatarCentavos(l.valor)} · {l.categoriaNome}
        {l.contaNome ? ` · ${l.contaNome}` : " · sem banco"}
        {l.status === "a_pagar" ? " · a pagar" : ""}
      </span>
    </span>
  );
}

// Conferir (1.6.0): o que pode fazer os números não baterem. Mostra e deixa você decidir; nada some sozinho.
export default async function Conferir() {
  await gerarRecorrencias();
  const hoje = hojeISO();
  const mes = mesDe(hoje);
  const [{ lista, ignorados, primeiroSaldoInformado }, saldos, calc, emprestimos, compromissos, guardado] = await Promise.all([
    dadosDaConferencia(),
    saldosHoje(hoje),
    lancamentosParaCalculo(mes),
    listarEmprestimosParaCalculo(),
    compromissosDoMes(hoje, mes),
    guardadoNoMes(mes),
  ]);
  const porId = new Map(lista.map((l) => [l.id, l]));
  const comNomes = (l: LancConferir) => porId.get(l.id)!;

  const parecemPagas = contasQueParecemPagas(lista);
  const atrasadas = atrasadasSemPagamento(lista, hoje);
  const repetidos = possiveisRepetidos(lista, ignorados);
  const sem = semBanco(lista, primeiroSaldoInformado, hoje);
  const pontos = parecemPagas.length + atrasadas.length + repetidos.length + sem.length;

  // Por que o Disponível é diferente do banco: decompõe a diferença em pedaços que dá pra conferir
  const sobrou = resumoDoMes(calc, emprestimos, hoje).saldoReal;
  const faltaPagar = compromissos.reduce((s, c) => s + c.valor, 0);
  const disponivel = disponivelParaGastar(sobrou, guardado, faltaPagar);
  const noBanco = saldos.algumInformado ? saldos.total : null;
  const deAntes = noBanco !== null ? noBanco - sobrou : null;
  const bancos = saldos.linhas.filter((b) => !b.va);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link href="/mais" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-tinta-suave">
          <ArrowLeft size={16} aria-hidden /> Mais
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <SearchCheck size={24} aria-hidden /> Conferir
        </h1>
        <p className="text-sm text-tinta-suave">Caça o que pode estar fazendo os números não baterem. Nada é apagado sem você mandar.</p>
      </div>

      <p className={`rounded-card px-4 py-3 text-sm font-semibold shadow-suave ${pontos === 0 ? "bg-menta" : "bg-limao"}`}>
        {pontos === 0 ? "Nada suspeito por aqui." : `${pontos} ponto${pontos === 1 ? "" : "s"} pra conferir abaixo.`}
      </p>

      <section className={cartao}>
        <h2 className="font-bold">Por que o Disponível é diferente do que tem no banco?</h2>
        <p className={linha}>
          <span>Nas contas hoje (sem o VA)</span>
          <strong className="tabular-nums">{noBanco !== null ? formatarCentavos(noBanco) : "informe os saldos"}</strong>
        </p>
        <p className={linha}>
          <span>Disponível para gastar</span>
          <strong className="tabular-nums">{formatarCentavos(disponivel)}</strong>
        </p>
        {noBanco !== null && (
          <div className="flex flex-col gap-1 rounded-2xl bg-fundo p-3 text-sm">
            <p className="font-semibold">A diferença de {formatarCentavos(noBanco - disponivel)} vem de:</p>
            <p className={linha}>
              <span>Dinheiro que já estava no banco antes deste mês</span>
              <span className="tabular-nums">{formatarCentavos(deAntes!)}</span>
            </p>
            <p className={linha}>
              <span>O que ainda falta pagar este mês</span>
              <span className="tabular-nums">{formatarCentavos(faltaPagar)}</span>
            </p>
            {guardado !== 0 && (
              <p className={linha}>
                <span>Guardado nos objetivos este mês</span>
                <span className="tabular-nums">{formatarCentavos(guardado)}</span>
              </p>
            )}
            <p className="mt-1 text-xs text-tinta-suave">
              O Disponível olha só este mês e já tira o que falta pagar, por segurança. O banco mostra tudo que você tem. Se a linha
              &quot;antes deste mês&quot; parecer errada, confira os bancos abaixo.
            </p>
          </div>
        )}
      </section>

      {bancos.length > 0 && (
        <section className={cartao}>
          <h2 className="flex items-center gap-2 font-bold">
            <Landmark size={18} aria-hidden /> Bate com o banco?
          </h2>
          <p className="text-sm text-tinta-suave">Abra o app do banco e digite o saldo que ele mostra agora. A diferença aparece na hora.</p>
          {bancos.map((b) => (
            <BateComBanco key={b.id} banco={{ id: b.id, nome: b.nome, sigla: b.sigla, cor: b.cor, corTexto: b.corTexto, saldo: b.saldo }} />
          ))}
        </section>
      )}

      {atrasadas.length > 0 && (
        <section className={cartao}>
          <h2 className="flex items-center gap-2 font-bold">
            <Receipt size={18} aria-hidden /> Atrasadas sem pagamento achado
          </h2>
          <p className="text-sm text-tinta-suave">
            Não achei nenhum gasto com o mesmo valor perto do vencimento delas. Se pagou de outro jeito (dinheiro, outra conta), marque Paguei
            com a data certa em Pagamentos. Se ainda não pagou, está certo: elas descontam do Disponível.
          </p>
          <ul className="flex flex-col gap-2">
            {atrasadas.map((l) => (
              <li key={l.id} className="rounded-2xl bg-fundo p-3 text-sm">
                <Linha l={comNomes(l)} />
                <span className="text-xs text-tinta-suave">venceu {diaCurto(l.vencimento ?? l.data)}</span>
              </li>
            ))}
          </ul>
          <Link href="/pagamentos" className="min-h-11 font-semibold underline">
            Ir pra Pagamentos
          </Link>
        </section>
      )}

      {parecemPagas.length > 0 && (
        <section className={cartao}>
          <h2 className="flex items-center gap-2 font-bold">
            <CircleCheck size={18} aria-hidden /> Contas a pagar que parecem já pagas
          </h2>
          <p className="text-sm text-tinta-suave">
            Tem um gasto com o mesmo valor perto do vencimento. Se for o pagamento dela, junte os dois: a conta fica paga e o gasto solto sai
            (senão conta duas vezes).
          </p>
          <ul className="flex flex-col gap-3">
            {parecemPagas.map(({ pendente, pagamento }) => (
              <li key={pendente.id} className="flex flex-col gap-2 rounded-2xl bg-fundo p-3 text-sm">
                <Linha l={comNomes(pendente)} />
                <span className="text-xs text-tinta-suave">parece ter sido paga com:</span>
                <Linha l={comNomes(pagamento)} />
                <BotaoAcao acao={juntarPagamento} campos={{ pendenteId: pendente.id, pagamentoId: pagamento.id }} rotulo="É esse: marcar como paga" forte />
              </li>
            ))}
          </ul>
        </section>
      )}

      {repetidos.length > 0 && (
        <section className={cartao}>
          <h2 className="flex items-center gap-2 font-bold">
            <CopyX size={18} aria-hidden /> Possíveis repetidos
          </h2>
          <p className="text-sm text-tinta-suave">
            Mesmo valor, no mesmo dia ou com 1 dia de diferença. Pode ser de verdade (dois cafés iguais) ou lançado duas vezes. Quando os
            dois vêm de extrato, nem aparecem aqui (cada banco registrou o seu): só aparece quando pelo menos um foi lançado à mão.
          </p>
          <ul className="flex flex-col gap-3">
            {repetidos.map(({ a, b, chave }) => (
              <li key={chave} className="flex flex-col gap-2 rounded-2xl bg-fundo p-3 text-sm">
                <Linha l={comNomes(a)} />
                <Linha l={comNomes(b)} />
                <div className="grid grid-cols-2 gap-2">
                  <BotaoAcao acao={apagarRepetido} campos={{ id: a.id }} rotulo={`Apagar o 1º`} />
                  <BotaoAcao acao={apagarRepetido} campos={{ id: b.id }} rotulo={`Apagar o 2º`} />
                </div>
                <BotaoAcao acao={marcarCerto} campos={{ chave }} rotulo="Está certo, são dois" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {sem.length > 0 && (
        <section className={cartao}>
          <h2 className="flex items-center gap-2 font-bold">
            <Unlink size={18} aria-hidden /> Lançamentos sem banco
          </h2>
          <p className="text-sm text-tinta-suave">
            Depois que você informou os saldos, estes entraram sem banco, então ficam fora do &quot;Nas contas hoje&quot;. Toque e escolha o
            banco.
          </p>
          <ul className="flex flex-col gap-2">
            {sem.map((l) => (
              <li key={l.id} className="rounded-2xl bg-fundo p-3 text-sm">
                <Linha l={comNomes(l)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
