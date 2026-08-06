# Folha de Remuneração INSS (TCO — Normal) — Guia Frontend

Integração do relatório oficial **Folha de Remuneração - TCO - Normal** do **Instituto Nacional de Segurança Social (INSS)** no módulo de Relatórios do PeopleCore.

---

## 1. Objetivo

Permitir ao utilizador:

1. Seleccionar **mês** e **ano** (competência)
2. **Pré-visualizar** a folha (cabeçalho + tabela + rodapé)
3. Editar **multa por atraso**, **nº da guia** e eventos pontuais
4. **Exportar PDF** (paisagem) e **Excel** com layout alinhado ao formulário INSS

> Os dados mensais vêm da **folha de pagamento processada** da empresa (itens por funcionário). Sem folha, a lista de funcionários activos aparece com valores a `0`.

---

## 2. Layout (referência visual)

### Cabeçalho (imagem 1)

```
[Logo INSS]  Folha de Remuneração - TCO - Normal          Página: 1/1
             Instituto Nacional de Segurança Social      Data e Hora de Emissão: …
─────────────────────────────────────────────────────────────────────
Competência: 01/MM/AAAA     Contribuinte: {inss_empresa | nif | nome}
```

### Colunas da tabela

| Coluna | Campo API | Origem |
|--------|-----------|--------|
| Nº Beneficiário | `numero_beneficiario` | `funcionario.inss` |
| Nome do Beneficiário | `nome_beneficiario` | `funcionario.nome` |
| Dias | `dias` | `item.dias_inss` / `dias_elegiveis` |
| Data de Nasc. | `data_nascimento` | `funcionario.data_nascimento` |
| Remuneração | `remuneracao` | `item.salario_base` |
| Subsídios | `subsidios` | soma benefícios + allowances + HE + noturno |
| Comissão | `comissao` | `item.bonus_total` |
| Total | `total` | remuneração + subsídios + comissão |
| Evento | `evento` | Admissão/Saída no mês (ou vazio) |
| Data Evento | `data_evento` | data do evento |

### Rodapé — `justify-between` (imagens 2 e 3)

```
┌─────────────────────────────┐          ┌─────────────────────────────┐
│ Quantidade de Beneficiários │          │ Valor do INSS :             │
│ Valor Total da Remuneração  │   ...    │ Multa por Atraso :          │
│ Valor do Contribuinte       │          │ Total á Pagar :             │
│ Valor do Beneficiário       │          │ Guia de Contribuição Número │
└─────────────────────────────┘          └─────────────────────────────┘
         (esquerda)                                (direita)
```

| Esquerda | API | Cálculo |
|----------|-----|---------|
| Quantidade de Beneficiários | `resumo_esquerda.quantidade_beneficiarios` | Nº de linhas |
| Valor Total da Remuneração | `resumo_esquerda.valor_total_remuneracao` | Σ `total` |
| Valor do Contribuinte | `resumo_esquerda.valor_contribuinte` | Σ INSS empregador (4%) |
| Valor do Beneficiário | `resumo_esquerda.valor_beneficiario` | Σ INSS trabalhador (3%) |

| Direita | API | Cálculo |
|---------|-----|---------|
| Valor do INSS | `resumo_direita.valor_inss` | contribuinte + beneficiário |
| Multa por Atraso | `resumo_direita.multa_atraso` | editável (default 0) |
| Total á Pagar | `resumo_direita.total_a_pagar` | valor_inss + multa |
| Guia de Contribuição Número | `resumo_direita.guia_contribuicao_numero` | editável |

---

## 3. Endpoints

Base: `/api/v1/reports`  
Auth: `Bearer {token}`

| Método | Rota | Uso |
|--------|------|-----|
| `GET` | `/inss-folha-remuneracao?mes=&ano=` | Preview JSON |
| `POST` | `/inss-folha-remuneracao/preview` | Preview com `personalizacao` |
| `GET` | `/inss-folha-remuneracao/pdf?mes=&ano=` | Download PDF |
| `POST` | `/inss-folha-remuneracao/pdf` | PDF com personalização |
| `GET` | `/inss-folha-remuneracao/excel?mes=&ano=` | Download Excel |
| `POST` | `/inss-folha-remuneracao/excel` | Excel com personalização |

