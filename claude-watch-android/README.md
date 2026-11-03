# Claude Watch (Android)

Pulsas play/pause en el **Redmi Watch 6 Lite** (HyperOS, firmware cerrado, sin apps de terceros) y el
móvil escucha, pregunta a Claude y responde **leyendo en voz alta** + notificación en el reloj.

El reloj actúa de mando: envía eventos multimedia Bluetooth al móvil, que los captura con una `MediaSession`.

## Compilar
Abre la carpeta en Android Studio (necesita Gradle wrapper/Android SDK) y ejecuta en tu móvil.
Pega tu API key en la app. La clave se guarda en SharedPreferences del dispositivo (prototipo).

## Limitaciones
- Si el reloj no tiene micrófono, la voz se capta con el del móvil.
- Los eventos de botón dependen de que la app esté como sesión multimedia activa; otra app de música puede robarla.
- Las notificaciones al reloj dependen de que Mi Fitness/Xiaomi Wear tenga permitidas las notificaciones de esta app.
