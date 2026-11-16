@echo off
rem Abre la galeria en http://localhost:8080 (solo accesible desde tu ordenador).
cd /d "%~dp0"
echo Boletus de Lugo en http://localhost:8080  (cierra esta ventana para parar)
start "" http://localhost:8080
py -m http.server 8080 --bind 127.0.0.1 || python -m http.server 8080 --bind 127.0.0.1
