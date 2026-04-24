# Real-Time Feedback Hub

Aplicación de mensajería en tiempo real con sistema de likes, edición con
historial y notificaciones vía WebSockets. Arquitectura distribuida en 3
capas, orquestada con Docker Compose.

---

## Stack

| Capa | Tecnología |
|------|------------|
| Cliente | Vue 3 · Vite · TypeScript · Pinia · vue-router · Tailwind CSS v4 · Axios · socket.io-client |
| Servidor | Node.js · Express 5 · TypeScript · pg (Postgres driver) · Socket.io · jsonwebtoken · bcrypt · Zod |
| Base de datos | PostgreSQL 15 |
| Infra | Docker Compose · multi-stage Dockerfiles |

Sin ORM: todas las consultas son SQL puro parametrizado desde `pg`.

---

## Arquitectura

```
┌──────────────┐      HTTP + WebSocket       ┌─────────────────┐
│   Cliente    │ ─────────────────────────── │     Server      │
│  Vue + Vite  │      (axios + socket.io)    │  Express + TS   │
└──────────────┘                             └────────┬────────┘
                                                      │ pg (pool)
                                                      ▼
                                             ┌─────────────────┐
                                             │   PostgreSQL    │
                                             │  + triggers     │
                                             └─────────────────┘
```

### Decisiones de diseño

- **JWT sin expiración** para simplificar el reto (se documenta en `jwt.ts`
  cómo activar `expiresIn` si se quiere).
- **DTOs con Zod** como "cadenero" antes de que nada toque la base de datos.
- **Auth del socket en el handshake**: el cliente manda el token en
  `io.handshake.auth.token`; el server lo valida con un `io.use(...)` middleware.
- **Historial con triggers**: las ediciones y eliminaciones se archivan
  automáticamente en `messages_archive` y `likes_archive` vía triggers
  `BEFORE UPDATE` y `BEFORE DELETE`.

---

## Estructura del proyecto

```
test_fullstack/
├── client/                  # Vue 3 + Vite
│   ├── src/
│   │   ├── components/      # MessageCard, MessageComposer, MessageHistoryModal
│   │   ├── views/           # Login, Register, Feed
│   │   ├── stores/          # Pinia: auth, feed
│   │   ├── services/        # api (axios), socket (io)
│   │   ├── router/          # vue-router con guards
│   │   └── types/           # tipos compartidos con el backend
│   ├── Dockerfile
│   └── .env.example
├── server/                  # Express + TypeScript
│   ├── src/
│   │   ├── config/          # db pool
│   │   ├── dtos/            # user, message, params (Zod)
│   │   ├── middleware/      # auth.middleware
│   │   ├── repositories/    # user, message, like (SQL puro)
│   │   ├── services/        # auth.service
│   │   ├── utils/           # jwt, AppError, asyncHandler
│   │   └── index.ts         # rutas + socket.io
│   ├── Dockerfile
│   └── .env.example
├── database/
│   └── schema.sql           # tablas + triggers + funciones
├── postman/                 # colecciones exportadas
├── docker-compose.yml
├── AI_LOG.md                # bitácora del uso de IA
└── README.md
```

---

## Arranque rápido

### 1. Requisitos

- Docker Desktop (con Docker Compose v2).
- Git.

### 2. Clonar y configurar

```bash
git clone <url-del-repo>
cd test_fullstack

# Copiar los .env.example
cp server/.env.example server/.env
cp client/.env.example client/.env

# Editar server/.env y poner un JWT_SECRET de tu preferencia
```

### 3. Levantar todo

```bash
docker compose up -d --build
```

Servicios expuestos:

| Servicio | Puerto | URL |
|----------|--------|-----|
| Cliente (Vue) | 5173 | http://localhost:5173 |
| Server (Express) | 3000 | http://localhost:3000 |
| Postgres | 5432 | postgres://admin:secret_password@localhost:5432/feedback_hub |

La base de datos corre el `database/schema.sql` automáticamente al primer
arranque gracias al volumen `docker-entrypoint-initdb.d`.

### 4. Comandos útiles

```bash
# Logs del server en vivo
docker compose logs -f server

# Reiniciar solo el server (tras cambiar código)
docker compose restart server

# Rebuild completo (tras cambiar Dockerfile o package.json)
docker compose up -d --build server

# Apagar todo y eliminar volúmenes (reinicia la DB)
docker compose down -v
```

---

## Variables de entorno

### `server/.env`

```env
PORT=3000
DATABASE_URL=postgres://admin:secret_password@db:5432/feedback_hub
JWT_SECRET=cambiar-por-un-secreto-fuerte
```

### `client/.env`

```env
VITE_API_URL=http://localhost:3000
```

> En producción (Render, Railway, etc.) ajustar `VITE_API_URL` a la URL pública
> del server y `DATABASE_URL` al connection string del Postgres hosteado.

---

## API

Base URL: `http://localhost:3000`

Todas las respuestas exitosas son **planas** (sin wrapper `{ success, data }`).
Los errores siempre llegan como `{ "message": "..." }`.

