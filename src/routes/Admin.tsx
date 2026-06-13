import { useRef, useState } from "react";
import { useConfig } from "../state/ConfigContext";
import { exportConfig, importConfig } from "../lib/config/store";
import type { Config } from "../types/config";
import { formatBRL } from "../lib/format";

// Painel do arquiteto (CMS) — sem banco. Edita a "tabela de preços" ativa
// (persistida em localStorage) e permite exportar/importar/restaurar.
// Fase 0: edição estruturada de marca, padrões e BDI + editor JSON avançado
// para os demais campos (ambientes, serviços, fatores, cronograma).
export default function Admin() {
  const { config, updateConfig, restoreDefault } = useConfig();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function patch(next: Partial<Config>) {
    updateConfig({ ...config, ...next });
  }

  async function onImport(file: File) {
    try {
      const next = await importConfig(file);
      updateConfig(next);
      setMsg("Configuração importada com sucesso.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao importar.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-marca">Painel de configuração</h1>
          <p className="text-stone-500 text-sm mt-1">
            Ajuste os valores-base usados na calculadora. As alterações ficam salvas neste
            navegador. Exporte o JSON para publicar como nova tabela oficial.
          </p>
        </div>
      </div>

      {msg && (
        <div className="rounded-md bg-marca-accent/10 text-marca-accent text-sm px-4 py-2">{msg}</div>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => exportConfig(config)} className="btn-primary">
          Exportar JSON
        </button>
        <button onClick={() => fileRef.current?.click()} className="btn-secondary">
          Importar JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
        />
        <button
          onClick={() => {
            restoreDefault();
            setMsg("Tabela restaurada para o padrão.");
          }}
          className="btn-secondary"
        >
          Restaurar padrão
        </button>
      </div>

      {/* Marca */}
      <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <h2 className="font-medium">Marca (usada na proposta em PDF)</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Field label="Nome do escritório" value={config.marca.nome} onChange={(v) => patch({ marca: { ...config.marca, nome: v } })} />
          <Field label="E-mail" value={config.marca.contato.email} onChange={(v) => patch({ marca: { ...config.marca, contato: { ...config.marca.contato, email: v } } })} />
          <Field label="Telefone" value={config.marca.contato.telefone} onChange={(v) => patch({ marca: { ...config.marca, contato: { ...config.marca.contato, telefone: v } } })} />
          <Field label="WhatsApp (só dígitos)" value={config.marca.contato.whatsapp} onChange={(v) => patch({ marca: { ...config.marca, contato: { ...config.marca.contato, whatsapp: v } } })} />
        </div>
      </section>

      {/* Padrões */}
      <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <h2 className="font-medium">Padrões de acabamento (R$/m²)</h2>
        <div className="space-y-2">
          {config.padroes.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 text-sm">
              <span className="w-32 font-medium">{p.nome}</span>
              <input
                type="number"
                value={p.valorM2}
                onChange={(e) => {
                  const padroes = [...config.padroes];
                  padroes[i] = { ...p, valorM2: Number(e.target.value) };
                  patch({ padroes });
                }}
                className="input w-40"
              />
              <span className="text-stone-400">{formatBRL(p.valorM2)}/m²</span>
            </div>
          ))}
        </div>
      </section>

      {/* BDI */}
      <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <h2 className="font-medium">BDI / margem (%)</h2>
        <input
          type="number"
          value={config.bdi.percentual}
          onChange={(e) => patch({ bdi: { ...config.bdi, percentual: Number(e.target.value) } })}
          className="input w-40"
        />
      </section>

      {/* Editor JSON avançado */}
      <details className="bg-white rounded-xl border border-stone-200 p-6">
        <summary className="font-medium cursor-pointer">
          Editor avançado (JSON completo: ambientes, serviços, fatores, cronograma)
        </summary>
        <JsonEditor config={config} onSave={(c) => { updateConfig(c); setMsg("JSON aplicado."); }} onError={setMsg} />
      </details>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-stone-600 mb-1">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="input" />
    </label>
  );
}

function JsonEditor({
  config,
  onSave,
  onError,
}: {
  config: Config;
  onSave: (c: Config) => void;
  onError: (m: string) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(config, null, 2));
  return (
    <div className="mt-4 space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="input font-mono text-xs h-80"
        spellCheck={false}
      />
      <button
        className="btn-primary"
        onClick={() => {
          try {
            onSave(JSON.parse(text) as Config);
          } catch {
            onError("JSON inválido.");
          }
        }}
      >
        Aplicar JSON
      </button>
    </div>
  );
}
