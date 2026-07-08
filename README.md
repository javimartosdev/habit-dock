# Habit Dock

Tu suite de enfoque personal: tareas, hábitos con calendario Seinfeld y estadísticas.

> **Documentación completa para IAs y desarrolladores:** ver [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md)

## Requisitos

- Node.js 20+
- Docker (para PostgreSQL local)

## Arranque rápido

```bash
# 1. Base de datos
docker compose up -d

# 2. Variables de entorno
cp .env.example .env.local
# Edita AUTH_SECRET si quieres (openssl rand -base64 32)

# 3. Esquema de BD
npm run db:push

# 4. Desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000), crea una cuenta y empieza.

## Funcionalidades

- **Dock** — Vista de enfoque: hábitos de hoy + tasks filtrables por contexto
- **Tasks** — Lista de pendientes con contextos personalizables
- **Hábitos** — Calendario mensual estilo Seinfeld con:
  - Días activos configurables (ej. entrenar Lun–Vie)
  - Recuperación automática de 1 día fallido
  - Modo cuota semanal (ej. 5 entrenamientos/semana)
- **Stats** — Rachas, cumplimiento 30d, días perfectos
- **Multi-usuario** — Cada cuenta tiene sus datos aislados
- **PWA** — Instalable desde el navegador

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run db:push` | Sincronizar esquema con Postgres |
| `npm run db:studio` | UI para explorar la BD |

## Stack

Next.js 16 · TypeScript · Drizzle · PostgreSQL · NextAuth · Tailwind CSS

## Próximos pasos (cloud)

1. Desplegar en Vercel
2. Postgres en Neon o Supabase
3. Cambiar `DATABASE_URL` y `AUTH_URL` en producción
