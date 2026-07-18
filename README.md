# NARA BACK

Sitio one-pager de NARA BACK (DJ media kit). Home construido a partir del diseño
original, desempaquetado a archivos estáticos self-contained.

## Estructura

```
index.html      # home (mobile) — markup + runtime de componentes embebido
assets/         # imágenes (webp/png), fonts (woff2) y libs (React, three, ogl, Swiper, Babel, dc-runtime, Waves)
vercel.json     # cleanUrls + cache larga para /assets/*
```

No hay paso de build: son archivos estáticos. El runtime hace `fetch()` de sus
recursos, así que hay que servirlo por **HTTP** (no `file://`).

## Local

```bash
npx serve .            # o: python3 -m http.server 4599
```

## Deploy en Vercel

- Framework Preset: **Other**
- Build Command: *(vacío)*
- Output Directory: *(raíz)*

Vercel sirve `index.html` en `/`.