**Query / body comuns**

```json
{
  "ano": 2026,
  "mes": 5,
  "empresa_id": "...",
  "personalizacao": {
    "multa_atraso": 0,
    "guia_contribuicao_numero": "123456789",
    "contribuinte": "400123456",
    "linhas": [
      {
        "funcionario_id": "...",
        "evento": "Admissão",
        "data_evento": "01/05/2026",
        "dias": 30
      }
    ]
  }
}
```

- `mes`: número `1–12` ou nome (`"Maio"`)
- `ano`: obrigatório recomendado (default: ano actual)
- Super-admin sem empresa: enviar `empresa_id`

---

## 4. Exemplo de resposta (preview)

```json
{
  "status": "success",
  "data": {
    "tipo": "inss_folha_remuneracao_tco",
    "titulo": "Folha de Remuneração - TCO - Normal",
    "instituicao": "Instituto Nacional de Segurança Social",
    "cabecalho": {
      "competencia": "01/05/2026",
      "contribuinte": "400123456",
      "contribuinte_nome": "Empresa Lda",
      "mes": "Maio",
      "mes_numero": 5,
      "ano": 2026,
      "data_hora_emissao": "30/07/2026 20:40:00",
      "pagina": { "actual": 1, "total": 1 }
    },
    "folha_id": "...",
    "folha_status": "Processado",
    "linhas": [
      {
        "funcionario_id": "...",
        "numero_beneficiario": "123456789",
        "nome_beneficiario": "Maria Silva",
        "dias": 30,
        "data_nascimento": "12/03/1990",
        "remuneracao": 25000,
        "subsidios": 3500,
        "comissao": 0,
        "total": 28500,
        "evento": "",
        "data_evento": "",
        "inss_trabalhador": 750,
        "inss_empregador": 1000
      }
    ],
    "resumo_esquerda": {
      "quantidade_beneficiarios": 1,
      "valor_total_remuneracao": 28500,
      "valor_contribuinte": 1000,
      "valor_beneficiario": 750
    },
    "resumo_direita": {
      "valor_inss": 1750,
      "multa_atraso": 0,
      "total_a_pagar": 1750,
      "guia_contribuicao_numero": ""
    },
    "campos_editaveis": [
      "resumo_direita.multa_atraso",
      "resumo_direita.guia_contribuicao_numero",
      "cabecalho.contribuinte",
      "linhas[].evento",
      "linhas[].data_evento",
      "linhas[].dias"
    ]
  }
}
```

---

## 5. UI recomendada no módulo Relatórios

### Rota frontend

`/relatorios/inss-folha-remuneracao`

### Ecrã

1. **Filtros:** Ano (obrigatório) + Mês (obrigatório)
2. **Pré-visualização** ao carregar / ao mudar filtros (`GET` preview)
3. **Cabeçalho** read-only (logo INSS + título + competência + contribuinte editável)
4. **Tabela** com as 10 colunas (scroll horizontal em mobile)
5. **Rodapé** em grelha `justify-between` / `flex justify-between`:
   - coluna esquerda: 4 labels do resumo de beneficiários
   - coluna direita: valor INSS, multa (input), total a pagar, guia (input)
6. Botões **Exportar PDF** e **Exportar Excel** (`POST` com `personalizacao`)

### Exemplo React (layout rodapé)

