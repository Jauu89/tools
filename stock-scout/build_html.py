#!/usr/bin/env python3
"""Genera stock-scout.html: un único archivo que funciona offline (también en Android)."""
import os, re
d = os.path.join(os.path.dirname(__file__), "static")
html = open(os.path.join(d, "index.html"), encoding="utf-8").read()
for js in ("learn.js", "engine.js", "demo.js"):
    code = open(os.path.join(d, js), encoding="utf-8").read()
    html = html.replace(f'<script src="{js}"></script>', f"<script>\n{code}\n</script>")
out = os.path.join(os.path.dirname(__file__), "stock-scout.html")
open(out, "w", encoding="utf-8").write(html)
print("Generado", out, f"({len(html)//1024} KB)")
