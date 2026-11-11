# Pressupost — Backend (Node.js + Express + MySQL + JWT)

## Estructura
```
pressupost-backend/
├── server.js              ← punt d'entrada (valida el .env i arrenca)
├── app.js                 ← l'app Express (separada per poder-la testejar)
├── config/
│   ├── db.js              ← connexió a MySQL (pool)
│   └── validateEnv.js     ← atura el servidor si falta configuració
├── middleware/
│   ├── auth.js            ← comprova el token JWT
│   └── validate.js        ← retorna els errors d'express-validator
├── routes/
│   ├── auth.js            ← POST /api/auth/register, /api/auth/login
│   ├── categories.js      ← GET/POST/PUT/DELETE categories (filtrat per usuari)
│   ├── expenses.js        ← DELETE expenses (comprovant propietat)
│   ├── history.js         ← GET /api/history (totals per mes i categoria)
│   └── analytics.js       ← GET /api/analytics (crida l'script de Python)
├── analytics/
│   ├── report.py          ← anàlisi amb pandas + gràfics amb matplotlib
│   └── requirements.txt
├── tests/                 ← tests amb Jest + Supertest (sense MySQL)
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
   Edita `.env` amb el teu usuari/contrasenya de MySQL i posa un `JWT_SECRET` llarg i aleatori
   (mínim 16 caràcters; si no, el servidor no arrenca). Per generar-ne un:
   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   El `.env` **no es puja a Git** (és al `.gitignore`).

3. **Instal·la les dependències de Python** (per a la pàgina d'anàlisi):
   ```
   pip install -r analytics/requirements.txt
   ```
   A Windows posa `PYTHON_BIN=python` al `.env`. Pots provar l'script sol amb
   `python analytics/report.py 1 all` (on `1` és l'id d'un usuari).

4. **Instal·la dependències i arrenca:**
   ```
   npm install
   npm start
   ```
   El servidor escoltarà a `http://localhost:3000`.

5. **Tests:** `npm test` (fan servir una base de dades simulada, no cal MySQL).

## Anàlisi amb Python + pandas

`GET /api/analytics?month=all|YYYY-MM` executa `analytics/report.py` amb `execFile`
(sense shell, només amb l'id de l'usuari del token i un mes validat). L'script llegeix les
despeses amb pandas, calcula el percentatge gastat per categoria i el total per mes, i
retorna un JSON amb les dades i dos gràfics PNG en base64.

## Com funciona l'autenticació

- **Registre / Login** (`/api/auth/register`, `/api/auth/login`) reben `name`/`email`/`password`, guarden la contrasenya **xifrada amb bcrypt** (mai en text pla) i retornen un **token JWT**.
- El frontend guarda aquest token i l'envia a totes les peticions dins la capçalera `Authorization: Bearer <token>`.
- El `middleware/auth.js` comprova aquest token a cada ruta protegida i n'extreu `req.userId`.
- **Totes les consultes de categories i despeses filtren pel `user_id`**, de manera que cada usuari només veu i modifica les seves pròpies dades — mai les d'un altre.

## Punts per seguir practicant

Fet:
- ✅ Validació de camps amb `express-validator`.
- ✅ `PUT /api/categories/:id` per editar nom i límit.
- ✅ Validació del `.env` a l'arrencada.
- ✅ Tests amb Jest + Supertest.

Pendent:
- Limitar els intents de login (`express-rate-limit`) contra atacs de força bruta.
- Passar de connexions "per consulta" a transaccions quan calgui (per exemple, si algun dia cal esborrar un usuari i tot el que en depèn en un sol pas atòmic).