```tsx
<footer className="mt-6 flex flex-col gap-6 border-t pt-4 md:flex-row md:justify-between">
  <dl className="space-y-1 text-sm">
    <div className="flex justify-between gap-8">
      <dt>Quantidade de Beneficiários :</dt>
      <dd className="font-semibold">{resumo.quantidade_beneficiarios}</dd>
    </div>
    <div className="flex justify-between gap-8">
      <dt>Valor Total da Remuneração :</dt>
      <dd className="font-semibold">{money(resumo.valor_total_remuneracao)}</dd>
    </div>
    <div className="flex justify-between gap-8">
      <dt>Valor do Contribuinte :</dt>
      <dd className="font-semibold">{money(resumo.valor_contribuinte)}</dd>
    </div>
    <div className="flex justify-between gap-8">
      <dt>Valor do Beneficiário :</dt>
      <dd className="font-semibold">{money(resumo.valor_beneficiario)}</dd>
    </div>
  </dl>

  <dl className="space-y-1 text-sm md:min-w-[280px]">
    <div className="flex justify-between gap-8">
      <dt>Valor do INSS :</dt>
      <dd className="font-semibold">{money(direita.valor_inss)}</dd>
    </div>
    <div className="flex justify-between gap-8">
      <dt>Multa por Atraso :</dt>
      <dd>
        <input
          type="number"
          value={multa}
          onChange={(e) => setMulta(Number(e.target.value))}
          className="w-28 border-b text-right font-semibold"
        />
      </dd>
    </div>
    <div className="flex justify-between gap-8">
      <dt>Total á Pagar :</dt>
      <dd className="font-semibold">{money(direita.valor_inss + multa)}</dd>
    </div>
    <div>
      <dt>Guia de Contribuição Número</dt>
      <dd>
        <input
          value={guia}
          onChange={(e) => setGuia(e.target.value)}
          className="mt-1 w-full border-b font-semibold"
        />
      </dd>
    </div>
  </dl>
</footer>
```

### Download blob

```ts
async function exportInss(
  formato: 'pdf' | 'excel',
  payload: { ano: number; mes: number; personalizacao: object },
) {
  const res = await fetch(`/api/v1/reports/inss-folha-remuneracao/${formato}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    formato === 'pdf'
      ? `inss-folha-remuneracao-${payload.mes}-${payload.ano}.pdf`
      : `inss-folha-remuneracao-${payload.mes}-${payload.ano}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## 6. Tipos TypeScript

```typescript
export interface InssFolhaLinha {
  funcionario_id: string;
  numero_beneficiario: string;
  nome_beneficiario: string;
  dias: number;
  data_nascimento: string;
  remuneracao: number;
  subsidios: number;
  comissao: number;
  total: number;
  evento: string;
  data_evento: string;
  inss_trabalhador: number;
  inss_empregador: number;
}

export interface InssFolhaRemuneracao {
  tipo: 'inss_folha_remuneracao_tco';
  titulo: string;
  instituicao: string;
  cabecalho: {
    competencia: string;
    contribuinte: string;
    contribuinte_nome: string;
    mes: string;
    mes_numero: number;
    ano: number;
    data_hora_emissao: string;
    pagina: { actual: number; total: number };
  };
  folha_id: string | null;
  folha_status: string | null;
  linhas: InssFolhaLinha[];
  resumo_esquerda: {
    quantidade_beneficiarios: number;
    valor_total_remuneracao: number;
    valor_contribuinte: number;
    valor_beneficiario: number;
  };
  resumo_direita: {
    valor_inss: number;
    multa_atraso: number;
    total_a_pagar: number;
    guia_contribuicao_numero: string;
  };
}
```

---

## 7. Notas importantes

- **Logo oficial INSS:** `public/img/inss/logo-inss.png`. É usado obrigatoriamente no PDF, Excel e deve ser usado na pré-visualização frontend.
- **Branding empresa:** este relatório usa o logo **INSS**, não o da empresa (é formulário oficial).
- **Folha em falta:** `folha_id: null` — avisar o utilizador que a folha do mês ainda não foi processada.
- **Contribuinte:** prioridade `empresa.inss_empresa` → `nif` → nome comercial.
- **Permissão:** utilizador autenticado com acesso ao módulo Relatórios (mesma protecção dos outros reports).

---

## 8. Checklist frontend

- [ ] Rota `/relatorios/inss-folha-remuneracao`
- [ ] Filtros mês + ano
- [ ] Preview com tabela 10 colunas
- [ ] Rodapé `justify-between` (2 blocos)
- [ ] Inputs: multa, guia, contribuinte (opcional)
- [ ] Export PDF + Excel via POST + blob
- [ ] Aviso quando `folha_id === null`
- [ ] Formatação monetária `pt-MZ` (MZN)

---

*Última actualização: backend PeopleCore — módulo `/api/v1/reports/inss-folha-remuneracao`*
