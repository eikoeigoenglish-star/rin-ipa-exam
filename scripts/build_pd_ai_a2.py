#!/usr/bin/env python3
"""Rebuild PD Data/AI A-2 from the 2026-11-21 refined CSV (single source of truth).

Usage from repository root: python3 scripts/build_pd_ai_a2.py
This does not write A-1 or SC A-2 data. It does not regenerate questions from old drafts.
"""
from __future__ import annotations
import csv
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "qa/pd-ai-a2/source-refined-230.csv"
TARGET = ROOT / "data/pd-ai-a2/questions.json"
SUMMARY = ROOT / "qa/pd-ai-a2/summary-230.json"
LABELS = "アイウエ"
FIELDS = {
    "data-management":"データマネジメント",
    "data-analytics":"データ分析・データ利活用",
    "ai-application":"AI利活用",
    "cloud":"クラウド",
    "database":"データベース",
    "ai-technology":"AI技術",
    "algorithms":"アルゴリズム・プログラミング",
    "privacy":"プライバシー関連法規",
}
REQUIRED = ["ID","模試回","問番号","分野ID","分野","問題文","選択肢ア","選択肢イ", "選択肢ウ","選択肢エ","正答記号","正答選択肢","解説","シラバス項目番号", "シラバス細目名","難易度","誤答アの理由","誤答イの理由","誤答ウの理由","誤答エの理由", "参照根拠URL","検証状態","変更区分"]

def build():
    with SOURCE.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != REQUIRED:
            raise ValueError("CSV must keep all 23 original columns in order")
        rows = list(reader)
    if len(rows) != 230:
        raise ValueError(f"Expected 230 CSV rows, got {len(rows)}")
    result=[]
    seen=set()
    for row in rows:
        ident=row["ID"]
        exam=row["模試回"]
        try:
            number=int(row["問番号"])
        except ValueError as e:
            raise ValueError(f"Invalid question number: {ident}") from e
        if (ident != f"pd-ai-a2-{exam}-{number:03d}" or
            not (exam.startswith("mock") and len(exam)==6 and 1<=int(exam[4:])<=10 and 1<=number<=23) or
            ident in seen):
            raise ValueError(f"Bad/duplicate ID: {ident}")
        seen.add(ident)
        field_id=row["分野ID"]
        if FIELDS.get(field_id) != row["分野"]:
            raise ValueError(f"Field mismatch: {ident}")
        choices=[row[f"選択肢{letter}"] for letter in LABELS]
        label=row["正答記号"]
        if label not in LABELS or len(set(choices))!=4 or any(not x.strip() for x in choices):
            raise ValueError(f"Invalid choice set: {ident}")
        if choices[LABELS.index(label)]!=row["正答選択肢"]:
            raise ValueError(f"Correct choice mismatch: {ident}")
        for letter in LABELS:
            reason=row[f"誤答{letter}の理由"]
            if (letter==label and reason.strip()) or (letter!=label and not reason.strip()):
                raise ValueError(f"Wrong-answer explanation mismatch: {ident} / {letter}")
        if any(not row[field].strip() for field in ("問題文","解説","シラバス項目番号", "シラバス細目名","難易度","検証状態","参照根拠URL")):
            raise ValueError(f"Missing required metadata: {ident}")
        if not row["参照根拠URL"].startswith("https://"):
            raise ValueError(f"Invalid reference URL: {ident}")
        result.append({
            "id":ident, "exam":exam, "questionNumber":number,
            "type":"choice", "qaTier":"text",
            "fieldId":field_id, "field":row["分野"],
            "subcategory":row["シラバス細目名"],
            "question":row["問題文"], "choices":choices,
            "correctLabel":label, "correct":row["正答選択肢"],
            "explanation":row["解説"],
            "origin":"original-mock", "reviewStatus":"reviewed-before-final-refinement",
            "syllabusVersion":"draft-ver0.1", "syllabusItemId":row["シラバス項目番号"],
            "difficulty":row["難易度"],
            "incorrectReasons":{letter:row[f"誤答{letter}の理由"] for letter in LABELS if letter!=label},
            "referenceUrl":row["参照根拠URL"],
            "verificationStatus":row["検証状態"],
            "changeType":row["変更区分"],
        })
    result.sort(key=lambda q:(int(q["exam"][4:]),q["questionNumber"]))
    by_exam=Counter(q["exam"] for q in result)
    by_field=Counter(q["fieldId"] for q in result)
    by_diff=Counter(q["difficulty"] for q in result)
    if by_exam != {f"mock{i:02d}":23 for i in range(1,11)}:
        raise ValueError(f"Unexpected exam distribution: {by_exam}")
    if sorted(by_field.values()) != [28,28,29,29,29,29,29,29]:
        raise ValueError(f"Unexpected field distribution: {by_field}")
    if by_diff != {"高度専門相当":138,"応用情報相当":92}:
        raise ValueError(f"Unexpected difficulty distribution: {by_diff}")
    for exam in by_exam:
        per_field=Counter(q["fieldId"] for q in result if q["exam"]==exam)
        if sorted(per_field.values()) != [2,3,3,3,3,3,3,3]:
            raise ValueError(f"Unexpected distribution in {exam}")
        per_letter=Counter(q["correctLabel"] for q in result if q["exam"]==exam)
        if per_letter != {"ア":6,"イ":6,"ウ":6,"エ":5}:
            raise ValueError(f"Unexpected correct-label distribution in {exam}")
    TARGET.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n", encoding="utf-8")
    summary={
        "total":len(result),"byExam":dict(sorted(by_exam.items())),
        "byField":dict(sorted(by_field.items())),
        "byDifficulty":dict(sorted(by_diff.items())),
        "correctLabels":dict(sorted(Counter(q["correctLabel"] for q in result).items())),
        "syllabusItemCount":len({q["syllabusItemId"] for q in result}),
        "status":"Original mock questions. Independent review completed on an earlier version; later revisions not independently re-reviewed.",
        "source":"qa/pd-ai-a2/source-refined-230.csv",
    }
    SUMMARY.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\n", encoding="utf-8")
    print(json.dumps(summary,ensure_ascii=False,indent=2))
    return result
if __name__ == "__main__":
    build()
