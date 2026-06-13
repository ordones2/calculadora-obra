import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useConfig } from "../state/ConfigContext";
import { loadInput } from "../lib/calc/inputStore";
import { calcular } from "../lib/calc/engine";
import { formatBRL, formatFaixa } from "../lib/format";
import { PropostaPDF } from "../pdf/Proposta";

const NIVEL_LABEL: Record<string, string> = {
  estimativaRapida: "Estimativa rápida (por m²)",
  porAmbiente: "Detalhada por ambiente",
  detalhado: "Detalhada por itens",
};

export default function Resultado() {
  const { config } = useConfig();
  const input = useMemo(() => loadInput(), []);
  const result = useMemo(() => (input ? calcular(config, input) : null), [config, input]);

  if (!input || !result) {
    return (
      <div className="text-center space-y-4 py-12">
        <p className="text-stone-500">Nenhuma simulação encontrada.</p>
        <Link to="/" className="btn-primary inline-block">
          Fazer uma simulação
        </Link>
      </div>
    );
  }

  const linhas = result.nivel === "porAmbiente" ? result.porAmbiente : result.porCategoria;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-marca">Sua estimativa</h1>
        <Link to="/" className="btn-secondary">
          ← Refazer
        </Link>
      </div>

      {/* Faixa de valor em destaque */}
      <section className="bg-white rounded-xl border border-stone-200 p-6 text-center">
        <p className="text-sm text-stone-500">Faixa estimada de investimento</p>
        <p className="text-3xl font-semibold text-marca-accent mt-2">
          {formatFaixa(result.faixa.min, result.faixa.max)}
        </p>
        <p className="text-xs text-stone-400 mt-2">
          {NIVEL_LABEL[result.nivel]} · valor central {formatBRL(result.total)} · prazo aprox.{" "}
          {result.cronograma.prazoDias} dias
        </p>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Orçamento */}
        <section className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="font-medium mb-4">
            {result.nivel === "porAmbiente" ? "Por ambiente" : "Por categoria"}
          </h2>
          <ul className="divide-y divide-stone-100">
            {linhas.map((l, i) => (
              <li key={i} className="flex justify-between py-2 text-sm">
                <span>
                  {l.rotulo}
                  {l.detalhe && <span className="text-stone-400"> · {l.detalhe}</span>}
                </span>
                <span className="font-medium">{formatBRL(l.valor)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-stone-200 mt-3 pt-3 text-sm space-y-1">
            <Row label="Custo direto" valor={result.subtotalDireto} />
            <Row label={`BDI (${config.bdi.percentual}%)`} valor={result.bdiValor} />
            <Row label="Total estimado" valor={result.total} bold />
          </div>
        </section>

        {/* Cronograma + desembolso */}
        <section className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="font-medium mb-4">Cronograma e desembolso</h2>
          <ul className="space-y-2 text-sm">
            {result.cronograma.fases.map((f, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {f.nome}
                  <span className="text-stone-400"> · dias {f.inicioDia}–{f.fimDia}</span>
                </span>
                <span className="font-medium">{formatBRL(f.custo)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex flex-wrap gap-3 justify-end">
        <PDFDownloadLink
          document={<PropostaPDF config={config} result={result} input={input} />}
          fileName="proposta-reforma.pdf"
          className="btn-primary"
        >
          {({ loading }) => (loading ? "Gerando PDF..." : "Baixar proposta (PDF)")}
        </PDFDownloadLink>
        {config.marca.contato.whatsapp && (
          <a
            href={`https://wa.me/${config.marca.contato.whatsapp}?text=${encodeURIComponent(
              "Olá! Fiz uma simulação de reforma e gostaria de conversar."
            )}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
          >
            Falar com o arquiteto
          </a>
        )}
      </div>

      <p className="text-xs text-stone-400">
        Estimativa orientativa baseada em valores médios de mercado. O orçamento executivo final
        pode variar conforme escopo, especificações e condições da obra.
      </p>
    </div>
  );
}

function Row({ label, valor, bold }: { label: string; valor: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold text-marca" : "text-stone-600"}`}>
      <span>{label}</span>
      <span>{formatBRL(valor)}</span>
    </div>
  );
}
