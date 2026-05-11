# Palvi Metrics

Reporte ejecutivo de métricas comerciales para reuniones matutinas. El Jefe de Ventas abre la página, elige un dataset, navega un rango de fechas, y ve qué reglas están disparadas hoy.

## Requisitos

Docker + Docker Compose. Nada más en el host.

## Levantar el proyecto

**Primera vez (build inicial):**

```bash
docker compose up --build
```

Esto levanta tres servicios: `db` (Postgres 16), `api` (FastAPI) y `web` (Vite). El backend crea las tablas, carga los 4 datasets reales desde `insumos/metrics.json` (~16k filas) y siembra el usuario admin + 3 reglas de ejemplo.

Cuando los logs muestren `Application startup complete`, abrí http://localhost:5173.

**Login por defecto:**

```
admin@palvi.local
palvi
```

**Reinicios normales** (sin rebuild, sin perder datos):

```bash
docker compose up
```

**Tras cambios de schema** (la app te lo va a tirar como `UndefinedColumnError` si pasa):

```bash
docker compose down -v && docker compose up --build
```

`-v` borra el volumen `palvi_db`. Es destructivo a propósito — el proyecto no usa Alembic para mantener la fricción baja en evaluación.

**Re-importar `metrics.json` sin tocar el volumen:**

Descomentá `# FORCE_RESEED: "true"` en `docker-compose.yml` (servicio `api`), corré `docker compose restart api`, después volvé a comentarlo.

## Servicios

| Servicio | URL | Notas |
| -------- | --- | ----- |
| Web      | http://localhost:5173 | Vite dev server, hot reload activo |
| API      | http://localhost:8000 | docs Swagger en `/docs` |
| DB       | localhost:5433 | usuario/pass/db = `palvi/palvi/palvi` |

## Cómo usar

1. **Login** con las credenciales por defecto.
2. **Switcher de datasets** (A/B/C/D) en el header — la URL refleja `?dataset=A` y la elección sobrevive al refresh.
3. **Rango de fechas** en la barra bajo el header — desde / hasta + presets 7d / 30d / 90d. Filtra KPIs, embudo, sparklines y la evaluación de reglas (que toma el último día del rango).
4. **Foco de hoy** muestra solo las reglas que están disparadas para el dataset y rango activos. Click en `+ Nueva regla` para crear una más (`nombre + métrica + operador + umbral + severidad`).
5. **Reglas** (toggle en el header) — vista de mantenedor: lista todas las reglas, disparadas o no, con editar/borrar.
6. **Exportar CSV** descarga el rango activo como CSV (compatible con Excel).
7. **Salir** en el header.

## Deployment (Coolify + Caddy)

El repo trae dos compose files:

| Archivo | Uso |
| ------- | --- |
| `docker-compose.yml` | desarrollo local (Vite dev server, bind mounts, credenciales dev) |
| `docker-compose.prod.yml` | producción: nginx sirviendo `dist/`, sin bind mounts, todo parametrizado por env, `expose` interno (no `ports` al host) |

**Simular producción local:**

```bash
cp .env.example .env       # ajustá las variables
docker compose -f docker-compose.prod.yml --env-file .env up --build
```

**Variables que Coolify (o `.env`) tiene que setear:**

| Variable | Para qué |
| -------- | -------- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | credenciales Postgres |
| `JWT_SECRET` | secreto HS256 — generar con `openssl rand -base64 48` |
| `CORS_ORIGINS` | CSV de orígenes permitidos (ej. `https://palvi.example.cl`) |
| `VITE_API_URL` | URL pública del API — **build-time**, Vite la inyecta al hacer `npm run build` |
| `API_WORKERS` *(opcional)* | uvicorn workers, default 2 |
| `FORCE_RESEED` *(opcional)* | `true` para re-importar `metrics.json` en el próximo boot |

**Por qué `VITE_API_URL` es build-time:** Vite resuelve `import.meta.env.*` cuando compila el bundle, no en runtime. Si cambiás la URL del API hay que rebuildear la imagen `web` (Coolify lo hace solo al redeployar). El `frontend/Dockerfile.prod` recibe la variable como `ARG` y la propaga al `npm run build`.

