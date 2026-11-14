# Stock Scout

App local para **cribar acciones, entender por qué puntúan bien o mal y aprender el proceso**.

```bash
cd stock-scout
pip install yfinance      # opcional: datos reales (sin esto usa datos demo)
python3 server.py         # abre http://127.0.0.1:8765
```

- **Oportunidades**: ranking de ~30 grandes empresas o de tu propia lista de tickers.
- **Analizar una acción**: nota 0-100 + explicación de cada métrica y su lección.
- **Aprende**: proceso de 5 pasos, tipos de oportunidad, trampas, checklist y glosario.

La nota combina valoración (30%), calidad (30%), crecimiento (20%), momentum (10%) y riesgo (10%); los umbrales están en `scoring.py` y puedes ajustarlos.
`demo_data.json` contiene cifras aproximadas **no actuales**, solo para probar sin conexión.

> Herramienta educativa; no es asesoramiento financiero.

## Sin instalar nada

- **Android / móvil**: abre `stock-scout.html` (un solo archivo, funciona offline). Cópialo al móvil
  (Drive, cable, WhatsApp a ti mismo…) y ábrelo con Chrome. Usa datos de ejemplo y el formulario
  «Mis datos» para analizar cualquier acción con cifras que copies de tu broker. Se regenera con `python3 build_html.py`.
- **Ejecutable (Windows/Mac/Linux)**: en GitHub → Actions → «Stock Scout ejecutables» → Run workflow,
  y descarga el artefacto de tu sistema. Doble clic y se abre en el navegador (con datos reales).

## Fondos de inversión y PDF de Morningstar
Pestaña **Fondos**: sube una o varias fichas PDF de Morningstar; se extraen TER, estrellas, rentabilidades, Sharpe,
volatilidad, patrimonio, antigüedad… (mejor esfuerzo, por patrones de texto). Revisa los campos resaltados, añade
la media de la categoría si la tienes y puntúa. Comparador de hasta 30 fondos (se guarda en el dispositivo).
El lector de PDF (pdf.js) se descarga de cdnjs, así que necesita internet la primera vez.

## Tiempo real
- **Finnhub (gratis, también en Android)**: pega tu clave en «Datos en tiempo real». Cotización en directo por
  WebSocket y fundamentales actualizados, solo acciones de EE. UU. Límite gratuito: 60 consultas/min.
- **Servidor/ejecutable**: usa `yfinance` (casi tiempo real, ~15 min de retraso en muchas bolsas europeas) con caché de 1 h para fundamentales.
- Los fondos publican precio una vez al día: no hay tiempo real posible.
