#!/usr/bin/env bash
# Abre la galería en http://localhost:8080 (solo accesible desde tu ordenador).
cd "$(dirname "$0")" || exit 1
PORT="${1:-8080}"
echo "Boletus de Lugo en http://localhost:$PORT  (Ctrl+C para parar)"
(command -v xdg-open >/dev/null && xdg-open "http://localhost:$PORT") \
  || (command -v open >/dev/null && open "http://localhost:$PORT") || true
exec python3 -m http.server "$PORT" --bind 127.0.0.1
