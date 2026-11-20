import json
from pathlib import Path
from collections import Counter
ROOT = Path(__file__).resolve().parent.parent

def test_v52_has_600_and_no_mode_tabs():
    doc = (ROOT/'a1/index.html').read_text(encoding='utf-8')
    assert 'V5.3 / 600Q' in doc
    assert 'name="examMode"' not in doc
    assert 'id="mode-' not in doc
    assert 'プロフェッショナル</button>' not in doc
    allq = json.loads((ROOT/'data/a1/questions.json').read_text(encoding='utf-8'))
    assert len(allq) == 600
    assert len(Counter(q['exam'] for q in allq)) == 20
