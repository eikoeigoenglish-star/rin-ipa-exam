from pathlib import Path
import shutil, subprocess, pytest
ROOT=Path(__file__).resolve().parent.parent

@pytest.mark.skipif(shutil.which("node") is None, reason="Node.js is not installed")
def test_question_order_and_random_preserves_pool():
    script=r"""
const vm=require('node:vm'), fs=require('node:fs'), assert=require('node:assert/strict');
const sandbox={window:{addEventListener(){}}, document:{}};
vm.createContext(sandbox); vm.runInContext(fs.readFileSync('assets/app.js','utf8'),sandbox);
const data=[
 {id:'b',year:2024,season:'spring',questionNumber:2},
 {id:'a',year:2025,season:'spring',questionNumber:1},
 {id:'c',year:2025,season:'autumn',questionNumber:30},
 {id:'d',year:2025,season:'autumn',questionNumber:1},
 {id:'e',year:2024,season:'autumn',questionNumber:1}
];
const ordered=Array.from(vm.runInContext('orderQuestionPool',sandbox)(data,'sequential'),q=>q.id);
assert.deepEqual(ordered,['d','c','a','e','b']);
assert.deepEqual(data.map(x=>x.id),['b','a','c','d','e']); // 元の配列は変わらない
const random=Array.from(vm.runInContext('orderQuestionPool',sandbox)(data,'random'),q=>q.id).sort();
assert.deepEqual(random,['a','b','c','d','e']);
assert.equal(vm.runInContext('orderQuestionPool',sandbox)(data.slice(1,3),'sequential').length,2);
"""
    subprocess.run(['node','-e',script],cwd=ROOT,check=True,capture_output=True,text=True)

def test_order_ui_and_qa():
    html=(ROOT/'a1/index.html').read_text(encoding='utf-8')
    assert html.count('name="order"')==2
    assert 'id="order-sequential"' in html and 'id="order-random"' in html
    assert 'V5.3 / 600Q' in html
    import csv, collections
    with (ROOT/'qa/確認対象122問.csv').open(encoding='utf-8-sig',newline='') as f:
        rows=list(csv.DictReader(f))
    assert len(rows)==122
    assert collections.Counter(r['区分'] for r in rows)=={'要出典照合':88,'出典参照型':34}
    assert len(set(r['問題ID'] for r in rows))==122
    assert all(r['出典URL'].startswith('https://www.sc-siken.com/') for r in rows)
