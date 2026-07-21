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
api/                # funciones serverless (config, content, contact, messages, instagram)
lib/                # helpers de servidor (supabase, auth)
supabase/schema.sql # esquema de la base (tablas, RLS, storage)
assets/             # imágenes, fonts y libs (React, three, ogl, Swiper, Babel, dc-runtime, Waves)
vercel.json         # cleanUrls + cache + funciones
.env.example        # variables de entorno necesarias
```

El home funciona aunque el backend no esté configurado (degrada al contenido base).

## Local

```bash
npm install
npx vercel dev        # corre estáticos + funciones /api (necesita Vercel CLI + .env.local)
# o, solo el home sin backend:
python3 -m http.server 4599
```

---

## Puesta en marcha del CMS

### 1. Crear proyecto en Supabase
1. En [supabase.com](https://supabase.com) → **New project**.
2. **SQL Editor** → pegá y ejecutá `supabase/schema.sql` (crea tablas, RLS y el bucket `media`).
3. **Authentication → Providers → Email**: activá email/password y **DESACTIVÁ** "Allow new users to sign up" (que solo exista tu cuenta).
4. **Authentication → Users → Add user**: creá tu usuario admin (ej. `hanna@authomata.io`) con contraseña.
5. **Project Settings → API**: copiá `Project URL`, `anon public` key y `service_role` key.

### 2. Variables de entorno en Vercel
En el proyecto de Vercel → **Settings → Environment Variables** (ver `.env.example`):

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key **(secreto)** |
| `ADMIN_EMAILS` | tu email admin, en minúscula |
| `IG_ACCOUNTS_JSON` | `{}` por ahora (ver Instagram) |

Redeploy. Entrá a `/admin`, iniciá sesión y editá el contenido / revisá la bandeja.

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
