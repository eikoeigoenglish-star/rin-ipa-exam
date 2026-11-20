import json
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent

def test_600_session_integrity():
    questions=json.loads((ROOT/'data/a1/questions.json').read_text(encoding='utf-8'))
    assert len(questions)==600
    assert len({q['id'] for q in questions})==600
    counts=Counter(q['exam'] for q in questions)
    assert len(counts)==20
    assert all(v==30 for v in counts.values())
    assert Counter(q['qaTier'] for q in questions)=={'text':478,'review':88,'reference':34}
    for q in questions:
        assert q['correctLabel'] in 'アイウエ'
        if q['qaTier']=='reference':
            assert q['choices']==[] and q['correct']==''
        else:
            assert len(q['choices'])==4
            assert len(set(q['choices']))==4
            assert q['correct']==q['choices']['アイウエ'.index(q['correctLabel'])]
        assert q['sourceQuestionUrl'].startswith('https://www.sc-siken.com/')


def test_2025_autumn_4_no_false_figure_warning():
    questions=json.loads((ROOT/'data/a1/questions.json').read_text(encoding='utf-8'))
    q=next(q for q in questions if q['exam']=='2025a' and q['questionNumber']==4)
    assert q['qaTier']=='text'
    assert q['choices']==['CISC','MIMD','RISC','VLIW']
    assert q['correctLabel']=='エ' and q['correct']=='VLIW'
