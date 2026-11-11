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
│   ├── incomes.js         ← GET/POST/DELETE /api/incomes (ingressos)
│   └── analytics.js       ← GET /api/analytics (crida l'script de Python)
├── analytics/
│   ├── report.py          ← anàlisi amb pandas + gràfics amb matplotlib
│   └── requirements.txt
├── utils/dates.js         ← regles de dates (any en curs editable, des del 2026)
├── migrations/            ← canvis d'esquema per a bases de dades ja creades
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

   **Si ja tenies la base de dades creada d'abans**, executa una sola vegada la migració
   que afegeix la data triada per l'usuari a cada despesa (les despeses existents es mantenen):
   ```
   mysql -u root -p pressupost < migrations/001_expense_dates.sql
   mysql -u root -p pressupost < migrations/002_incomes.sql
   ```

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

## Dates de les despeses (calendari)

- Cada despesa té `date` (el dia en què es va gastar, el tria l'usuari al calendari) i
  `created_at` (quan es va apuntar a l'app, automàtic).
- `GET /api/categories?month=YYYY-MM` retorna les categories amb les despeses d'aquell mes.
- Només es poden afegir o esborrar despeses de **l'any en curs i fins avui**. Els anys
  anteriors són de només lectura. L'app comença el 2026 (`utils/dates.js`).
- `GET /api/history?year=YYYY` retorna els totals d'un any concret.

## Anàlisi amb Python + pandas

`GET /api/analytics?month=all|YYYY|YYYY-MM` executa `analytics/report.py` amb `execFile`
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

## Registre de canvis (novembre 2026)

Aquest registre és el mateix als dos repositoris (`Cently_front` i `Cently_back`), perquè
la majoria de funcionalitats necessiten canvis a tots dos costats.

### Tanda 1 · Errors corregits

| On | Problema | Solució |
|---|---|---|
| Front · `app.routes.ts` | La ruta comodí `'**'` estava abans de `'historial'`. Angular comprova les rutes en ordre, així que `/historial` redirigia sempre a la landing (semblava que tornava a demanar iniciar sessió). | `'**'` es posa sempre l'última. |
| Front · `dashboard.component.ts` | La plantilla feia servir `routerLink` sense importar `RouterLink`: el botó Historial no navegava. | S'importa `RouterLink` (ara dins la barra de navegació compartida). |
| Front · `history.component.html` | Tenia `<html>`, `<head>` i `<body>` complets dins d'un component. | Eliminats. |
| Front · `history.components.scss` | Nom mal escrit (`components`). | Reanomenat a `history.component.scss`. |
| Front · `package.json` | Paquet obsolet `angular-core` que no es feia servir. | Desinstal·lat. |
| Back · `.env` | `JWT_SECRET=secret123` (massa curt) i el `.env` es pujava a GitHub. | `.env` al `.gitignore`, `.env.example` com a plantilla i el servidor no arrenca amb un secret de menys de 16 caràcters. |
| Back · `node_modules` | La carpeta `node_modules` es pujava a GitHub. | Afegida al `.gitignore`. |
| Back · `routes/categories.js` | Una consulta SQL per cada categoria (problema N+1). | Dues consultes en total amb `IN (?)`. |
| Back · `config/db.js` | MySQL retornava els `DECIMAL` com a text. | `decimalNumbers: true`. |
| Back · `routes/history.js` | Amb Express 5, `req.query` és només de lectura i l'any del filtre es concatenava com a text (`2026` + 1 = `20261`). Ho va detectar un test. | L'any es converteix a número dins la ruta. |

### Tanda 1 · Millores del backend

- **Validació de camps** amb `express-validator` a totes les rutes (`middleware/validate.js`).
  Els errors es retornen com `{ error: "..." }`, el format que ja llegeix el front.
- **`PUT /api/categories/:id`** per editar el nom i el límit d'una categoria.
- **404** quan s'intenta esborrar o editar una categoria o despesa que no existeix o no és teva.
- **Validació del `.env` a l'arrencada** (`config/validateEnv.js`): si falta alguna variable, el
  servidor avisa i s'atura.
- **`app.js` separat de `server.js`**, perquè els tests puguin provar l'app sense obrir cap port.
- **Tests amb Jest + Supertest** (`npm test`). Simulen la base de dades, així que no cal MySQL.
- **CORS** limitat a `CORS_ORIGIN` (per defecte `http://localhost:4200`).

### Tanda 1 · Millores del frontend

- **Toasts** per als missatges d'èxit i d'error (`toast.service.ts` + `toast-container`).
- **Barra de navegació compartida** (Dashboard · Historial · Anàlisi), present a totes les pàgines privades.
- **Pàgina "Editar categoria"** (`/categories/:id/edit`) amb formulari reactiu i validació.
- **Registre amb formularis reactius** (`ReactiveFormsModule`).
- **Caducitat del token:** el guard llegeix el camp `exp` del JWT. Si el back respon 401 (token
  caducat o signat amb un altre secret), l'interceptor tanca la sessió i porta a `/login` amb el
  missatge "La sessió ha caducat".
- **URLs de l'API a `src/environments/`** en lloc d'estar escrites als serveis.
- **Format català** per als imports i les dates (`30,00 €`).
- Confirmació abans d'eliminar una categoria.

### Tanda 1 · Pàgina d'anàlisi amb Python + pandas

- **Back:** `GET /api/analytics?month=all|YYYY|YYYY-MM` executa `analytics/report.py` amb
  `execFile`, sense shell. L'script només rep l'id de l'usuari (del token) i un període validat.
  Llegeix les despeses amb pandas, calcula el percentatge per categoria i el total per mes, i
  retorna dos gràfics de matplotlib en PNG (base64).
- **Front:** pàgina `/analisi` amb un selector de període, el total gastat, la categoria on s'ha
  gastat més, els dos gràfics i una taula amb el detall per categoria.

### Tanda 2 · Calendari a la home i dates de les despeses

**Decisió:** no s'ha creat cap taula nova (opció A, aprovada). Una despesa d'un mes passat és una
despesa més amb una altra data. Així l'Historial, l'Anàlisi i el dashboard continuen llegint d'una
sola taula i els totals sempre quadren.

- **Base de dades:** `expenses.date` passa a ser `DATE` (el dia en què es va gastar, el tria
  l'usuari) i s'afegeix `created_at` (quan es va apuntar a l'app, automàtic). Hi ha un índex
  `(category_id, date)`. Migració: `migrations/001_expense_dates.sql` (al repositori del back).
- **Calendari a la home:** es tria un mes (de gener de 2026 fins al mes actual) i un dia. Cada
  categoria mostra el que s'havia gastat de l'1 del mes fins a aquell dia: el dia 20 no surten
  les despeses del 25 i el dia 30 o 31 surt el mes sencer. Els dies amb despeses porten un punt.
- **La despesa es guarda amb el dia marcat**, no amb el dia en què s'apunta. Així es pot omplir
  octubre durant el novembre. Les despeses apuntades en un mes posterior porten l'etiqueta
  "apuntada més tard".
- **Regles de dates** (`utils/dates.js` al back i `src/app/utils/dates.ts` al front):
  - Només es poden afegir o esborrar despeses de **l'any en curs i fins avui**. No s'accepten dates futures.
  - Els **anys anteriors són de només lectura** (el back respon 403 si s'intenta esborrar-ne una despesa).
  - L'app comença el **2026**: no es poden consultar mesos ni anys anteriors.
- **Back:** `GET /api/categories?month=YYYY-MM`, `POST` de despeses amb `date` i
  `GET /api/history?year=YYYY`. L'anàlisi també accepta un any sencer.
- **Historial:** mostra l'any en curs i té el botó **"← Mira anys anteriors"** a dalt a l'esquerra.
- **Informes per anys** (`/historial/anys`): una pestanya per any des del 2026 amb el total de
  l'any, la categoria on s'ha gastat més, el gràfic de pandas, la taula mes a mes i la taula per
  categoria. Els anys tancats porten l'avís "només lectura".

### Tanda 3 · Ingressos, rètol de saldo i home d'escriptori

**Decisió aprovada:** taula nova `incomes`, separada de les despeses. Un ingrés no pertany a cap
categoria. Si s'hagués guardat com una despesa negativa, l'Historial, l'Anàlisi i els totals de
categories l'haurien hagut de restar a tot arreu. El saldo és **del mes**: cada mes torna a començar.

- **Base de dades:** taula `incomes` (`user_id`, `amount`, `description`, `date`, `created_at`).
  Migració: `migrations/002_incomes.sql` (al repositori del back).
- **Back:** `GET /api/incomes?month=YYYY-MM`, `POST /api/incomes` i `DELETE /api/incomes/:id`, amb
  les mateixes regles de dates que les despeses (any en curs, fins avui, anys anteriors de només lectura).
- **Rètol a dalt de la home:** "Hola, Andrea · Tens X €", on X = ingressos del mes − despeses del mes,
  fins al dia marcat al calendari. Si tries un dia passat diu "El 5 de novembre tenies X €". Si
  gastes més del que ingresses, avisa en vermell. Té el botó **"+ Afegir ingrés"** (es guarda amb el dia
  del calendari) i "Veure ingressos" per consultar-los o esborrar-los.
- **Disseny d'escriptori a pantalla completa**, en tres columnes:
  esquerra **Afegir despesa** (tria la categoria) i **Nova categoria**; centre les **categories** en
  dues columnes; dreta el **calendari**. A escriptori, les columnes laterals es queden fixes mentre fas
  scroll. A mòbil es veu en una columna: rètol, calendari, afegir i categories.
- **Cerca** per descripció, nom de categoria o import (per exemple `súper` o `43,20`) i **filtre per
  categoria**. Mostra quantes despeses coincideixen i té el botó "Treu els filtres". La cerca no canvia
  els totals ni les barres: només amaga les línies que no coincideixen.

### Com s'ha provat

- **Back:** 41 tests en verd (`npm test`) i proves contra una base de dades MySQL real amb dades
  d'exemple, incloent-hi la migració sobre dades existents.
- **Front:** `ng build` sense errors i un recorregut automàtic al navegador: login, Historial,
  Anàlisi, editar categoria, sessió caducada, calendari (filtre per dia i despesa afegida a un dia
  passat), informes per anys, ingressos i saldo del rètol, cerca, filtre per categoria i vistes
  d'escriptori, tauleta i mòbil.

### Posada en marxa després d'aquests canvis

**Back** (carpeta del back):
1. `git rm -r --cached node_modules .env`: deixa de pujar-los a GitHub sense esborrar-los del disc.
2. `npm install` i `pip install -r analytics/requirements.txt`.
3. Al `.env`, posa un `JWT_SECRET` de 16 caràcters o més i, a Windows, `PYTHON_BIN=python`.
   Pots generar el secret amb `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
4. Executa **una sola vegada** cada migració, en ordre, a la pestanya SQL de phpMyAdmin o a MySQL Workbench:
   `migrations/001_expense_dates.sql` i `migrations/002_incomes.sql`.
5. `npm test` i `npm start`.

**Front** (carpeta del front):
1. `git rm src/app/pages/history/history.components.scss`: és el fitxer amb el nom mal escrit, que ja no es fa servir.
2. `npm install` i `npm start`.
3. Com que el `JWT_SECRET` és nou, cal tornar a iniciar sessió una vegada.

**Tots dos:** `git add -A`, `git commit` i `git push`.

### Pendent

- Límit de les categories per mes (taula `monthly_limits`). Ara cada categoria té un sol límit, i
  si es canvia, els mesos anteriors també mostren el límit nou.
- Limitar els intents de login (`express-rate-limit`).
- Passar el login a formularis reactius.
- Gràfics interactius al navegador (per exemple amb Chart.js) a partir de les mateixes dades.

De la llista "Coses a futur que vull implementar":
- **Punt 2 (ingressos i rètol que es va restant):** fet (tanda 3).
- **Punt 3 ("S'estalviarà X €"):** encara no. Ara el rètol ja mostra ingressos − despeses; faltaria
  comparar els ingressos amb la suma dels límits de les categories.
- **Punt 6 (categories que es puguin modificar):** fet en part, perquè ja hi ha la pàgina
  "Editar categoria". Falta evitar que s'esborrin.
- **Punt "Afegir camp Password en users":** la taula `users` ja guarda la contrasenya xifrada amb
  bcrypt a `password_hash`.
