# 🎯 Objetivo da aula

No final desta aula, vais ter:

- Um back-end em Node.js + Express.js
- Uma API simples de autenticação
- Registo de utilizador com confirmação de password
- Login com email e password
- Passwords guardadas de forma segura com bcrypt
- Token JWT para identificar o utilizador
- Swagger UI para documentar e testar a API
- Utilizadores guardados numa base de dados SQLite
- Uma página Angular para criar conta
- Uma página Angular para fazer login
- Uma página protegida que só aparece quando o login foi feito

---

# 🧠 O que vamos fazer

Vamos criar uma autenticação simples para uma aplicação web.

A ideia é:

```
Angular Frontend
   ↓
Formulário de Login / Registo
   ↓
Node.js + Express.js Backend
   ↓
Validação do utilizador
   ↓
JWT Token
   ↓
Frontend guarda o token
   ↓
Utilizador fica autenticado
```

---

# ✨ Nice to Have — Iniciar ambos os projetos com um só comando

> Esta parte pode ser feita agora ou no final. O objetivo é facilitar o desenvolvimento: em vez de abrir dois terminais, usamos um só comando para iniciar o back-end e o front-end ao mesmo tempo.

Na **raiz do projeto** (fora das pastas `auth-backend` e `auth-frontend`), criar o ficheiro `package.json`:

```bash
npm init -y
```

Instalar o `concurrently`:

```bash
npm install --save-dev concurrently
```

No ficheiro `package.json` da raiz, substituir os scripts por:

```json
"scripts": {
  "start": "concurrently --names \"backend,frontend\" --prefix-colors \"cyan,magenta\" \"npm run dev --prefix auth-backend\" \"npm start --prefix auth-frontend\""
}
```

A partir de agora, basta correr na raiz:

```bash
npm start
```

para iniciar os dois projetos ao mesmo tempo.

---

# 🧩 PARTE 1 — Criar o Back-end

## 🔹 CHECKPOINT 1 — Criar projeto Node.js

Criar uma pasta para o back-end:

```bash
mkdir auth-backend
cd auth-backend
npm init -y
```

Instalar as bibliotecas necessárias:

```bash
npm install express cors bcrypt jsonwebtoken swagger-ui-express swagger-jsdoc
npm install --save-dev nodemon
```

---

## 🧠 O que são estas bibliotecas?

### express

Framework para criar APIs em Node.js.

### cors

Permite que o Angular consiga comunicar com o back-end.

### bcrypt

Serve para encriptar passwords.

⚠️ Nunca devemos guardar passwords em texto normal.

### jsonwebtoken

Serve para criar tokens de autenticação.

### swagger-ui-express

Cria a interface visual do Swagger.

### swagger-jsdoc

Permite gerar documentação automaticamente através de comentários.

### nodemon

Reinicia automaticamente o servidor sempre que alteramos o código.

---

## 🔹 CHECKPOINT 2 — Preparar o package.json

No ficheiro `package.json`, adicionar:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

---

## 🔹 CHECKPOINT 3 — Criar o servidor Express

Criar o ficheiro:

```bash
touch server.js
```

Adicionar o seguinte código:

```js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const JWT_SECRET = 'my-secret-key';

// Base de dados falsa em memória
const users = [];

/**
 * SWAGGER CONFIGURATION
 */

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Auth API',
      version: '1.0.0',
      description: 'Simple authentication API with Node.js, Express.js and JWT'
    },
    servers: [{ url: 'http://localhost:3000' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./server.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * AUTH MIDDLEWARE
 */

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token not provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

/**
 * @swagger
 * /:
 *   get:
 *     summary: Check if the API is running
 *     responses:
 *       200:
 *         description: API is running
 */
app.get('/', (req, res) => {
  res.send('Auth API is running');
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Create a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ash
 *               email:
 *                 type: string
 *                 example: ash@test.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: User already exists
 */
app.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  const userAlreadyExists = users.find(user => user.email === email);

  if (userAlreadyExists) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = {
    id: users.length + 1,
    name,
    email,
    password: hashedPassword
  };

  users.push(newUser);

  res.status(201).json({ message: 'User created successfully' });
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: ash@test.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid credentials
 */
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = users.find(user => user.email === email);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const passwordIsValid = await bcrypt.compare(password, user.password);

  if (!passwordIsValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({
    message: 'Login successful',
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get authenticated user information
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information returned successfully
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Invalid or expired token
 */
app.get('/auth/me', authenticateToken, (req, res) => {
  res.json({ message: 'Protected data', user: req.user });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

⚠️ Neste momento os utilizadores são guardados num **array em memória**. Se o servidor reiniciar, os utilizadores desaparecem. Vamos resolver isso na **PARTE 9** com SQLite.

---

## 🔹 CHECKPOINT 4 — Correr o servidor

Executar:

```bash
npm run dev
```

Abrir: `http://localhost:3000`

