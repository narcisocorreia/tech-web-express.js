# 🎯 Objetivo da aula

No final desta aula, vais ter:

- Um sistema de papéis (roles) associados a cada utilizador
- Middleware de autorização que verifica o papel além do JWT
- Rotas protegidas por papel (ex: só admins podem apagar)
- Diferença clara entre **autenticação** e **autorização**
- Front-end Angular que adapta a interface conforme o papel do utilizador

---

# 🧠 O que vamos fazer

Vamos estender o sistema de autenticação que já existe para suportar **autorização por papéis**.

Até agora, qualquer utilizador autenticado pode fazer tudo. Com RBAC (*Role-Based Access Control*), definimos o que cada papel pode fazer.

```
Utilizador autenticado (tem JWT)
   ↓
Pedido chega ao back-end
   ↓
Middleware verifica: quem és? (autenticação - JWT)
   ↓
Middleware verifica: o que podes fazer? (autorização - role)
   ↓
Se autorizado → executa a rota
Se não autorizado → 403 Forbidden
```

## 🧠 Autenticação vs Autorização

| | Autenticação | Autorização |
|---|---|---|
| **Pergunta** | Quem és tu? | O que podes fazer? |
| **Mecanismo** | JWT Token | Role / Permissão |
| **Erro** | 401 Unauthorized | 403 Forbidden |

---

# 🧩 PARTE 1 — Roles na base de dados

## 🧠 Conceito — Como representar papéis?

A forma mais simples é adicionar uma coluna `role` à tabela `users`.

Valores possíveis:
- `user` — utilizador normal (valor padrão)
- `admin` — administrador

> 💡 Em sistemas mais complexos, os papéis ficam numa tabela separada com relações many-to-many. Para esta aula, uma coluna simples é suficiente.

## 🔹 CHECKPOINT 1 — Modificar a tabela users

Adicionar a coluna `role` à tabela `users`.

> 💡 **Dica:** Em SQLite, usa `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`.  
> Todos os utilizadores existentes ficam automaticamente com `role = 'user'`.

## 🔹 CHECKPOINT 2 — Incluir o role no JWT

Quando fazes `jwt.sign(...)`, inclui o campo `role` no payload do token.

Assim, o middleware de autorização consegue ler o papel diretamente do token, sem precisar de ir à base de dados em cada pedido.

> ⚠️ O payload do JWT é **codificado, não encriptado** — não coloques informação sensível lá. O `role` é seguro de incluir.

## 🔹 CHECKPOINT 3 — Criar utilizador admin

Para testes, vais precisar de um utilizador com `role = 'admin'`.

> 💡 Podes fazê-lo diretamente na base de dados com um cliente SQLite, ou criar uma rota temporária de desenvolvimento para promover um utilizador.

---

# 🧩 PARTE 2 — Middleware de Autorização

## 🧠 Conceito — Como funciona um middleware?

Um middleware em Express é uma função que corre **antes** do handler da rota.

A cadeia é:

```
Pedido → middleware1 → middleware2 → handler da rota → resposta
```

Já tens o `authenticateToken` que verifica o JWT. Vais criar um novo middleware que verifica o papel.

## 🔹 CHECKPOINT 4 — Criar o middleware `requireRole`

O middleware deve:
1. Aceitar um ou mais papéis como argumento (ex: `requireRole('admin')` ou `requireRole('admin', 'moderator')`)
2. Verificar se `req.user.role` está na lista de papéis permitidos
3. Se sim → `next()`
4. Se não → responder com `403 Forbidden`

> 💡 **Dica:** Um middleware que aceita argumentos é uma **função que retorna uma função**:
> ```javascript
> function requireRole(...roles) {
>   return (req, res, next) => {
>     // verifica req.user.role
>   };
> }
> ```

## 🔹 CHECKPOINT 5 — Proteger rotas com o novo middleware

Aplica os dois middlewares em sequência nas rotas que precisam de autorização:

```javascript
// Exemplo de como encadear middlewares numa rota
app.delete('/users/:id', authenticateToken, requireRole('admin'), (req, res) => {
  // só admins chegam aqui
});
```

---

# 🧩 PARTE 3 — Criar rotas protegidas por papel

## 🔹 CHECKPOINT 6 — Rota de listagem de utilizadores (admin only)

