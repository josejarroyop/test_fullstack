# AI_LOG — Real-Time Feedback Hub

Bitácora del uso de asistentes de IA durante el desarrollo del FullStack Challenge.
Herramienta: Claude (Cowork mode) con acceso al workspace `C:\test_fullstack`.

> Formato: para cada fase se registra la petición, la decisión tomada, el
> entregable y — cuando aplica — los errores reales que aparecieron y cómo se
> corrigieron. La idea es que se pueda auditar qué salió del humano, qué salió
> de la IA y dónde hubo retoques manuales.

---

## 1. Revisión inicial del backend

**Petición del humano:** "Revisa mi `index.ts` en `server/src/index.ts`, verifica
las importaciones, el feed de usuarios y el CRUD de `message`."

**Hallazgos de la IA:**

1. El middleware de errores de Express estaba registrado **antes** de las rutas
   (no captura nada).
2. `UserRepository.create` insertaba en la columna incorrecta (`email` en lugar
   de `username`).
3. El handler `DELETE /message/:id` no tenía `return` en la rama 404, así que
   seguía ejecutándose y podía lanzar doble respuesta.

**Resuelto:** puntos 1 y 3 los arregló el humano; la IA hizo una pasada de
consistencia usando `throw AppError.notFound(...)` para alinear estilos.

---

## 2. Autenticación con JWT

**Petición:** "Quita el `userId` hardcodeado. Implementa auth con JWT usando
`jsonwebtoken`."

**Decisiones de diseño (humano + IA):**

- `bcrypt` con `SALT_ROUNDS = 10` para hash de contraseñas.
- JWT **sin expiración** (decisión explícita del humano — más simple para el
  reto; se documenta en `jwt.ts` cómo activarla luego con `expiresIn`).
- `AppError` con *factory methods*: `badRequest`, `unauthorized`, `forbidden`,
  `notFound`, `conflict`, `internal`.

**Entregables:**

- `server/src/utils/jwt.ts` — `signToken` / `verifyToken`.
- `server/src/utils/AppError.ts`.
- `server/src/services/auth.service.ts` — `register` / `login`.
- `server/src/middleware/auth.middleware.ts` — lee `Authorization: Bearer`.
- `server/src/types/express.d.ts` — extiende `Request` con `user?: { id, username }`.

**Error real encontrado:** el humano corrió `npm install jsonwebtoken` en la
raíz del monorepo. La IA identificó que debía instalarse dentro de `server/`.

---

## 3. Docker Compose — dos bugs consecutivos

**3.1 `node-gyp-build` symlink**

Al hacer `docker compose build --no-cache`, falló con "invalid file request
`node_modules/.bin/node-gyp-build`". Causa: `COPY . .` en el Dockerfile
copiaba `node_modules` de Windows a un contenedor Linux y los symlinks se
rompían.

**Fix IA:** crear `server/.dockerignore` y `client/.dockerignore` que excluyen
`node_modules`, `.env`, `dist`, etc. También se añadieron `python3`, `make` y
`g++` en la etapa builder para poder compilar `bcrypt` nativo.

**3.2 `JWT_SECRET no está definido`**

Al arrancar el contenedor, el server tiraba ese error. Causa: `.dockerignore`
excluía `.env`, entonces nunca llegaba al contenedor.

**Fix IA:** añadir `env_file: ./server/.env` en `docker-compose.yml`. Así el
archivo queda fuera de la imagen (bien) pero Compose inyecta las variables en
runtime.

---

## 4. DTOs con Zod — el "cadenero"

**Petición:** "Antes de seguir, quiero DTOs para validar `insert` y `update`
antes de que toquen la BD. El DTO es nuestro cadenero."

**Entregables:**

- `server/src/dtos/user.dto.ts` — `CreateUserSchema` (username 3–50, regex
  alfanumérico, password 6–100).
- `server/src/dtos/message.dto.ts` — `CreateMessageSchema` (content 1–2000,
  trim) + `UpdateMessageSchema` con `.partial().refine()` para exigir al menos
  un campo.
- `server/src/dtos/params.dto.ts` — `UuidParamSchema` para validar `:id`.

**Error real:** la IA generó los schemas con `required_error` (API de Zod v3).
El proyecto usa **Zod v4**, donde la propiedad se llama `error`. Se corrigió.

---

## 5. Likes + WebSockets con auth en el handshake

**Petición:** "Instala `socket.io-client`, cerramos backend."

**Decisiones:**

- `io.use(...)` valida el JWT en el handshake; el token llega en
  `socket.handshake.auth.token`.
