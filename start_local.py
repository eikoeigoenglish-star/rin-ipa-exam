#!/usr/bin/env python3
"""Serve the GitHub Pages directory at the repository root for local QA."""
from __future__ import annotations
import json,sys,webbrowser
from collections import Counter
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def main():
    try:
        qs=json.loads((ROOT/'data/a1/questions.json').read_text(encoding='utf-8'))
        c=Counter(q['exam'] for q in qs)
        assert len(qs)==600 and len(c)==20 and all(v==30 for v in c.values()),'問題データ不正'
        assert 'V5.3 / 600Q' in (ROOT/'a1/index.html').read_text(encoding='utf-8')
        scq=json.loads((ROOT/'data/sc-a2/questions.json').read_text(encoding='utf-8'))
        sc=Counter(q['exam'] for q in scq)
        assert len(scq)==500 and len(sc)==20 and all(v==25 for v in sc.values()), 'SC A-2問題データ不正'
        pdq=json.loads((ROOT/'data/pd-ai-a2/questions.json').read_text(encoding='utf-8'))
        field_counts=Counter(q['fieldId'] for q in pdq)
        assert len(pdq)==230 and len(field_counts)==8 and sorted(field_counts.values())==[28,28,29,29,29,29,29,29], 'PD A-2問題データ不正'
        mocks=Counter(q['exam'] for q in pdq)
        assert len(mocks)==10 and all(v==23 for v in mocks.values()), 'PD模試回数・問数不正'
        for p in ['index.html','sc/a2.html','sc/b.html','pd/data-ai/a2.html','pd/data-ai/b.html']:
            assert (ROOT/p).is_file(),f'ページ不足: {p}'
    except (OSError,ValueError,KeyError,AssertionError) as ex:
        print(f'起動検証エラー: {ex}',file=sys.stderr);return 1
    handler=partial(SimpleHTTPRequestHandler,directory=str(ROOT))
    try:
        server=ThreadingHTTPServer(('127.0.0.1',8000),handler)
    except OSError:
        server=ThreadingHTTPServer(('127.0.0.1',0),handler)
        print('8000番ポート使用中のため代替ポートを使用します。学習履歴はオリジンごとに保存されます。')
    address=f'http://localhost:{server.server_address[1]}/'
    print(f'[IPA EXAM V5.7] A-1 600問 / SC A-2 500問 / PD D-AI A-2 査読・改修版230問　検証OK\n配信元: {ROOT}\nURL: {address}\nCtrl+Cで停止',flush=True)
    webbrowser.open_new_tab(address)
    try:server.serve_forever()
    except KeyboardInterrupt:print('終了します')
    finally:server.server_close()
    return 0

if __name__=='__main__':raise SystemExit(main())
