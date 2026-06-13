import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Config } from "../types/config";
import type { CalcInput, CalcResult } from "../types/calc";
import { formatBRL, formatFaixa } from "../lib/format";

// Proposta em PDF com a marca do arquiteto. Layout inicial (Fase 0/1);
// evolui nas próximas fases (logo, cores dinâmicas, capa).
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, color: "#292524", fontFamily: "Helvetica" },
  header: { marginBottom: 20, borderBottom: 1, borderColor: "#e7e5e4", paddingBottom: 12 },
  marca: { fontSize: 16, fontWeight: 700, color: "#b08d57" },
  contato: { fontSize: 9, color: "#78716c", marginTop: 2 },
  h1: { fontSize: 14, marginBottom: 8, marginTop: 16 },
  faixaBox: { backgroundColor: "#faf8f5", padding: 16, marginTop: 8, borderRadius: 4 },
  faixa: { fontSize: 18, color: "#b08d57", fontWeight: 700 },
  small: { fontSize: 9, color: "#78716c", marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  total: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderTop: 1, borderColor: "#e7e5e4", marginTop: 6, fontWeight: 700 },
  rodape: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#a8a29e", borderTop: 1, borderColor: "#e7e5e4", paddingTop: 8 },
});

export function PropostaPDF({
  config,
  result,
  input,
}: {
  config: Config;
  result: CalcResult;
  input: CalcInput;
}) {
  const linhas = result.nivel === "porAmbiente" ? result.porAmbiente : result.porCategoria;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.marca}>{config.marca.nome || "Proposta de Reforma"}</Text>
          <Text style={styles.contato}>
            {config.marca.contato.email} · {config.marca.contato.telefone}
          </Text>
        </View>

        <Text style={styles.h1}>Estimativa de investimento</Text>
        <View style={styles.faixaBox}>
          <Text style={styles.faixa}>{formatFaixa(result.faixa.min, result.faixa.max)}</Text>
          <Text style={styles.small}>
            Área {input.areaTotal} m² · valor central {formatBRL(result.total)} · prazo aprox.{" "}
            {result.cronograma.prazoDias} dias
          </Text>
        </View>

        <Text style={styles.h1}>
          {result.nivel === "porAmbiente" ? "Por ambiente" : "Por categoria"}
        </Text>
        {linhas.map((l, i) => (
          <View style={styles.row} key={i}>
            <Text>{l.rotulo}{l.detalhe ? ` (${l.detalhe})` : ""}</Text>
            <Text>{formatBRL(l.valor)}</Text>
          </View>
        ))}
        <View style={styles.row}>
          <Text>Custo direto</Text>
          <Text>{formatBRL(result.subtotalDireto)}</Text>
        </View>
        <View style={styles.row}>
          <Text>BDI ({config.bdi.percentual}%)</Text>
          <Text>{formatBRL(result.bdiValor)}</Text>
        </View>
        <View style={styles.total}>
          <Text>Total estimado</Text>
          <Text>{formatBRL(result.total)}</Text>
        </View>

        <Text style={styles.h1}>Cronograma</Text>
        {result.cronograma.fases.map((f, i) => (
          <View style={styles.row} key={i}>
            <Text>{f.nome} (dias {f.inicioDia}–{f.fimDia})</Text>
            <Text>{formatBRL(f.custo)}</Text>
          </View>
        ))}

        <Text style={styles.rodape}>
          Estimativa orientativa baseada em valores médios de mercado (tabela{" "}
          {config.meta.versaoTabela}). Não substitui orçamento executivo. Valores podem variar
          conforme escopo e especificações.
        </Text>
      </Page>
    </Document>
  );
}
