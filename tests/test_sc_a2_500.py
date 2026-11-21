import json,collections
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent

def test_500_questions_and_quality_tiers():
    data=json.loads((ROOT/'data/sc-a2/questions.json').read_text(encoding='utf-8'))
    assert len(data)==500
    assert len({q['id'] for q in data})==500
    assert sorted(collections.Counter(q['exam'] for q in data).values())==[25]*20
    assert collections.Counter(q['qaTier'] for q in data)=={'text':439,'review':41,'reference':20}
    assert data[0]['exam']=='2025a' and data[0]['questionNumber']==1
    assert data[-1]['exam']=='2015a' and data[-1]['questionNumber']==25
    for q in data:
        assert 1<=q['questionNumber']<=25 and q['correctLabel'] in 'アイウエ'
        if q['qaTier']=='reference':
            assert not q['question'] and q['choices']==[] and q['correct']==''
        else:
            assert q['question'] and len(q['choices'])==4
            assert q['correct']==q['choices']['アイウエ'.index(q['correctLabel'])]
        assert q['sourceQuestionUrl'].startswith('https://www.sc-siken.com/')

def test_sc_a2_separate_storage_and_page():
    config=(ROOT/'assets/exam-config.js').read_text(encoding='utf-8')
    assert 'ipa-sc-a2-progress-v1' in config
    assert 'ipa-a1-common-progress-v1' in config
    assert 'expectedQuestionCount: 500' in config
    sc=(ROOT/'sc/a2.html').read_text(encoding='utf-8')
    assert 'window.IPA_ACTIVE_EXAM = "scA2"' in sc
    assert 'V5.4 / 500Q' in sc
    assert 'range" value="21-25"' in sc
    assert '30問</label>' not in sc
    portal=(ROOT/'index.html').read_text(encoding='utf-8')
    assert 'SC午前Ⅱ 過去問20回・500問' in portal

def test_a1_progress_and_page_retained():
    data=json.loads((ROOT/'data/a1/questions.json').read_text(encoding='utf-8'))
    assert len(data)==600
    assert 'V5.3 / 600Q' in (ROOT/'a1/index.html').read_text(encoding='utf-8')
