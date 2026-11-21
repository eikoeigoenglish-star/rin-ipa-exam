from scripts.fetch_sc_am2 import SESSIONS, question_url, parse_question
from scripts.sc_a2_manifest import build_manifest


def html_fixture(question='CRYPTREC暗号リストに関する記述として、正しいものはどれか。'):
    return f"""<!doctype html><html><body><nav><ul><li>TOP</li><li>年度</li><li>検索</li><li>学習</li></ul></nav>
    <main><h2>令和7年秋期試験問題 午前Ⅱ 問1</h2>
    <a href="#kaisetsu">問1解説へ</a><p>{question}</p>
    <ul><li>① 候補A</li><li>② 候補B</li><li>③ 候補C</li><li>④ 候補D</li></ul>
    <ul><li>ア</li><li>イ</li><li>ウ</li><li>エ</li></ul>
    <div>正解　ウ問題へ</div><p>分野：テクノロジ系</p><p>中分類：セキュリティ</p>
    <h3 id="kaisetsu">解説</h3><p>サイト独自の解説</p>
    </main></body></html>"""


def test_500_targets():
    assert len(SESSIONS)==20
    assert len(build_manifest())==500
    assert len(set(x['id'] for x in build_manifest()))==500
    assert (2020,'spring','02_haru') not in SESSIONS
    assert build_manifest()[0]['id']=='sc-a2-2025a-001'
    assert question_url('07_aki',1).endswith('/s/kakomon/07_aki/am2_1.html')
    assert build_manifest()[-1]['id']=='sc-a2-2015a-025'


def test_basic_question_and_correct():
    q=parse_question(html_fixture(),2025,'autumn','07_aki',1)
    assert q['id']=='sc-a2-2025a-001'
    assert q['correctLabel']=='ウ'
    assert q['correct']=='③ 候補C'
    assert len(q['choices'])==4
    assert q['question'].startswith('CRYPTREC')
    assert 'サイト独自の解説' not in q['question']


def test_missing_correct_is_review():
    q=parse_question(html_fixture().replace('正解　ウ問題へ','正解を表示する'),2025,'autumn','07_aki',1)
    assert q['status']=='review'
    assert 'answer_not_extracted' in q['issues']


def test_figure_question_is_review():
    h=html_fixture().replace('</p>\n    <ul>','<img src="figure.png"></p>\n    <ul>',1)
    q=parse_question(h,2025,'autumn','07_aki',1)
    assert q['status']=='review'
    assert 'stem_contains_markup_or_media' in q['issues']
    assert q['questionImageRefs'][0].endswith('figure.png')


def test_image_options_preserved_as_refs():
    h=html_fixture().replace('<li>① 候補A</li><li>② 候補B</li><li>③ 候補C</li><li>④ 候補D</li>',
      '<li><img src="a.png"></li><li><img src="b.png"></li><li><img src="c.png"></li><li><img src="d.png"></li>')
    q=parse_question(h,2025,'autumn','07_aki',1)
    assert q['status']=='review'
    assert q['choices'][0]=='[画像選択肢 ア]'
    assert q['choiceImageRefs'][2][0].endswith('c.png')
    assert 'image_choice_requires_visual_review' in q['issues']


def test_empty_options_keeps_answer_label_but_not_answer_text():
    h=html_fixture().replace('<li>① 候補A</li><li>② 候補B</li><li>③ 候補C</li><li>④ 候補D</li>','')
    q=parse_question(h,2025,'autumn','07_aki',1)
    assert 'choices_not_extracted' in q['issues']
    assert q['correctLabel']=='ウ'
    assert not q['correct']


def test_site_header_image_not_counted_as_question_media():
    h=html_fixture().replace('<body>','<body><img src="logo.png">')
    q=parse_question(h,2025,'autumn','07_aki',1)
    assert 'stem_contains_markup_or_media' not in q['issues']