- La base tiene tabla `likes (user_id, message_id, PK compuesta)`. Se hace
  *upsert* por intento de INSERT y se captura el código Postgres `23505`
  (unique_violation) para devolver `409 Conflict`.
- Eventos emitidos: `message:new`, `message:updated`, `message:deleted`,
  `like:added`, `like:removed`.

**Entregables:**

- `server/src/repositories/like.repository.ts`.
- `MessageRepository.findById/findAll` extendidas con `likes_count` (subquery
  `COUNT(*)::INT`) y `liked_by_me` (subquery `EXISTS` parametrizada por el
  usuario autenticado).
- Endpoints `POST /message/:id/like` y `DELETE /message/:id/like`.

---

## 6. Git / ramas / PRs

**Petición:** "¿Me puedes manejar `branch` y `pull` en GitHub?"

**Respuesta de la IA:** la IA no accede al `origin` remoto; puede editar en
`worktrees` locales y dejar commits listos, pero el humano es quien hace
`push`, abre PRs y hace merge. Se acordó **Opción A**: commitear backend
directamente a `main` y abrir una rama solo si el cliente iba a tardar más.

**Nota lateral:** apareció el clásico "11 archivos modificados" de CRLF/LF al
pushear desde Windows. Se resolvió con `.gitattributes` (`* text=auto eol=lf`)
y renormalizando el index.

---

## 7. Bootstrap del cliente (Vue 3 + Tailwind v4 + Pinia)

**Stack acordado:**

- Vue 3 + Vite + TypeScript (ya scaffolding inicial).
- **Tailwind v4** con el plugin oficial `@tailwindcss/vite` (no hay `tailwind.config.js`; todo CSS-first).
- **Pinia** como store.
- **Axios** con interceptor que inyecta `Authorization: Bearer <token>`.
- **socket.io-client** con `auth: { token }` en el handshake.

**Estructura creada por la IA:**

```
client/src/
├── types/api.ts
├── services/
│   ├── api.ts         # axios + interceptors + AuthApi/MessagesApi/UsersApi
│   └── socket.ts      # connect/disconnect reutilizable
├── stores/
│   ├── auth.ts        # login/register/logout/bootstrap + persistencia localStorage
│   └── feed.ts        # fetchAll/publish/edit/destroy/toggleLike + bindSocket
├── router/index.ts    # guard requiresAuth / guestOnly
├── views/
│   ├── LoginView.vue
│   ├── RegisterView.vue
│   └── FeedView.vue
├── components/
│   ├── MessageComposer.vue
│   ├── MessageCard.vue
│   └── MessageHistoryModal.vue
├── App.vue
└── main.ts
```

**Problema operativo recurrente:** el sandbox Linux no pudo borrar los
archivos scaffold (`HelloWorld.vue`, `TheWelcome.vue`, `WelcomeItem.vue`,
`components/icons/*`, `base.css`, `logo.svg`) porque eran archivos Windows con
permisos restringidos. Quedaron como *dead code* (no se importan desde ningún
lado) con instrucción de borrado manual.

---

## 8. Debugging en vivo: login no guardaba el token

**Síntoma:** el humano veía `❌ No se está enviando token` en consola y `401`
en `GET /message`, pero el response del backend sí contenía el token.

**Diagnóstico (IA):** el backend envolvía todas las respuestas en
`{ success: true, data: {...} }` y el error handler devolvía `{ error: "..." }`.
El cliente esperaba:

- `{ user, token }` plano (no envuelto).
- Errores con `{ message: "..." }`.

Adicionalmente, el evento `message:new` emitía `msg` crudo pero el cliente
estaba tipado para `{ message: Message }`.

**Fix IA (decisión: arreglar backend, no cliente — más limpio):**

- Se quitó el wrapper `{ success, data }` de todas las respuestas de éxito.
- El error handler pasó a `{ message: err.message }`.
- El emit de socket pasó a `io.emit('message:new', { message: msg })`.

**Lección registrada:** el primer problema real del proyecto fue **contrato
implícito roto entre cliente y server**. Se habría detectado antes con tipos
compartidos o un test de integración.

---

## 9. Preflight CORS y credenciales inválidas

Durante el mismo debugging, el humano reportó secuencia extraña de `OPTIONS
204` y `POST 401`. La IA aclaró que los `OPTIONS 204` son preflights normales
del navegador por CORS y los manejaba `app.use(cors())`; el `401` intermedio
fue solo una contraseña mal tecleada.

---

## 10. Historial de mensajes (edit + timeline)

**Petición:** "Quiero `PUT /message/:id` pero también un timeline. ¿Sirve
`messages_archive`?"

