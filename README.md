# calculadora-obra

Calculadora de previsibilidade de custo de obras/reformas para arquitetos e seus clientes
de médio e alto padrão. O cliente responde um wizard simples e recebe uma **faixa de
investimento**, **orçamento**, **cronograma** e uma **proposta em PDF** com a marca do
arquiteto. O arquiteto configura todos os valores-base por um painel (`/admin`), sem banco
de dados.

> Especificação completa em [`SPEC.md`](./SPEC.md).

## Stack

React + Vite + TypeScript + Tailwind · PDF via `@react-pdf/renderer` · app 100% estático.

## Como rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes do motor de cálculo (Vitest)
npm run build      # build estático em dist/
```

## Estrutura

```
src/
├── data/config.default.json   # "tabela de preços" (seed versionado)
├── types/                     # tipos da Config e do cálculo
├── lib/
│   ├── calc/engine.ts         # motor de cálculo (puro, testado)
│   └── config/store.ts        # seed + localStorage + export/import
├── state/ConfigContext.tsx    # config ativa
├── routes/                    # Home (wizard), Resultado, Admin (CMS)
└── pdf/Proposta.tsx           # proposta em PDF
```

## Como o arquiteto atualiza os valores

1. Abra `/admin` e ajuste marca, padrões (R$/m²), BDI ou use o editor JSON avançado.
2. As alterações ficam salvas no navegador (`localStorage`).
3. Clique em **Exportar JSON** e substitua `src/data/config.default.json` no repositório
   para publicar a nova tabela oficial. **Restaurar padrão** volta ao seed.
