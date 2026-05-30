# 🎯 Objetivo da aula

No final desta aula, vais ter:

- Paginação de resultados na API (página, limite, total)
- Pesquisa por texto em campos da base de dados
- Ordenação por campo e direção (ASC/DESC)
- Queries SQLite dinâmicas e seguras com prepared statements
- Tabela Angular com paginação, pesquisa e ordenação

---

# 🧠 O que vamos fazer

Quando uma API devolve listas de dados, não podemos devolver tudo de uma vez — imagina uma tabela com 100.000 utilizadores. Vamos implementar **paginação**, **filtros** e **ordenação** na API.

```
Cliente envia: GET /users?page=2&limit=10&search=ash&sort=name&order=asc
   ↓
Back-end interpreta os query params
   ↓
Constrói query SQL dinâmica de forma segura
   ↓
Executa: buscar resultados + contar total
   ↓
Devolve: dados + metadados de paginação
   ↓
Angular recebe e atualiza a tabela
```

---

# 🧩 PARTE 1 — Conceitos

## 🧠 O que são query params?

Query params são os parâmetros que aparecem no URL depois do `?`.

```
/users?page=1&limit=10&search=ash&sort=name&order=asc
```

| Param | Valor | Significado |
|-------|-------|-------------|
| `page` | `1` | Qual página |
| `limit` | `10` | Quantos resultados por página |
| `search` | `ash` | Texto para filtrar |
| `sort` | `name` | Campo para ordenar |
| `order` | `asc` | Direção da ordenação |

No Express, acedes a eles via `req.query`.

> ⚠️ `req.query` devolve **strings** — mesmo `?page=2` devolve a string `"2"`. Não te esqueças de converter com `parseInt()`.

## 🧠 Como funciona a paginação em SQL?

Para devolver apenas os resultados de uma página, usa-se `LIMIT` e `OFFSET`:

```sql
-- Página 1 (primeiros 10): LIMIT 10 OFFSET 0
-- Página 2 (seguintes 10): LIMIT 10 OFFSET 10
-- Página 3 (seguintes 10): LIMIT 10 OFFSET 20

-- Fórmula: OFFSET = (page - 1) * limit
SELECT * FROM users LIMIT 10 OFFSET 0;
```

Para saber o total de resultados (para calcular o número total de páginas), precisas de uma segunda query:

```sql
SELECT COUNT(*) as total FROM users WHERE ...
```

## 🧠 Metadados de paginação

A resposta da API não deve devolver apenas os dados — deve incluir informação para o cliente saber onde está:

```json
{
  "data": [...],
  "meta": {
    "total": 47,
    "page": 2,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

# 🧩 PARTE 2 — Queries dinâmicas e seguras

## 🧠 O perigo das queries dinâmicas

Quando construímos uma query com base em input do utilizador, há risco de **SQL Injection**:

```javascript
// ❌ NUNCA fazer isto — vulnerável a SQL Injection
const query = `SELECT * FROM users WHERE name = '${req.query.search}'`;
```

Se `search` for `' OR '1'='1`, a query devolve todos os utilizadores.

## 🧠 A solução: prepared statements com parâmetros

O `better-sqlite3` suporta prepared statements com `?` como placeholder:

```javascript
// ✅ Seguro — o valor é tratado como dado, nunca como código SQL
const stmt = db.prepare('SELECT * FROM users WHERE name LIKE ?');
stmt.all(`%${search}%`);
```

## 🧠 O desafio: SQL dinâmico seguro

O problema surge quando a query muda consoante os parâmetros recebidos. Por exemplo:
- Se `search` não foi enviado, não queremos o `WHERE`
- Se `sort` foi enviado, queremos o `ORDER BY`

> 💡 **Estratégia recomendada:** Constrói a query por partes com arrays e `join`:
>
> ```javascript
> const conditions = [];
> const params = [];
>
> if (search) {
>   conditions.push('name LIKE ?');
>   params.push(`%${search}%`);
> }
>
> const whereClause = conditions.length > 0
>   ? 'WHERE ' + conditions.join(' AND ')
>   : '';
>
> const query = `SELECT * FROM users ${whereClause} LIMIT ? OFFSET ?`;
> params.push(limit, offset);
> ```

## 🔹 CHECKPOINT 1 — Validar e sanitizar os query params

Antes de usar os query params, define valores padrão e valida os valores recebidos:

- `page` → inteiro, mínimo 1, padrão: 1
- `limit` → inteiro, entre 1 e 100, padrão: 10
- `order` → só aceita `'asc'` ou `'desc'`, padrão: `'asc'`
- `sort` → só aceita campos da tabela conhecidos (whitelist!), padrão: `'id'`

> ⚠️ O campo `sort` **não pode** ser um parâmetro de prepared statement — nomes de colunas não podem ser placeholders em SQL. Por isso, tens de usar uma **whitelist** de campos permitidos e verificar que o valor recebido está nessa lista antes de o colocar na query.

```javascript
// Exemplo de whitelist para o campo sort
const ALLOWED_SORT_FIELDS = ['id', 'name', 'email', 'created_at'];
const sortField = ALLOWED_SORT_FIELDS.includes(req.query.sort)
  ? req.query.sort
  : 'id';
