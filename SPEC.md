# Calculadora de Obras — Especificação de Desenvolvimento

> Calculadora de previsibilidade de custo de obras/reformas para arquitetos e seus
> clientes de médio e alto padrão.

## 1. Contexto e problema

Arquitetos que projetam reformas para clientes de médio/alto padrão enfrentam uma dor
recorrente: **o cliente consegue pagar o projeto, mas não tem ideia de quanto custará a
obra final**. Isso gera ansiedade, desalinhamento de expectativas e, muitas vezes, a
desistência do projeto.

Esta calculadora dá **previsibilidade**: a partir de poucas informações, o cliente recebe
uma faixa de investimento, um orçamento estruturado, um cronograma com curva de desembolso
e uma proposta em PDF com a marca do arquiteto.

## 2. Personas e papéis

| Persona | Papel | Como usa |
|---|---|---|
| **Cliente final** | Consumidor da estimativa | Responde um wizard simples e recebe faixa de valor, orçamento, cronograma e PDF. |
| **Arquiteto (admin)** | Curador dos valores-base | Configura a "tabela de preços" (padrões, ambientes, serviços, fatores, BDI, cronograma) e a sua marca, via painel `/admin`. |

## 3. Princípios de produto

- **Previsibilidade honesta**: sempre comunicar um intervalo (min–max), nunca um número
  cravado. A incerteza diminui conforme o cliente detalha mais.
- **Progressive disclosure**: estimativa rápida em 30s; detalhamento opcional para quem
  quer mais precisão.
- **Arquiteto no controle**: todos os valores são parametrizáveis sem mexer no código.
- **Sem fricção de infra**: app estático, sem banco de dados nesta fase.

## 4. Método de cálculo (híbrido, 3 níveis)

O nível efetivo é **o mais detalhado que o cliente preencheu**:

1. **Estimativa rápida** — `área total × R$/m² do padrão × fatores globais`.
2. **Por ambiente** — soma de `área do ambiente × R$/m² do ambiente (por padrão) × fatores`.
3. **Detalhado (itens)** — soma de `quantidade × preço unitário do serviço (por padrão) × fatores`,
   agrupada por categoria.

Sobre o custo direto aplica-se o **BDI** (custos indiretos + margem + impostos). A **faixa
min–max** vem da tabela de incerteza, mais estreita quanto mais detalhado o nível.

**Fatores globais** (multiplicadores): tipo de reforma, complexidade, condição do imóvel,
região.

> Implementação de referência: `js/engine.js` (função pura `calcular`), testada em
> `tests/engine.test.js`.

## 5. Entregáveis ao cliente

- **Faixa de valor (min–max)** em destaque.
- **Orçamento detalhado** por categoria (nível detalhado) ou por ambiente.
- **Cronograma / fases** com prazo estimado e **curva de desembolso** acumulada.
- **Proposta em PDF** com a marca do arquiteto (impressão do navegador + `@media print`).
- **Contato/lead**: link de WhatsApp (sem backend nesta fase).

## 6. Arquitetura

- **Stack**: HTML + CSS + JavaScript puro (módulos ES). **Sem framework e sem build** —
  basta servir os arquivos estáticos (deploy em GitHub Pages/Netlify/qualquer hospedagem).
- **Sem banco de dados**:
  - Seed oficial em `data/config.default.json` (versionado no git) — é a tabela publicada,
    carregada via `fetch` (`js/config.js`).
  - Edições do arquiteto persistem em `localStorage`.
  - **Exportar/Importar JSON** + **Restaurar padrão** = fluxo de "publish" (commitar o seed).
- **Roteamento**: hash routing em `js/app.js` (`#/`, `#/resultado`, `#/admin`).
- **Estado**: config ativa mantida em `js/app.js`; entrada do wizard em `sessionStorage`
  (`js/inputStore.js`).
