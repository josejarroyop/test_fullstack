# Guía de despliegue (free tier)

Esta guía te lleva de un repo limpio a tres URLs públicas que el evaluador puede abrir:

- **Base de datos**: Neon (Postgres serverless, gratis)
- **Backend**: Render (Web Service, free)
- **Frontend**: Vercel (Vite/Vue, free)

Tiempo estimado: 30–45 minutos la primera vez.

> Prerrequisito: tener el repo en GitHub. Si todavía no lo subiste, hazlo antes de empezar (`git remote add origin ...` + `git push`).

---

## 1. Base de datos en Neon

1. Entra a https://neon.tech y crea cuenta (con GitHub o Google).
2. **Create Project** → nombre `feedback-hub`, región la más cercana (US East suele ser la más barata en latencia desde México).
3. Cuando termine, te muestra una **Connection string** del tipo:

   ```
   postgres://USER:PASSWORD@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

   Cópiala completa y guárdala — la vas a pegar en Render más adelante. **Importante**: marca el checkbox "Pooled connection" si lo ves; el `pg` driver con esa URL funciona en serverless.

4. Carga el schema. En Neon, abre **SQL Editor** y pega el contenido completo de `database/schema.sql`. Click **Run**. Confirma que las tablas `users`, `messages`, `likes`, `messages_archive`, `likes_archive` aparecen en el panel izquierdo.

   > Atajo: si prefieres terminal, `psql "postgres://USER:PASSWORD@HOST/neondb?sslmode=require" -f database/schema.sql`.

---

## 2. Backend en Render

1. Ve a https://render.com y entra con GitHub. Autoriza acceso al repo.
2. **New +** → **Web Service** → selecciona el repo.
3. Configuración:
   - **Name**: `feedback-server` (lo que sea, será parte de la URL pública).
   - **Region**: Oregon (US West) o la más cercana a Neon.
   - **Branch**: `main` (o la rama que uses).
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Antes de hacer click en **Create Web Service**, baja a **Environment Variables** y agrega:

   | Key            | Value                                                              |
   |----------------|--------------------------------------------------------------------|
   | `NODE_VERSION` | `20.19.0`                                                          |
   | `PORT`         | `3000`                                                             |
   | `JWT_SECRET`   | una cadena aleatoria larga (puedes generarla en https://www.random.org/strings/ o con `openssl rand -hex 32`) |
   | `DATABASE_URL` | la connection string que copiaste de Neon en el paso 1            |

5. **Create Web Service**. Render clona el repo, corre `npm ci && npm run build` y levanta el server. Tarda 3–5 min la primera vez.
6. Cuando el log diga `Servidor en puerto 3000` y arriba aparezca `Live`, copia la URL pública del servicio. Será algo como:

   ```
   https://feedback-server.onrender.com
   ```

7. **Verificación rápida**: abre esa URL en el navegador. Debes ver `{"message":"Servidor operativo"}`. Si ves eso, el backend está vivo.

   > El free tier de Render duerme el servicio después de 15 min sin tráfico. La primera petición tras dormir tarda ~50s en responder (cold start). Es normal — díselo al evaluador en el mensaje (más abajo).

---

## 3. Frontend en Vercel

1. Ve a https://vercel.com y entra con GitHub.
2. **Add New** → **Project** → importa el mismo repo.
3. Configuración:
   - **Framework Preset**: Vite (debería detectarlo solo).
   - **Root Directory**: `client`  ← importante, click en **Edit** y selecciónalo.
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
4. **Environment Variables**:

   | Key            | Value                                          |
   |----------------|------------------------------------------------|
   | `VITE_API_URL` | la URL de Render del paso 2 (`https://feedback-server.onrender.com`, sin slash al final) |

5. **Deploy**. Tarda 1–2 min.
6. Cuando termine, Vercel te da la URL pública:

   ```
   https://feedback-client-xxxx.vercel.app
   ```

7. **Verificación end-to-end**:
   - Abre la URL de Vercel.
   - Registra un usuario (la primera petición despertará el backend de Render — espera ~50s y reintenta si falla).
   - Loguéate, manda un mensaje, dale like, edítalo, bórralo.
   - Abre dos pestañas con sesiones distintas: confirma que los eventos en tiempo real (mensaje nuevo, like, edición, borrado) se ven en ambas sin recargar.

---

## 4. Endurecer CORS (recomendado, opcional)

Hoy el server tiene `cors()` abierto a todo origen. Para entregar a producción es mejor restringirlo al dominio de Vercel. Si te alcanza el tiempo, edita `server/src/index.ts`:

```ts
const ALLOWED_ORIGIN = process.env.CLIENT_URL || '*';

app.use(cors({ origin: ALLOWED_ORIGIN }));
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGIN, methods: ['GET', 'POST'] },
});
```

Y en Render agrega la variable `CLIENT_URL=https://tu-app.vercel.app`. Redeploy.

---

## 5. Mensaje sugerido para el gerente

> Buen día, le comparto los enlaces del despliegue:
>
> - **Aplicación (frontend)**: https://feedback-client-xxxx.vercel.app
> - **API (backend)**: https://feedback-server.onrender.com
> - **Repositorio**: https://github.com/USUARIO/REPO
>
> El backend corre en el plan gratuito de Render, que duerme el servicio tras 15 min de inactividad. Si la primera petición tarda en responder (~50s), por favor reintente; las siguientes son inmediatas. La base de datos está en Neon (Postgres) y el frontend en Vercel.
>
> Cualquier duda quedo atento.

---

## Troubleshooting

**El frontend no se conecta al backend / errores CORS.**
Revisa que `VITE_API_URL` en Vercel apunte a la URL HTTPS de Render sin `/` final. Si cambias la variable, tienes que redeployar el frontend (Deployments → ⋯ → Redeploy).

**`relation "users" does not exist` en los logs de Render.**
No se cargó el schema en Neon. Vuelve al paso 1.4.

**`JWT_SECRET no está definido` en los logs de Render.**
Falta la variable en el dashboard de Render → Environment. Agrégala y redeploya.

**`SSL/TLS required` o `no pg_hba.conf entry` al conectarse a Neon.**
La connection string debe terminar en `?sslmode=require`. Cópiala de nuevo desde el dashboard de Neon, no la edites a mano.

**Socket.IO no recibe eventos en tiempo real.**
Verifica en el devtools del navegador que la conexión a `/socket.io/` devuelve 101 (Switching Protocols). Si se queda en pending, suele ser cold start del backend — espera 1 min y recarga.