### Públicos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Health check |
| POST | `/auth/register` | Crear cuenta → `{ user, token }` |
| POST | `/auth/login` | Iniciar sesión → `{ user, token }` |

### Protegidos (`Authorization: Bearer <token>`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/users` | Lista de usuarios (máx 50) |
| GET | `/message` | Feed completo con `likes_count` y `liked_by_me` |
| POST | `/message` | Publicar mensaje (DTO: content 1–2000) |
| GET | `/message/:id` | Detalle de un mensaje |
| PUT | `/message/:id` | Editar (solo dueño) — dispara archivo de versión anterior |
| DELETE | `/message/:id` | Eliminar (solo dueño) — dispara archivo en cascada |
| GET | `/message/:id/history` | Línea de tiempo pública del mensaje |
| POST | `/message/:id/like` | Dar like |
| DELETE | `/message/:id/like` | Quitar like |

### WebSocket

- URL: `ws://localhost:3000`
- Auth en handshake: `io(URL, { auth: { token } })`
- Eventos emitidos por el server:
  - `message:new` → `{ message }`
  - `message:updated` → `{ message }`
  - `message:deleted` → `{ id }`
  - `like:added` → `{ message_id, user_id, likes_count }`
  - `like:removed` → `{ message_id, user_id, likes_count }`

### Códigos de error

| Status | Cuándo |
|--------|--------|
| 400 | DTO inválido o UUID mal formado |
| 401 | Token ausente / inválido / credenciales incorrectas |
| 403 | Intento de editar o borrar recurso ajeno |
| 404 | Recurso no existe |
| 409 | Duplicado (username o like) |
| 500 | Error no controlado (revisa logs del server) |

---

## Base de datos

Schema en `database/schema.sql`. Resumen de tablas:

- `users` — id, username (unique), password_hash, created_at
- `messages` — id, user_id (FK → users), content, created_at, **updated_at**
- `likes` — (user_id, message_id) PK compuesta, created_at
- `messages_archive` — archivo de versiones editadas y borradas
- `likes_archive` — likes que acompañaban mensajes borrados

### Triggers

- `trigger_archive_all` (`BEFORE DELETE ON messages`) — archiva mensaje + sus
  likes antes del borrado en cascada.
- `trigger_archive_on_update` (`BEFORE UPDATE ON messages`, `WHEN (OLD.content
  IS DISTINCT FROM NEW.content)`) — archiva la versión vieja antes de pisar el
  contenido y bumpea `updated_at`.

---

## Cliente — flujos principales

- **Login/Register**: formularios validados; al éxito, `token` y `user` van a
  `localStorage` y el socket se conecta automáticamente.
- **Feed**: carga inicial vía `GET /message`, luego actualizaciones en vivo por
  socket. Likes con *optimistic update* que se reconcilia con la respuesta del
  server.
- **Edición**: cada autor puede editar sus mensajes. El contenido viejo se
  archiva automáticamente en la DB.
- **Historial**: cualquier usuario autenticado puede ver la línea de tiempo de
  un mensaje. Incluye botón para **descargar como `.md`** (generado del lado del
  cliente con `Blob`).
- **Logout**: desconecta socket y limpia `localStorage`.

---

## Deploy a Render

Notas para cuando despliegues:

1. **Postgres**: crea un Postgres gestionado en Render; copia la connection
   string.
2. **Server**: crea un Web Service apuntando a `/server` con:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Variables: `DATABASE_URL`, `JWT_SECRET`, `PORT` (Render inyecta `PORT`
     automáticamente).
3. **Cliente**: crea un Static Site apuntando a `/client` con:
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Variable: `VITE_API_URL` apuntando a la URL pública del server.
4. **CORS**: en producción restringe `origin` del server a la URL del cliente.
5. **Primera carga de schema**: en Postgres de Render no hay
   `docker-entrypoint-initdb.d`; ejecuta `database/schema.sql` manualmente una
   vez desde `psql` o la consola web.

---

## Desarrollo local sin Docker

### Server

```bash
cd server
npm install
npm run dev   # tsx watch
```

### Cliente

```bash
cd client
npm install
npm run dev
```

Necesitas Postgres corriendo localmente o apuntar `DATABASE_URL` al contenedor
de Docker (`postgres://admin:secret_password@localhost:5432/feedback_hub`).

---

## Testing con Postman

La colección exportada vive en `postman/`. Pasos:

1. Importa la colección y el environment.
2. En el environment define `baseUrl = http://localhost:3000`.
3. La request `POST /auth/login` tiene un script en **Tests** que guarda el
   token automáticamente:
   ```js
   pm.environment.set("token", pm.response.json().token);
   ```
4. Las demás requests usan `Authorization: Bearer {{token}}`.

Orden sugerido para un smoke test: register → login → POST /message → GET
/message → POST /message/:id/like → PUT /message/:id → GET
/message/:id/history → DELETE /message/:id/like → DELETE /message/:id.

---

## Uso de IA durante el desarrollo

Ver `AI_LOG.md` para la bitácora completa del uso de Claude (Cowork mode)
durante el reto: decisiones, errores encontrados, y correcciones aplicadas.

---

## Licencia

Uso interno para prueba técnica.
