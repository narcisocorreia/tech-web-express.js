# 🎯 Objetivo da aula

No final desta aula, vais ter:

- Validação de dados no back-end com `zod`
- Mensagens de erro claras e estruturadas por campo
- Fluxo de confirmação de conta por email
- Fluxo de reset de password por email
- Tokens temporários com prazo de validade para operações sensíveis
- Formulários Angular para "esqueci a password" e confirmação de conta

---

# 🧠 O que vamos fazer

Vamos completar o ciclo de autenticação que já existe, adicionando duas coisas fundamentais em qualquer aplicação real:

1. **Validação robusta** — nunca confiar nos dados que chegam do cliente
2. **Emails transacionais** — confirmação de conta e reset de password

```
Cliente envia dados
   ↓
Back-end valida com zod
   ↓
Se inválido → responde com erros por campo
Se válido → processa o pedido
   ↓
Operações sensíveis (registo, reset)
   ↓
Gerar token temporário
   ↓
Enviar email com link + token
   ↓
Utilizador clica no link
   ↓
Back-end valida o token e executa a ação
```

---

# 🧩 PARTE 1 — Validação com Zod

## 🧠 Conceito — Por que validar no back-end?

Qualquer pessoa pode enviar um pedido HTTP diretamente ao servidor — sem passar pelo formulário Angular. Por isso, **a validação no front-end é apenas para conveniência do utilizador**, mas a validação real tem de estar sempre no back-end.

Exemplos do que pode correr mal sem validação:
- Registar um utilizador com email `""` (string vazia)
- Enviar uma password com 1 caracter
- Injetar SQL ou código malicioso nos campos

## 🧠 O que é o Zod?

`zod` é uma biblioteca de validação de esquemas para TypeScript/JavaScript.

Permite definir a "forma" esperada dos dados e validar automaticamente, com mensagens de erro personalizáveis.

Exemplo de como pensar num schema:

```
// Que campos espero? Que tipo? Que restrições?
// name   → string, obrigatório, mínimo 2 caracteres
// email  → string, formato de email válido
// password → string, mínimo 8 caracteres
```

## 🔹 CHECKPOINT 1 — Instalar Zod

```bash
npm install zod
```

## 🔹 CHECKPOINT 2 — Criar um schema de validação

Cria um ficheiro separado para os schemas, por exemplo `schemas/auth.schema.js`.

> 💡 **Dica:** Usa `z.object({})` para definir um objeto, `z.string()` para strings, `.min()` para comprimento mínimo, `.email()` para validar formato de email.

## 🔹 CHECKPOINT 3 — Aplicar validação nas rotas

Antes de processar o pedido, valida o `req.body` com o schema.

> 💡 **Dica:** O método `schema.safeParse(data)` devolve `{ success: true, data }` ou `{ success: false, error }`. O `error.format()` devolve os erros organizados por campo.

> ⚠️ Se a validação falhar, responde com status `400` e os erros por campo. Não continues a processar o pedido.

---

# 🧩 PARTE 2 — Confirmação de conta por email

## 🧠 Conceito — Para que serve?

Quando um utilizador se regista, queremos confirmar que o email pertence mesmo a ele. O fluxo é:

```
Utilizador regista-se
   ↓
Back-end gera token aleatório + guarda na BD com prazo de validade
   ↓
Back-end envia email com link: /auth/confirm?token=XXXXX
   ↓
Utilizador clica no link
   ↓
Back-end verifica o token (existe? não expirou?)
   ↓
Marca a conta como confirmada
```

## 🧠 O que precisamos na base de dados?

A tabela `users` vai precisar de dois novos campos:
- `is_verified` — booleano, começa a `false`
- `verification_token` — string aleatória, apagada depois de confirmar

> 💡 **Dica:** Usa `ALTER TABLE` ou recria a tabela com os novos campos. Em SQLite, `ALTER TABLE` só suporta adicionar colunas.

## 🧠 O que é o Nodemailer?

`nodemailer` é a biblioteca mais usada em Node.js para enviar emails.

Funciona com qualquer servidor SMTP — Gmail, Outlook, Mailtrap, etc.

Para desenvolvimento, existe o **Mailtrap** — um servidor de email falso que captura os emails sem os enviar a ninguém. Ideal para testes.

> 🔗 Criar conta gratuita em: https://mailtrap.io

## 🔹 CHECKPOINT 4 — Instalar Nodemailer

