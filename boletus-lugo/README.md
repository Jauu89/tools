# Boletus de Lugo

Galería para distinguir boletus comestibles de sus dobles no comestibles y tóxicos. Web estática, sin dependencias.

## Usarla en local

Necesitas Python 3 (suele venir en Mac y Linux; en Windows, instálalo desde python.org).

- **Mac / Linux:** `./iniciar.sh`
- **Windows:** doble clic en `iniciar.bat`

Se abre en <http://localhost:8080>. Solo es accesible desde tu ordenador.

¿Por qué no abrir `index.html` directamente? Se ve igual, pero los navegadores guardan los datos
de las páginas `file://` de forma poco fiable, y el mapa con tus puntos secretos los guardará en el navegador.

## Estructura

- `data.js`: especies, grupos y pares "se confunde con" (se enlazan solos en las dos direcciones).
- `credits.js`: autor y licencia de cada foto (Wikimedia Commons).
- `img/`: fotos.
- `app.js`, `styles.css`, `index.html`: la interfaz.

## Aviso

Es una ayuda para aprender, no un identificador. Contrasta siempre con una guía micológica de confianza.
