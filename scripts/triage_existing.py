#!/usr/bin/env python3
"""以前の取得済みreview.jsonを捨てずに暫定仕分けする（再アクセス不要）。

テキストだけで問題全体が復元できたことは証明できないため、
結果の 'text_likely' はQA対象であり、公開承認ではない。
"""
from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter
from pathlib import Path

# FIGURE WORDS include some false positives intentionally: never guess that
# diagrams, formulas, or overlined variables were accurately flattened.
# Ignore 方+式 (e.g. 暗号方式は), which is not a formula reference.
# Ignore 図る (verb) without suppressing 図の... (diagram).
RISK_WORDS = re.compile(
    r'図(?![るりれろ])|真理値表|カルノー|網掛け|グラフ|フローチャート|ブロック図|回路|'
    r'補集合|上線|下線|論理式|数式|計算式|方程式|表の|下表|次の表|'
    r'次の[A-Za-z]?表|次の式|次式|(?<!方)式で|(?<!方)式は|(?<!方)式を|(?<!方)式として|'
    r'ビットパターン|行列|ベン図'
)
STRUCTURAL = {'question_not_extracted','choices_not_extracted','answer_not_extracted'}


def decide(q: dict) -> tuple[str, list[str], str]:
    stem = q.get('question') or ''
    clean_stem = re.sub(r'^問\s*\d+\s*\n解説へ\s*\n?', '', stem)
    # 11 questions include all site text after the answer. Drop that appendix
    # from the triage display but do *not* promote these into likely-text.
    chrome = bool(re.search(r'\n正解\n[アイウエ]\n問題へ\n', clean_stem))
    if chrome:
        clean_stem = re.split(r'\nア\nイ\nウ\nエ\n正解\n', clean_stem, maxsplit=1)[0]
    issues = set(q.get('issues', []))
    reasons = []
    if issues & STRUCTURAL or len(q.get('choices', [])) != 4 or not q.get('correct'):
        reasons.append('抽出不完全')
    if chrome:
        reasons.append('問題文に解説等が混入')
    if 'choice_contains_markup_or_media' in issues or 'choice_contains_overline' in issues:
        reasons.append('選択肢に画像・数式あり')
    if 'possible_figure_or_table' in issues or RISK_WORDS.search(clean_stem):
        reasons.append('問題文に図表・数式の可能性')
    if len(clean_stem.strip()) < 8:
        reasons.append('問題文が短すぎる')
    if q.get('correctLabel') not in 'アイウエ':
        reasons.append('正答ラベルなし')
    if q.get('correct') and q.get('correct') not in q.get('choices', []):
        reasons.append('正答と選択肢が不整合')
    return ('manual_review' if reasons else 'text_likely'), reasons, clean_stem


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--input', type=Path, default=Path('data/a1/sc-am1.review.json'))
    ap.add_argument('--out', type=Path, default=Path('data/a1'))
    args = ap.parse_args()
    questions = json.loads(args.input.read_text(encoding='utf-8'))
    if not isinstance(questions, list):
        raise ValueError('入力はJSON配列です')
    groups = {'text_likely': [], 'manual_review': []}
    reason_counts = Counter()
    ids = set()
    for q in questions:
        if q['id'] in ids:
            raise ValueError(f'重複ID: {q["id"]}')
        ids.add(q['id'])
        status, reasons, clean_stem = decide(q)
        result = dict(q)
        result['question'] = clean_stem
        result['triageStatus'] = status
        result['triageReasons'] = reasons
        result['status'] = 'review'  # No auto-approval in this offline pass.
        groups[status].append(result)
        reason_counts.update(reasons)
    args.out.mkdir(parents=True, exist_ok=True)
    for key, filename in [('text_likely','sc-am1.triage-text.json'),('manual_review','sc-am1.triage-review.json')]:
        (args.out / filename).write_text(json.dumps(groups[key],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    summary = {
        'input_count': len(questions),
        'text_likely_unverified': len(groups['text_likely']),
        'manual_review': len(groups['manual_review']),
        'reason_counts': dict(reason_counts),
        'note': '旧HTMLパーサの全600件偽陽性を取り除く目的の暫定仕分け。画像・数式の欠落がない保証はない。GitHub公開用JSONではありません。',
    }
    (args.out / 'sc-am1.triage-report.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    with (args.out / 'sc-am1.triage-checklist.csv').open('w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['id','year','season','questionNumber','status','reason','sourceQuestionUrl'])
        for key in ('manual_review','text_likely'):
            for q in groups[key]:
                writer.writerow([q['id'],q['year'],q['season'],q['questionNumber'],key,
                                 ' / '.join(q['triageReasons']),q['sourceQuestionUrl']])
    print(json.dumps(summary,ensure_ascii=False,indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
