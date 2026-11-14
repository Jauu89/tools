"""Motor de puntuación: convierte datos fundamentales y técnicos en una nota 0-100
y, sobre todo, en una EXPLICACIÓN de por qué una acción puntúa bien o mal."""

def _scale(v, bad, good):
    """0 si v<=bad, 100 si v>=good (funciona también si good<bad)."""
    if v is None:
        return None
    t = (v - bad) / (good - bad)
    return max(0.0, min(1.0, t)) * 100

def _pct(v): return f"{v*100:.1f}%"
def _x(v): return f"{v:.1f}"

# key, etiqueta, categoría, valor_malo, valor_bueno, formato, [texto malo, medio, bueno], lección
METRICS = [
    ("pe", "PER (precio/beneficio)", "valoracion", 40, 10, _x,
     ["Pagas mucho por cada € de beneficio: el mercado ya descuenta un futuro muy brillante.",
      "Valoración razonable, ni barata ni cara.",
      "Barata respecto a sus beneficios actuales."],
     "El PER dice cuántos años de beneficios actuales pagas. Compáralo con empresas de su sector, no con todo el mercado."),
    ("forward_pe", "PER futuro", "valoracion", 35, 10, _x,
     ["Incluso con los beneficios que se esperan, sigue cara.",
      "Se espera que los beneficios mejoren la valoración, pero sin holgura.",
      "Con los beneficios esperados, el precio resulta atractivo."],
     "Si el PER futuro es mucho menor que el actual, se esperan beneficios crecientes (o una predicción optimista)."),
    ("peg", "PEG (PER/crecimiento)", "valoracion", 3.0, 0.8, _x,
     ["El precio no está justificado por su crecimiento.",
      "Precio acorde con el crecimiento.",
      "Crece rápido para lo que cuesta (PEG < 1 es la clásica señal de Peter Lynch)."],
     "PEG = PER / crecimiento esperado del beneficio. Corrige el defecto de mirar el PER sin contexto."),
    ("fcf_yield", "Rentabilidad por caja libre", "valoracion", 0.0, 0.08, _pct,
     ["Genera poca o ninguna caja libre respecto a lo que vale.",
      "Caja libre aceptable frente a su precio.",
      "Genera mucha caja libre respecto a su precio: el negocio 'paga' tu inversión."],
     "La caja libre (flujo de caja - inversiones) es difícil de maquillar. FCF/capitalización > 5% suele ser señal de infravaloración."),
    ("roe", "ROE (rentabilidad sobre recursos propios)", "calidad", 0.0, 0.25, _pct,
     ["Gana poco con el dinero de los accionistas.",
      "Rentabilidad correcta sobre el capital.",
      "Alta rentabilidad sobre el capital: típico de negocios con ventajas competitivas."],
     "Busca ROE sostenido > 15% durante años. Ojo: demasiada deuda infla el ROE artificialmente."),
    ("margin", "Margen neto", "calidad", 0.0, 0.25, _pct,
     ["Margen muy ajustado: poco colchón ante problemas.",
      "Margen decente.",
      "Margen alto: señal de poder de fijación de precios."],
     "Márgenes altos y estables indican ventaja competitiva (marca, tecnología, escala)."),
    ("debt_equity", "Deuda / recursos propios (%)", "calidad", 200, 30, lambda v: f"{v:.0f}%",
     ["Muy endeudada: vulnerable a subidas de tipos o a una mala racha.",
      "Deuda moderada.",
      "Balance sólido, poca deuda."],
     "La deuda amplifica ganancias y pérdidas. Los bancos y eléctricas tienen mucha deuda por naturaleza: compara por sector."),
    ("rev_growth", "Crecimiento de ingresos", "crecimiento", -0.05, 0.20, _pct,
     ["Las ventas caen o están estancadas.",
      "Crecimiento moderado.",
      "Ventas creciendo con fuerza."],
     "Sin crecimiento de ingresos, los beneficios solo pueden crecer recortando costes, y eso tiene límite."),
    ("earn_growth", "Crecimiento de beneficios", "crecimiento", -0.10, 0.25, _pct,
     ["Beneficios en retroceso.",
      "Beneficios creciendo a un ritmo normal.",
      "Beneficios acelerando."],
     "Los precios siguen a los beneficios a largo plazo. Desconfía de crecimiento puntual por factores extraordinarios."),
    ("ret_6m", "Rentabilidad 6 meses", "momentum", -0.15, 0.25, _pct,
     ["Tendencia bajista reciente.",
      "Tendencia lateral o suave.",
      "Fuerte tendencia alcista reciente."],
     "El momentum es uno de los factores mejor documentados: lo que sube tiende a seguir subiendo a medio plazo."),
    ("vs_sma200", "Precio vs media de 200 sesiones", "momentum", -0.10, 0.15, _pct,
     ["Cotiza por debajo de su media de 200 días: tendencia de largo plazo rota.",
      "Cerca de su media de 200 días.",
      "Por encima de su media de 200 días: tendencia de largo plazo sana."],
     "Regla simple: no comprar contra la tendencia. Por debajo de la media de 200 días, espera a confirmación."),
    ("drawdown", "Caída desde máximos de 52 semanas", "riesgo", 0.40, 0.05, _pct,
     ["Muy lejos de máximos: o hay una oportunidad, o un problema serio. Investiga por qué.",
      "Corrección normal.",
      "Cerca de máximos: el mercado confía en ella."],
     "Una caída grande no es una ganga por sí misma. Pregunta siempre: ¿ha cambiado el negocio o solo el precio?"),
    ("beta", "Beta (volatilidad vs mercado)", "riesgo", 1.8, 0.7, _x,
     ["Muy volátil: sube y baja mucho más que el mercado.",
      "Volatilidad similar al mercado.",
      "Menos volátil que el mercado."],
     "Beta 1 = como el mercado. Beta 2 = se mueve el doble. Ajusta el tamaño de la posición a la volatilidad."),
]

