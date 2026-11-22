"""Structural regression checks for SC B's first case-based practice set."""
import json
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
SCB = ROOT / 'data' / 'sc-b'


def data():
    manifest = json.loads((SCB / 'manifest.json').read_text(encoding='utf-8'))
    cases = json.loads((SCB / 'mock01' / 'cases.json').read_text(encoding='utf-8'))['cases']
    questions = json.loads((SCB / 'mock01' / 'questions.json').read_text(encoding='utf-8'))['questions']
    return manifest, cases, questions


def test_mock01_12_cases_and_20_independent_questions():
    manifest, cases, questions = data()
    assert manifest['plannedMockCount'] == 10
    assert manifest['plannedQuestionCount'] == 200
    assert len(manifest['available']) == 1
    assert len(cases) == 12 and len(questions) == 20
    assert len({c['caseId'] for c in cases}) == 12
    assert len({q['questionId'] for q in questions}) == 20
    assert [q['order'] for q in questions] == list(range(1, 21))
    case_map = {c['caseId']: c for c in cases}
    related = Counter(q['caseId'] for q in questions)
    assert Counter(c['caseType'] for c in cases) == {'single': 8, 'multi': 4}
    assert all(related[cid] == (3 if c['caseType'] == 'multi' else 1)
               for cid, c in case_map.items())
    assert all(case_map[q['caseId']]['caseType'] == ('single' if q['order'] < 9 else 'multi')
               for q in questions)
    assert all(q['partNo'] in (1, 2, 3) and q['partCount'] == 3
               for q in questions[8:])
    assert all('partNo' not in q for q in questions[:8])


def test_mock01_choices_answers_and_explanations():
    _, cases, questions = data()
    for q in questions:
        labels = [x['id'] for x in q['choices']]
        assert 4 <= len(labels) <= 9
        assert len(labels) == len(set(labels))
        assert q['answer'] in labels
        assert all(x['text'].strip() for x in q['choices'])
        assert q['format'] == 'single'  # single correct option even for a 1問3答 part
        assert q['explanation']['summary']
        assert q['explanation']['rationale']
        reasons = [x['choiceId'] for x in q['explanation']['distractors']]
        assert set(reasons) == set(labels) - {q['answer']}
        assert len(reasons) == len(labels) - 1
    for c in cases:
        assert c['title'] and c['body']
        assert all(b['type'] in {'paragraph', 'heading', 'table', 'code', 'diagram', 'box', 'list'}
                   for b in c['body'])


def test_github_review_fixes_present():
    _, cases, questions = data()
    c10 = next(c for c in cases if c['caseId'].endswith('c10'))
    wf3 = next(b for b in c10['body'] if b.get('caption', '').startswith('WF3 '))
    assert 'allow-unsafe-pr-checkout: true' in wf3['content']
    q13 = next(q for q in questions if q['questionId'].endswith('-013'))
    q14 = next(q for q in questions if q['questionId'].endswith('-014'))
    assert q13['answer'] == 'オ'
    assert q14['answer'] == 'ウ'
    assert any('--index-url' in c['text'] and '--extra-index-url' in c['text']
               for c in q14['choices'])
