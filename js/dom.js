// Helpers mínimos para as views (sem framework).

/** Escapa texto para interpolar com segurança em HTML. */
export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Atalho para querySelector dentro de um root. */
export function qs(root, sel) {
  return root.querySelector(sel);
}

/** Atalho para querySelectorAll (como array). */
export function qsa(root, sel) {
  return [...root.querySelectorAll(sel)];
}