`GET /admin/users` — devolve a lista de todos os utilizadores.

> ⚠️ Nunca devolvas as passwords, mesmo que estejam em hash. Usa `SELECT id, name, email, role FROM users`.

## 🔹 CHECKPOINT 7 — Rota para alterar o papel de um utilizador (admin only)

`PUT /admin/users/:id/role` — altera o papel de um utilizador.

> 💡 Valida que o papel enviado é um valor válido (`user` ou `admin`) antes de atualizar.

## 🔹 CHECKPOINT 8 — Rota de apagar utilizador (admin only)

`DELETE /admin/users/:id` — apaga um utilizador.

> 💡 **Dica:** Considera impedir que um admin se apague a si próprio. Verifica se `req.user.id === parseInt(req.params.id)`.

---

# 🧩 PARTE 4 — Documentar no Swagger

## 🔹 CHECKPOINT 9 — Documentar as novas rotas

Adiciona comentários Swagger às novas rotas `/admin/*`.

> 💡 Para indicar que uma rota requer um papel específico, podes adicionar uma descrição no `summary` ou usar um campo personalizado nos comentários:
> ```
> * @swagger
> * /admin/users:
> *   get:
> *     summary: List all users (admin only)
> *     tags: [Admin]
> *     security:
> *       - bearerAuth: []
> ```

---

# 🧩 PARTE 5 — Angular (apoio visual)

## 🧠 Conceito — Como ler o role no Angular?

O JWT é guardado em `localStorage`. O payload do token é a parte do meio (entre os dois pontos), codificada em Base64.

Para ler o payload:
```typescript
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
// payload.role → 'admin' ou 'user'
```

> 💡 Considera guardar o utilizador no `AuthService` quando faz login, em vez de descodificar o token sempre que precisas.

## 🔹 CHECKPOINT 10 — Expor o role no AuthService

Adiciona um método `getRole()` ou uma propriedade `currentUser` ao `AuthService` que expõe o papel do utilizador autenticado.

## 🔹 CHECKPOINT 11 — Página de admin

Cria uma página simples `pages/admin` que lista os utilizadores.

> ⚠️ A proteção real é sempre no back-end. O Angular apenas esconde ou mostra elementos — nunca é uma barreira de segurança.

## 🔹 CHECKPOINT 12 — Esconder elementos conforme o papel

Na navbar ou nas páginas, usa `@if` para mostrar/esconder elementos:

```html
@if (authService.getRole() === 'admin') {
  <a routerLink="/admin">Admin</a>
}
```

## 🔹 CHECKPOINT 13 — Guard para a página de admin

Extende o `authGuard` existente ou cria um novo `adminGuard` que verifica se o utilizador é admin antes de permitir o acesso à rota `/admin`.

---

# 🧪 Exercícios

## 🟢 Exercício 1 — Adicionar role
Modificar a tabela e o JWT para incluir o papel. Confirmar no Swagger que o token devolvido no login contém o `role`.

## 🟢 Exercício 2 — Middleware requireRole
Implementar o middleware e aplicá-lo à rota `GET /admin/users`. Testar com um utilizador normal (deve receber `403`) e com um admin (deve funcionar).

## 🟡 Exercício 3 — Rotas de admin completas
Implementar as rotas de listar, alterar papel e apagar utilizadores. Documentar no Swagger.

## 🟡 Exercício 4 — Angular adapta a UI
Mostrar o link "Admin" na navbar apenas para admins. Criar página de listagem de utilizadores.

## 🔴 Exercício 5 — Promover utilizador
Implementar funcionalidade na página de admin para alterar o papel de um utilizador diretamente na tabela (botão para promover/rebaixar).

---

# 🔥 Desafios

## 🟢 Obrigatório
- Coluna `role` na BD e no JWT
- Middleware `requireRole`
- Rota `GET /admin/users` protegida

## 🟡 Intermédio
- Rotas de gestão de utilizadores (alterar papel, apagar)
- Angular esconde elementos conforme o papel
- Guard para rota de admin

## 🔴 Avançado
- Sistema de permissões mais granular (ex: `can_delete_users`, `can_edit_posts`) em vez de papéis simples
- Auditoria: registar numa tabela separada quem fez o quê e quando (log de ações de admin)
