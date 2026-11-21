import json
from collections import Counter, defaultdict
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
LABELS='アイウエ'
EXPECTED_FIELDS={'data-management','data-analytics','ai-application','cloud','database','ai-technology','algorithms','privacy'}

def load():
    return json.loads((ROOT/'data/pd-ai-a2/questions.json').read_text(encoding='utf-8'))

def test_pd_8_fields_balanced_230_reviewed():
    q=load()
    assert len(q)==230
    assert len({x['id'] for x in q})==230
    assert set(x['fieldId'] for x in q)==EXPECTED_FIELDS
    assert sorted(Counter(x['fieldId'] for x in q).values())==[28,28,29,29,29,29,29,29]
    assert Counter(x['exam'] for x in q)=={f'mock{i:02d}':23 for i in range(1,11)}
    assert len({x['question'] for x in q})==230
    for x in q:
        assert x['qaTier']=='text'
        assert x['origin']=='original-mock' and x['reviewStatus']=='reviewed-before-final-refinement'
        assert x['correctLabel'] in LABELS
        assert x['correct']==x['choices'][LABELS.index(x['correctLabel'])]
        assert len(x['choices'])==4 and len(set(x['choices']))==4
        assert x['explanation'] and x['subcategory']
        assert x['referenceUrl'].startswith('https://www.ipa.go.jp/')
    for mock, rows in group_by_exam(q).items():
        assert {x['questionNumber'] for x in rows}==set(range(1,24))
        assert sorted(Counter(x['fieldId'] for x in rows).values()) == [2,3,3,3,3,3,3,3]

def group_by_exam(q):
    d=defaultdict(list)
    for x in q:d[x['exam']].append(x)
    return d

def test_pd_page_and_progress_isolation():
    config=(ROOT/'assets/exam-config.js').read_text(encoding='utf-8')
    assert 'expectedQuestionCount: 230, maxQuestionNumber: 23' in config
    for storage in ('ipa-pd-ai-a2-progress-v2','ipa-sc-a2-progress-v1','ipa-a1-common-progress-v1'):
        assert storage in config
    html=(ROOT/'pd/data-ai/a2.html').read_text(encoding='utf-8')
    assert 'IPA_ACTIVE_EXAM = "pdAiA2"' in html
    assert 'id="field-options"' in html
    assert 'id="field-toggle-btn"' in html
    assert 'value="23"' in html
    assert 'V5.7 / 230Q' in html
    assert '再査読は未実施' in html
    assert 'data-ai/a2.html' in (ROOT/'index.html').read_text(encoding='utf-8')

def test_portal_hover_not_permanently_gold():
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    css=(ROOT/'assets/portal.css').read_text(encoding='utf-8')
    assert 'class="tile hero"' not in html
    assert '.tile.hero{' not in css
    assert '.tile:is(:hover,:focus-visible)' in css
    assert '模試10回（230問）' in html


def test_pd_difficulty_and_source_fidelity():
    import csv
    source=ROOT/'qa/pd-ai-a2/source-refined-230.csv'
    with source.open(encoding='utf-8-sig',newline='') as f:
        rows=list(csv.DictReader(f))
    questions=load()
    assert len(rows)==len(questions)==230
    assert Counter(q['difficulty'] for q in questions)=={'高度専門相当':138,'応用情報相当':92}
    assert len({q['syllabusItemId'] for q in questions})==62
    for row,q in zip(rows,questions):
        assert q['id']==row['ID']
        assert q['question']==row['問題文']
        assert q['choices']==[row['選択肢'+c] for c in LABELS]
        assert q['correctLabel']==row['正答記号']
        assert q['correct']==row['正答選択肢']
        assert q['explanation']==row['解説']
        assert q['difficulty']==row['難易度']
        assert q['syllabusItemId']==row['シラバス項目番号']
        assert q['referenceUrl']==row['参照根拠URL']
        assert q['verificationStatus']==row['検証状態']
        assert q['incorrectReasons']=={c:row['誤答'+c+'の理由'] for c in LABELS if c!=q['correctLabel']}
