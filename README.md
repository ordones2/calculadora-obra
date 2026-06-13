# calculadora-obra

Calculadora de previsibilidade de custo de obras/reformas para arquitetos e seus clientes
de médio e alto padrão. O cliente responde um wizard simples e recebe uma **faixa de
investimento**, **orçamento**, **cronograma** e uma **proposta em PDF** com a marca do
arquiteto. O arquiteto configura todos os valores-base por um painel (`#/admin`), sem banco
de dados.

> Especificação completa em [`SPEC.md`](./SPEC.md).

## Stack

HTML + CSS + JavaScript puro (módulos ES). **Sem framework e sem build.** PDF via impressão
do navegador. Testes com o runner nativo do Node (`node --test`).

## Como rodar

Não há instalação nem build — só servir os arquivos estáticos (ES modules não funcionam por
`file://`):

```bash
npm run dev     # python3 -m http.server 5173  → http://localhost:5173
# ou: npx serve .  /  qualquer hospedagem estática (GitHub Pages, Netlify, ...)

npm test        # node --test (sem dependências)
```

## Estrutura

```
index.html · styles.css
data/config.default.json     # "tabela de preços" (seed versionado)
js/
├── app.js                   # roteamento (hash) + estado
├── engine.js                # motor de cálculo (puro, testado)
├── config.js                # seed + localStorage + export/import
├── format.js · dom.js · inputStore.js
└── views/  home.js  resultado.js  admin.js
tests/engine.test.js
```

## Como o arquiteto atualiza os valores

1. Abra `#/admin` e ajuste marca, padrões (R$/m²), BDI ou use o editor JSON avançado.
2. As alterações ficam salvas no navegador (`localStorage`).
3. Clique em **Exportar JSON** e substitua `data/config.default.json` no repositório para
   publicar a nova tabela oficial. **Restaurar padrão** volta ao seed.
