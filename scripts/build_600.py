#!/usr/bin/env python3
"""既存のユーザー取得600件からA-1アプリ用データを生成（外部への通信なし）。

- 現状のデータだけで復元できる566問と、出典参照モードの34問を区別。
- 初版パーサによる解説の混入を削除。図表/数式等は未確認と明示。
- 目視で照合済みのV3の2問はそのまま優先。
- 解答は選択肢文字列ではなく、元のア〜エラベルで管理する。
"""
from __future__ import annotations
import argparse, collections, csv, json
from pathlib import Path
from triage_existing import decide

LABELS = 'アイウエ'
SRC_PREFIX = 'https://www.sc-siken.com/'

def build(raw, verified):
    results, ids = [], set()
    verified_map = {x['id']:x for x in verified}
    for item in raw:
        ident = item['id']
        if ident in ids: raise ValueError(f'ID重複：{ident}')
        ids.add(ident)
        if not item['sourceQuestionUrl'].startswith(SRC_PREFIX):
            raise ValueError(f'不正な出典URL: {ident}')
        if item['correctLabel'] not in LABELS:
            raise ValueError(f'正答ラベルなし: {ident}')
        kind, reasons, question = decide(item)
        choices = item['choices']
        tier = 'reference' if len(choices) != 4 or not question.strip() else ('review' if kind=='manual_review' else 'text')
        if tier != 'reference':
            if len(set(choices)) != 4 or choices[LABELS.index(item['correctLabel'])] != item['correct']:
                raise ValueError(f'4択・正答の不整合: {ident}')
        if ident in verified_map:
            old = verified_map[ident]
            question = old['question'];choices = old['choices']
            if old.get('correctLabel') != item['correctLabel']:
                raise ValueError(f'既存の照合済み正答と不一致: {ident}')
            tier = 'text';reasons = []
        row = {k:item[k] for k in ('id','exam','year','season','questionNumber','type','sourceQuestionUrl','sourceSite')}
        row.update({
            'question': question if tier!='reference' else '',
            'choices': choices if tier!='reference' else [],
            'correctLabel': item['correctLabel'],
            'correct': choices[LABELS.index(item['correctLabel'])] if tier!='reference' else '',
            'qaTier': tier,
            'reviewReasons': reasons if tier!='text' else [],
        })
        for key in ('field','category','subcategory'):
            if item.get(key):row[key]=item[key]
        # 画像URL自体は旧抽出JSONに存在しない。新規取得した実画像と混同しない。
        results.append(row)
    results.sort(key=lambda q:(q['year'],q['season']!='spring',q['questionNumber']))
    assert len(results) == 600 and len(ids)==600
    years = collections.Counter(q['exam'] for q in results)
    assert len(years)==20 and all(v==30 for v in years.values()), years
    return results

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--input',type=Path,default=Path('data/a1/sc-am1.review.json'))
    ap.add_argument('--verified',type=Path,default=Path('data/a1/verified-v3.json'))
    ap.add_argument('--output',type=Path,default=Path('data/a1/questions.json'))
    ap.add_argument('--qa',type=Path,default=Path('qa/qa-600.csv'))
    args=ap.parse_args()
    raw=json.loads(args.input.read_text(encoding='utf-8'))
    verified=json.loads(args.verified.read_text(encoding='utf-8'))
    result=build(raw,verified)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    args.qa.parent.mkdir(parents=True,exist_ok=True)
    with args.qa.open('w',newline='',encoding='utf-8-sig') as f:
        writer=csv.writer(f)
        writer.writerow(['id','年度','期','問','状態','点検理由','出典URL'])
        for q in result:
            writer.writerow([q['id'],q['year'],q['season'],q['questionNumber'],q['qaTier'],' / '.join(q['reviewReasons']),q['sourceQuestionUrl']])
    (args.qa.parent/'reference-34-ids.txt').write_text('\n'.join(x['id'] for x in result if x['qaTier']=='reference')+'\n',encoding='utf-8')
    counts=collections.Counter(x['qaTier'] for x in result)
    summary={'total':len(result),'text_likely_unverified':counts['text'],
             'requires_source_check':counts['review'],'source_reference_only':counts['reference'],
             'note':'いずれも実HTML/画像での全面照合は未実施。source_reference_onlyは元サイトを別タブで開いて回答する方式。'}
    (args.qa.parent/'qa-600-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(summary,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
