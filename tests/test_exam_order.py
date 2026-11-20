from pathlib import Path
import subprocess
import shutil
import pytest

ROOT=Path(__file__).resolve().parent.parent

@pytest.mark.skipif(shutil.which('node') is None,reason='node is not installed')
def test_js_exam_options_show_autumn_before_spring():
    js = r"""
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const sandbox={window:{addEventListener(){}}, document:{}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('assets/app.js','utf8'),sandbox);
const ordered=Array.from(vm.runInContext('sortExamKeys(new Set(["2024s","2025s","2023a","2024a","2025a","2023s","2020a"]))',sandbox));
assert.deepEqual(ordered,['2025a','2025s','2024a','2024s','2023a','2023s','2020a']);
"""
    subprocess.run(['node','-e',js],cwd=ROOT,check=True,capture_output=True,text=True)
