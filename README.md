# NARA BACK

Sitio one-pager de NARA BACK (DJ media kit) + CMS. El home es el diseño original
desempaquetado a estáticos self-contained; encima corre una capa de contenido
editable, un formulario de contacto con bandeja, e Instagram en vivo.

## Estructura

```
index.html          # home — markup + runtime de componentes + hydrate.js + formulario
hydrate.js          # capa de hidratación: aplica el contenido del CMS sobre el home
content.spec.json   # modelo de contenido (fuente única que consumen hydrate.js y /admin)
admin/index.html    # panel de administración (login + editor de contenido + bandeja)
api/                # funciones serverless (login, logout, session, content, contact, messages, upload, instagram)
lib/                # helpers de servidor (db, auth, http)
db/schema.sql       # esquema de Vercel Postgres
scripts/            # utilidades (hash-password)
assets/             # imágenes, fonts y libs (React, three, ogl, Swiper, Babel, dc-runtime, Waves)
vercel.json         # cleanUrls + cache + funciones
.env.example        # variables de entorno necesarias
```

Backend **todo en Vercel**: Vercel Postgres (datos) + Vercel Blob (imágenes) +
auth propia por cookie firmada (sin proveedores externos).

El home funciona aunque el backend no esté configurado (degrada al contenido base).

## Local

```bash
npm install
npx vercel dev        # corre estáticos + funciones /api (necesita Vercel CLI + .env.local)
# o, solo el home sin backend:
python3 -m http.server 4599
```

---

## Puesta en marcha del CMS (todo en Vercel)

### 1. Storage en Vercel (auto-inyecta sus env vars)
En el proyecto de Vercel → **Storage**:
1. **Create → Postgres** → conectalo al proyecto. Luego abrí su pestaña **Query** y ejecutá `db/schema.sql` (crea las tablas).
2. **Create → Blob** → conectalo al proyecto (para las imágenes).

Ambos setean solos `POSTGRES_URL` y `BLOB_READ_WRITE_TOKEN`.

### 2. Variables de entorno del admin (a mano)
En **Settings → Environment Variables** (ver `.env.example`):

| Variable | Valor |
|---|---|
| `AUTH_SECRET` | cadena aleatoria: `openssl rand -base64 32` |
| `ADMIN_EMAIL` | tu email admin, en minúscula |
| `ADMIN_PASSWORD_HASH` | generalo con `npm run hash-password -- 'tu-contraseña'` |
| `IG_ACCOUNTS_JSON` | `{}` por ahora (ver Instagram) |

Redeploy. Entrá a `/admin`, iniciá sesión con tu email + contraseña y editá el
contenido / revisá la bandeja.

### 3. Instagram en vivo (opcional)
Solo funciona sobre cuentas que **administrás** (Instagram Graph API):
1. La cuenta IG debe ser **Profesional/Business** y estar ligada a una Página de Facebook.
2. Creá una app en [developers.facebook.com](https://developers.facebook.com) con **Instagram Graph API** y obtené un **token de larga duración** + el **user id** de la cuenta.
3. Cargá `IG_ACCOUNTS_JSON` con: `{"narabacks":{"userId":"...","token":"..."}}` (agregá más handles si administrás otras). Los tokens caducan cada ~60 días y hay que renovarlos.
4. Las cuentas sin token siguen mostrando las imágenes curadas desde el `/admin`.

---

## Deploy en Vercel

- Framework Preset: **Other** · Build Command: *(vacío)* · Output Directory: *(raíz)*
- Vercel detecta `/api/*` como funciones automáticamente.
- `git push` a `main` → deploy automático.

## Notas / límites conocidos
- El home es un artefacto compilado: el CMS edita **textos e imágenes en su lugar**.
  Agregar/quitar ítems de las listas (agenda, escenarios, logos) es una mejora futura.
- Solo versión **mobile** por ahora.
