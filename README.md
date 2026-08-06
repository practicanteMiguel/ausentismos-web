# Gestión de Ausentismos

Plataforma digital de gestión de ausentismos (Next.js 16 + Firebase + Google Drive + pdf-lib).

Ver **[ROADMAP.md](./ROADMAP.md)** para la arquitectura completa y el roadmap por fases, y
**[SETUP.md](./SETUP.md)** para la guía paso a paso de configuración manual (Firebase, Google Drive,
variables de entorno, Vercel) — es indispensable antes de poder usar la plataforma.

## Desarrollo local

1. Sigue **[SETUP.md](./SETUP.md)** para crear el proyecto de Firebase, habilitar Drive y completar `.env.local`.
2. Instala dependencias: `npm install`
3. Crea el primer Super Administrador: `npm run create-super-admin -- correo@ejemplo.com "Contraseña123!" "Nombre"`
4. Ejecuta el servidor de desarrollo: `npm run dev`
5. Abre [http://localhost:3000](http://localhost:3000)

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm run lint` — ESLint

## Despliegue de reglas e índices de Firestore

Requiere [Firebase CLI](https://firebase.google.com/docs/cli) autenticado (`firebase login`) y el proyecto
seleccionado (`firebase use <project-id>`):

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Estructura

Ver la sección 1.1 de [ROADMAP.md](./ROADMAP.md) para el detalle de carpetas y convenciones.
