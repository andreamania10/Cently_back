# Pressupost — Backend (Node.js + Express + MySQL + JWT)

## Estructura
```
pressupost-backend/
├── server.js              ← punt d'entrada
├── config/db.js           ← connexió a MySQL (pool)
├── middleware/auth.js      ← comprova el token JWT
├── routes/
│   ├── auth.js             ← POST /api/auth/register, /api/auth/login
│   ├── categories.js       ← GET/POST/DELETE categories (filtrat per usuari)
│   └── expenses.js         ← DELETE expenses (comprovant propietat)
├── database.sql           ← esquema de la base de dades
└── .env.example
```

## Passos per arrencar-ho

1. **Crea la base de dades.** Amb MySQL instal·lat i en marxa:
   ```
   mysql -u root -p < database.sql
   ```
   Això crea la base `pressupost` amb les taules `users`, `categories` i `expenses`.

2. **Configura les variables d'entorn.**
   ```
   cp .env.example .env
   ```
   Edita `.env` amb el teu usuari/contrasenya de MySQL i posa un `JWT_SECRET` llarg i aleatori.

3. **Instal·la dependències i arrenca:**
   ```
   npm install
   node server.js
   ```
   El servidor escoltarà a `http://localhost:3000`.

## Com funciona l'autenticació

- **Registre / Login** (`/api/auth/register`, `/api/auth/login`) reben `name`/`email`/`password`, guarden la contrasenya **xifrada amb bcrypt** (mai en text pla) i retornen un **token JWT**.
- El frontend guarda aquest token i l'envia a totes les peticions dins la capçalera `Authorization: Bearer <token>`.
- El `middleware/auth.js` comprova aquest token a cada ruta protegida i n'extreu `req.userId`.
- **Totes les consultes de categories i despeses filtren pel `user_id`**, de manera que cada usuari només veu i modifica les seves pròpies dades — mai les d'un altre.

## Punts per seguir practicant

Algunes idees per ampliar-ho tu mateix:
- Afegir validació més estricta de camps (per exemple amb `express-validator`).
- Afegir un endpoint `PUT /api/categories/:id` per editar el límit d'una categoria.
- Fer que el `JWT_SECRET` i la resta de configuració es validin a l'arrencada (si falta alguna variable, avisar i aturar el servidor).
- Afegir tests amb Jest + Supertest per a les rutes d'autenticació.
- Passar de connexions "per consulta" a transaccions quan calgui (per exemple, si algun dia cal esborrar un usuari i tot el que en depèn en un sol pas atòmic).
