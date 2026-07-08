# Habit Dock — Contexto completo del proyecto

> **Propósito de este documento:** dar contexto total a cualquier IA o desarrollador que abra el proyecto en un chat nuevo.  
> **Nombre actual:** Habit Dock (antes *Study Dock*).  
> **Carpeta en disco:** `~/Projects/study-dock` (el nombre de carpeta no se renombró para no romper Docker/BD).  
> **Estado:** MVP funcional en local. Sin deploy cloud aún.

---

## 1. Visión del producto

**Habit Dock** es una suite personal de enfoque en el navegador:

- **Hábitos** con calendario estilo Jerry Seinfeld (“no rompas la cadena”), pensado para usarse sin culpa si faltas un día.
- **Tasks** secundarias (lista minimal debajo del calendario).
- **Stats** en página aparte.
- **Multi-usuario:** cada persona tiene su cuenta (email + contraseña), datos aislados por `user_id`.
- **Una sola pantalla principal** (sin navegación por secciones): calendario + hábitos hoy + tasks.

### Usuario objetivo (caso real del creador)

- Quiere abrir una pestaña del navegador y tener su “dock” de estudio/trabajo.
- Hábitos ejemplo: **Entrenar** y **Programar**, meta **5 días/semana** en **cualquier combinación** de días (no obligatorio Lun–Vie).
- Puede hacer **recuento retroactivo** el domingo (o cuando quiera): marcar días pasados tocando el calendario.
- No quiere entrar obligatoriamente cada día; la app debe ser flexible.

### Roadmap acordado (no implementado aún)

- Pomodoro / timer en el Dock (v2).
- Deploy cloud (Vercel + Neon/Supabase).
- PWA instalable en móvil (manifest ya existe; falta pulir).
- App nativa iOS/Android (opcional, vía PWA o Capacitor).

---

## 2. Stack técnico

| Capa | Tecnología |
|------|------------|
| Framework | **Next.js 16** (App Router, Turbopack) |
| Lenguaje | **TypeScript** |
| UI | **Tailwind CSS v4** + componentes propios (`src/components/ui.tsx`) |
| BD | **PostgreSQL 16** (Docker local) |
| ORM | **Drizzle ORM** + `drizzle-kit push` |
| Auth | **NextAuth v5** (beta) — Credentials (email/password) |
| Validación | **Zod** |
| Fechas | **date-fns** (locale `es`) |
| Iconos | **lucide-react** |

### Variables de entorno (`.env.local`)

```env
DATABASE_URL=postgres://studydock:studydock@localhost:5433/studydock
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=http://localhost:3000
```

---

## 3. Cómo arrancar en local

```bash
# 1. Base de datos (contenedor existente)
docker start study-dock-db
# Si no existe: docker run -d --name study-dock-db \
#   -e POSTGRES_USER=studydock -e POSTGRES_PASSWORD=studydock \
#   -e POSTGRES_DB=studydock -p 5433:5432 postgres:16-alpine

# 2. Esquema (primera vez o tras cambios en schema)
cd ~/Projects/study-dock
npm run db:push

# 3. Desarrollo
npm run dev
# → http://localhost:3000
# Red local (iPhone misma WiFi): npm run dev -- -H 0.0.0.0
```

### Scripts npm

| Script | Uso |
|--------|-----|
| `npm run dev` | Servidor desarrollo |
| `npm run build` | Build producción |
| `npm run db:push` | Sincronizar esquema Drizzle → Postgres |
| `npm run db:studio` | UI Drizzle para explorar BD |

---

## 4. Estructura del proyecto

```
study-dock/
├── src/
│   ├── app/
│   │   ├── (app)/              # Rutas autenticadas
│   │   │   ├── page.tsx        # HOME = Habit Dock (pantalla única)
│   │   │   ├── stats/page.tsx  # Estadísticas
│   │   │   ├── habits/page.tsx # → redirect a /
│   │   │   ├── tasks/page.tsx  # → redirect a /
│   │   │   └── layout.tsx      # AppShell (header)
│   │   ├── login/ register/
│   │   ├── api/                # REST + NextAuth
│   │   ├── layout.tsx          # Root layout, metadata, Providers
│   │   └── globals.css         # Temas + estilos calendario skeuomórfico
│   ├── components/
│   │   ├── habit-dock.tsx      # Pantalla principal (client)
│   │   ├── global-calendar.tsx # Calendario global clickeable
│   │   ├── app-shell.tsx       # Header: logo, theme, stats, logout
│   │   ├── brand-logo.tsx      # Icono + texto Habit Dock
│   │   ├── theme-provider.tsx  # Modo claro/oscuro
│   │   ├── theme-toggle.tsx
│   │   └── ui.tsx              # Button, Input, Card
│   ├── lib/
│   │   ├── habits.ts           # ⭐ Lógica calendario, rachas, semanas
│   │   ├── data.ts             # Queries servidor
│   │   ├── utils.ts            # formatDateKey, WEEKDAY_PICKER, ALL_WEEK_DAYS
│   │   └── theme.ts
│   ├── hooks/use-achievement-sound.ts  # Sonido tipo logro Xbox (Web Audio)
│   ├── db/schema.ts
│   └── auth.ts                 # NextAuth config
├── public/icons/               # icon.svg, logo.svg, PNGs PWA
├── docker-compose.yml          # Postgres (nombre legacy study-dock-db)
├── drizzle.config.ts
├── PROJECT_CONTEXT.md          # ← Este archivo
└── README.md                   # Quick start
```

