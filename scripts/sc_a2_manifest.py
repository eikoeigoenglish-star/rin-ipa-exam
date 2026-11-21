#!/usr/bin/env python3
"""SC A-2 20回×25問の取得先URL表を作成。ネット接続不要。"""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts.fetch_sc_am2 import SESSIONS, question_url


def build_manifest():
    return [
      {'id':f'sc-a2-{year}{"s" if season=="spring" else "a"}-{number:03d}',
       'year':year,'season':season,'questionNumber':number,
       'sourceQuestionUrl':question_url(code, number)}
      for year, season, code in sorted(SESSIONS,key=lambda x:(x[0],x[1]=='autumn'),reverse=True)
      for number in range(1,26)
    ]

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out',type=Path,default=Path('data/sc-a2/sc-am2.targets.json'))
    args=parser.parse_args()
    args.out.parent.mkdir(parents=True,exist_ok=True)
    rows=build_manifest()
    assert len(rows)==500 and len(set(r['id'] for r in rows))==500
    args.out.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'{args.out}: {len(rows)}問のURL一覧を作成しました')
