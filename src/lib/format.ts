export function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function formatFaixa(min: number, max: number): string {
  return `${formatBRL(min)} – ${formatBRL(max)}`;
}
