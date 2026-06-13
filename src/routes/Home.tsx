import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useConfig } from "../state/ConfigContext";
import type { AmbienteSelecionado, CalcInput } from "../types/calc";
import { saveInput } from "../lib/calc/inputStore";
import { formatBRL } from "../lib/format";

// Wizard do cliente. Fase 0: estimativa rápida funcional + detalhamento
// opcional por ambiente. Os passos 4 (itens detalhados) e a UI rica ficam
// para as próximas fases (ver SPEC.md).
export default function Home() {
  const { config } = useConfig();
  const navigate = useNavigate();

  const [areaTotal, setAreaTotal] = useState(80);
  const [padraoId, setPadraoId] = useState(config.padroes[1]?.id ?? "");
  const [tipoReformaId, setTipoReformaId] = useState(config.fatores.tipoReforma[1]?.id ?? "");
  const [complexidadeId, setComplexidadeId] = useState(config.fatores.complexidade[1]?.id ?? "");
  const [condicaoImovelId, setCondicaoImovelId] = useState(config.fatores.condicaoImovel[1]?.id ?? "");
  const [regiaoId, setRegiaoId] = useState(config.fatores.regiao[0]?.id ?? "");
  const [ambientes, setAmbientes] = useState<AmbienteSelecionado[]>([]);

  function toggleAmbiente(id: string) {
    setAmbientes((prev) =>
      prev.some((a) => a.ambienteId === id)
        ? prev.filter((a) => a.ambienteId !== id)
        : [...prev, { ambienteId: id, area: 10 }]
    );
  }

  function setAreaAmbiente(id: string, area: number) {
    setAmbientes((prev) => prev.map((a) => (a.ambienteId === id ? { ...a, area } : a)));
  }

  function calcular() {
    const input: CalcInput = {
      areaTotal,
      padraoId,
      tipoReformaId,
      complexidadeId,
      condicaoImovelId,
      regiaoId,
      ambientes: ambientes.length ? ambientes : undefined,
    };
    saveInput(input);
    navigate("/resultado");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-marca">Quanto vai custar sua reforma?</h1>
        <p className="text-stone-500 mt-1">
          Responda algumas perguntas e receba uma faixa de investimento, orçamento e cronograma.
        </p>
      </div>

      {/* Passo 1: Projeto */}
      <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <h2 className="font-medium">1. Sobre o projeto</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Campo label="Área total (m²)">
            <input
              type="number"
              min={1}
              value={areaTotal}
              onChange={(e) => setAreaTotal(Number(e.target.value))}
              className="input"
            />
          </Campo>
          <Select label="Tipo de reforma" value={tipoReformaId} onChange={setTipoReformaId} options={config.fatores.tipoReforma} />
          <Select label="Complexidade" value={complexidadeId} onChange={setComplexidadeId} options={config.fatores.complexidade} />
          <Select label="Condição do imóvel" value={condicaoImovelId} onChange={setCondicaoImovelId} options={config.fatores.condicaoImovel} />
          <Select label="Região" value={regiaoId} onChange={setRegiaoId} options={config.fatores.regiao} />
        </div>
      </section>

      {/* Passo 2: Padrão */}
      <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <h2 className="font-medium">2. Padrão de acabamento</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {config.padroes.map((p) => (
            <button
              key={p.id}
              onClick={() => setPadraoId(p.id)}
              className={`text-left rounded-lg border p-4 transition ${
                padraoId === p.id
                  ? "border-marca-accent ring-2 ring-marca-accent/30 bg-marca-accent/5"
                  : "border-stone-200 hover:border-stone-300"
              }`}
            >
              <div className="font-medium">{p.nome}</div>
              <div className="text-marca-accent text-sm mt-1">{formatBRL(p.valorM2)}/m²</div>
              {p.descricao && <p className="text-xs text-stone-500 mt-2">{p.descricao}</p>}
            </button>
          ))}
        </div>
      </section>

      {/* Passo 3: Ambientes (opcional) */}
      <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <h2 className="font-medium">
          3. Ambientes <span className="text-stone-400 text-sm font-normal">(opcional — melhora a precisão)</span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {config.ambientes.map((a) => {
            const sel = ambientes.find((x) => x.ambienteId === a.id);
            return (
              <div
                key={a.id}
                className={`rounded-lg border p-3 ${sel ? "border-marca-accent bg-marca-accent/5" : "border-stone-200"}`}
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!sel} onChange={() => toggleAmbiente(a.id)} />
                  <span className="font-medium text-sm">{a.nome}</span>
                </label>
                {sel && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="text-stone-500">Área</span>
                    <input
                      type="number"
                      min={1}
                      value={sel.area}
                      onChange={(e) => setAreaAmbiente(a.id, Number(e.target.value))}
                      className="input w-20"
                    />
                    <span className="text-stone-500">m²</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={calcular} className="btn-primary">
          Calcular estimativa
        </button>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-stone-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; nome: string }[];
}) {
  return (
    <Campo label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nome}
          </option>
        ))}
      </select>
    </Campo>
  );
}
