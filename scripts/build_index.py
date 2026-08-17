import fitz, json, re, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manuals = [
    ("universal", "Manual IBK Universal", "2025", ROOT/"public/manuals/manual-universal.pdf"),
    ("express", "Manual IBK Express", "2025", ROOT/"public/manuals/manual-express.pdf"),
    ("obra", "Manual de obra", "2026", ROOT/"public/manuals/manual-obra.pdf"),
]

def clean(text):
    text = text.replace("\u00ad", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

pages=[]
for mid, name, version, path in manuals:
    doc=fitz.open(path)
    for i, page in enumerate(doc):
        text=clean(page.get_text("text"))
        if not text:
            continue
        # Heuristic headings: useful metadata only; never treated as facts.
        lines=[x.strip() for x in text.splitlines() if x.strip()]
        heading=""
        for line in lines[:8]:
            if len(line) <= 90 and not re.fullmatch(r"\d+", line):
                heading=line
                break
        pages.append({
            "manualId": mid,
            "manual": name,
            "version": version,
            "page": i+1,
            "heading": heading,
            "text": text,
            "pdfUrl": f"/manuals/manual-{mid if mid!='obra' else 'obra'}.pdf#page={i+1}",
        })
    doc.close()

# Fix universal filename mapping generated above.
for p in pages:
    if p["manualId"] == "universal": p["pdfUrl"] = f"/manuals/manual-universal.pdf#page={p['page']}"
    elif p["manualId"] == "express": p["pdfUrl"] = f"/manuals/manual-express.pdf#page={p['page']}"

out=ROOT/"data/manual-index.json"
out.write_text(json.dumps(pages, ensure_ascii=False), encoding="utf-8")
print(f"Indexed {len(pages)} pages -> {out} ({out.stat().st_size/1024/1024:.1f} MB)")
