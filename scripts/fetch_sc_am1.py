#!/usr/bin/env python3
"""SCドットコム掲載の *午前I* 過去問を読み、品質検査用JSONを作る。

このスクリプトは未認証の公開ページだけを対象とし、robots.txtを尊重する。
解説文を取得・再配布せず、図表/数式を検出した問題は確認待ちにする。
構造が変わったページは無理に推測せず、要確認ログに残す。

IMPORTANT: Site pages weren't accessible from the author's runtime. Actual site DOM needs
verification on the machine running this script. No live harvest is claimed.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup, NavigableString, Tag

BASE = 'https://www.sc-siken.com'
UA = 'IPA-Study-PersonalResearch/0.1 (+local study; respects robots.txt)'
LETTERS = 'アイウエ'

# Exactly 20 sittings. No 2020 spring exam.
SESSIONS = [
    (2015, 'autumn', '27_aki'),
    (2016, 'spring', '28_haru'), (2016, 'autumn', '28_aki'),
    (2017, 'spring', '29_haru'), (2017, 'autumn', '29_aki'),
    (2018, 'spring', '30_haru'), (2018, 'autumn', '30_aki'),
    (2019, 'spring', '31_haru'), (2019, 'autumn', '01_aki'),
    (2020, 'autumn', '02_aki'),
    (2021, 'spring', '03_haru'), (2021, 'autumn', '03_aki'),
    (2022, 'spring', '04_haru'), (2022, 'autumn', '04_aki'),
    (2023, 'spring', '05_haru'), (2023, 'autumn', '05_aki'),
    (2024, 'spring', '06_haru'), (2024, 'autumn', '06_aki'),
    (2025, 'spring', '07_haru'), (2025, 'autumn', '07_aki'),
]


def question_url(code: str, number: int, mobile: bool = True) -> str:
    prefix = '/s' if mobile else ''
    return f'{BASE}{prefix}/kakomon/{code}/am1_{number}.html'


def clean(value: str) -> str:
    return re.sub(r'[ \t\f\v]+', ' ', value).strip()


def text_lines(tag: Tag | BeautifulSoup) -> list[str]:
    return [s for s in (clean(x) for x in tag.get_text('\n', strip=True).splitlines()) if s]


def _best_choice_list(soup: BeautifulSoup, stop_tag: Tag | None) -> tuple[Tag | None, list[str]]:
    """Find the four options immediately before the answer block.

    The live site also uses image-only options. Keep those as *review-only*
    placeholders; never mistake a missing figure for a text answer.
    """
    elements = list(soup.find_all(True))
    position = {id(node): i for i, node in enumerate(elements)}
    stop = position.get(id(stop_tag), len(elements)) if stop_tag else len(elements)
    candidates = []
    for node in soup.find_all(['ul', 'ol']):
        if position.get(id(node), -1) >= stop:
            continue
        lis = node.find_all('li', recursive=False)
        if len(lis) != 4 or any(li.find('a', href=True) for li in lis):
            continue
        original = [clean(li.get_text(' ', strip=True)) for li in lis]
        if all(v and v in LETTERS for v in original):
            continue
        values = []
        for i, (li, raw) in enumerate(zip(lis, original)):
            raw = re.sub(r'^[アイウエ][)）\.、：:]\s*', '', raw).strip()
            if not raw and li.find(['img', 'svg', 'canvas']):
                raw = f'[画像選択肢 {LETTERS[i]}]'
            values.append(raw)
        if not all(values) or any(len(v) > 900 for v in values):
            continue
        if len(set(values)) != 4:
            continue
        candidates.append((position[id(node)], node, values))
    if candidates:
        _, node, values = candidates[-1]
        return node, values
    return None, []


def _answer_from_visible_text(lines: list[str]) -> str | None:
    for ix, line in enumerate(lines):
        if '正解' not in line:
            continue
        value = ' '.join(lines[ix:ix+3])
        m = re.search(r'正解\s*[：:]?\s*([アイウエ])(?:\s|問題へ|$)', value)
        if m:
            return m.group(1)
    return None


def _question_marker(soup: BeautifulSoup, choice_node: Tag | None, number: int) -> tuple[NavigableString | None, bool]:
    """Find the question-local '解説へ' marker, not navigation in the page header.

    This resolves the all-600 false positive: the old implementation looked
    for an <a> containing *both* 問n and 解説へ; the live pages can split them.
    Failing that, use an exact '問n' marker but flag the uncertainty.
    """
    nodes = list(soup.descendants)
    stop_idx = next((i for i, item in enumerate(nodes) if item is choice_node), len(nodes))
    strong, weak = [], []
    for item in nodes[:stop_idx]:
        if not isinstance(item, NavigableString):
            continue
        value = clean(str(item))
        if value == '解説へ' or re.fullmatch(rf'問\s*{number}\s*解説へ', value):
            strong.append(item)
        elif re.fullmatch(rf'問\s*{number}', value):
            weak.append(item)
    if strong:
        return strong[-1], True
    if weak:
        return weak[-1], False
    return None, False


def _question_content(marker: NavigableString | None, choice_node: Tag | None, url: str) -> tuple[str, list[str], list[str]]:
    """Collect only the DOM portion between the question marker and options."""
    if marker is None or choice_node is None:
        return '', [], []
    tokens, issues, media_urls = [], [], []
    ancestors = {id(node) for node in choice_node.parents}
    terminated = False
    for node in marker.next_elements:
        if node is choice_node:
            terminated = True
            break
        if isinstance(node, Tag):
            if node.name in ('img', 'table', 'svg', 'canvas', 'math', 'sup', 'sub', 'ruby'):
                if id(node) not in ancestors:
                    issues.append('stem_contains_markup_or_media')
                    if node.name == 'img':
                        src = node.get('data-src') or node.get('src')
                        if src:
                            media_urls.append(urljoin(url, src))
            if 'overline' in str(node.get('style','')) or 'overline' in ' '.join(node.get('class', [])):
                issues.append('stem_contains_overline')
        elif isinstance(node, NavigableString):
            if any(p.name in ('script', 'style', 'noscript') for p in node.parents):
                continue
            value = clean(str(node))
            if value:
                tokens.append(value)
    if not terminated:
        issues.append('question_boundary_not_found')
    if tokens and re.fullmatch(r'問\s*\d+', tokens[0]):
        tokens.pop(0)
    if tokens and tokens[0] == '解説へ':
        tokens.pop(0)
    return '\n'.join(tokens).strip(), list(dict.fromkeys(issues)), sorted(set(media_urls))


def parse_question(html: str, year: int, season: str, code: str, number: int) -> dict[str, Any]:
    soup = BeautifulSoup(html, 'lxml')
    for tag in soup(['script', 'style', 'noscript']):
        tag.decompose()
    url = question_url(code, number)
    result: dict[str, Any] = {
        'id': f'a1-{year}{"s" if season == "spring" else "a"}-{number:03d}',
        'exam': f'{year}{"s" if season == "spring" else "a"}',
        'year': year, 'season': season, 'questionNumber': number,
        'type': 'choice', 'sourceQuestionUrl': url,
        'sourceSite': '情報処理安全確保支援士ドットコム',
        'status': 'review', 'issues': [],
    }
    lines = text_lines(soup)
    result['correctLabel'] = _answer_from_visible_text(lines)
    stop = soup.find(string=re.compile(r'^\s*正解\s*'))
    choice_list, choices = _best_choice_list(soup, stop.parent if stop else None)
    marker, strong_marker = _question_marker(soup, choice_list, number)
    stem, stem_issues, stem_images = _question_content(marker, choice_list, url)
    result['question'] = stem
    result['choices'] = choices
    result['correct'] = choices[LETTERS.index(result['correctLabel'])] if result['correctLabel'] is not None and result['correctLabel'] in LETTERS and len(choices) == 4 else ''
    result['issues'].extend(stem_issues)
    if marker is not None and not strong_marker:
        result['issues'].append('question_start_marker_uncertain')
    if not stem or len(stem) < 8:
        result['issues'].append('question_not_extracted')
    if len(choices) != 4 or len(set(choices)) != 4:
        result['issues'].append('choices_not_extracted')
    if not result['correct']:
        result['issues'].append('answer_not_extracted')
    if re.search(r'(^|\n)(正解|広告|問題へ|問題をシェア|利用規約)(\n|$)', stem):
        result['issues'].append('question_contains_site_chrome')
    if len(stem) > 2500:
        result['issues'].append('question_unusually_long')
    if choice_list is not None:
        media_by_choice = []
        for li in choice_list.find_all('li', recursive=False):
            refs = [urljoin(url, src) for img in li.find_all('img')
                    if (src := img.get('data-src') or img.get('src'))]
            media_by_choice.append(refs)
            if li.find(['img', 'table', 'svg', 'canvas', 'math', 'sup', 'sub', 'ruby']):
                result['issues'].append('choice_contains_markup_or_media')
            if any('overline' in str(t.get('style', '')) or
                   'overline' in ' '.join(t.get('class', [])) for t in li.find_all(True)):
                result['issues'].append('choice_contains_overline')
        if any(media_by_choice):
            result['choiceImageRefs'] = media_by_choice
    if stem_images:
        result['questionImageRefs'] = stem_images
    if re.search(r'(下図|次の図|図に示す|図の|表の|下表|真理値表|カルノー図|図を|図中|網掛け|流れ図|次の表)', stem):
        result['issues'].append('possible_figure_or_table')
    if re.search(r'[A-Za-z]_[A-Za-z0-9]|\\(?:frac|overline|sqrt)', stem):
        result['issues'].append('possible_formula')
    for key, label in [('field','分野'), ('category','中分類'), ('subcategory','小分類')]:
        matched = re.search(rf'^{label}\s*[：:]\s*(.+)$', '\n'.join(lines), re.M)
        if matched:
            result[key] = clean(matched.group(1))
    result['issues'] = list(dict.fromkeys(result['issues']))
    if not result['issues']:
        result['status'] = 'extracted_needs_spotcheck'
    return result


def get_robots(session: requests.Session) -> RobotFileParser:
    url = BASE + '/robots.txt'
    try:
        response = session.get(url, timeout=20)
        if response.status_code == 404:
            rp = RobotFileParser()
            rp.allow_all = True  # RFC 9309: unavailable robots file (4xx except 401/403)
            return rp
        response.raise_for_status()
    except requests.RequestException as exc:
        raise RuntimeError(f'robots.txtを確認できません。収集を中止します: {exc}') from exc
    rp = RobotFileParser()
    rp.parse(response.text.splitlines())
    if not rp.can_fetch(UA, question_url('07_aki', 1)):
        raise RuntimeError('robots.txtにより午前Ⅰページの収集が許可されていません。中止します。')
    return rp


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, default=Path(__file__).resolve().parent.parent / 'data/a1')
    parser.add_argument('--html-dir', type=Path, help='ローカル保存済みのHTMLで解析（ネットワーク不要）')
    parser.add_argument('--cache-dir', type=Path, help='HTMLキャッシュ。既存ファイルを再利用し、新規取得を保存')
    parser.add_argument('--limit', type=int, default=600, help='検証したいページ数（全件600）')
    parser.add_argument('--session', action='append', help='例: 07_aki。複数指定可')
    parser.add_argument('--only-ids-file', type=Path, help='収集対象のIDを1行ずつ記したファイル。34問の再取得等に使用')
    parser.add_argument('--interval', type=float, default=3.0, help='リクエスト間隔（秒）')
    parser.add_argument('--output-prefix', default='sc-am1', help='出力ファイルの接頭辞')
    args = parser.parse_args()
    if args.limit < 1 or args.interval < 1:
        parser.error('--limit、--interval は1以上にしてください')
    selected = [s for s in SESSIONS if not args.session or s[2] in args.session]
    if args.session and len(selected) != len(set(args.session)):
        parser.error('--session に存在しないコードまたは重複があります')
    targets = [(y, s, code, n) for y, s, code in selected for n in range(1,31)]
    if args.only_ids_file:
        wanted={line.strip() for line in args.only_ids_file.read_text(encoding='utf-8').splitlines() if line.strip() and not line.lstrip().startswith('#')}
        expected={f'a1-{y}{"s" if s=="spring" else "a"}-{n:03d}' for y,s,_,n in targets}
        if not wanted or not wanted<=expected:
            parser.error('--only-ids-file に対象外IDまたは空の指定があります。')
        targets=[(y,s,code,n) for y,s,code,n in targets if f'a1-{y}{"s" if s=="spring" else "a"}-{n:03d}' in wanted]
    targets=targets[:args.limit]
    session = requests.Session()
    session.headers.update({'User-Agent': UA, 'Accept-Language':'ja-JP,ja;q=0.9'})
    if args.html_dir is None:
        try:
            robots = get_robots(session)
        except RuntimeError as e:
            print(f'ERROR: {e}', file=sys.stderr)
            return 2
    else:
        robots = None

    approved, review, errors = [], [], []
    last_request_at = 0.0
    for i, (year, season, code, number) in enumerate(targets, 1):
        url = question_url(code, number)
        try:
            if args.html_dir:
                html_path = args.html_dir / f'{code}_am1_{number}.html'
                html = html_path.read_text(encoding='utf-8')
            elif args.cache_dir and (args.cache_dir / f'{code}_am1_{number}.html').exists():
                html = (args.cache_dir / f'{code}_am1_{number}.html').read_text(encoding='utf-8')
            else:
                if not robots.can_fetch(UA, url):
                    raise RuntimeError('robots.txtにより拒否')
                wait = args.interval - (time.monotonic() - last_request_at)
                if wait > 0:
                    time.sleep(wait)
                r = session.get(url, timeout=20)
                last_request_at = time.monotonic()
                r.raise_for_status()  # no CAPTCHA/auth bypass; no 403 retry
                if 'text/html' not in r.headers.get('Content-Type', 'text/html'):
                    raise ValueError('HTML以外のContent-Type')
                r.encoding = r.apparent_encoding or r.encoding
                html = r.text
                if args.cache_dir:
                    args.cache_dir.mkdir(parents=True, exist_ok=True)
                    (args.cache_dir / f'{code}_am1_{number}.html').write_text(html, encoding='utf-8')
            q = parse_question(html, year, season, code, number)
            if q['status'] == 'extracted_needs_spotcheck':
                # Only syntactically complete. Still need independent human/visual QA.
                approved.append(q)
            else:
                review.append(q)
            print(f'[{i}/{len(targets)}] {code} 問{number}: {q["status"]} {", ".join(q["issues"])}')
        except (requests.RequestException, OSError, UnicodeError, ValueError, RuntimeError) as exc:
            errors.append({'url':url, 'error':str(exc)})
            print(f'[{i}/{len(targets)}] ERROR {url}: {exc}', file=sys.stderr)
            if isinstance(exc, requests.HTTPError) and exc.response is not None and exc.response.status_code in (401, 403, 429):
                print('認証・アクセス制限・レート制限を検出。残りのアクセスを停止。', file=sys.stderr)
                break

    args.out.mkdir(parents=True, exist_ok=True)
    # No uncontrolled rewrite of the live app's data/a1/questions.json.
    (args.out / f'{args.output_prefix}.candidates.json').write_text(
        json.dumps(approved, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (args.out / f'{args.output_prefix}.review.json').write_text(
        json.dumps(review, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    summary = {'target_count':len(targets), 'extracted_needs_spotcheck':len(approved),
               'review_required':len(review), 'fetch_errors':len(errors), 'errors':errors,
               'note':'候補のままでは本番公開せず、目視で問題・選択肢・正答・図表を確認してください'}
    (args.out / f'{args.output_prefix}.report.json').write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k:v for k,v in summary.items() if k!='errors'}, ensure_ascii=False, indent=2))
    return 0 if not errors and not review and len(approved)==len(targets) else 1


if __name__ == '__main__':
    raise SystemExit(main())
