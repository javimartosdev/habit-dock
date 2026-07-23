# Habit Dock

Tu calendario de hábitos estilo Seinfeld: rachas, cuotas semanales y estadísticas.

## Requisitos

- Node.js 20+
- Docker (para PostgreSQL local)

## Arranque rápido

```bash
cd ~/Projects/01_habit-dock

# 1. Base de datos (contenedor Docker)
docker start study-dock-db
# Si no existe aún: docker compose up -d  (requiere plugin compose)

# 2. Variables de entorno
cp .env.example .env.local
# Edita AUTH_SECRET si quieres (openssl rand -base64 32)

# 3. Esquema de BD
npm run db:push

# 4. Desarrollo
npm run dev
# O todo en uno (BD + servidor):
npm run dev:up
```

Abre [http://localhost:3000](http://localhost:3000), crea una cuenta y empieza.

## Funcionalidades

- **Dock** — Calendario global + hábitos de hoy en una sola pantalla
- **Hábitos** — Calendario mensual estilo Seinfeld con:
  - Días activos configurables (ej. entrenar Lun–Vie)
  - Recuperación automática de 1 día fallido
  - Modo cuota semanal (ej. 5 días/semana, no tienen que ser seguidos)
  - Semana perfecta al cumplir la meta (sin esperar al domingo)
- **Stats** — Rachas (días o semanas), progreso de la semana, cumplimiento
- **Multi-usuario** — Cada cuenta tiene sus datos aislados
- **PWA** — Instalable desde el navegador

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (Webpack, estable) |
| `npm run dev:turbo` | Servidor con Turbopack (experimental) |
| `npm run db:push` | Sincronizar esquema con Postgres |
| `npm run db:studio` | UI para explorar la BD |

## Stack

Next.js 16 · TypeScript · Drizzle · PostgreSQL · NextAuth · Tailwind CSS

## Próximos pasos (cloud)

Ver **[DEPLOY.md](./DEPLOY.md)** — guía paso a paso Neon + Vercel + PWA en iPhone.

Resumen:

1. Crear Postgres en Neon y ejecutar `npm run db:push`
2. Deploy en Vercel con `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`
3. Instalar en iPhone vía Safari → `/install`
