from scripts.fetch_sc_am1 import SESSIONS, parse_question, question_url


def mobile_html(question='バランススコアカードの説明として、適切なものはどれか。'):
    return f'''<!doctype html><html><head><title>午前Ⅰ 問26</title></head>
    <body><nav><ul><li>トップ</li><li>カテゴリ</li><li>試験</li><li>学習</li></ul></nav>
    <main><h2>令和7年秋期試験問題 午前Ⅰ 問26</h2>
    <a href="#explain">問26解説へ</a><p>{question}</p>
    <ul class="answer-options"><li>選択肢1</li><li>選択肢2</li>
    <li>選択肢3</li><li>選択肢4</li></ul>
    <ul><li>ア</li><li>イ</li><li>ウ</li><li>エ</li></ul>
    <div>正解　イ問題へ</div><p>分野：ストラテジ系</p>
    <h3 id="explain">解説</h3><ul><li>解説1</li><li>解説2</li><li>解説3</li><li>解説4</li></ul>
    </main></body></html>'''


def test_sessions_have_exactly_20_sittings_600_pages():
    assert len(SESSIONS) == 20
    assert len(set(code for _, _, code in SESSIONS)) == 20
    assert (2020, 'spring', '02_haru') not in SESSIONS
    assert question_url('07_aki', 1).endswith('/s/kakomon/07_aki/am1_1.html')


def test_parse_mobile_fixture_complete():
    q = parse_question(mobile_html(), 2025, 'autumn', '07_aki', 26)
    assert q['status'] == 'extracted_needs_spotcheck', q
    assert q['question'].startswith('バランススコアカード')
    assert q['choices'] == ['選択肢1', '選択肢2', '選択肢3', '選択肢4']
    assert q['correct'] == '選択肢2'
    assert q['id'] == 'a1-2025a-026'
    assert '解説1' not in q['question']


def test_parse_graphic_question_requires_review():
    html = mobile_html('次の図のうち正しいものを選べ。')
    html = html.replace('<p>次の図のうち正しいものを選べ。</p>',
                        '<p>次の図のうち正しいものを選べ。</p><img src="figure.png">')
    q = parse_question(html, 2025, 'autumn', '07_aki', 26)
    assert q['status'] == 'review'
    assert 'stem_contains_markup_or_media' in q['issues']


def test_missing_answer_never_guessed():
    q = parse_question(mobile_html().replace('正解　イ問題へ', '正解を表示する'),
                       2025, 'autumn', '07_aki', 26)
    assert q['status'] == 'review'
    assert 'answer_not_extracted' in q['issues']


def test_split_question_marker_not_a_link():
    html = mobile_html().replace('<a href="#explain">問26解説へ</a>',
                                 '<div><b>問26</b> <a href="#explain">解説へ</a></div>')
    q = parse_question(html, 2025, 'autumn', '07_aki', 26)
    assert q['status'] == 'extracted_needs_spotcheck', q
    assert q['question'].startswith('バランススコアカード')
    assert 'stem_contains_markup_or_media' not in q['issues']


def test_only_real_question_image_flagged_not_logo():
    html = mobile_html().replace('<body>', '<body><img src="logo.png">')
    q = parse_question(html, 2025, 'autumn', '07_aki', 26)
    assert 'stem_contains_markup_or_media' not in q['issues'], q


def test_image_only_choices_are_preserved_for_review():
    html = mobile_html().replace(
        '<li>選択肢1</li><li>選択肢2</li>\n    <li>選択肢3</li><li>選択肢4</li>',
        '<li><img src="a.png"></li><li><img src="b.png"></li>\n    <li><img src="c.png"></li><li><img src="d.png"></li>'
    )
    q = parse_question(html, 2025, 'autumn', '07_aki', 26)
    assert q['status'] == 'review', q
    assert q['choices'][0] == '[画像選択肢 ア]'
    assert q['correctLabel'] == 'イ'
    assert q['choiceImageRefs'][1][0].endswith('/07_aki/b.png')
    assert 'choice_contains_markup_or_media' in q['issues']


def test_stem_does_not_capture_advertisements_and_explanation():
    html = mobile_html().replace('<p>バランス', '<p>バランス')
    q = parse_question(html, 2025, 'autumn', '07_aki', 26)
    assert '解説1' not in q['question'] and '選択肢1' not in q['question']
    assert '広告' not in q['question']