Resultado esperado:

```
Auth API is running
```

---

# 🧩 PARTE 2 — Swagger

## 🔹 CHECKPOINT 5 — Abrir Swagger UI

Abrir: `http://localhost:3000/api-docs`

Resultado esperado:

- Swagger UI abre no browser
- As rotas aparecem documentadas
- É possível testar a API diretamente no browser

---

## 🔹 CHECKPOINT 6 — Testar Register

Abrir: `POST /auth/register`

Testar com:

```json
{
  "name": "Ash",
  "email": "ash@test.com",
  "password": "123456"
}
```

Resultado esperado:

```json
{
  "message": "User created successfully"
}
```

---

## 🔹 CHECKPOINT 7 — Testar Login

Abrir: `POST /auth/login`

Testar com:

```json
{
  "email": "ash@test.com",
  "password": "123456"
}
```

Resultado esperado:

```json
{
  "message": "Login successful",
  "token": "JWT_TOKEN_AQUI"
}
```

---

## 🔹 CHECKPOINT 8 — Testar rota protegida

1. Copiar o token recebido no passo anterior
2. Clicar no botão `Authorize` no Swagger UI
3. Escrever:

```
Bearer TOKEN_AQUI
```

4. Testar: `GET /auth/me`

Resultado esperado:

```json
{
  "message": "Protected data",
  "user": {
    "id": 1,
    "name": "Ash",
    "email": "ash@test.com"
  }
}
```

---

# 🧩 PARTE 3 — Preparar o Angular

## 🔹 CHECKPOINT 9 — Criar projeto Angular

Criar aplicação (fora da pasta `auth-backend`):

```bash
ng new auth-frontend
```

Respostas:

```
Routing → YES
Styles → CSS
```

Entrar na pasta:

```bash
cd auth-frontend
```

Instalar Bootstrap:

```bash
npm install bootstrap
```

---

## 🔹 CHECKPOINT 10 — Adicionar Bootstrap

No ficheiro `angular.json`, dentro de `"styles"`:

```json
"styles": [
  "node_modules/bootstrap/dist/css/bootstrap.min.css",
  "src/styles.css"
]
```

---

## 🔹 CHECKPOINT 11 — Criar componentes

Criar páginas:

```bash
ng generate component pages/login
ng generate component pages/register
ng generate component pages/profile
```

Criar service:

```bash
ng generate service services/auth
```

---

# 🧩 PARTE 4 — Criar AuthService

## 🔹 CHECKPOINT 12 — Configurar HttpClient

No ficheiro `src/app/app.config.ts`:

```ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient()
  ]
};
```

---

## 🔹 CHECKPOINT 13 — Criar AuthService

No ficheiro `src/app/services/auth.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:3000/auth';

  register(data: RegisterRequest) {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(data: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, data);
  }

  saveToken(token: string) {
    localStorage.setItem('token', token);
  }

  getToken() {
    return localStorage.getItem('token');
  }

  isLoggedIn() {
    return !!this.getToken();
  }

  logout() {
    localStorage.removeItem('token');
  }

  getProfile() {
    return this.http.get(`${this.apiUrl}/me`, {
      headers: {
        Authorization: `Bearer ${this.getToken()}`
      }
    });
  }
}
```

---

# 🧩 PARTE 5 — Routing Angular

## 🔹 CHECKPOINT 14 — Configurar Rotas

No ficheiro `src/app/app.routes.ts`:

```ts
import { Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ProfileComponent } from './pages/profile/profile.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'profile', component: ProfileComponent }
];
```

---

## 🔹 CHECKPOINT 15 — Atualizar app.component.html

No ficheiro `src/app/app.component.html`:

```html
<nav class="navbar navbar-expand-lg bg-body-tertiary px-4">
  <a class="navbar-brand" routerLink="/login">
    Auth App
  </a>

  <div class="navbar-nav">
    <a class="nav-link" routerLink="/login">Login</a>
    <a class="nav-link" routerLink="/register">Create Account</a>
    <a class="nav-link" routerLink="/profile">Profile</a>
  </div>
</nav>

<router-outlet></router-outlet>
```

