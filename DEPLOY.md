# Deploy — Fase 1 (Vercel + Neon)

Guía para publicar Habit Dock en internet y usarla en el iPhone como PWA.

## Requisitos

- Cuenta en [GitHub](https://github.com) (repo: `javimartosdev/habit-dock`)
- Cuenta en [Neon](https://neon.tech) (Postgres gratis)
- Cuenta en [Vercel](https://vercel.com) (plan Hobby gratis)

---

## 1. Base de datos en Neon

1. Crea un proyecto en Neon (región EU si vives en España).
2. Copia la **connection string** con SSL, formato:
   ```
   postgres://usuario:password@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
3. En tu PC, crea un archivo temporal `.env.production.local` (no lo subas a Git):

   ```env
   DATABASE_URL=postgres://...tu-url-de-neon...?sslmode=require
   ```

4. Sincroniza el esquema contra Neon:

   ```bash
   cd ~/Projects/01_habit-dock
   export $(grep -v '^#' .env.production.local | xargs)
   npm run db:push
   ```

5. (Opcional) Crea tu usuario en producción registrándote en la URL de Vercel tras el deploy, o exporta datos desde local.

---

## 2. Secretos para producción

Genera un `AUTH_SECRET` distinto al de local:

```bash
openssl rand -base64 32
```

Anota estos tres valores para Vercel:

| Variable | Ejemplo |
|----------|---------|
| `DATABASE_URL` | URL de Neon con `?sslmode=require` |
| `AUTH_SECRET` | Salida de `openssl rand -base64 32` |
| `AUTH_URL` | `https://habit-dock.vercel.app` (tu URL final) |

---

## 3. Deploy en Vercel

### Opción A — Dashboard (recomendada)

1. [vercel.com/new](https://vercel.com/new) → Import Git Repository → `habit-dock`
2. Framework: **Next.js** (auto-detectado)
3. **Environment Variables** → añade las 3 variables de arriba (Production)
4. Deploy

### Opción B — CLI

```bash
npm i -g vercel
cd ~/Projects/01_habit-dock
vercel login
vercel --prod
# Sigue el asistente; luego añade env vars en el dashboard si faltan
```

Tras el primer deploy, actualiza `AUTH_URL` en Vercel con la URL real que te asignen y redeploy.

---

## 4. Comprobar producción

1. Abre `https://tu-app.vercel.app/register` y crea cuenta
2. Marca hábitos en el Dock y toca días del calendario
3. Entra en `/stats` (rachas, semana actual, cumplimiento)
4. Abre `/install` para ver instrucciones PWA

---

## 5. Instalar en iPhone

1. **Safari** → `https://tu-app.vercel.app`
2. Inicia sesión
3. **Compartir** (icono cuadrado con flecha) → **Añadir a pantalla de inicio**
4. Abre desde el icono naranja «Habit Dock»

La app necesita internet (no hay modo offline en Fase 1).

---

## 6. Actualizar la app

```bash
git add .
git commit -m "feat: descripción del cambio"
git push origin main
```

Vercel redeploya automáticamente si conectaste GitHub.

---

## Variables de entorno — resumen

```env
# Local (.env.local)
DATABASE_URL=postgres://studydock:studydock@localhost:5433/studydock
AUTH_SECRET=...
AUTH_URL=http://localhost:3000

# Producción (Vercel)
DATABASE_URL=postgres://...@neon.tech/neondb?sslmode=require
AUTH_SECRET=...otro-secreto-distinto...
AUTH_URL=https://habit-dock.vercel.app
```

---

## Problemas frecuentes

| Síntoma | Solución |
|---------|----------|
| Error 500 al login | Revisa `DATABASE_URL` y que `npm run db:push` se ejecutó en Neon |
| Sesión no persiste | `AUTH_URL` debe coincidir exactamente con la URL pública (https) |
| No aparece «Añadir a pantalla de inicio» | Usa Safari, no Chrome en iOS |
| Icono genérico | Regenera: `npm run icons:generate` y redeploy |

---

## Scripts útiles

```bash
npm run icons:generate   # Regenerar PNG desde icon.svg
npm run db:push          # Sincronizar esquema (con DATABASE_URL activa)
npm run build            # Probar build local antes de push
```