```bash
npm install nodemailer
```

## 🔹 CHECKPOINT 5 — Configurar o transporter

Cria um ficheiro `services/email.service.js`.

O transporter é o objeto que sabe como enviar emails (servidor, porta, credenciais).

> 💡 **Dica:** Usa as credenciais SMTP do Mailtrap para testes. Nunca coloques as credenciais diretamente no código — usa variáveis de ambiente ou um ficheiro `.env`.

## 🔹 CHECKPOINT 6 — Modificar o register

Quando um utilizador se regista:
1. Gerar um token aleatório (`crypto.randomBytes(32).toString('hex')`)
2. Guardar o token na BD associado ao utilizador
3. Enviar email com o link de confirmação
4. Responder `201` mas indicar que o email precisa de ser confirmado

## 🔹 CHECKPOINT 7 — Criar rota de confirmação

`GET /auth/confirm?token=XXXXX`

Esta rota deve:
1. Procurar o token na BD
2. Verificar se existe e não expirou
3. Marcar o utilizador como verificado
4. Apagar o token da BD

> 💡 **Dica:** Para prazo de validade, guarda a data de criação do token e verifica se não passaram mais de X horas.

---

# 🧩 PARTE 3 — Reset de Password

## 🧠 Conceito — Fluxo de "esqueci a password"

```
Utilizador pede reset (envia email)
   ↓
Back-end gera token temporário + envia email
   ↓
Utilizador clica no link
   ↓
Utilizador define nova password
   ↓
Back-end valida o token + atualiza a password + invalida o token
```

> ⚠️ **Nunca** dizes se o email existe ou não — responde sempre com a mesma mensagem genérica. Caso contrário, estás a revelar quais emails estão registados.

## 🔹 CHECKPOINT 8 — Modificar a tabela users

Adicionar campos para o reset de password:
- `reset_token` — token aleatório
- `reset_token_expires` — data de expiração

## 🔹 CHECKPOINT 9 — Criar rota de pedido de reset

`POST /auth/forgot-password`

Recebe o email, gera token, envia email com link.

## 🔹 CHECKPOINT 10 — Criar rota de reset

`POST /auth/reset-password`

Recebe o token e a nova password, valida, atualiza.

---

# 🧩 PARTE 4 — Angular (apoio visual)

## 🔹 CHECKPOINT 11 — Página "Esqueci a password"

Criar componente `pages/forgot-password` com um formulário simples (só o campo de email).

Ao submeter, chamar `POST /auth/forgot-password` e mostrar uma mensagem de sucesso genérica.

## 🔹 CHECKPOINT 12 — Página de reset

Criar componente `pages/reset-password`.

Esta página recebe o token pelo query param (`?token=XXXXX`) — usar `ActivatedRoute` para ler o token da URL.

Mostrar formulário com nova password + confirmação.

> 💡 **Dica:** Para ler query params em Angular:
> ```typescript
> private route = inject(ActivatedRoute);
> const token = this.route.snapshot.queryParams['token'];
> ```

---

# 🧪 Exercícios

## 🟢 Exercício 1 — Validação básica
Adicionar validação `zod` ao `POST /auth/register`. Testar no Swagger com dados inválidos e confirmar que os erros aparecem por campo.

## 🟢 Exercício 2 — Confirmação de conta
Implementar o fluxo completo de confirmação de conta. Verificar no Mailtrap que o email chega.

## 🟡 Exercício 3 — Bloquear login sem confirmação
Modificar o `POST /auth/login` para rejeitar utilizadores que ainda não confirmaram o email.

## 🟡 Exercício 4 — Reset de password
Implementar o fluxo completo de reset de password. Confirmar que o token expira após 1 hora.

## 🔴 Exercício 5 — Reenvio de email
Criar rota `POST /auth/resend-verification` para reenviar o email de confirmação. Proteger contra abuso (limitar a 1 pedido por minuto por email).

---

# 🔥 Desafios

## 🟢 Obrigatório
- Validação com Zod nas rotas de register e login
- Mensagens de erro por campo
- Email de confirmação de conta (Mailtrap)

## 🟡 Intermédio
- Fluxo completo de reset de password
- Bloquear login de contas não verificadas
- Páginas Angular para forgot-password e reset-password

## 🔴 Avançado
- Templates HTML para os emails (em vez de texto simples)
- Reenvio de email de confirmação com rate limiting
- Variáveis de ambiente com `dotenv` para as credenciais
