// Kyoto Kentei training UI: exam/streak/long-press/quiz workflows adapted for IPA.
// SC and Professional A-1 share one question bank and LocalStorage progress.
"use strict";
const A1_CONFIG = window.IPA_EXAM_CONFIG?.a1 || {};
const STORAGE_KEY = A1_CONFIG.storageKey || "ipa-a1-common-progress-v1";
const EXPECTED_QUESTION_COUNT = A1_CONFIG.expectedQuestionCount || 600;
const APP_VERSION = "5.3.0";
const EXAM_LONG_PRESS_MS = 3000;
const MARKERS = ["1", "2", "3", "4"];
const LABELS = ["ア", "イ", "ウ", "エ"];
const STAGE_KEYS = ["new", "miss", "hit", "double", "triple"];
const state = {
  allQuestions: [], questions: [], answers: {}, currentIndex: 0,
  progress: {}, exams: []
};
const el = id => document.getElementById(id);
const byName = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(e => e.value);
const shuffle = arr => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; --i) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
function stageOf(id) {
  if (!Object.prototype.hasOwnProperty.call(state.progress, id)) return "new";
  const count = state.progress[id];
  return count >= 3 ? "triple" : count === 2 ? "double" : count === 1 ? "hit" : "miss";
}
function loadProgress() {
  try {
    const obj = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return obj && typeof obj === "object" && !Array.isArray(obj) ? obj : {};
  } catch (_) { return {}; }
}
function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); }
  catch (_) { el("mastery-note").textContent = "保存ができません。このブラウザを閉じると記録が消える可能性があります。"; }
}
function showError(text) { el("start-error").hidden = false; el("start-error").textContent = text; }
function hideError() { el("start-error").hidden = true; el("start-error").textContent = ""; }
function showScreen(id) {
  ["screen-start", "screen-quiz", "screen-result"].forEach(name => { el(name).hidden = id !== name; });
  window.scrollTo(0, 0);
}
function examLabel(exam) { return `${exam.slice(0, 4)}年${exam.endsWith("s") ? "春" : "秋"}`; }
function sourceLabel(q) { return `${q.year}年度 ${q.season === "spring" ? "春期" : "秋期"} 高度試験 午前Ⅰ 問${q.questionNumber}`; }
function questionLabel(q) { return `${examLabel(q.exam)}・問${q.questionNumber}`; }
function stageCounts(items = state.allQuestions) {
  const counts = {new:0, miss:0, hit:0, double:0, triple:0};
  items.forEach(q => { ++counts[stageOf(q.id)]; });
  return counts;
}
function renderMastery() {
  const counts = stageCounts();
  const total = state.allQuestions.length;
  STAGE_KEYS.forEach(key => {
    el(`count-${key}`).textContent = counts[key];
    el(`chip-count-${key}`).textContent = counts[key];
    el(`seg-${key}`).style.width = (total ? 100 * counts[key] / total : 0) + "%";
  });
  const percent = total ? Math.round(counts.triple / total * 100) : 0;
  el("mastery-headline").textContent = `${counts.triple} / ${total}問（${percent}%）`;
  el("mastery-bar").setAttribute("aria-valuenow", String(percent));
}
function resetAll() {
  const answered = state.allQuestions.filter(q => stageOf(q.id) !== "new").length;
  if (!answered || !confirm(`${answered}問分の進捗をすべて消しますか？`)) return;
  state.progress = {};
  saveProgress(); renderMastery(); updateAvailability();
}
function resetExam(exam) {
  const questions = state.allQuestions.filter(q => q.exam === exam);
  const answered = questions.filter(q => stageOf(q.id) !== "new").length;
  if (!confirm(`${examLabel(exam)}の進捗（${answered}問分）を消しますか？\nこの操作は取り消せません。`)) return;
  questions.forEach(q => { delete state.progress[q.id]; });
  saveProgress(); renderMastery(); updateAvailability();
}
// 年度は新しい順、同一年は秋期(A)→春期(S)。文字列逆順では春が先になる。
function sortExamKeys(keys) {
  return [...keys].sort((a, b) =>
    Number(b.slice(0, 4)) - Number(a.slice(0, 4)) ||
    (a.endsWith("a") ? -1 : 1)
  );
}
function renderExams() {
  const keys = sortExamKeys(new Set(state.allQuestions.map(q => q.exam)));
  state.exams = keys;
  const area = el("exam-options"); area.replaceChildren();
  keys.forEach(exam => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox"; checkbox.name = "exam"; checkbox.id = `exam-${exam}`;
    checkbox.value = exam; checkbox.checked = true;
    const label = document.createElement("label");
    label.className = "chip"; label.htmlFor = checkbox.id;
    label.textContent = examLabel(exam);
    label.title = "3秒長押しでこの回の進捗をリセット";
    label.setAttribute("aria-description", "3秒長押しでこの回の進捗をリセット");
    area.append(checkbox, label);
  });
  el("exam-toggle-btn").disabled = !keys.length;
  if (!keys.length) { const p=document.createElement("p");p.className="ipa-empty";p.textContent="確認済みの問題を追加すると、ここに年度が表示されます。";area.append(p); }
  installExamLongPressReset();
}
// The original Kyoto app's pointer-based 3-second reset, adapted for string exam IDs.
function installExamLongPressReset() {
  const area = el("exam-options");
  let timer = null, pressed = null, pointerId = null, startX = 0, startY = 0, suppressed = null;
  const clear = () => { if (timer !== null) clearTimeout(timer); timer=null; pressed?.classList.remove("is-long-pressing"); pressed=null; pointerId=null; };
  area.addEventListener("pointerdown", event => {
    clear();
    if (event.button !== 0 || !event.isPrimary) return;
    suppressed = null;
    const label = event.target.closest("label.chip");
    if (!label) return;
    const input = el(label.htmlFor);
    if (!input || input.disabled) return;
    pressed=label;pointerId=event.pointerId;startX=event.clientX;startY=event.clientY;
    label.classList.add("is-long-pressing");
    timer = setTimeout(() => { clear();suppressed=label;try{navigator.vibrate?.(40);}catch(_){}resetExam(input.value); }, EXAM_LONG_PRESS_MS);
  });
  area.addEventListener("pointermove", event => { if (event.pointerId === pointerId && Math.hypot(event.clientX-startX,event.clientY-startY)>10) clear(); });
  ["pointerup","pointercancel","pointerleave"].forEach(name => area.addEventListener(name, clear));
  window.addEventListener("scroll",clear,true);window.addEventListener("blur",clear);
  area.addEventListener("click", event => {
    const label=event.target.closest("label.chip");
    if (suppressed && (label === suppressed || event.target.id === suppressed.htmlFor)) {
      event.preventDefault();event.stopImmediatePropagation();suppressed=null;
    }
  },true);
  area.addEventListener("keydown",()=>{suppressed=null;});
  area.addEventListener("contextmenu",event=>{ if(event.target.closest("label.chip"))event.preventDefault(); });
}
function filteredQuestions() {
  const exams = new Set(byName("exam"));
  const ranges = byName("range").map(s => s.split("-").map(Number));
  const stages = new Set(byName("stage"));
  return state.allQuestions.filter(q => exams.has(q.exam)
    && ranges.some(([lo,hi]) => q.questionNumber >= lo && q.questionNumber <= hi)
    && stages.has(stageOf(q.id)));
}
function updateAvailability() {
  const pool = filteredQuestions();
  el("count-all-num").textContent=pool.length;
  el("count-availability").textContent=`対象 ${pool.length}問`;
  document.querySelectorAll('input[name="count"]').forEach(input => {input.disabled = input.value !== "all" && Number(input.value)>pool.length;});
  if (document.querySelector('input[name="count"]:checked')?.disabled) el("count-all").checked=true;
  el("start-btn").disabled = state.allQuestions.length === 0;
}
// 出題順は選択した年度・期および問題番号・進捗状態で絞り込んだ後に適用する。
// 同一年の秋→春、各回は問1→問30。未出題のみなら既習問を自然にスキップする。
function orderQuestionPool(pool, mode) {
  if (mode === "random") return shuffle(pool);
  return [...pool].sort((a, b) =>
    b.year - a.year ||
    (a.season === "autumn" ? 0 : 1) - (b.season === "autumn" ? 0 : 1) ||
    a.questionNumber - b.questionNumber ||
    a.id.localeCompare(b.id)
  );
}
function startExam() {
  hideError();
  const pool=filteredQuestions();
  if(!pool.length){showError("選択条件に該当する問題がありません。");return;}
  const count=byName("count")[0];
  const size=count==="all"?pool.length:Number(count);
  if (!size || pool.length<size){showError("対象問題数より少ない出題数を選んでください。");return;}
  const order = byName("order")[0] || "sequential";
  state.questions=orderQuestionPool(pool, order).slice(0,size).map(q=>{
    // 出典照合モードでは原文のア〜エ順を維持する。
    const pairs=LABELS.map((label,i)=>({label,text:q.choices[i]??""}));
    return {...q, displayChoices:q.qaTier==="text"?shuffle(pairs):pairs};
  });
  state.answers={};state.currentIndex=0;showScreen("screen-quiz");renderQuestion();
}
function sourceAnchor(q, label="出典の問題ページを開く") {
  const a=document.createElement("a");
  a.href=q.sourceQuestionUrl;
  a.rel="noopener noreferrer";
  a.target="_blank";
  a.textContent=label;
  return a;
}
function renderQuestion() {
  const q=state.questions[state.currentIndex];
  el("question-meta").textContent=questionLabel(q);
  el("question-stage").textContent=({new:"未出題",miss:"ミス",hit:"ヒット",double:"ダブル",triple:"トリプル"})[stageOf(q.id)];
  el("question-counter").textContent=`${state.currentIndex+1} / ${state.questions.length}`;
  const percent=Math.round((state.currentIndex+1)/state.questions.length*100);
  el("progress-fill").style.width=`${percent}%`;
  el("progress-bar").setAttribute("aria-valuenow",String(percent));
  const referenceOnly=q.qaTier==="reference";
  el("question-text").textContent=referenceOnly
    ?"問題文・選択肢は出典ページで確認してください。" : q.question;
  const review=el("question-review");review.replaceChildren();
  review.hidden=q.qaTier==="text";
  if(q.qaTier!=="text") {
    const p=document.createElement("p");
    p.textContent=referenceOnly
      ?"この問題はテキストを抽出できませんでした。出典を別タブで開き、原文のア〜エから回答してください。画像選択肢の可能性があります。"
      :"図表・数式・選択肢の一部が再現できていない可能性があります。元の問題を出典で照合してください。";
    review.append(p,sourceAnchor(q));
  }
  const area=el("answer-area");area.replaceChildren();
  q.displayChoices.forEach((choice,i)=>{
    const button=document.createElement("button");button.type="button";button.className="choice-btn";
    button.dataset.label=choice.label;
    button.setAttribute("aria-pressed",String(state.answers[q.id]===choice.label));
    const n=document.createElement("span");n.className="choice-marker";
    n.textContent=q.qaTier==="text"?MARKERS[i]:choice.label;
    const body=document.createElement("span");body.className="choice-text";
    body.textContent=referenceOnly?`出典ページの選択肢 ${choice.label}`:choice.text;
    button.append(n,body);
    if(state.answers[q.id]===choice.label)button.classList.add("is-selected");
    button.addEventListener("click",()=>{
      state.answers[q.id]=choice.label;
      area.querySelectorAll(".choice-btn").forEach(b=>{
        const yes=b.dataset.label===choice.label;
        b.classList.toggle("is-selected",yes);
        b.setAttribute("aria-pressed",String(yes));
      });
    });
    area.append(button);
  });
  el("next-btn").textContent=state.currentIndex===state.questions.length-1?"採点する":"次へ";
  el("question-text").focus({preventScroll:true});
}
function next() { if(state.currentIndex<state.questions.length-1){state.currentIndex++;renderQuestion();}else showResult(); }
function choiceName(q, label) {
  if(!label)return "未回答";
  const i=LABELS.indexOf(label);
  return q.choices.length===4 && i>=0 ? `${label}：${q.choices[i]}` : `${label}（原文は出典ページ参照）`;
}
function copyPrompt(q,answer) {
  const lines=["IPA情報処理技術者試験の次の問題を解説してください。",`出典：${sourceLabel(q)}`,
    `URL：${q.sourceQuestionUrl}`, "【問題】",q.question||"出典の問題ページを確認してください。",
    "【原文の選択肢】",...(q.choices.length===4?q.choices.map((text,i)=>`${LABELS[i]} ${text}`):["原文の画像等を出典で確認してください。"]),
    `【正解】${choiceName(q,q.correctLabel)}`,`【私の回答】${choiceName(q,answer)}`,
    "正答の根拠、全選択肢の誤り、背景知識と類題への対応を説明してください。"];
  if(q.qaTier!=="text")lines.push("注意：この問題は図表・数式・画像の再現が未検証です。出典と照合してください。");
  return lines.join("\n");
}
function showResult() {
  let score=0;
  const list=el("result-list");list.replaceChildren();
  state.questions.forEach((q,i)=>{
    const answer=state.answers[q.id];const hit=answer===q.correctLabel;
    if(hit)score++;
    const prev=state.progress[q.id]??0;
    state.progress[q.id]=hit?Math.min(3,prev+1):0;
    const li=document.createElement("li");li.className="ipa-result-entry";
    const heading=document.createElement("h3");heading.textContent=`問${i+1} ${hit?"○ 正解":"× 不正解"} / ${questionLabel(q)}`;
    const question=document.createElement("p");question.textContent=q.question||"本文・選択肢は出典ページで確認してください。";
    const correct=document.createElement("p");correct.className="ipa-choice-correct";correct.textContent=`正解：${choiceName(q,q.correctLabel)}`;
    const submitted=document.createElement("p");submitted.className=hit?"":"ipa-choice-wrong";submitted.textContent=`回答：${choiceName(q,answer)}`;
    const citation=document.createElement("p");citation.className="ipa-source";
    citation.append(sourceAnchor(q,`出典：${sourceLabel(q)}（SCドットコム）`));
    li.append(heading,question,correct,submitted,citation);
    if(q.qaTier!=="text"){
      const caveat=document.createElement("p");caveat.className="ipa-label-small";
      caveat.textContent=q.qaTier==="reference"
        ?"原文の選択肢・画像は未収録。出典を確認したうえで採点結果を利用してください。"
        :"図表・数式・一部の選択肢が未検証です。出典で照合してください。";
      li.append(caveat);
    }
    const copy=document.createElement("button");copy.type="button";copy.className="ipa-action";copy.textContent="生成AI相談プロンプトをコピー";
    copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(copyPrompt(q,answer));copy.textContent="コピーしました";}catch(_){copy.textContent="コピーできませんでした";}});
    li.append(copy);list.append(li);
  });
  saveProgress();
  el("score").textContent=`${score} / ${state.questions.length}問 正解`;
  el("score-percent").textContent=`正答率 ${Math.round(100*score/state.questions.length)}%`;
  el("score-sub").textContent="今回の結果を進捗に記録しました。出典確認が必要な問題は元ページと照合してください。";
  showScreen("screen-result");
}
async function init() {
  try {
    const result=await fetch(A1_CONFIG.questionUrl || "../data/a1/questions.json",{cache:"no-cache"});
    if(!result.ok)throw Error(`HTTP ${result.status}`);
    const questions=await result.json();if(!Array.isArray(questions))throw Error("データ形式が配列ではありません");
    if (questions.length !== EXPECTED_QUESTION_COUNT) throw Error(`V${APP_VERSION}は600問が必要です。現在${questions.length}問。古いフォルダ/JSONを開いていないか確認してください。`);
    const ids=new Set();
    for(const q of questions){
      const full=Array.isArray(q.choices)&&q.choices.length===4;
      const reference=q.qaTier==="reference";
      const indexed=LABELS.indexOf(q.correctLabel);
      if(!q.id || ids.has(q.id) || !/^\d{4}[sa]$/.test(q.exam)
          || !Number.isInteger(q.questionNumber)||q.questionNumber<1||q.questionNumber>30
          || !["text","review","reference"].includes(q.qaTier)
          || indexed<0 || !Array.isArray(q.choices)
          || (reference && (q.choices.length!==0 || q.correct!==""))
          || (!reference && (!q.question||!full||new Set(q.choices).size!==4||q.choices[indexed]!==q.correct))
          || !/^https:\/\/www\.sc-siken\.com\/((s\/)?kakomon)\//.test(q.sourceQuestionUrl))
        throw Error(`データの検証に失敗：${q.id}`);
      ids.add(q.id);
    }
    state.allQuestions=questions;
    el("data-summary").textContent=`収録 ${questions.length}問（要出典照合 ${questions.filter(q=>q.qaTier==="review").length}問・本文/選択肢未取得 ${questions.filter(q=>q.qaTier==="reference").length}問）。`;
    state.progress=loadProgress();
    renderExams();renderMastery();updateAvailability();
  } catch(error){showError(`問題を読み込めませんでした：${error.message}`);el("start-btn").disabled=true;}
  el("start-btn").addEventListener("click",startExam);
  el("next-btn").addEventListener("click",next);
  el("back-to-start-btn").addEventListener("click",()=>{showScreen("screen-start");renderMastery();updateAvailability();});
  el("reset-progress-btn").addEventListener("click",resetAll);
  el("exam-toggle-btn").addEventListener("click",()=>{const inputs=[...document.querySelectorAll('input[name="exam"]')];const all=inputs.every(e=>e.checked);inputs.forEach(e=>e.checked=!all);updateAvailability();});
  document.addEventListener("change",event=>{if(event.target.matches('input[name="exam"],input[name="range"],input[name="stage"]'))updateAvailability();});
  document.addEventListener("keydown",event=>{
    if(el("screen-quiz").hidden || event.altKey || event.ctrlKey || event.metaKey || event.target.closest("input,textarea"))return;
    if(MARKERS.includes(event.key)){const btn=el("answer-area").querySelectorAll(".choice-btn")[Number(event.key)-1];btn?.click();event.preventDefault();}
    else if(event.key==="Enter"){next();event.preventDefault();}
  });
}
window.addEventListener("DOMContentLoaded",init);
