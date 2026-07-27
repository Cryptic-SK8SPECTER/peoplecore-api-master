# PeopleCore — Guia Frontend: Códigos de Funcionário, Importação Excel e Branding

Documentação para integração no frontend de todas as alterações recentes do backend: **código de funcionário configurável**, **importação em massa via Excel** (funcionários e benefícios) e **logotipos em relatórios internos**.

> **Estado:** módulo implementado no repositório `peoplecore-master` (frontend React/Vite). Secções marcadas com ✅ estão concluídas; ⏳ indicam funcionalidades de API disponíveis mas ainda sem ecrã dedicado no frontend.

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Mapa de implementação no frontend](#2-mapa-de-implementação-no-frontend)
3. [Código de funcionário (configurações)](#3-código-de-funcionário-configurações)
4. [Importação em massa — Funcionários](#4-importação-em-massa--funcionários)
5. [Importação em massa — Benefícios](#5-importação-em-massa--benefícios)
6. [Branding em relatórios internos](#6-branding-em-relatórios-internos)
7. [Modelos Excel estáticos](#7-modelos-excel-estáticos)
8. [Tipos TypeScript](#8-tipos-typescript)
9. [Fluxos de UI](#9-fluxos-de-ui)
10. [Tratamento de erros](#10-tratamento-de-erros)
11. [Checklist de implementação](#11-checklist-de-implementação)

---

## 1. Visão geral

| Funcionalidade | Onde no frontend | Endpoint principal | Estado |
|----------------|------------------|-------------------|--------|
| Configurar geração de códigos | Configurações → Empresa | `PATCH /api/v1/empresas/minha-empresa` | ✅ |
| Pré-visualizar próximo código | Formulário novo funcionário + Configurações | `GET /api/v1/empresas/minha-empresa/codigo-funcionario/proximo` | ✅ |
| Importar funcionários (Excel) | Funcionários → Importar Excel | `POST /api/v1/funcionarios/import/excel` | ✅ |
| Modelo Excel funcionários | Botão "Descarregar modelo" | `GET /api/v1/funcionarios/import/template` | ✅ |
| Importar benefícios (Excel) | Benefícios → Importar Excel | `POST /api/v1/beneficios-funcionario/import/excel` | ✅ |
| Modelo Excel benefícios | Botão "Descarregar modelo" | `GET /api/v1/beneficios-funcionario/import/template` | ✅ |
| Logotipo da empresa (upload) | Configurações + Admin → Empresas | `PATCH/DELETE /api/v1/empresas/.../logo` | ✅ |
| Branding em PDFs internos | `pdfGenerator.ts` | `GET /api/v1/reports/branding` | ✅ |
| Actualizar atribuições benefícios (JSON) | — | `PATCH /api/v1/beneficios-funcionario/atualizar-massa` | ⏳ |
| Actualizar catálogo benefícios (Excel/JSON) | — | `POST/PATCH /api/v1/beneficios/...` | ⏳ |
| Logotipo de subempresa | — | CRUD subempresas (`logo_url`) | ⏳ |

**Campo no funcionário:** `codigo_interno` (exibido na UI como **Código**). É distinto do `_id` MongoDB e deve ser usado em Excel, recibos e referências humanas.

**Relação Nominal (MITESS):** não usa o logotipo da empresa — usa o brasão oficial (`src/assets/logo_republica.png`). Não aplicar branding interno nesse relatório.

**Logotipo padrão do sistema (frontend):** quando não há logotipo personalizado, o frontend usa `src/assets/peoplecore-logo.png` em pré-visualizações e PDFs gerados no cliente. O backend pode devolver `logo_source: "sistema"` com `SYSTEM_LOGO_URL` (default `/img/logo-sistema.svg`); o frontend ignora esse URL para PDFs e usa o asset local PeopleCore.

---

## 2. Mapa de implementação no frontend

### Rotas (`src/App.tsx`)

| Rota | Página |
|------|--------|
| `/dashboard/funcionarios/importar` | `ImportarFuncionariosPage` |
| `/dashboard/beneficios/importar` | `ImportarBeneficiosPage` |
| `/dashboard/admin/configuracoes` | `ConfiguracoesPage` (código + logotipo) |
| `/dashboard/admin/empresas` | `EmpresasPage` (logotipo por empresa, super admin) |
| `/dashboard/funcionarios/adicionar` | `AdicionarFuncionarioPage` (código automático/manual) |
| `/dashboard/relatorios/relacao-nominal` | `RelacaoNominalPage` (brasão oficial, sem branding empresa) |

### Sidebar (`src/components/AppSidebar.tsx`)

- **Funcionários → Importar Excel**
- **Benefícios → Importar Excel**

### Serviços

| Ficheiro | Funções principais |
|----------|-------------------|
| `src/services/admin.ts` | `getCodigoFuncionarioConfig`, `getProximoCodigoFuncionario`, `uploadMinhaEmpresaLogo`, `removeMinhaEmpresaLogo`, `uploadEmpresaLogoById`, `removeEmpresaLogoById` |
| `src/services/funcionarios.ts` | `downloadFuncionariosImportTemplate`, `importarFuncionariosExcel` |
| `src/services/beneficios.ts` | `downloadBeneficiosImportTemplate`, `importarBeneficiosExcel` |
| `src/services/reports.ts` | `getReportBranding` |

### Componentes partilhados

| Ficheiro | Uso |
|----------|-----|
| `src/components/ImportExcelPanel.tsx` | Upload drag-and-drop, resumo, tabela de erros, export CSV |
| `src/components/LogoUrlField.tsx` | Pré-visualização, Carregar/Substituir/Remover (sem input de URL) |

### PDF / branding

| Ficheiro | Uso |
|----------|-----|
| `src/lib/defaultReportLogo.ts` | Asset `peoplecore-logo.png`, fallback DataURL |
| `src/lib/reportBrandingPdf.ts` | `getPdfBranding()`, cache, `addLogoToDoc()`, `clearPdfBrandingCache()` |
| `src/lib/pdfGenerator.ts` | Todos os PDFs internos usam `await getPdfBranding()` |

### Proxy Vite (`vite.config.ts`)

Pedidos a `/img`, `/users` e `/uploads` são encaminhados para a API, permitindo pré-visualizar logotipos guardados em `public/img/empresas/`.

---

## 3. Código de funcionário (configurações)

### 3.1 Estrutura em `Empresa.codigo_funcionario`

```json
{
  "codigo_funcionario": {
    "modo": "automatico",
    "prefixo": "CDM",
    "proximo_numero": 1,
    "digitos": 4,
    "separador": "-",
    "incluir_ano": true
  }
}
```

| Campo | Tipo | Default sistema | Descrição |
|-------|------|-----------------|-----------|
| `modo` | `"automatico"` \| `"manual"` | `automatico` | Em `manual`, o código é obrigatório ao criar funcionário |
| `prefixo` | string | Sigla derivada do nome da empresa | Ex: `CDM`, `FUNC` |
| `proximo_numero` | number ≥ 1 | `1` | Próximo número sequencial (actualizado pelo backend) |
| `digitos` | 1–10 | `4` | Padding do número (`0001`) |
| `separador` | string | `"-"` | Entre prefixo, ano e número |
| `incluir_ano` | boolean | `true` | Se `true`: `CDM-2026-0001`; se `false`: `CDM-0001` |

### 3.2 Formato gerado (exemplos)

| Configuração | Resultado |
|--------------|-----------|
| prefixo `CDM`, incluir_ano, dígitos 4 | `CDM-2026-0001` |
| prefixo `RH`, sem ano | `RH-0042` |
| Sem configuração personalizada | `FUNC-2026-0001` (prefixo derivado do nome comercial) |

### 3.3 API — Ler configuração

```http
GET /api/v1/empresas/minha-empresa/codigo-funcionario
Authorization: Bearer {token}
```

**Resposta:**

```json
{
  "status": "success",
  "data": {
    "config": {
      "modo": "automatico",
      "prefixo": "CDM",
      "proximo_numero": 15,
      "digitos": 4,
      "separador": "-",
      "incluir_ano": true
    }
  }
}
```

### 3.4 API — Pré-visualizar próximo código

```http
GET /api/v1/empresas/minha-empresa/codigo-funcionario/proximo
Authorization: Bearer {token}
```

**Resposta:**

```json
{
  "status": "success",
  "data": {
    "config": { "...": "..." },
    "proximo_codigo": "CDM-2026-0015"
  }
}
```

> Não consome o contador — apenas mostra o que será gerado na próxima criação automática.

### 3.5 API — Actualizar configuração

```http
PATCH /api/v1/empresas/minha-empresa
Authorization: Bearer {token}
Permissão: Configurações → editar
Content-Type: application/json

{
  "codigo_funcionario": {
    "modo": "automatico",
    "prefixo": "CDM",
    "proximo_numero": 100,
    "digitos": 4,
    "separador": "-",
    "incluir_ano": true
  }
}
```

### 3.6 UI — Secção em Configurações ✅

**Ecrã:** `/dashboard/admin/configuracoes` → `ConfiguracoesPage.tsx`

- Select **Modo:** `Automático` / `Manual`
- **Prefixo**, **Separador**, **Dígitos do número** (select 3–6), **Próximo número**
- Toggle **Incluir ano**
- **Pré-visualização local** (cálculo no cliente) + valor do servidor via `GET .../proximo`
- Gravado com `PATCH minha-empresa` no mesmo formulário da empresa

### 3.7 Criar funcionário (formulário individual) ✅

**Ecrã:** `/dashboard/funcionarios/adicionar` → `AdicionarFuncionarioPage.tsx`

```http
POST /api/v1/funcionarios
```

| Modo | Comportamento no frontend |
|------|---------------------------|
| `automatico` | Campo código só leitura; mostra `proximo_codigo`; **não envia** `codigo_interno` no POST (backend gera) |
| `manual` | Campo obrigatório; envia `codigo_interno` no body |

**Body exemplo (modo manual):**

```json
{
  "nome": "Maria Silva",
  "email": "maria@empresa.co.mz",
  "departamento_id": "...",
  "cargo_id": "...",
  "data_admissao": "2026-03-01",
  "codigo_interno": "CDM-2026-0099",
  "enviar_email_boas_vindas": true
}
```

### 3.8 Listagem de funcionários ✅

**Ecrã:** `/dashboard/funcionarios` → `FuncionariosPage.tsx`

- Coluna **Código** (`codigo_interno`)
- Pesquisa por nome, cargo ou código
- Botão **Importar Excel** → `/dashboard/funcionarios/importar`

---

## 4. Importação em massa — Funcionários

### 4.1 Descarregar modelo (dinâmico, com referências da empresa)

```http
GET /api/v1/funcionarios/import/template
Authorization: Bearer {token}
Permissão: Funcionários
```

Resposta: ficheiro `.xlsx` com folhas:
- **Funcionários** — colunas + 2 linhas de exemplo
- **Referências** — departamentos e cargos da empresa
- **Instruções** — regras de preenchimento

**Frontend:** `downloadFuncionariosImportTemplate()` → grava `modelo-importacao-funcionarios.xlsx`

### 4.2 Colunas do Excel

| Coluna | Obrigatório | Notas |
|--------|-------------|-------|
| `codigo_funcionario` | Não | Se vazio, gera automaticamente |
| `nome` | Sim | |
| `email` | Sim | Único no sistema |
| `telefone` | Não | |
| `departamento` | Sim | Nome exacto (ver folha Referências) |
| `cargo` | Sim | Título exacto no departamento |
| `data_admissao` | Sim | `AAAA-MM-DD` ou `DD/MM/AAAA` |
| `tipo_contrato` | Não | `Efetivo`, `Termo Certo`, `Termo Incerto`, `Estágio`, `Prestação Serviços` |
| `genero` | Não | `Masculino`, `Feminino`, `Outro` |
| `bi_numero` | Não | |
| `nuit` | Não | |
| `data_nascimento` | Não | |
| `inss` | Não | |
| `banco` | Não | |
| `nib` | Não | |
| `status` | Não | Default `Ativo` |

### 4.3 Submeter importação

```http
POST /api/v1/funcionarios/import/excel
Authorization: Bearer {token}
Content-Type: multipart/form-data

ficheiro: (arquivo .xlsx)
enviar_email_boas_vindas: false   // recomendado false em massa
```

**Serviço frontend:**

```typescript
// src/services/funcionarios.ts
export async function importarFuncionariosExcel(
  file: File,
  enviarEmailBoasVindas = false,
): Promise<ImportFuncionarioResultado> {
  const form = new FormData();
  form.append("ficheiro", file);
  form.append("enviar_email_boas_vindas", String(enviarEmailBoasVindas));
  const res = await api.post("/funcionarios/import/excel", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.data ?? res.data?.data?.data;
}
```

**Resposta:**

```json
{
  "status": "success",
  "data": {
    "total_linhas": 50,
    "criados": 47,
    "ignorados": 2,
    "erros": [
      { "linha": 12, "campo": "email", "mensagem": "Email já registado: x@y.co.mz", "tipo": "ignorado" },
      { "linha": 33, "mensagem": "departamento \"Vendas\" não encontrado", "tipo": "erro" }
    ],
    "criados_detalhe": [
      {
        "linha": 2,
        "funcionario_id": "...",
        "codigo_interno": "CDM-2026-0015",
        "nome": "Maria Silva",
        "email": "maria@empresa.co.mz"
      }
    ]
  }
}
```

### 4.4 UI — Ecrã de importação ✅

**Ecrã:** `/dashboard/funcionarios/importar` → `ImportarFuncionariosPage.tsx` + `ImportExcelPanel`

1. Botão **Descarregar modelo Excel**
2. Zona drag-and-drop para `.xlsx`
3. Checkbox *Enviar email de boas-vindas* (desmarcado por defeito)
4. Botão **Importar**
5. Resumo: total / criados / ignorados / erros
6. Tabela de erros por linha + **Descarregar relatório CSV**
7. Invalida cache React Query `funcionarios` e `funcionarios-stats` após sucesso

---

## 5. Importação em massa — Benefícios

### 5.1 Descarregar modelo

```http
GET /api/v1/beneficios-funcionario/import/template
Authorization: Bearer {token}
Permissão: Funcionários
```

Folhas: **Benefícios**, **Referências** (funcionários com código + benefícios activos), **Instruções**.

### 5.2 Colunas (atribuir + actualizar atribuições)

| Coluna | Obrigatório | Notas |
|--------|-------------|-------|
| `acao` | Não | `atribuir` (default) ou `actualizar` |
| `codigo_funcionario` | Sim | Código interno (não o MongoDB `_id`) |
| `beneficio` | Sim | Nome exacto do benefício |
| `valor` | Não | atribuir: default do benefício; actualizar: vazio = mantém |
| `data_inicio` | Não | Apenas em `atribuir` (default: hoje) |
| `data_fim` | Não | |
| `status` | Não | `Ativo`, `Inativo`, `Suspenso` (em `actualizar`) |
| `observacoes` | Não | |

### 5.3 Submeter importação/atribuição Excel

```http
POST /api/v1/beneficios-funcionario/import/excel
Content-Type: multipart/form-data

ficheiro: (arquivo .xlsx)
```

**Resposta:**

```json
{
  "status": "success",
  "data": {
    "total_linhas": 20,
    "atribuidos": 18,
    "actualizados": 5,
    "ignorados": 2,
    "erros": [
      { "linha": 5, "mensagem": "Funcionário com código \"X\" não encontrado", "tipo": "erro" },
      { "linha": 8, "mensagem": "Benefício já activo para CDM-2026-0001", "tipo": "ignorado" }
    ]
  }
}
```

### 5.4 UI — Atribuição via Excel ✅

**Ecrã:** `/dashboard/beneficios/importar` → `ImportarBeneficiosPage.tsx` + `ImportExcelPanel`

Mesmo padrão visual da importação de funcionários. Invalida `beneficios-funcionario` após sucesso.

### 5.5 Actualizar atribuições em massa (JSON) ⏳

```http
PATCH /api/v1/beneficios-funcionario/atualizar-massa
Content-Type: application/json

{
  "atribuicoes": [
    {
      "codigo_funcionario": "CDM-2026-0001",
      "beneficio": "Subsídio de Transporte",
      "valor": 4200,
      "status": "Ativo",
      "data_fim": "2026-12-31",
      "observacoes": "Revisão anual"
    }
  ]
}
```

> API disponível; ainda sem ecrã no frontend.

### 5.6 Actualizar catálogo de benefícios (Excel / JSON) ⏳

```http
GET  /api/v1/beneficios/import/template-atualizacao
POST /api/v1/beneficios/import/atualizacao-excel
PATCH /api/v1/beneficios/atualizar-massa
```

> API disponível; ainda sem ecrã no frontend.

---

## 6. Branding em relatórios internos

### 6.1 Endpoint dedicado

```http
GET /api/v1/reports/branding?subempresa_id={opcional}
```

**Resposta:**

```json
{
  "status": "success",
  "data": {
    "logo_url": "http://localhost:9000/img/empresas/empresa-abc123.jpeg",
    "logo_url_relativa": "/img/empresas/empresa-abc123.jpeg",
    "logo_source": "empresa",
    "nome_exibicao": "Minha Empresa Lda",
    "empresa_id": "...",
    "subempresa_id": null,
    "usa_brasao_oficial": false,
    "relatorio_tipo": "interno"
  }
}
```

**Prioridade do logotipo (backend):** subempresa → empresa → sistema (`SYSTEM_LOGO_URL`, default `/img/logo-sistema.svg`).

**Prioridade no frontend (PDFs gerados no cliente):**

| `logo_source` | Logotipo usado |
|---------------|----------------|
| `empresa` ou `subempresa` | URL da API (`/img/empresas/...`) |
| `sistema` ou ausência de logo | `src/assets/peoplecore-logo.png` (asset Vite) |

O nome de exibição (`nome_exibicao`) vem sempre da API quando disponível.

### 6.2 Onde o branding já vem na resposta da API

Incluído em `data.branding` nos endpoints:

- `GET /api/v1/reports/dashboard`
- `GET /api/v1/reports/departments`
- `GET /api/v1/reports/contracts`
- `GET /api/v1/reports/alerts`
- `GET /api/v1/presencas/relatorio-mensal?subempresa_id=`

Recibos: `cabecalho.branding` e `cabecalho.empresa.logo_url`.

### 6.3 Upload de logotipo (empresa) ✅

Não usar campo de texto `logo_url` na UI. O frontend envia ficheiro via multipart:

```http
PATCH /api/v1/empresas/minha-empresa/logo
Authorization: Bearer {token}
Permissão: Configurações → editar
Content-Type: multipart/form-data

logo: (ficheiro imagem, máx. 2 MB — JPG, PNG, WEBP, GIF)
```

```http
DELETE /api/v1/empresas/minha-empresa/logo
```

**Super admin (empresa por ID):**

```http
PATCH /api/v1/empresas/:id/logo
DELETE /api/v1/empresas/:id/logo
```

Ficheiros guardados em `public/img/empresas/empresa-{id}-{timestamp}.ext`.  
`logo_url` na base de dados: `/img/empresas/empresa-....jpeg`

**Serviços frontend (`src/services/admin.ts`):**

- `uploadMinhaEmpresaLogo(file)` / `removeMinhaEmpresaLogo()`
- `uploadEmpresaLogoById(id, file)` / `removeEmpresaLogoById(id)`

### 6.4 Componente `LogoUrlField` ✅

**Ficheiro:** `src/components/LogoUrlField.tsx`

- Pré-visualização do logotipo (personalizado ou padrão PeopleCore)
- Botões **Personalizar** / **Substituir** e **Remover** (só quando há logo personalizado)
- Sem input de URL
- Após upload/remoção: chamar `clearPdfBrandingCache()` para actualizar PDFs

**Onde é usado:**

- `ConfiguracoesPage.tsx` — logotipo da empresa actual
- `EmpresasPage.tsx` — logotipo ao editar empresa (super admin; upload só após criar)

### 6.5 PDFs internos ✅

**Ficheiro:** `src/lib/pdfGenerator.ts`

Todos os exports PDF (`exportDashboardPDF`, recibos, presenças, turnover, custos, etc.) são `async` e usam:

```typescript
import { getPdfBranding, addLogoToDoc, clearPdfBrandingCache } from "@/lib/reportBrandingPdf";

const branding = await getPdfBranding();
// branding.displayName, branding.logoDataUrl
```

`getPdfBranding()` cacheia o resultado; invalidar com `clearPdfBrandingCache()` após alterar logotipo.

### 6.6 Relação Nominal (MITESS) ✅

**Não** usar branding da empresa. Cabeçalho com brasão fixo:

- Asset: `src/assets/logo_republica.png`
- Componente: `RelacaoNominalCabecalho.tsx`

---

## 7. Modelos Excel estáticos

Ficheiros de exemplo no repositório API (podem ser servidos estaticamente):

| Ficheiro | URL sugerida |
|----------|--------------|
| `public/templates/modelo-importacao-funcionarios.xlsx` | `/templates/modelo-importacao-funcionarios.xlsx` |
| `public/templates/modelo-importacao-beneficios.xlsx` | `/templates/modelo-importacao-beneficios.xlsx` |

> **Preferir** `GET .../import/template` para modelos com **Referências actualizadas** da empresa autenticada (é o que o frontend usa).

Regenerar localmente:

```bash
node scripts/generate-import-templates.js
```

---

## 8. Tipos TypeScript

**Ficheiro implementado:** `src/types/funcionariosImport.ts`

```typescript
export interface CodigoFuncionarioConfig {
  modo: "automatico" | "manual";
  prefixo: string;
  proximo_numero: number;
  digitos: number;
  separador: string;
  incluir_ano: boolean;
}

export interface ReportBranding {
  logo_url: string;
  logo_url_relativa: string;
  logo_source: "subempresa" | "empresa" | "sistema";
  nome_exibicao: string;
  empresa_id: string | null;
  subempresa_id: string | null;
  usa_brasao_oficial: boolean;
  relatorio_tipo: "interno";
}

export interface ImportErroLinha {
  linha: number;
  campo?: string;
  mensagem: string;
  tipo: "erro" | "ignorado";
}

export interface ImportFuncionarioResultado {
  total_linhas: number;
  criados: number;
  ignorados: number;
  erros: ImportErroLinha[];
  criados_detalhe: Array<{
    linha: number;
    funcionario_id: string;
    codigo_interno: string;
    nome: string;
    email: string;
  }>;
}

export interface ImportBeneficioResultado {
  total_linhas: number;
  atribuidos: number;
  ignorados: number;
  erros: ImportErroLinha[];
}
```

**Logotipo padrão:** `src/lib/defaultReportLogo.ts` exporta `DEFAULT_REPORT_LOGO_URL`, `getDefaultReportLogoDataUrl()`, `isCustomReportLogo()`.

---

## 9. Fluxos de UI

### Configurações → Código de funcionário ✅

```
ConfiguracoesPage → editar codigo_funcionario local
                 → PATCH minha-empresa (com resto do formulário)
                 → GET proximo (actualiza preview servidor)
```

### Novo funcionário ✅

```
AdicionarFuncionarioPage → GET config + GET proximo (se automático)
                        → POST funcionarios
                        → codigo_interno visível na listagem
```

### Importação funcionários ✅

```
ImportarFuncionariosPage → Descarregar modelo → Upload → ImportExcelPanel resultado
                        → invalidar queries funcionarios
```

### Importação benefícios ✅

```
ImportarBeneficiosPage → Descarregar modelo → Upload → resumo atribuidos/ignorados/erros
```

### Logotipo empresa ✅

```
LogoUrlField → PATCH .../logo (multipart) ou DELETE .../logo
            → clearPdfBrandingCache()
            → próximos PDFs usam novo branding
```

### PDF interno ✅

```
exportXxxPDF() → getPdfBranding() → addLogoToDoc() + nome_exibicao no cabeçalho/rodapé
```

---

## 10. Tratamento de erros

| Situação | HTTP | Acção no frontend |
|----------|------|-----------------|
| Ficheiro não enviado | — | `ImportExcelPanel`: "Seleccione um ficheiro .xlsx" |
| Formato inválido | 400 | "Apenas ficheiros .xlsx" (drop zone) |
| Colunas em falta | 500/400 | Mensagem do backend no painel |
| Email duplicado | 200 | Linha em `erros` tipo `ignorado` |
| Código duplicado | 400 | Ao criar individual |
| Modo manual sem código | — | Toast "Código obrigatório" em `AdicionarFuncionarioPage` |
| Imagem logo inválida | — | `LogoUrlField`: tipo ou tamanho > 2 MB |
| Sem permissão | 403 | Toast / RouteGuard |
| Falha ao carregar logo para PDF | — | Fallback para `peoplecore-logo.png` |

---

## 11. Checklist de implementação

### Configurações
- [x] Secção `codigo_funcionario` em Configurações da empresa
- [x] Preview do próximo código (local + servidor)
- [x] Validação modo manual no formulário de funcionário

### Funcionários
- [x] Coluna `codigo_interno` na tabela de funcionários
- [x] Pesquisa por código
- [x] Ecrã de importação Excel com upload multipart
- [x] Download do modelo dinâmico
- [x] Tabela de resultados pós-importação + export CSV de erros

### Benefícios
- [x] Ecrã importação Excel de atribuições
- [x] Download modelo com referências
- [x] Resumo atribuidos/ignorados/erros
- [ ] Actualização em massa via JSON (`atualizar-massa`)
- [ ] Actualização de catálogo via Excel/JSON

### Relatórios
- [x] Branding em PDFs internos (`getPdfBranding` + `pdfGenerator.ts`)
- [x] Logotipo padrão PeopleCore quando sem logo personalizado
- [ ] Selector `subempresa_id` no branding (quando multi-subempresa na UI de relatórios)
- [x] Relação Nominal: brasão oficial apenas

### Empresa / Subempresa
- [x] Upload de logotipo (empresa — Configurações)
- [x] Upload de logotipo (empresa por ID — super admin)
- [ ] Upload de logotipo (subempresa)

---

*Última actualização: frontend PeopleCore — códigos de funcionário, importação Excel, upload de logotipo e branding PDF com fallback `peoplecore-logo.png`.*