**Análisis (IA):** la tabla existente solo registraba eliminaciones (trigger
`BEFORE DELETE`). Para capturar ediciones se propuso:

1. Añadir `updated_at` a `messages`.
2. Añadir `archive_reason VARCHAR(20) DEFAULT 'DELETED'` a `messages_archive`.
3. Crear segundo trigger `BEFORE UPDATE ON messages` con
   `WHEN (OLD.content IS DISTINCT FROM NEW.content)` — solo archiva si el
   contenido cambió. El trigger marca la fila como `archive_reason='EDITED'`.

**Decisión humana:** "Sí, usa el `WHEN`. El historial es público."

**Entregables:**

- `PUT /message/:id` (ownership + DTO).
- `GET /message/:id/history` (público para autenticados).
- `MessageRepository.update` + `MessageRepository.getHistory` (UNION ALL de
  archivo + fila viva, ordenado por `version_at`).
- Cliente: `MessageHistoryModal.vue` con badges de color (verde=actual,
  ámbar=edición, rojo=eliminado) y botón **"Descargar .md"** que genera el
  archivo en el navegador con `Blob` (sin pegar al backend).

---

## 11. Problemas técnicos de la IA — y cómo se mitigaron

Para transparencia, se registran las fricciones reales del flujo con la IA:

- **Truncamiento del `Write` tool:** al escribir archivos largos (>100 líneas),
  varias veces el archivo se cortó a la mitad. Se migró a `bash heredoc`
  escribiendo a `/tmp/` y copiando con `cat > destino` para asegurar
  escrituras atómicas.
- **Caracteres no-ASCII inestables:** los acentos españoles (`á`, `é`, `í`,
  `ó`, `ú`, `ñ`) a veces se corrompían en heredoc. Se evitó usarlos dentro de
  strings de código. En texto plano (comentarios) sí se conservaron cuando
  fue seguro.
- **Mensajes del compilador:** el humano y la IA se apoyaron en
  `npx tsc --noEmit` (server) y `npx vue-tsc --noEmit` (client) como check
  final antes de declarar una tarea como terminada.
- **Ediciones manuales del humano:** el humano añadió logs de debug
  (`console.log`) en `LoginView.vue`, `auth.ts`, `api.ts` y simplificó el
  guard del router leyendo `localStorage` directo. La IA los respetó y no
  los revirtió.

---

## 12. Entregables finales (resumen)

**Backend**

- Auth: `POST /auth/register`, `POST /auth/login`.
- Users: `GET /users`.
- Mensajes: `POST /message`, `GET /message`, `GET /message/:id`,
  `PUT /message/:id`, `DELETE /message/:id`, `GET /message/:id/history`.
- Likes: `POST /message/:id/like`, `DELETE /message/:id/like`.
- Socket.io con auth JWT en handshake y 5 eventos de tiempo real.

**Base de datos**

- `users`, `messages`, `likes` vivas.
- `messages_archive`, `likes_archive` con trigger `BEFORE DELETE`.
- Trigger `BEFORE UPDATE` con `WHEN (OLD.content IS DISTINCT FROM NEW.content)`
  para historial de ediciones.
- `archive_reason` como discriminador.

**Cliente**

- Rutas: `/login`, `/register`, `/feed`.
- Auth persistida en `localStorage` con reconexión automática del socket al
  refrescar.
- Feed en tiempo real con update optimista en likes.
- Modal de historial + descarga `.md`.

**Infra**

- `docker-compose.yml` con `db` (Postgres), `server` (Node + TS) y `client`
  (Vue + Vite).
- `.dockerignore` en server y client.
- `.gitattributes` para normalizar EOL.

---

## 13. Prompts que funcionaron bien

Documentados para reutilizar en futuros retos:

- *"Haz X y explícame por qué lo haces así. Si ves algo inconsistente con lo
  anterior, dímelo antes de avanzar."*
- *"Antes de escribir código, dame el plan en 3 bullets y una pregunta por si
  algo es ambiguo."*
- *"Compila y dime si hay errores antes de declarar esto terminado."*
- *"Reinicia el backend si aplica y dime exactamente qué pasos seguir para
  verificar."*

---

## 14. Lo que quedó pendiente / para iterar

- Borrar manualmente los archivos scaffold de Vue (`HelloWorld.vue` etc.).
- Añadir tests — no se incluyeron en este reto por tiempo.
- Deploy a Render (ya están las pistas en el README; falta disparar el deploy
  y validar variables de entorno en producción).
- Validar `.env.example` y `README.md` contra lo que terminó en el código.

---

_Fin del log — documento vivo; sigue creciendo conforme el proyecto evolucione._