CATS = {  # nombre, peso
    "valoracion": ("Valoración", 0.30),
    "calidad": ("Calidad del negocio", 0.30),
    "crecimiento": ("Crecimiento", 0.20),
    "momentum": ("Momentum / tendencia", 0.10),
    "riesgo": ("Riesgo", 0.10),
}

def derive(raw):
    """Calcula métricas derivadas a partir de datos brutos."""
    d = dict(raw)
    mc, fcf = raw.get("market_cap"), raw.get("fcf")
    d["fcf_yield"] = fcf / mc if mc and fcf is not None else None
    p, hi, sma = raw.get("price"), raw.get("high_52w"), raw.get("sma200")
    d["drawdown"] = (hi - p) / hi if p and hi else None
    d["vs_sma200"] = p / sma - 1 if p and sma else None
    return d

def analyze(raw):
    d = derive(raw)
    findings, cat_scores = [], {}
    for key, label, cat, bad, good, fmt, texts, lesson in METRICS:
        v = d.get(key)
        s = _scale(v, bad, good)
        if s is None:
            continue
        level = 0 if s < 35 else (1 if s < 65 else 2)
        findings.append(dict(key=key, label=label, category=cat, value=fmt(v),
                             score=round(s), level=["bad", "mid", "good"][level],
                             text=texts[level], lesson=lesson))
        cat_scores.setdefault(cat, []).append(s)
    cats, total, wsum = [], 0.0, 0.0
    for cat, (name, w) in CATS.items():
        sc = cat_scores.get(cat)
        if sc:
            avg = sum(sc) / len(sc)
            cats.append(dict(key=cat, name=name, score=round(avg), weight=w))
            total += avg * w
            wsum += w
    score = round(total / wsum) if wsum else None

    flags = []
    if (d.get("margin") or 0) < 0: flags.append("Pierde dinero (margen neto negativo).")
    if (d.get("fcf") or 0) < 0: flags.append("Consume caja: la caja libre es negativa.")
    if (d.get("debt_equity") or 0) > 250: flags.append("Deuda muy elevada frente a sus recursos propios.")
    if (d.get("pe") or 0) > 60: flags.append("Valoración extrema (PER > 60): poco margen de error.")
    if (d.get("vs_sma200") or 0) < -0.15: flags.append("Tendencia de largo plazo claramente rota.")
    if len(findings) < 6: flags.append("Pocos datos disponibles: la nota es poco fiable.")

    if score is None: verdict = "Sin datos"
    elif score >= 68 and len(flags) == 0: verdict = "Interesante"
    elif score >= 55: verdict = "A vigilar"
    else: verdict = "Evitar por ahora"

    pos = [f for f in sorted(findings, key=lambda f: -f["score"]) if f["level"] == "good"][:3]
    neg = [f for f in sorted(findings, key=lambda f: f["score"]) if f["level"] == "bad"][:3]
    name = raw.get("name") or raw.get("ticker")
    if score is None:
        summary = "No hay datos suficientes."
    else:
        summary = f"{name} obtiene {score}/100 ({verdict}). "
        if pos: summary += "Lo mejor: " + "; ".join(f["label"].lower() for f in pos) + ". "
        if neg: summary += "Lo peor: " + "; ".join(f["label"].lower() for f in neg) + ". "
        summary += "Es una nota de cribado, no una recomendación: valida el negocio antes de comprar."

    return dict(ticker=raw.get("ticker"), name=name, sector=raw.get("sector"),
                price=raw.get("price"), currency=raw.get("currency", "USD"),
                score=score, verdict=verdict, categories=cats, findings=findings,
                flags=flags, summary=summary, source=raw.get("source", "?"))
