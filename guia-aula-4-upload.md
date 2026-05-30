# 🎯 Objetivo da aula

No final desta aula, vais ter:

- Upload de ficheiros (imagens, PDFs) através da API
- Validação de tipo e tamanho dos ficheiros no back-end
- Ficheiros guardados no servidor e o caminho na base de dados
- Rota para servir ficheiros estáticos
- Formulário Angular para fazer upload e visualizar o ficheiro enviado

---

# 🧠 O que vamos fazer

Vamos adicionar ao back-end a capacidade de receber ficheiros do cliente e guardá-los no servidor.

O caso de uso mais comum: **foto de perfil do utilizador**.

```
Angular envia formulário com ficheiro (multipart/form-data)
   ↓
Back-end recebe o ficheiro com multer
   ↓
Validar: é uma imagem? Tem menos de 5MB?
   ↓
Guardar o ficheiro na pasta /uploads
   ↓
Guardar o nome/caminho na base de dados
   ↓
Devolver o URL público do ficheiro
   ↓
Angular exibe a imagem
```

---

# 🧩 PARTE 1 — Conceitos

## 🧠 O que é multipart/form-data?

Quando um formulário HTML envia um ficheiro, o conteúdo não é JSON — é `multipart/form-data`. É um formato que permite misturar texto e dados binários no mesmo pedido.

O Express por defeito não sabe processar este formato. É para isso que usamos o `multer`.

## 🧠 O que é o Multer?

`multer` é um middleware para Express que processa pedidos `multipart/form-data`.

Trata de:
- Receber o ficheiro do pedido
- Guardá-lo em disco (ou em memória)
- Disponibilizar a informação do ficheiro em `req.file`

## 🧠 Onde guardar os ficheiros?

Para esta aula: **em disco**, numa pasta `uploads/` dentro do projeto.

> 💡 Em produção, normalmente usa-se um serviço externo como Amazon S3 ou Cloudflare R2. Para aprendizagem, guardar em disco é suficiente.

---

# 🧩 PARTE 2 — Configurar o Multer

## 🔹 CHECKPOINT 1 — Instalar multer

```bash
npm install multer
```

## 🔹 CHECKPOINT 2 — Configurar o storage

O multer precisa de saber **onde** e **com que nome** guardar os ficheiros.

Usa `multer.diskStorage()` para configurar:
- `destination` — a pasta onde guardar (ex: `./uploads`)
- `filename` — o nome do ficheiro guardado

> 💡 **Dica:** Nunca uses o nome original do ficheiro diretamente (`req.file.originalname`). Pode conter caracteres especiais, espaços ou ser malicioso. Gera um nome único com `Date.now()` ou `crypto.randomUUID()` e mantém apenas a extensão original.

> 💡 Para extrair a extensão: `path.extname(file.originalname)`

## 🔹 CHECKPOINT 3 — Configurar validação de ficheiros

O multer aceita um campo `fileFilter` onde podes rejeitar ficheiros que não queres.

> 💡 Verifica `file.mimetype` — para imagens, os valores válidos são `image/jpeg`, `image/png`, `image/webp`, etc.

Também podes limitar o tamanho com `limits: { fileSize: 5 * 1024 * 1024 }` (5MB).

## 🔹 CHECKPOINT 4 — Criar a pasta uploads

Criar a pasta manualmente ou verificar no código se existe e criá-la se não existir:

```javascript
// Dica: usa o módulo 'fs' do Node.js
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}
```

---

# 🧩 PARTE 3 — Rotas de upload

## 🔹 CHECKPOINT 5 — Rota de upload de foto de perfil

`POST /auth/avatar` — protegida por autenticação.

Para aplicar o multer numa rota específica, passa-o como middleware:

```javascript
// Exemplo de como usar o multer como middleware
// upload.single('avatar') → espera um campo chamado 'avatar' no formulário
app.post('/auth/avatar', authenticateToken, upload.single('avatar'), (req, res) => {
  // req.file contém a informação do ficheiro
});
```

O handler deve:
1. Verificar se `req.file` existe (o multer pode não ter recebido nada)
2. Guardar o caminho/nome do ficheiro na tabela `users` para o utilizador autenticado
3. Devolver o URL público do ficheiro

> 💡 O URL público vai ser algo como `http://localhost:3000/uploads/nome-do-ficheiro.jpg`

## 🔹 CHECKPOINT 6 — Modificar a tabela users