### Archivos legacy (no usados en UI actual, pueden eliminarse)

- `src/components/dock-view.tsx`
- `src/components/habits-manager.tsx`
- `src/components/tasks-manager.tsx`
- `src/components/habit-calendar.tsx`
- `src/components/context-filter.tsx`

---

## 5. Modelo de datos (Drizzle / PostgreSQL)

### `users`
- `id`, `email` (unique), `name`, `passwordHash`, `createdAt`

### `contexts` (para tasks)
- Por usuario. Al registrarse se crean: **General**, **Estudiar**, **Programar**, **Creativo**.
- `name`, `icon`, `color`, `sortOrder`

### `tasks`
- `title`, `priority`, `dueDate`, `contextId`, `completedAt`
- Filtradas en home: pendientes, sin due date o due ≤ hoy.

### `habits`
- `name`, `color`
- `kind`: `"daily"` | `"weekly_quota"`
- `weeklyTarget`: número (ej. 5) — solo para cuota semanal
- `scheduleDays`: `integer[]` — **0=Dom … 6=Sáb**
  - Para `weekly_quota`: se guarda `[0,1,2,3,4,5,6]` (todos); la lógica ignora días fijos.
  - Para `daily`: días obligatorios elegidos por el usuario.

### `habit_logs`
- `habitId`, `logDate` (YYYY-MM-DD), `completed` (boolean)
- Unique: `(habitId, logDate)`

---

## 6. API REST

Todas requieren sesión excepto register y NextAuth.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Crear cuenta + contextos default |
| * | `/api/auth/[...nextauth]` | Login/logout NextAuth |
| GET/POST | `/api/habits` | Listar / crear hábitos |
| DELETE | `/api/habits?id=` | Borrar hábito |
| POST | `/api/habits/[id]/log` | Marcar/desmarcar día. Body: `{ date?: "YYYY-MM-DD", completed: bool }` — **sin `date` = hoy** |
| GET/POST | `/api/tasks` | Listar / crear tasks |
| PATCH/DELETE | `/api/tasks/[id]` | Completar/reabrir/borrar |
| GET/POST/DELETE | `/api/contexts` | CRUD contextos |

---

## 7. Lógica de hábitos y calendario (`src/lib/habits.ts`)

### Tipos de hábito

1. **`weekly_quota`** (caso principal del usuario)
   - Marcar **cualquier día L–D**.
   - Meta: N completados en la semana (ej. 5).
   - Días sin marcar **no se penalizan** (estado `pending`, neutro).
   - Semana **perfecta** (dorada): al cerrar la semana, **cada hábito** alcanzó su cuota.

2. **`daily`**
   - Solo aplica en `scheduleDays` elegidos.
   - Días obligatorios no cumplidos → `missed`.

### Calendario global (todos los hábitos juntos)

Funciones clave:

- `isHabitLoggableOnDay()` — cuota semanal: siempre true; diario: según schedule.
- `computeGlobalDayStatus()` — estado del día para **todos** los hábitos:
  - **`optimal`**: todos los hábitos loggeables ese día están marcados.
  - **`partial`**: algunos marcados.
  - **`pending`**: ninguno marcado (neutral, no es fallo en cuota semanal).
  - **`missed`**: hábito diario obligatorio no cumplido.
- `computeWeekStatus()` — `perfect` si semana terminada y todas las cuotas cumplidas.
- `buildGlobalMonthCalendar()` — grid mensual + resumen (días óptimos, semanas perfectas).

### Regla “Seinfeld perdonosa” (por hábito, en `computeDailyStatuses`)

Si fallas **exactamente un** día activo y al **siguiente día activo** completas → el día fallado pasa a **`recovered`** (tachado suave, no rompe la cadena visual).

### Rachas (`computeStreak`)

- Por hábito individual (usado en `/stats`).
- Estados que cuentan: `done`, `recovered`, `week_success`.

---

## 8. UI / UX — Pantalla principal (`HabitDock`)

Orden vertical en `/`:

1. **Calendario global** (`GlobalCalendar`)
   - Estilo **papel skeuomórfico** (`.calendar-paper` en CSS).
   - Mes actual + flechas ← → (meses anteriores ilimitados; futuro bloqueado).
   - **Tocar un día** → panel debajo para marcar/desmarcar hábitos de ese día (recuento retroactivo).
   - Leyenda: Día óptimo | Semana perfecta | Fallado.
   - Al completar el último hábito de un día → **animación tachado** + **sonido logro** (4 notas Web Audio).

