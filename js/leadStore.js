// Armazena o lead capturado no funil. Por ora é apenas UI + armazenamento local
// (sessionStorage). A ENTREGA real do lead (WhatsApp pré-preenchido, endpoint
// no-code/Formspree ou CRM) está fora de escopo nesta fase — ver Fase 4 no SPEC.

const KEY = "calculadora-obra:lead";

export function saveLead(lead) {
  sessionStorage.setItem(KEY, JSON.stringify(lead));
}

export function loadLead() {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
