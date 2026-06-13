// Formatação de moeda (BRL).

export function formatBRL(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function formatFaixa(min, max) {
  return `${formatBRL(min)} – ${formatBRL(max)}`;
}