**Coolify setup:**

1. Conectar el repo, elegir el Docker Compose build pack y apuntar al `docker-compose.prod.yml`.
2. Setear las env vars del cuadro de arriba en el panel del proyecto.
3. Asignar un subdominio al servicio `web` (puerto `80`) y otro al `api` (puerto `8000`). Caddy entra por la red interna de Docker (no hace falta `ports`).
4. Asegurarse que `VITE_API_URL` apunta al subdominio del `api`, y que `CORS_ORIGINS` incluye el subdominio del `web`.

**Nota sobre el primer deploy:** el lifespan del backend siembra el admin, las alarmas y los 365×11×4 metric values al primer boot. Esa rutina chequea "is empty?" antes de insertar y **no es concurrency-safe**. Con `API_WORKERS=2` y DB vacía, los dos workers pueden correr la verificación a la vez y el segundo pegar contra UNIQUE. Si el cold-start falla, bajá `API_WORKERS=1`, redeployá, y una vez sembrado podés volver a `2` sin problemas. En boots subsiguientes la data ya está, no hay race.

## Decisiones técnicas

**Stack.** React + TypeScript + Vite (lo que pide el brief). Backend FastAPI + Postgres + Docker — decisión deliberada para demostrar pensamiento full-stack y aislar la lógica de dominio (ingest, validación, reglas) de la presentación. Sé que para 668 KB de JSON estático un backend es over-engineering, pero el brief evalúa decisiones y prefiero defenderla.

**Reglas como entidad.** Una alarma es una regla evaluada: `nombre + metric_key + operador + umbral + severidad`. El operador es un ENUM Postgres con 6 valores; valores inválidos son imposibles a nivel DB. La evaluación corre en el servidor — `GET /api/alarms?dataset=A&to=YYYY-MM-DD` carga las reglas, busca el último valor de cada métrica con un solo query `DISTINCT ON`, y devuelve cada regla con `triggered` y `current_value`. Las reglas son globales; el dataset y el rango son contexto de evaluación.

**Estado en URL.** `?dataset=`, `?view=`, `?from=`, `?to=` coexisten en la query string. Refresh, deep links y back/forward funcionan sin librería de routing — un solo state-gate en `main.tsx` decide auth, una toggle decide reporte vs reglas, y los hooks pequeños mantienen cada param.

**Filtros client-side.** El dataset se trae completo una sola vez por dataset (cache `Map` en `App.tsx`). Filtrar por rango no genera más fetches — `metricUtils.ts` provee helpers `sliceByRange` puros que recomputan KPIs/funnel/sparklines en memoria. Solo las reglas pasan `to` al backend para evaluar contra el último día correcto.

**Auth.** JWT HS256 + bcrypt. Sin registro (sistema interno). Token en `localStorage`; XSS es riesgo conocido y aceptado para una herramienta sin scripts de terceros. `JWT_SECRET` arranca con default de dev en `docker-compose.yml` — debe sobreescribirse en producción.

## Segunda iteración

**Reglas combinadas y temporales.** Las reglas actuales comparan un valor puntual contra un umbral fijo. Lo natural siguiente es combinar condiciones (`avg_response_time_min > 30 AND delta_7d > 50%`) o detectar spikes. Requiere un mini DSL o un editor visual; el brief priorizaba foco sobre ambición.

**Tests.** Unitarios para `metricUtils.ts` (sentiment, slicing, null-handling) y un par de e2e para los flujos del switcher y el filtro. Ahí vive la lógica que más fácil se rompe en silencio.

**Reglas scoped por dataset.** Hoy son globales — el mismo umbral aplica a A/B/C/D. Si cada dataset necesita umbrales distintos, basta agregar un `dataset_id` FK opcional a `alarms` y filtrar en el GET.

**Carga de datos real.** Hoy se lee `metrics.json` al boot. La iteración natural es un endpoint `POST /api/metrics/import` que acepta CSV/JSON, más un cron que tire del CRM real cada noche.