2. **Panel día seleccionado** (si hay día tocado en calendario)

3. **Hoy** — pills para marcar hábitos del día actual.

4. **Crear hábito** (inline, botón + Hábito)
   - Cuota semanal: texto explicativo, meta numérica, **sin selector de días** (L–D implícito).

5. **Tasks** — lista minimal, colapsable si >5 items.

### Header (`AppShell`)

- Logo: icono app + “Habit Dock”
- Toggle **modo claro/oscuro** (sol/luna) — persistido en `localStorage` key `habit-dock-theme`
- Enlace **Stats**
- **Salir**

### Stats (`/stats`)

- Días perfectos 30d, tasks pendientes, rachas por hábito, % cumplimiento.
- Botón **← Dock** para volver (importante en móvil).

---

## 9. Autenticación

- **NextAuth v5** JWT session.
- Middleware (`src/middleware.ts`) protege todas las rutas excepto login, register, assets.
- Registro: `POST /api/auth/register` → bcrypt hash → insert user + 4 contextos default.
- Cuenta de prueba creada en desarrollo: `javi@test.com` / `test123` (si no fue borrada).

---

## 10. Branding

- **Nombre:** Habit Dock
- **Icono:** libro abierto sobre degradado azul (`public/icons/icon.svg`) — **sin** el “ancla/dock” curvo del diseño original.
- **Header:** icono 36px + texto (no logo SVG vertical comprimido).
- **Login/registro:** icono 72px + “Habit Dock”.
- PWA: `manifest.webmanifest`, `apple-touch-icon.png`, theme color `#2E3D8F`.

---

## 11. Temas (claro / oscuro)

- Variables CSS en `.light` y `.dark` (`globals.css`).
- `ThemeProvider` aplica tema con `useLayoutEffect` (sin `<script>` inline — Next.js 16 + Turbopack lo rechaza).
- HTML default: clase `dark` en `<html>`.

---

## 12. Historial de decisiones (conversación con el usuario)

| Decisión | Elección |
|----------|----------|
| Pantallas | **Una sola** (+ Stats aparte) |
| Calendario | **Global** (todos los hábitos), no uno por hábito |
| Cuota semanal | **5 días cualquier día L–D**, no Lun–Vie fijo |
| Día óptimo | Todos los hábitos marcados ese día |
| Semana buena | Una sola: **Semana perfecta** (dorada), eliminada distinción verde/dorada |
| Tasks | Abajo, minimal, colapsable |
| Skeumorfismo | **Sutil** (calendario papel) |
| Crear hábitos | **Inline** bajo calendario |
| Edición pasada | **Tocar día** en calendario (Opción A) |
| Navegación meses | Solo mes actual + flechas; historial ilimitado hacia atrás |
| Sonido | Tipo logro Xbox al completar día óptimo |
| Deploy | **Local primero**; cloud después |
| Nombre final | **Habit Dock** (antes Study Dock) |

---

## 13. Problemas conocidos y soluciones

| Problema | Solución |
|----------|----------|
| `ERR_CONNECTION_REFUSED` | `npm run dev` no está corriendo |
| Error BD | `docker start study-dock-db` |
| Error `<script>` en layout | **No usar** scripts inline; tema vía `ThemeProvider` |
| Logo pequeño/feo en header | Usar `BrandLogo variant="header"` (icono + texto), no logo.svg vertical |
| `docker compose` falla | Usar `docker run` / `docker start study-dock-db` |
| Puerto Postgres | **5433** (no 5432) |

---

## 14. Próximos pasos sugeridos

1. Probar flujo completo y depurar bugs de UX.
2. Eliminar componentes legacy no usados.
3. Renombrar carpeta `study-dock` → `habit-dock` (opcional).
4. Deploy: Vercel + Neon, cambiar `DATABASE_URL` y `AUTH_URL`.
5. Pomodoro v2.
6. Mejorar PWA / instalar en iPhone.
7. Editar/borrar contextos desde UI.
8. Exportar stats.

---

## 15. Prompt sugerido para chat nuevo

Copia esto al iniciar un chat:

```
Estoy trabajando en Habit Dock (~/Projects/study-dock).
Lee PROJECT_CONTEXT.md del repo para contexto completo.

Stack: Next.js 16, Drizzle, Postgres Docker :5433, NextAuth.
Pantalla única: calendario global + hábitos + tasks.
Hábitos cuota semanal flexibles (5 días/semana cualquier día).
Recuento retroactivo tocando días en el calendario.

[Describe aquí tu tarea concreta]
```

---

*Última actualización: julio 2026 — sesión de diseño e implementación MVP con asistente IA.*