Adicionar a coluna `avatar` à tabela `users` para guardar o nome do ficheiro.

## 🔹 CHECKPOINT 7 — Servir os ficheiros estáticos

Para que o Angular consiga aceder aos ficheiros pelo URL, o Express precisa de servir a pasta `uploads/` como estática:

```javascript
// Dica: usa express.static()
app.use('/uploads', express.static('uploads'));
```

Depois disto, um ficheiro em `./uploads/foto.jpg` fica acessível em `http://localhost:3000/uploads/foto.jpg`.

## 🔹 CHECKPOINT 8 — Incluir o avatar na resposta do /auth/me

Modifica a rota `GET /auth/me` para incluir o campo `avatar` na resposta.

> 💡 Pensa: devolves o nome do ficheiro ou o URL completo? Qual é mais conveniente para o Angular?

---

# 🧩 PARTE 4 — Tratar erros do Multer

## 🧠 Conceito — Como o Multer reporta erros?

Quando o multer rejeita um ficheiro (tipo inválido, tamanho excedido), lança um erro especial do tipo `MulterError`.

Precisas de um **error handler** específico para capturar esses erros e devolver uma resposta legível.

> 💡 **Dica:** Um error handler em Express tem 4 parâmetros: `(err, req, res, next)`. O Express reconhece-o pelo número de parâmetros.

```javascript
// Estrutura de um error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // erro do multer (ex: ficheiro demasiado grande)
  }
  // outros erros
});
```

---

# 🧩 PARTE 5 — Angular (apoio visual)

## 🧠 Conceito — Como enviar ficheiros com Angular?

Para enviar ficheiros, não usas JSON — usas `FormData`:

```typescript
// Dica: como construir um FormData com um ficheiro
const formData = new FormData();
formData.append('avatar', file); // 'avatar' tem de coincidir com o campo esperado pelo multer

// O HttpClient envia automaticamente como multipart/form-data
this.http.post('/auth/avatar', formData, { headers: { Authorization: `Bearer ${token}` } });
```

> ⚠️ Quando usas `FormData`, **não defines** o `Content-Type` manualmente — o browser define-o automaticamente com o `boundary` correto.

## 🔹 CHECKPOINT 9 — Adicionar método uploadAvatar ao AuthService

Adiciona um método ao `AuthService` que recebe um `File` e faz o pedido com `FormData`.

## 🔹 CHECKPOINT 10 — Formulário de upload na página de perfil

Na página `/profile`, adicionar:
- Um input `<input type="file" accept="image/*">`
- Um botão de upload
- Prévia da imagem atual (se existir)
- Prévia da nova imagem antes de enviar (usa `URL.createObjectURL(file)`)

> 💡 Para capturar o ficheiro selecionado num componente Angular:
> ```typescript
> onFileSelected(event: Event) {
>   const input = event.target as HTMLInputElement;
>   const file = input.files?.[0];
> }
> ```

---

# 🧪 Exercícios

## 🟢 Exercício 1 — Upload básico
Configurar o multer e criar a rota `POST /auth/avatar`. Testar no Swagger enviando uma imagem.

## 🟢 Exercício 2 — Servir estáticos
Confirmar que após o upload, a imagem é acessível pelo URL `http://localhost:3000/uploads/...`.

## 🟡 Exercício 3 — Validação
Testar a rejeição de ficheiros inválidos: enviar um `.txt` e um ficheiro maior que 5MB. Confirmar que a resposta é um erro claro.

## 🟡 Exercício 4 — Angular com upload
Implementar o formulário de upload na página de perfil com prévia da imagem.

## 🔴 Exercício 5 — Substituir avatar
Quando um utilizador faz upload de um novo avatar, apagar o ficheiro antigo do disco antes de guardar o novo.

> 💡 Usa `fs.unlink()` para apagar ficheiros. Cuidado com paths relativos vs absolutos.

---

# 🔥 Desafios

## 🟢 Obrigatório
- Multer configurado com validação de tipo e tamanho
- Rota `POST /auth/avatar` protegida
- Ficheiros servidos como estáticos
- Avatar guardado na base de dados

## 🟡 Intermédio
- Formulário Angular com upload e prévia
- Error handler para erros do Multer
- Avatar incluído na resposta de `/auth/me`

## 🔴 Avançado
- Apagar ficheiro antigo ao substituir o avatar
- Redimensionar a imagem antes de guardar (biblioteca `sharp`)
- Suporte a upload de múltiplos ficheiros (`upload.array()`)