---

# 🧩 PARTE 6 — Página de Criar Conta

## 🔹 CHECKPOINT 16 — Register Component

No ficheiro `register.component.ts`:

```ts
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  name = '';
  email = '';
  password = '';

  message = '';

  register() {
    this.authService.register({
      name: this.name,
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        this.message = 'Account created successfully';
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.message = error.error?.message || 'Error creating account';
      }
    });
  }
}
```

---

## 🔹 CHECKPOINT 17 — Register HTML

No ficheiro `register.component.html`:

```html
<div class="container mt-5" style="max-width: 500px;">
  <h2>Create Account</h2>

  @if (message) {
    <div class="alert alert-info">{{ message }}</div>
  }

  <div class="mb-3">
    <label class="form-label">Name</label>
    <input class="form-control" [(ngModel)]="name">
  </div>

  <div class="mb-3">
    <label class="form-label">Email</label>
    <input class="form-control" type="email" [(ngModel)]="email">
  </div>

  <div class="mb-3">
    <label class="form-label">Password</label>
    <input class="form-control" type="password" [(ngModel)]="password">
  </div>

  <button class="btn btn-primary w-100" (click)="register()">
    Create Account
  </button>

  <p class="mt-3">
    Already have an account?
    <a routerLink="/login">Login here</a>
  </p>
</div>
```

---

## 🔹 CHECKPOINT 18 — Confirmação de Password

Quando o utilizador cria conta, deve confirmar a password antes de submeter o formulário. Vamos adicionar esse campo e validá-lo no componente.

No ficheiro `register.component.ts`, adicionar o campo `confirmPassword` e uma validação antes de chamar a API:

```ts
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  name = '';
  email = '';
  password = '';
  confirmPassword = '';  // ← novo campo

  message = '';

  register() {
    // ← validação antes de chamar a API
    if (this.password !== this.confirmPassword) {
      this.message = 'Passwords do not match';
      return;
    }

    this.authService.register({
      name: this.name,
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        this.message = 'Account created successfully';
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.message = error.error?.message || 'Error creating account';
      }
    });
  }
}
```

No ficheiro `register.component.html`, adicionar o campo a seguir ao campo de password:

```html
<div class="mb-3">
  <label class="form-label">Confirm Password</label>
  <input class="form-control" type="password" [(ngModel)]="confirmPassword">
</div>
```

Resultado esperado:

- Se as passwords não coincidirem, aparece a mensagem `Passwords do not match`
- O pedido ao servidor só é feito quando as passwords coincidem

---

# 🧩 PARTE 7 — Página de Login

## 🔹 CHECKPOINT 19 — Login Component

No ficheiro `login.component.ts`:

```ts
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';

  message = '';

  login() {
    this.authService.login({
      email: this.email,
      password: this.password
    }).subscribe({
      next: (response) => {
        this.authService.saveToken(response.token);
        this.router.navigate(['/profile']);
      },
      error: (error) => {
        this.message = error.error?.message || 'Login failed';
      }
    });
  }
}
```

---

## 🔹 CHECKPOINT 20 — Login HTML

No ficheiro `login.component.html`:

```html
<div class="container mt-5" style="max-width: 500px;">
  <h2>Login</h2>

  @if (message) {
    <div class="alert alert-danger">{{ message }}</div>
  }

  <div class="mb-3">
    <label class="form-label">Email</label>
    <input class="form-control" type="email" [(ngModel)]="email">
  </div>

  <div class="mb-3">
    <label class="form-label">Password</label>
    <input class="form-control" type="password" [(ngModel)]="password">
  </div>

  <button class="btn btn-success w-100" (click)="login()">
    Login
  </button>

  <p class="mt-3">
    Don't have an account?
    <a routerLink="/register">Create one here</a>
  </p>
</div>
```

---

# 🧩 PARTE 8 — Página Protegida

## 🔹 CHECKPOINT 21 — Profile Component

No ficheiro `profile.component.ts`:

```ts
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  imports: [],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  user: any = null;

  message = '';

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.authService.getProfile().subscribe({
      next: (response: any) => {
        this.user = response.user;
      },
      error: () => {
        this.message = 'Session expired. Please login again.';
        this.authService.logout();
        this.router.navigate(['/login']);
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
```

---

## 🔹 CHECKPOINT 22 — Profile HTML

No ficheiro `profile.component.html`:

