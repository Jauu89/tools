"""Proveedores de datos: en vivo (yfinance) o demo (ejemplo ilustrativo sin conexión)."""
import json, os
from concurrent.futures import ThreadPoolExecutor

import sys
HERE = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
UNIVERSE = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "BRK-B", "JPM", "V", "JNJ",
            "PG", "KO", "PEP", "XOM", "CVX", "UNH", "HD", "COST", "WMT", "INTC",
            "PFE", "VZ", "T", "MRK", "ABBV", "TSLA", "NFLX", "DIS", "BAC", "CSCO"]

try:
    import yfinance as yf
    HAS_LIVE = True
except Exception:
    HAS_LIVE = False

def _g(info, *keys):
    for k in keys:
        v = info.get(k)
        if isinstance(v, (int, float)) and v == v:
            return v
    return None

import time
_CACHE = {}   # ticker -> (timestamp, info) ; los fundamentales cambian poco: 1 h
def _info(t, ticker):
    c = _CACHE.get(ticker)
    if c and time.time() - c[0] < 3600:
        return c[1]
    info = t.info or {}
    _CACHE[ticker] = (time.time(), info)
    return info

def fetch_live(ticker):
    t = yf.Ticker(ticker)
    info = _info(t, ticker)
    hist = t.history(period="1y", auto_adjust=True)
    if hist.empty:
        raise ValueError("sin historial de precios")
    close = hist["Close"]
    price = float(close.iloc[-1])
    try:  # precio más reciente (puede venir con ~15 min de retraso según la bolsa)
        fast = t.fast_info.get("last_price")
        if fast and fast == fast:
            price = float(fast)
    except Exception:
        pass
    ret_6m = price / float(close.iloc[max(0, len(close) - 126)]) - 1
    sma200 = float(close.tail(200).mean())
    peg = _g(info, "trailingPegRatio", "pegRatio")
    de = _g(info, "debtToEquity")
    return dict(
        ticker=ticker.upper(), name=info.get("longName") or info.get("shortName"),
        sector=info.get("sector"), currency=info.get("currency", "USD"), source="live",
        price=price, market_cap=_g(info, "marketCap"), fcf=_g(info, "freeCashflow"),
        pe=_g(info, "trailingPE"), forward_pe=_g(info, "forwardPE"), peg=peg,
        roe=_g(info, "returnOnEquity"), margin=_g(info, "profitMargins"),
        debt_equity=de, rev_growth=_g(info, "revenueGrowth"),
        earn_growth=_g(info, "earningsGrowth", "earningsQuarterlyGrowth"),
        ret_6m=ret_6m, sma200=sma200, high_52w=float(close.max()),
        beta=_g(info, "beta"))

def fetch_demo(ticker):
    with open(os.path.join(HERE, "demo_data.json"), encoding="utf-8") as f:
        db = json.load(f)
    row = db.get(ticker.upper())
    if not row:
        raise ValueError("no está en los datos de demo (instala yfinance para datos reales)")
    row = dict(row, ticker=ticker.upper(), source="demo")
    return row

def fetch_many(tickers, mode):
    fn = fetch_live if mode == "live" else fetch_demo
    def one(t):
        try:
            return ("ok", fn(t))
        except Exception as e:
            return ("err", {"ticker": t.upper(), "error": str(e)[:200]})
    with ThreadPoolExecutor(max_workers=8) as ex:
        return list(ex.map(one, tickers))

def fetch_quotes(tickers):
    """Último precio de cada ticker (solo modo live)."""
    def one(t):
        try:
            v = yf.Ticker(t).fast_info.get("last_price")
            return t.upper(), (float(v) if v and v == v else None)
        except Exception:
            return t.upper(), None
    with ThreadPoolExecutor(max_workers=8) as ex:
        return dict(ex.map(one, tickers))
