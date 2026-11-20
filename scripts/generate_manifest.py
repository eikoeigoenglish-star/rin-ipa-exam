#!/usr/bin/env python3
"""収録済み600問から出典・品質状態の対応表を生成。"""
import json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
questions=json.loads((root/'data/a1/questions.json').read_text(encoding='utf-8'))
rows=[{'id':q['id'],'year':q['year'],'season':q['season'],'questionNumber':q['questionNumber'],
       'sourceUrl':q['sourceQuestionUrl'],'collectionStatus':q['qaTier']} for q in questions]
assert len(rows)==600 and len({r['id'] for r in rows})==600
out=root/'data/a1/source-manifest.json'
out.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Generated {len(rows)} source entries.')
