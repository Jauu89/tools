#!/usr/bin/env python3
"""Stock Scout: servidor local sin dependencias obligatorias.
Uso:  python3 server.py [--port 8765] [--demo]"""
import argparse, json, mimetypes, os, sys, threading, webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
import data, scoring

BASE = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
STATIC = os.path.join(BASE, "static")
MODE = "live" if data.HAS_LIVE else "demo"

def analyze_many(tickers):
    out, errors = [], []
    for kind, item in data.fetch_many(tickers, MODE):
        (out if kind == "ok" else errors).append(scoring.analyze(item) if kind == "ok" else item)
    out.sort(key=lambda r: -(r["score"] or 0))
    return out, errors

class H(BaseHTTPRequestHandler):
    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers(); self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/api/status":
            return self._json({"mode": MODE, "universe": data.UNIVERSE})
        if u.path == "/api/analyze":
            q = parse_qs(u.query).get("tickers", [""])[0]
            tickers = [t.strip().upper() for t in q.split(",") if t.strip()][:60] or data.UNIVERSE
            results, errors = analyze_many(tickers)
            return self._json({"mode": MODE, "results": results, "errors": errors})
        path = "index.html" if u.path in ("/", "") else u.path.lstrip("/")
        full = os.path.realpath(os.path.join(STATIC, path))
        if not full.startswith(os.path.realpath(STATIC) + os.sep) or not os.path.isfile(full):
            self.send_error(404); return
        with open(full, "rb") as f: body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(full)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers(); self.wfile.write(body)

    def log_message(self, *a): pass

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--demo", action="store_true", help="forzar datos de ejemplo")
    ap.add_argument("--no-browser", action="store_true", help="no abrir el navegador")
    a = ap.parse_args()
    if a.demo: MODE = "demo"
    print(f"Stock Scout en http://127.0.0.1:{a.port}  (modo: {MODE})")
    if MODE == "demo":
        print("Aviso: datos de ejemplo. Para datos reales:  pip install yfinance")
    url = f"http://127.0.0.1:{a.port}"
    if not a.no_browser:
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    try:
        ThreadingHTTPServer(("127.0.0.1", a.port), H).serve_forever()
    except OSError:
        print(f"El puerto {a.port} está ocupado. Prueba: --port 9000")
        input("Pulsa Enter para salir")
