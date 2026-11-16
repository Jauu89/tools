# Boletus de Lugo

Galería para distinguir boletus comestibles de sus dobles no comestibles y tóxicos. Web estática, sin dependencias.

## Usarla en local

Necesitas Python 3 (suele venir en Mac y Linux; en Windows, instálalo desde python.org).

- **Mac / Linux:** `./iniciar.sh`
- **Windows:** doble clic en `iniciar.bat`

Se abre en <http://localhost:8080>. Solo es accesible desde tu ordenador.

¿Por qué no abrir `index.html` directamente? Se ve igual, pero los navegadores guardan los datos
de las páginas `file://` de forma poco fiable, y el mapa con tus puntos secretos los guardará en el navegador.

## Mapa (mapa.html)

- **＋ Añadir punto** y toca el mapa, o clic derecho. **📍 Mi ubicación** añade un punto donde estás.
- Cada punto tiene nombre, especies, árbol, notas y un **diario de visitas** (fecha, resultado, nota).
  El color del marcador es el resultado de la última visita; azul = sin visitas.
- Para moverlo, selecciónalo y arrástralo.
- Capas: mapa, topográfico y satélite (PNOA del IGN).
- **Exportar / Importar**: copia de seguridad en un `.json`.

### Privacidad de tus puntos
- Se guardan **solo en este navegador** (`localStorage`). No se envían a ningún sitio.
- Lo único que sale a internet son las peticiones de las teselas del mapa, que revelan la zona que miras, no tus puntos.
- **Este repositorio es público.** No subas nunca un archivo exportado (`boletus-puntos-*.json`);
  el `.gitignore` ya lo evita.
- Borrar los datos del navegador borra los puntos: exporta de vez en cuando.

## Lluvia (lluvia.html)

Panel con la lluvia de los últimos 30 días y la previsión de 14, la temperatura y la humedad del suelo
(datos de [Open-Meteo](https://open-meteo.com), gratis y sin clave). Para cada especie estima una
**ventana de fructificación**: cuando se acumula la lluvia necesaria repartida en varios días, calcula
10-16 días después, y la valora con la temperatura (heladas, noches frías, calor) y la temporada.

- Zona por defecto: entre O Corgo y Castroverde. Puedes añadir otras con **＋ Zona** (o «usar el centro del mapa»).
- **Solo se consulta la zona**, con las coordenadas redondeadas a 2 decimales. Nunca tus puntos.
- Los datos se guardan una hora en el navegador; sin conexión, se enseñan los últimos guardados.
- **Ajustes del modelo**: los umbrales son de partida (vídeo divulgativo y fuentes generales) y no están
  validados para Lugo. Se pueden cambiar por especie.
- Es una estimación, no una garantía.

`modelo.js` contiene el cálculo, sin depender del navegador, para reutilizarlo en las alarmas.

## Estructura

- `data.js`: especies, grupos y pares "se confunde con" (se enlazan solos en las dos direcciones).
- `credits.js`: autor y licencia de cada foto (Wikimedia Commons).
- `img/`: fotos.
- `index.html`, `app.js`, `styles.css`: galería.
- `mapa.html`, `mapa.js`, `mapa.css`: mapa de puntos.
- `lluvia.html`, `lluvia.js`, `lluvia.css`: panel de lluvia y previsión.
- `modelo.js`: modelo de fructificación (navegador y Node).
- `vendor/leaflet/`: Leaflet 1.9.4 (BSD-2), incluido para no depender de ninguna CDN.

## Aviso

Es una ayuda para aprender, no un identificador. Contrasta siempre con una guía micológica de confianza.
