"""
Anàlisi de despeses d'un usuari amb pandas.

Ús:  python analytics/report.py <user_id> [all|YYYY|YYYY-MM]

Escriu per stdout un JSON amb:
  - months:      mesos amb despeses (més recent primer)
  - total:       total gastat al període
  - categories:  [{category, total, pct}] ordenat de més a menys
  - monthly:     [{month, total}] total per mes (tot l'historial)
  - chart_categories / chart_monthly: gràfics PNG en base64
"""
import base64
import io
import json
import os
import re
import sys

import matplotlib

matplotlib.use("Agg")  # sense finestra, només genera imatges
import matplotlib.pyplot as plt
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

BAR = "#2a78d6"
TEXT = "#3d3d3a"
MUTED = "#8a8a85"
GRID = "#e8e7e2"


def load_expenses(user_id: int) -> pd.DataFrame:
    url = URL.create(
        "mysql+pymysql",
        username=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "") or None,
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "pressupost"),
    )
    engine = create_engine(url)
    query = text(
        """
        SELECT c.name AS category, e.amount, e.date
        FROM expenses e
        JOIN categories c ON c.id = e.category_id
        WHERE c.user_id = :uid
        """
    )
    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"uid": user_id})
    engine.dispose()

    df["amount"] = df["amount"].astype(float)
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.strftime("%Y-%m")
    return df


def eur(value: float) -> str:
    # 1234.5 -> "1.234,50 €"
    s = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{s} €"


def style_axes(ax) -> None:
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color(GRID)
    ax.tick_params(colors=MUTED, labelsize=9, length=0)


def to_base64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=140, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def chart_categories(by_cat: pd.Series, pct: pd.Series) -> str:
    """Barres horitzontals ordenades: % del total per categoria."""
    data = pct.iloc[::-1]  # la més gran a dalt
    height = max(2.2, 0.45 * len(data) + 0.8)
    fig, ax = plt.subplots(figsize=(7, height))
    ax.barh(data.index, data.values, color=BAR, height=0.6)
    for i, (name, value) in enumerate(data.items()):
        ax.text(value + 1, i, f"{value:.1f}".replace(".", ",") + f" %  ·  {eur(by_cat[name])}",
                va="center", fontsize=9, color=TEXT)
    ax.set_xlim(0, max(100, data.max() * 1.45))
    ax.xaxis.set_visible(False)
    ax.spines["bottom"].set_visible(False)
    style_axes(ax)
    ax.tick_params(axis="y", colors=TEXT, labelsize=10)
    ax.set_title("Percentatge de la despesa per categoria", loc="left",
                 fontsize=11, color=TEXT, pad=10)
    return to_base64(fig)


def chart_monthly(monthly: pd.Series, highlight: str) -> str:
    """Total gastat per mes; si hi ha un mes seleccionat, es destaca."""
    fig, ax = plt.subplots(figsize=(7, 3.2))
    colors = [BAR if highlight in ("all", m) or len(highlight) == 4 else "#b7d3f6" for m in monthly.index]
    ax.bar(monthly.index, monthly.values, color=colors, width=0.6)
    ax.yaxis.grid(True, color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    style_axes(ax)
    ax.set_ylabel("€", color=MUTED, fontsize=9)
    ax.set_title("Total gastat per mes", loc="left", fontsize=11, color=TEXT, pad=10)
    if len(monthly) > 6:
        ax.tick_params(axis="x", rotation=45)
    return to_base64(fig)


def main() -> None:
    user_id = int(sys.argv[1])
    month = sys.argv[2] if len(sys.argv) > 2 else "all"
    if month != "all" and not re.fullmatch(r"\d{4}(-\d{2})?", month):
        raise ValueError("Període invàlid")

    df = load_expenses(user_id)
    months = sorted(df["month"].unique().tolist(), reverse=True)
    if len(month) == 4:  # un any sencer: el gràfic mensual només mostra aquell any
        df = df[df["month"].str.startswith(month)]
    monthly = df.groupby("month")["amount"].sum().sort_index()

    view = df if month == "all" or len(month) == 4 else df[df["month"] == month]
    total = float(view["amount"].sum())

    result = {
        "month": month,
        "months": months,
        "total": round(total, 2),
        "categories": [],
        "monthly": [{"month": m, "total": round(float(v), 2)} for m, v in monthly.items()],
        "chart_categories": None,
        "chart_monthly": None,
    }

    if total > 0:
        by_cat = view.groupby("category")["amount"].sum().sort_values(ascending=False)
        pct = (by_cat / total * 100).round(1)
        result["categories"] = [
            {"category": name, "total": round(float(by_cat[name]), 2), "pct": float(pct[name])}
            for name in by_cat.index
        ]
        result["chart_categories"] = chart_categories(by_cat, pct)
        result["chart_monthly"] = chart_monthly(monthly, month)

    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # l'error va a stderr i Node respon 500
        print(f"{type(exc).__name__}: {exc}", file=sys.stderr)
        sys.exit(1)
