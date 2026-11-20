#!/usr/bin/env python3
"""手動確認済みIDリストからアプリ用 data/a1/questions.json を構築する。"""
import argparse
import json
from pathlib import Path


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--candidates',type=Path,default=Path('data/a1/sc-am1.candidates.json'))
    p.add_argument('--approved-ids',type=Path,required=True,help='1行1IDの確認済みリスト')
    p.add_argument('--out',type=Path,default=Path('data/a1/questions.json'))
    a=p.parse_args()
    questions=json.loads(a.candidates.read_text(encoding='utf-8'))
    ids=set(x.strip() for x in a.approved_ids.read_text(encoding='utf-8').splitlines() if x.strip() and not x.startswith('#'))
    selected=[]
    for q in questions:
        if q['id'] not in ids:
            continue
        if q.get('issues') or len(q.get('choices',[]))!=4 or q['correct'] not in q['choices']:
            raise ValueError(f'未検証のデータを含むため中止: {q["id"]}')
        q={k:v for k,v in q.items() if k not in ('issues','status')}
        selected.append(q)
    unknown=ids-{q['id'] for q in selected}
    if unknown:
        raise ValueError(f'候補に存在しないID: {sorted(unknown)}')
    a.out.parent.mkdir(parents=True,exist_ok=True)
    a.out.write_text(json.dumps(selected,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'公開用JSON: {len(selected)}問 -> {a.out}')


if __name__=='__main__':main()
