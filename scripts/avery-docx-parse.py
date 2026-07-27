#!/usr/bin/env python3
"""Avery Word template parser (gist-style) for US Letter templates."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import docx
import win32com.client

MM_TO_IN = 1 / 25.4
PAGE_W_IN = 8.5
PAGE_H_IN = 11


def convert_doc_to_docx(doc_path: Path, docx_path: Path) -> None:
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    doc = word.Documents.Open(str(doc_path.resolve()))
    doc.SaveAs2(str(docx_path.resolve()), FileFormat=16)
    doc.Close(False)
    word.Quit()


def split_label_gutter(sizes_in: list[float]) -> tuple[list[float], list[float]]:
    if len(sizes_in) == 1:
        return sizes_in, []
    if len(sizes_in) >= 3 and len(sizes_in) % 2 == 1:
        return sizes_in[0::2], sizes_in[1::2]
    if max(sizes_in) - min(sizes_in) < 0.02:
        return sizes_in, []
    med = sorted(sizes_in)[len(sizes_in) // 2]
    labels = [s for s in sizes_in if s >= med * 0.75]
    gutters = [s for s in sizes_in if s < med * 0.75]
    return labels, gutters


def table_to_geometry(cols_mm: list[float], rows_mm: list[float]) -> dict | None:
    cols = [c * MM_TO_IN for c in cols_mm]
    rows = [r * MM_TO_IN for r in rows_mm]
    label_cols, gutter_cols = split_label_gutter(cols)
    label_rows, gutter_rows = split_label_gutter(rows)
    if not label_cols or not label_rows:
        return None
    used_w = sum(cols)
    used_h = sum(rows)
    margin_left = (PAGE_W_IN - used_w) / 2
    margin_top = (PAGE_H_IN - used_h) / 2
    if margin_left < 0 or margin_top < 0:
        return None
    return {
        "labelWidthIn": round(label_cols[0], 3),
        "labelHeightIn": round(label_rows[0], 3),
        "columns": len(label_cols),
        "rows": len(label_rows),
        "marginLeftIn": round(margin_left, 3),
        "marginTopIn": round(margin_top, 3),
        "gutterXIn": round(gutter_cols[0], 3) if gutter_cols else 0,
        "gutterYIn": round(gutter_rows[0], 3) if gutter_rows else 0,
        "pageWidthIn": PAGE_W_IN,
        "pageHeightIn": PAGE_H_IN,
    }


def parse_doc(doc_path: Path) -> dict | None:
    docx_path = doc_path.with_suffix(".docx")
    if not docx_path.exists() or docx_path.stat().st_mtime < doc_path.stat().st_mtime:
        convert_doc_to_docx(doc_path, docx_path)
    document = docx.Document(str(docx_path))
    for table in document.tables:
        cols = [round(c.width.mm, 3) for c in table.columns]
        rows = [round(r.height.mm, 3) for r in table.rows]
        geom = table_to_geometry(cols, rows)
        if geom:
            geom["tableColsMm"] = cols
            geom["tableRowsMm"] = rows
            return geom
    return None


def main() -> None:
    doc_path = Path(sys.argv[1])
    result = parse_doc(doc_path)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