```

---

# 🧩 PARTE 3 — Implementar a rota

## 🔹 CHECKPOINT 2 — Rota GET /users (admin only)

Criar a rota `GET /users` protegida por autenticação e pelo papel `admin`.

A rota deve aceitar os seguintes query params:
- `page`, `limit` — paginação
- `search` — filtrar por nome ou email
- `sort`, `order` — ordenação

## 🔹 CHECKPOINT 3 — Executar as duas queries

Para uma resposta completa, precisas de **duas queries**:

1. A query com `LIMIT` e `OFFSET` para os dados da página atual
2. A mesma query **sem** `LIMIT`/`OFFSET` mas com `COUNT(*)` para o total

> 💡 As condições `WHERE` devem ser as mesmas nas duas queries. Considera extrair a cláusula `WHERE` para uma variável reutilizável.

## 🔹 CHECKPOINT 4 — Calcular os metadados

Com o `total` e o `limit`, calcula:
- `totalPages = Math.ceil(total / limit)`
- Inclui `page`, `limit`, `total`, `totalPages` na resposta

## 🔹 CHECKPOINT 5 — Documentar no Swagger

Documenta os query params na rota:

```javascript
/**
 * @swagger
 * /users:
 *   get:
 *     summary: List users with pagination, search and sorting
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       // ...etc
 */
```

---

# 🧩 PARTE 4 — Angular (apoio visual)

## 🧠 Conceito — Como passar query params com Angular HttpClient?

O `HttpClient` aceita um objeto `params` na configuração do pedido:

```typescript
// Dica: como enviar query params com HttpClient
this.http.get('/users', {
  params: {
    page: this.currentPage,
    limit: this.pageSize,
    search: this.searchTerm,
    sort: this.sortField,
    order: this.sortOrder
  },
  headers: { Authorization: `Bearer ${token}` }
});
```

## 🔹 CHECKPOINT 6 — Adicionar método ao AuthService

Cria um método `getUsers(params)` no `AuthService` (ou num novo `UserService`) que faz o pedido à API com os parâmetros de paginação.

## 🔹 CHECKPOINT 7 — Componente de tabela na página admin

Na página de admin, implementar uma tabela que:
- Mostra os utilizadores com colunas clicáveis para ordenar
- Tem um campo de pesquisa com debounce
- Tem controlos de paginação (anterior, próxima, número de página)

> 💡 **Debounce** — não queres fazer um pedido à API a cada tecla que o utilizador prime. Espera que o utilizador pare de escrever antes de fazer o pedido.
>
> Com `RxJS`:
> ```typescript
> // Dica: Subject + debounceTime
> private searchSubject = new Subject<string>();
>
> ngOnInit() {
>   this.searchSubject.pipe(debounceTime(300)).subscribe(value => {
>     this.search = value;
>     this.loadUsers();
>   });
> }
> ```

## 🔹 CHECKPOINT 8 — Indicadores visuais

- Mostrar qual coluna está a ser usada para ordenar e em que direção (seta ↑ ↓)
- Mostrar "Página X de Y" e o total de resultados
- Desativar o botão "Anterior" na página 1 e "Próxima" na última página

---

# 🧪 Exercícios

## 🟢 Exercício 1 — Paginação básica
Criar a rota `GET /users` com suporte a `page` e `limit`. Testar no Swagger e confirmar que os metadados de paginação aparecem na resposta.

## 🟢 Exercício 2 — Pesquisa
Adicionar suporte ao parâmetro `search`. Testar com `?search=ash` e confirmar que filtra por nome ou email.

## 🟡 Exercício 3 — Ordenação
Adicionar suporte a `sort` e `order` com whitelist. Testar ordenar por `name` ASC e DESC.

## 🟡 Exercício 4 — Angular tabela
Implementar a tabela na página de admin com paginação e pesquisa funcional.

## 🔴 Exercício 5 — Ordenação com clique nas colunas
Implementar colunas clicáveis na tabela Angular que alternam entre ASC e DESC ao clicar.

---

# 🔥 Desafios

## 🟢 Obrigatório
- Rota `GET /users` com paginação
- Metadados na resposta (`total`, `page`, `totalPages`)
- Prepared statements seguros

## 🟡 Intermédio
- Pesquisa por nome e email
- Ordenação com whitelist
- Tabela Angular com paginação

## 🔴 Avançado
- Debounce na pesquisa Angular com RxJS
- Ordenação por clique nas colunas com indicadores visuais
- Sincronizar os filtros com os query params do URL Angular (para que o link seja partilhável)
  > 💡 Usa `Router.navigate` com `queryParams` e `ActivatedRoute` para ler e escrever os filtros no URL