```html
<div class="container mt-5" style="max-width: 600px;">
  <h2>Profile</h2>

  @if (message) {
    <div class="alert alert-warning">{{ message }}</div>
  }

  @if (user) {
    <div class="card shadow-sm">
      <div class="card-body">
        <h4 class="card-title">Login successful ✅</h4>

        <p><strong>Name:</strong> {{ user.name }}</p>
        <p><strong>Email:</strong> {{ user.email }}</p>

        <p class="text-success">You are authenticated!</p>

        <button class="btn btn-outline-danger" (click)="logout()">
          Logout
        </button>
      </div>
    </div>
  }
</div>
```

---

# 🧩 PARTE 9 — Persistência com SQLite

Neste momento, os utilizadores ficam em memória — se o servidor reiniciar, perdem-se. Vamos resolver isso usando uma base de dados **SQLite**.

O SQLite é uma base de dados simples que guarda tudo num ficheiro (`.db`). É ideal para projetos pequenos e para aprender SQL sem precisar de instalar um servidor de base de dados.

## 🔹 CHECKPOINT 23 — Instalar better-sqlite3

Na pasta `auth-backend`, instalar a biblioteca:

```bash
npm install better-sqlite3
```

---

## 🔹 CHECKPOINT 24 — Criar a base de dados

No topo do `server.js`, a seguir ao `require` das outras bibliotecas, adicionar:

```js
const Database = require('better-sqlite3');

// Cria o ficheiro database.db se não existir
const db = new Database('database.db');

// Cria a tabela de utilizadores se não existir
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )
`);
```

E **remover** a linha do array em memória:

```js
// Apagar esta linha:
const users = [];
```

---

## 🔹 CHECKPOINT 25 — Migrar o Register para SQLite

Substituir o handler do `POST /auth/register` pela versão com base de dados:

```js
app.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  // Verificar se o utilizador já existe
  const userAlreadyExists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

  if (userAlreadyExists) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Inserir o utilizador na base de dados
  db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hashedPassword);

  res.status(201).json({ message: 'User created successfully' });
});
```

---

## 🔹 CHECKPOINT 26 — Migrar o Login para SQLite

Substituir o handler do `POST /auth/login` pela versão com base de dados:

```js
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  // Procurar o utilizador na base de dados
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const passwordIsValid = await bcrypt.compare(password, user.password);

  if (!passwordIsValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({
    message: 'Login successful',
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
});
```

---

## 🔹 CHECKPOINT 27 — Testar com Swagger

Reiniciar o servidor:

```bash
npm run dev
```

Abrir o Swagger: `http://localhost:3000/api-docs`

Testar:

1. `POST /auth/register` → criar um utilizador
2. Reiniciar o servidor (`Ctrl+C` e `npm run dev` novamente)
3. `POST /auth/login` com o mesmo utilizador

Resultado esperado:

- O utilizador **persiste** mesmo após o servidor reiniciar
- O ficheiro `database.db` foi criado na pasta `auth-backend`

---

# 🧪 Exercícios

## 🟢 Exercício 1 — Criar conta

Criar um utilizador através da página `/register`.

---

## 🟢 Exercício 2 — Fazer login

Autenticar o utilizador através da página `/login`.

---

## 🟢 Exercício 3 — Testar Swagger

Testar `Register`, `Login` e `/auth/me` diretamente no Swagger UI.

---

## 🟢 Exercício 4 — Verificar persistência

1. Criar uma conta
2. Reiniciar o servidor (`Ctrl+C` e `npm run dev`)
3. Fazer login com a mesma conta

O utilizador deve continuar a existir.

---

## 🟡 Exercício 5 — Melhorar validações

Adicionar:

- Password mínima de 8 caracteres
- Email obrigatório e com formato válido
- Mensagens de erro específicas por campo

---

## 🟡 Exercício 6 — Melhorar UI

Melhorar:

- Cards e espaçamentos
- Indicadores de erro por campo (classe `is-invalid` do Bootstrap)
- Botões e responsividade

---

## 🔴 Exercício 7 — Route Guard

Criar um Guard Angular que impede o acesso ao `/profile` sem login.

Gerar o guard:

```bash
ng generate guard guards/auth
```

Conteúdo do `auth.guard.ts`:

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
```

Aplicar na rota protegida em `app.routes.ts`:

```ts
import { authGuard } from './guards/auth.guard';

{ path: 'profile', component: ProfileComponent, canActivate: [authGuard] }
```

---

# 🔥 Desafios

## 🟢 Obrigatório

- Criar conta
- Fazer login
- JWT Token
- Swagger UI
- Página protegida
- Logout
- Persistência com SQLite

---

## 🟡 Intermédio

- Confirmação de password no registo
- Melhorar UI com Bootstrap
- Validações por campo com mensagens específicas
- Route Guard

---

## 🔴 Avançado — Editar Perfil

Implementar uma página que permite ao utilizador alterar o nome, o email e a password.

### Back-end

Adicionar uma nova rota `PUT /auth/profile` protegida pelo middleware de autenticação:

```js
/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Update authenticated user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: No fields to update
 *       401:
 *         description: Token not provided
 */
app.put('/auth/profile', authenticateToken, async (req, res) => {
  const { name, email, password } = req.body;

  if (!name && !email && !password) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  const updatedName = name || user.name;
  const updatedEmail = email || user.email;
  let updatedPassword = user.password;

  if (password) {
    updatedPassword = await bcrypt.hash(password, 10);
  }

  db.prepare('UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?')
    .run(updatedName, updatedEmail, updatedPassword, req.user.id);

  res.json({ message: 'Profile updated successfully' });
});
```

### Angular — AuthService

Adicionar o método `updateProfile` ao `auth.service.ts`:

```ts
interface UpdateProfileRequest {
  name?: string;
  email?: string;
  password?: string;
}

updateProfile(data: UpdateProfileRequest) {
  return this.http.put(`${this.apiUrl}/profile`, data, {
    headers: {
      Authorization: `Bearer ${this.getToken()}`
    }
  });
}
```

### Angular — Componente

Criar o componente:

```bash
ng generate component pages/edit-profile
```

Conteúdo do `edit-profile.component.ts`:

```ts
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-edit-profile',
  imports: [FormsModule, RouterLink],
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.css'
})
export class EditProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  successMessage = '';
  errorMessage = '';

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.authService.getProfile().subscribe({
      next: (response: any) => {
        this.name = response.user.name;
        this.email = response.user.email;
      },
      error: () => {
        this.authService.logout();
        this.router.navigate(['/login']);
      }
    });
  }

  save() {
    if (this.password && this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.successMessage = '';
    this.errorMessage = '';

    const payload: { name: string; email: string; password?: string } = {
      name: this.name,
      email: this.email
    };

    if (this.password) {
      payload.password = this.password;
    }

    this.authService.updateProfile(payload).subscribe({
      next: () => {
        this.successMessage = 'Profile updated successfully!';
        this.password = '';
        this.confirmPassword = '';
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error updating profile';
      }
    });
  }
}
```

Conteúdo do `edit-profile.component.html`:

```html
<div class="container mt-5" style="max-width: 500px;">
  <h2>Edit Profile</h2>

  @if (successMessage) {
    <div class="alert alert-success">{{ successMessage }}</div>
  }

  @if (errorMessage) {
    <div class="alert alert-danger">{{ errorMessage }}</div>
  }

  <div class="mb-3">
    <label class="form-label">Name</label>
    <input class="form-control" [(ngModel)]="name">
  </div>

  <div class="mb-3">
    <label class="form-label">Email</label>
    <input class="form-control" type="email" [(ngModel)]="email">
  </div>

  <div class="mb-3">
    <label class="form-label">New Password</label>
    <small class="text-muted d-block mb-1">Leave blank to keep current password</small>
    <input class="form-control" type="password" [(ngModel)]="password">
  </div>

  <div class="mb-4">
    <label class="form-label">Confirm New Password</label>
    <input class="form-control" type="password" [(ngModel)]="confirmPassword">
  </div>

  <button class="btn btn-primary w-100" (click)="save()">Save Changes</button>
  <a class="btn btn-outline-secondary w-100 mt-2" routerLink="/profile">Cancel</a>
</div>
```

### Angular — Rota

Adicionar a rota em `app.routes.ts`:

```ts
import { EditProfileComponent } from './pages/edit-profile/edit-profile.component';

{ path: 'edit-profile', component: EditProfileComponent, canActivate: [authGuard] }
```

Adicionar o link na página de perfil:

```html
<a class="btn btn-outline-primary" routerLink="/edit-profile">Edit Profile</a>
```

---

## 🔴 Outros desafios avançados

- **Roles** (admin/user) — utilizadores com diferentes permissões
- **Refresh tokens** — renovar o JWT sem fazer login novamente
- **Password reset** — enviar email para redefinir a password
- **Docker** — containerizar os dois projetos