- **PDF**: gerado pela impressão do navegador (`window.print()`) com folha de estilo de
  impressão (`@media print` em `styles.css`) — zero dependências.

### Estrutura de arquivos

```
index.html · styles.css
data/config.default.json        # "tabela de preços" (seed)
js/
├── app.js                      # roteamento + estado
├── engine.js                   # motor de cálculo (puro, testado)
├── config.js                   # seed + localStorage + export/import
├── format.js · dom.js · inputStore.js
└── views/  home.js  resultado.js  admin.js
tests/engine.test.js            # node:test (sem dependências)
```

### Modelo de dados (config)

Estrutura do `data/config.default.json`: `meta`, `marca`, `padroes[]`, `fatores`
(tipoReforma/complexidade/condicaoImovel/regiao), `ambientes[]`, `servicos[]`, `bdi`,
`incerteza` (por nível), `cronograma` (produtividade + fases com pesos de custo/prazo).
O motor recebe esse objeto + o input do wizard e devolve o resultado.

## 7. Telas

### Cliente — wizard (`/`)
1. **Projeto**: tipo de imóvel/área total, tipo de reforma, complexidade, condição, região.
2. **Padrão de acabamento**: cards econômico/médio/alto/luxo.
3. **Ambientes** (opcional): seleção + área por ambiente.
4. **Itens detalhados** (opcional/avançado — *fase futura na UI*).
5. **Prévia ao vivo**: faixa estimada atualizada conforme o cliente preenche.
6. **Resultado** (`/resultado`): faixa, orçamento, cronograma, PDF e contato.

### Admin / CMS (`/admin`)
- Edição de **marca**, **padrões (R$/m²)**, **BDI**.
- **Editor JSON avançado** para ambientes, serviços, fatores e cronograma.
- **Exportar / Importar / Restaurar** a tabela.
- *Sem autenticação nesta fase* (rota não divulgada). Auth simples fica para fase futura.

## 8. Roadmap por fases

- **Fase 0 — Esqueleto (entregue)**: estrutura HTML/CSS/JS, seed, motor de cálculo + testes,
  store de config (seed + localStorage + export/import), wizard funcional (estimativa rápida +
  por ambiente), resultado, PDF via impressão, admin (marca/padrões/BDI + editor JSON).
- **Fase 1 — MVP (entregue)**: validações no wizard, prévia da estimativa ao vivo, tema com a
  cor da marca, logo e cor no PDF (impressão).
- **Fase 2**: edição estruturada de ambientes e serviços no admin (sem JSON cru).
- **Fase 3**: nível "itens detalhados" na UI do cliente + sugestão de quantidades por
  ambiente; gráfico da curva de desembolso.
- **Fase 4**: captura de lead com backend/CRM, autenticação do admin, multiusuário e/ou CMS
  externo (headless), histórico de simulações.

## 9. Como rodar e verificar

Não há instalação nem build. Sirva os arquivos com qualquer servidor estático
(ES modules não funcionam via `file://`):

```bash
npm run dev        # python3 -m http.server 5173  → http://localhost:5173
# ou: npx serve .  /  qualquer hospedagem estática
npm test           # node --test (test runner nativo, sem dependências)
```

Checklist de verificação:
1. Wizard calcula e leva a `#/resultado` com faixa, orçamento e cronograma.
2. Em `#/admin`, alterar o R$/m² de um padrão e refazer a simulação muda o resultado.
3. **Exportar JSON** baixa o arquivo; **Restaurar padrão** volta ao seed.
4. "Baixar proposta (PDF)" abre a impressão do navegador → Salvar como PDF.
5. `npm test` conclui sem erros.

## 10. Limitações conhecidas (nesta fase)

- Valores do seed são exemplos de mercado — devem ser calibrados pelo arquiteto.
- Sem persistência server-side: a config vive no navegador (+ export/import).
- Lead via WhatsApp/mailto; sem integração com CRM ainda.
- Admin sem autenticação.
