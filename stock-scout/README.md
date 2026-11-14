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
