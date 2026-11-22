/* SC Subject B original case study module. Independent of the existing V5.7 A-1/A-2 engine. */
"use strict";
(() => {
  const STORAGE_KEY = "ipa-sc-b-progress-v1";
  const STAGES = ["new", "miss", "hit", "double", "triple"];
  const STAGE_JA = {new:"未出題",miss:"ミス",hit:"ヒット",double:"ダブル",triple:"トリプル"};
  const HOLD_MS = 3000;
  const state = {cases:new Map(), questions:[], progress:{}, selection:{}, picked:[], at:0, mocks:[]};
  const el = id => document.getElementById(id);
  const checked = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(i=>i.value);
  const make = (tag, cls, text) => {
    const node = document.createElement(tag);
    if(cls) node.className = cls;
    if(text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };
  const countJapanese = mock => `模試 第${Number(mock.slice(4))}回`;
  const shuffle = items => {
    const a = [...items];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  };
  function stage(id) {
    if(!Object.prototype.hasOwnProperty.call(state.progress,id)) return "new";
    const n=state.progress[id];
    return n>=3?"triple":n===2?"double":n===1?"hit":"miss";
  }
  function loadProgress(){
    try {const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");return v && typeof v==="object" && !Array.isArray(v) ? v : {};}
    catch(_){return {};}
  }
  function saveProgress(){
    try {localStorage.setItem(STORAGE_KEY,JSON.stringify(state.progress));}
    catch(_){el("mastery-note").textContent="このブラウザでは進捗を保存できません。";}
  }
  function renderMastery(){
    const counts={new:0,miss:0,hit:0,double:0,triple:0};
    for(const q of state.questions) counts[stage(q.questionId)]++;
    const n=state.questions.length,percent=n?Math.round(100*counts.triple/n):0;
    for(const name of STAGES){
      el(`count-${name}`).textContent=counts[name];
      el(`chip-count-${name}`).textContent=counts[name];
      el(`seg-${name}`).style.width=(n?100*counts[name]/n:0)+"%";
    }
    el("mastery-headline").textContent=`${counts.triple} / ${n}問（${percent}%）`;
    el("mastery-bar").setAttribute("aria-valuenow",String(percent));
  }
  function showScreen(screen){
    for(const id of ["screen-start","screen-quiz","screen-result"]) el(id).hidden=id!==screen;
    window.scrollTo(0,0);
  }
  function setError(message){ el("start-error").hidden=false;el("start-error").textContent=message; }
  function clearError(){ el("start-error").hidden=true;el("start-error").textContent=""; }
  function resetMock(mock){
    const items=state.questions.filter(q=>q.mock===mock);
    const count=items.filter(q=>stage(q.questionId)!=="new").length;
    if(!confirm(`${countJapanese(mock)}の進捗（${count}設問分）をリセットしますか？\nこの操作は取り消せません。`))return;
    for(const q of items)delete state.progress[q.questionId];
    saveProgress();renderMastery();updateAvailability();
  }
  function resetAll(){
    const done=state.questions.filter(q=>stage(q.questionId)!=="new").length;
    if(!done || !confirm(`全${done}設問の進捗を消しますか？`))return;
    state.progress={};saveProgress();renderMastery();updateAvailability();
  }
  function renderMocks(){
    const area=el("exam-options");area.replaceChildren();
    for(const mock of state.mocks){
      const input=make("input");input.type="checkbox";input.name="exam";input.id=`exam-${mock.id}`;input.value=mock.id;input.checked=true;
      const label=make("label","chip",mock.label||countJapanese(mock.id));label.htmlFor=input.id;
      label.title="3秒長押しでこの模試回の進捗を消去";
      area.append(input,label);
    }
    installLongPress();
  }
  function installLongPress(){
    const area=el("exam-options");
    let timer=null,pressed=null,pointer=null,x=0,y=0,suppressed=null,suppressUntil=0;
    function clear(){if(timer!==null)clearTimeout(timer);timer=null;pressed?.classList.remove("is-long-pressing");pressed=null;pointer=null;}
    area.addEventListener("pointerdown",ev=>{
      clear(); if(!ev.isPrimary||ev.button!==0)return;
      const label=ev.target.closest("label.chip");if(!label)return;
      pressed=label;pointer=ev.pointerId;x=ev.clientX;y=ev.clientY;
      label.classList.add("is-long-pressing");
      timer=setTimeout(()=>{
        suppressed=label;suppressUntil=Date.now()+1000;
        const input=el(label.htmlFor);clear();
        try{navigator.vibrate?.(35);}catch(_){}
        if(input)resetMock(input.value);
      },HOLD_MS);
    });
    area.addEventListener("pointermove",ev=>{if(ev.pointerId===pointer&&Math.hypot(ev.clientX-x,ev.clientY-y)>10)clear();});
    ["pointerup","pointercancel","pointerleave"].forEach(name=>area.addEventListener(name,clear));
    window.addEventListener("blur",clear);window.addEventListener("scroll",clear,true);
    area.addEventListener("click",ev=>{
      if(suppressed && Date.now()<suppressUntil && (ev.target.closest("label")===suppressed || ev.target.id===suppressed.htmlFor)){
        ev.preventDefault();ev.stopImmediatePropagation();suppressed=null;
      }
    },true);
    area.addEventListener("contextmenu",ev=>{if(ev.target.closest("label.chip"))ev.preventDefault();});
  }
  function selectedPool(){
    const exams=new Set(checked("exam")),formats=new Set(checked("format")),stages=new Set(checked("stage"));
    return state.questions.filter(q=>exams.has(q.mock) && formats.has(state.cases.get(q.caseId).caseType) && stages.has(stage(q.questionId)));
  }
  function updateAvailability(){
    const pool=selectedPool();
    el("count-all-num").textContent=pool.length;
    el("count-availability").textContent=`対象 ${pool.length}問`;
    document.querySelectorAll('input[name="count"]').forEach(input=>input.disabled=input.value!=="all"&&Number(input.value)>pool.length);
    if(document.querySelector('input[name="count"]:checked')?.disabled)el("count-all").checked=true;
    el("start-btn").disabled=!state.questions.length;
  }
  function caseLabel(q){
    const c=state.cases.get(q.caseId);
    return `${countJapanese(q.mock)}・問${q.problemNo||q.order}` + (c.caseType==="multi"?`（設問${q.partNo}）`:"");
  }
  function start(){
    clearError();const pool=selectedPool();
    if(!pool.length){setError("選択条件に該当する設問がありません。模試回・出題形式・出題状態を確認してください。");return;}
    const count=checked("count")[0]||"all", n=count==="all"?pool.length:Number(count);
    if(!(n>=1&&n<=pool.length)){setError("出題可能な問数を選んでください。");return;}
    const ordered=checked("order")[0]==="random"?shuffle(pool):[...pool].sort((a,b)=>a.mock.localeCompare(b.mock)||a.order-b.order);
    state.picked=ordered.slice(0,n);state.selection={};state.at=0;
    showScreen("screen-quiz");renderQuestion();
  }
  function renderNotes(parent, notes){
    if(!Array.isArray(notes)||!notes.length)return;
    const ul=make("ul","scb-notes");
    notes.forEach(note=>ul.append(make("li",null,note)));
    parent.append(ul);
  }
  function renderBlock(parent,block){
    if(!block||typeof block!=="object")return;
    if(block.type==="paragraph"){parent.append(make("p",null,block.text));return;}
    if(block.type==="heading"){parent.append(make("h3",null,block.text));return;}
    if(block.type==="list"){
      const list=make(block.style==="numbered"?"ol":"ul","scb-list");
      (block.items||[]).forEach(item=>list.append(make("li",null,item)));
      parent.append(list);return;
    }
    const resource=make("details","scb-resource");resource.open=true;
    resource.append(make("summary",null,[block.id,block.caption].filter(Boolean).join("　") || "資料"));
    const inner=make("div");resource.append(inner);parent.append(resource);
    if(block.type==="table"){
      const wrap=make("div","scb-table-wrap"),table=make("table","scb-data-table");
      const head=make("thead"),headrow=make("tr");
      (block.columns||[]).forEach(label=>headrow.append(make("th",null,label)));head.append(headrow);table.append(head);
      const tbody=make("tbody");
      (block.rows||[]).forEach(cells=>{const tr=make("tr");cells.forEach(value=>tr.append(make("td",null,value)));tbody.append(tr);});
      table.append(tbody);wrap.append(table);inner.append(wrap);
    } else if(block.type==="code"){
      inner.append(make("p","scb-code-note",`コード・設定ファイル（${block.language||"text"}）`));
      const pre=make("pre","scb-code"),code=make("code",null,block.content||"");pre.append(code);inner.append(pre);
    } else if(block.type==="box"){
      (block.blocks||[]).forEach(item=>renderBlock(inner,item));
    } else if(block.type==="diagram"){
      renderDiagram(inner,block);
    } else {
      inner.append(make("p",null,block.text||"資料形式を表示できません。"));
    }
    renderNotes(inner,block.notes);
  }
  function renderDiagram(container,diagram){
    const nodes=diagram.nodes||[];const edges=diagram.edges||[];
    if(diagram.diagramType==="network"&&nodes.length){
      const diagramEl=make("div","scb-diagram");
      const byId=new Map(nodes.map(n=>[n.id,n]));
      function nodeCard(n){
        const box=make("div","scb-diagram-node");box.append(make("strong",null,n.label));
        if(n.members?.length){const ul=make("ul");n.members.forEach(s=>ul.append(make("li",null,s)));box.append(ul);}return box;
      }
      const start=byId.get("inet"),fw=byId.get("fw");
      if(start&&fw){
        diagramEl.append(nodeCard(start),make("div","scb-diagram-arrow","↓"),nodeCard(fw),make("div","scb-diagram-arrow","↓"));
        const branches=make("div","scb-diagram-branches");
        edges.filter(([a,b])=>a==="fw"&&b!=="inet").forEach(([,id])=>{if(byId.has(id))branches.append(nodeCard(byId.get(id)));});
        diagramEl.append(branches);
      } else nodes.forEach(n=>diagramEl.append(nodeCard(n)));
      container.append(diagramEl);
      const edgeText=edges.map(([a,b])=>`${byId.get(a)?.label||a} → ${byId.get(b)?.label||b}`);
      if(edgeText.length)container.append(make("p","scb-diagram-edge-list",`接続：${edgeText.join(" ／ ")}`));
    }
    if(diagram.fallbackText)container.append(make("p","scb-diagram-fallback",`テキスト表現：${diagram.fallbackText}`));
  }
  function renderCase(q){
    const c=state.cases.get(q.caseId);
    el("case-title").textContent=`共通事例：${c.title}（クリックで折りたたみ）`;
    el("case-details").open=true;
    const body=el("case-body");body.replaceChildren();
    for(const block of c.body)renderBlock(body,block);
  }
  function selectAnswer(id){
    const q=state.picked[state.at];state.selection[q.questionId]=id;
    el("answer-area").querySelectorAll("[data-choice]").forEach(btn=>{
      const yes=btn.dataset.choice===id;
      btn.classList.toggle("is-selected",yes);btn.setAttribute("aria-pressed",String(yes));
      const tr=btn.closest("tr");if(tr)tr.classList.toggle("is-selected",yes);
    });
  }
  function renderChoices(q){
    const area=el("answer-area");area.replaceChildren();
    if(q.choiceFormat==="table"){
      const wrap=make("div","scb-choice-table-wrap"),table=make("table","scb-choice-table");
      const head=make("thead"),headrow=make("tr");headrow.append(make("th",null,"解答"));
      (q.choiceHeaders||[]).forEach(label=>headrow.append(make("th",null,label)));
      head.append(headrow);table.append(head);
      const body=make("tbody");
      for(const choice of q.choices){
        const tr=make("tr"),td=make("td");
        const btn=make("button","scb-copy",choice.id);btn.type="button";btn.dataset.choice=choice.id;
        btn.setAttribute("aria-pressed",String(state.selection[q.questionId]===choice.id));
        btn.setAttribute("aria-label",`${choice.id}：${choice.text||choice.cells?.join("・")||""}`);
        btn.addEventListener("click",()=>selectAnswer(choice.id));td.append(btn);tr.append(td);
        for(const cell of (choice.cells||[]))tr.append(make("td",null,cell));
        tr.addEventListener("click",ev=>{if(!ev.target.closest("button"))selectAnswer(choice.id);});
        if(state.selection[q.questionId]===choice.id)tr.classList.add("is-selected");
        body.append(tr);
      }
      table.append(body);wrap.append(table);area.append(wrap);
    } else {
      for(const choice of q.choices){
        const btn=make("button","choice-btn");btn.type="button";btn.dataset.choice=choice.id;
        btn.setAttribute("aria-pressed",String(state.selection[q.questionId]===choice.id));
        const marker=make("span","choice-marker",choice.id),body=make("span","choice-text",choice.text||choice.cells?.join("・")||"");
        btn.append(marker,body);
        if(state.selection[q.questionId]===choice.id)btn.classList.add("is-selected");
        btn.addEventListener("click",()=>selectAnswer(choice.id));area.append(btn);
      }
    }
  }
  function renderQuestion(){
    const q=state.picked[state.at],c=state.cases.get(q.caseId);
    el("question-meta").textContent=caseLabel(q);
    el("question-stage").textContent=STAGE_JA[stage(q.questionId)];
    el("question-counter").textContent=`${state.at+1} / ${state.picked.length}`;
    const pct=Math.round(100*(state.at+1)/state.picked.length);
    el("progress-fill").style.width=`${pct}%`;
    el("progress-bar").setAttribute("aria-valuenow",String(pct));
    el("question-section-label").textContent=c.caseType==="multi"?`1問3答形式 / 設問${q.partNo}（個別採点）`:"1問1答形式";
    el("question-text").textContent=q.stem;
    const extras=el("question-extra");extras.replaceChildren();
    (q.stemBlocks||[]).forEach(block=>renderBlock(extras,block));
    renderCase(q);renderChoices(q);
    el("next-btn").textContent=state.at===state.picked.length-1?"採点する":"次へ";
    el("question-text").focus({preventScroll:true});
  }
  function next(){
    if(state.at+1<state.picked.length){state.at++;renderQuestion();window.scrollTo(0,0);}
    else renderResults();
  }
  function copyQuestion(q,answer){
    const c=state.cases.get(q.caseId);
    const blocks=c.body.map(b=>{
      if(b.type==="paragraph"||b.type==="heading")return b.text;
      if(b.type==="table")return `${b.id||""} ${b.caption||""}\n${[b.columns,...b.rows].map(r=>r.join(" | ")).join("\n")}`;
      if(b.type==="code")return `${b.id||""} ${b.caption||""}\n${b.content}`;
      if(b.type==="diagram")return b.fallbackText||JSON.stringify(b);
      return JSON.stringify(b);
    });
    return ["SC科目B（非公式オリジナル模試）の次の設問を解説してください。",caseLabel(q),"【共通事例】",...blocks,"【設問】",q.stem,...(q.stemBlocks||[]).map(b=>JSON.stringify(b)),"【選択肢】",...q.choices.map(c=>`${c.id} ${c.text||c.cells?.join(" / ")||""}`),`【正答】${q.answer}`,`【私の回答】${answer||"未回答"}`,"根拠と誤答肢の理由を詳しく説明してください。"].join("\n\n");
  }
  function renderResults(){
    let score=0;const list=el("result-list");list.replaceChildren();
    for(let i=0;i<state.picked.length;i++){
      const q=state.picked[i],answer=state.selection[q.questionId],correct=answer===q.answer;
      if(correct)score++;
      const prev=state.progress[q.questionId]||0;
      state.progress[q.questionId]=correct?Math.min(3,prev+1):0;
      const li=make("li","scb-result-item"+(correct?" is-correct":""));
      li.append(make("h3",null,`${i+1}. ${correct?"○ 正解":"× 不正解"} / ${caseLabel(q)}`));
      li.append(make("p",null,q.stem));
      const label=choice=>q.choices.find(c=>c.id===choice)?.text||choice||"未回答";
      li.append(make("p","scb-answer-good",`正答：${q.answer}　${label(q.answer)}`));
      li.append(make("p",correct?"scb-answer-good":"scb-answer-wrong",`あなたの回答：${answer?`${answer}　${label(answer)}`:"未回答"}`));
      const detail=make("details");detail.open=!correct;
      detail.append(make("summary",null,"解説・誤答肢の検証を読む"));
      const exp=q.explanation||{};
      if(exp.summary)detail.append(make("p",null,exp.summary));
      (exp.rationale||[]).forEach(s=>detail.append(make("p",null,s)));
      if(exp.distractors?.length)detail.append(make("h4",null,"誤答肢の理由"));
      (exp.distractors||[]).forEach(d=>detail.append(make("p","scb-distractor",`${d.choiceId}：${d.reason}`)));
      li.append(detail);
      const copy=make("button","scb-copy","生成AIへの相談文をコピー");copy.type="button";
      copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(copyQuestion(q,answer));copy.textContent="コピーしました";}catch(_){copy.textContent="コピーできませんでした";}});
      li.append(copy);list.append(li);
    }
    saveProgress();
    el("score").textContent=`${score} / ${state.picked.length}問 正解`;
    el("score-percent").textContent=`正答率 ${Math.round(100*score/state.picked.length)}%`;
    el("score-sub").textContent="今回の結果を設問ごとの進捗に保存しました。各設問の解説と誤答理由を確認できます。";
    showScreen("screen-result");
  }
  function validateData(mock,cases,questions){
    if(!Array.isArray(cases)||!Array.isArray(questions)||cases.length!==mock.expectedCases||questions.length!==mock.expectedQuestions)throw Error(`${mock.id}の事例／設問数が設定値と一致しません`);
    const byCase=new Map();
    for(const c of cases){
      if(typeof c.caseId!=="string"||state.cases.has(c.caseId)||byCase.has(c.caseId)||!["single","multi"].includes(c.caseType)||!Array.isArray(c.body)||!c.title)throw Error(`不正な事例：${c.caseId||"IDなし"}`);
      byCase.set(c.caseId,c);
    }
    const ids=new Set(state.questions.map(q=>q.questionId));
    for(const q of questions){
      const c=byCase.get(q.caseId);
      if(!c||typeof q.questionId!=="string"||ids.has(q.questionId)||!q.questionId.startsWith(`sc-b-${mock.id}-`)||!Number.isInteger(q.order)||!q.stem||!Array.isArray(q.choices)||q.choices.length<2||q.choices.length>12||!q.explanation||!Array.isArray(q.explanation.rationale))throw Error(`不正な設問：${q.questionId}`);
      const labels=q.choices.map(ch=>ch.id);
      if(new Set(labels).size!==labels.length||!labels.includes(q.answer)||!q.choices.every(ch=>typeof ch.text==="string"&&ch.text.trim())||!Array.isArray(q.explanation.distractors))throw Error(`選択肢の不整合：${q.questionId}`);
      const reasons=new Set(q.explanation.distractors.map(d=>d.choiceId));
      if(reasons.size!==q.choices.length-1||labels.some(id=>id!==q.answer&&!reasons.has(id))||reasons.has(q.answer))throw Error(`誤答理由の不整合：${q.questionId}`);
      if(c.caseType==="multi"&&(!Number.isInteger(q.partNo)||q.partNo<1||q.partNo>3||q.partCount!==3||!q.problemNo))throw Error(`1問3答の属性が不正：${q.questionId}`);
      if(c.caseType==="single"&&q.partNo!==undefined)throw Error(`1問1答の属性が不正：${q.questionId}`);
      ids.add(q.questionId);
    }
    for(const c of cases){
      const related=questions.filter(q=>q.caseId===c.caseId);
      if(related.length!==(c.caseType==="multi"?3:1)||c.caseType==="multi"&&new Set(related.map(q=>q.partNo)).size!==3)throw Error(`事例と設問の対応不整合：${c.caseId}`);
    }
    return byCase;
  }
  async function fetchJSON(path){
    const response=await fetch(path,{cache:"no-cache"});
    if(!response.ok)throw Error(`HTTP ${response.status} (${path})`);
    return response.json();
  }
  async function init(){
    try{
      const manifestUrl=new URL("../data/sc-b/manifest.json",location.href);
      const manifest=await fetchJSON(manifestUrl.href);
      if(!Array.isArray(manifest.available))throw Error("manifest.jsonの形式が不正です");
      for(const mock of manifest.available){
        if(!/^mock\d{2}$/.test(mock.id)||state.mocks.some(m=>m.id===mock.id))throw Error("模試回IDが不正です");
        const [casesData,questionsData]=await Promise.all([
          fetchJSON(new URL(mock.casesUrl,manifestUrl).href),
          fetchJSON(new URL(mock.questionsUrl,manifestUrl).href)
        ]);
        const cases=casesData.cases,questions=questionsData.questions;
        const byCase=validateData(mock,cases,questions);
        byCase.forEach((value,key)=>state.cases.set(key,value));
        questions.forEach(q=>state.questions.push({...q,mock:mock.id}));
        state.mocks.push(mock);
      }
      if(!state.questions.length)throw Error("利用可能な問題がありません");
      state.progress=loadProgress();
      state.mocks.sort((a,b)=>a.id.localeCompare(b.id));
      renderMocks();renderMastery();updateAvailability();
      el("data-status").textContent=`収録 ${state.mocks.length}回・${state.cases.size}大問・${state.questions.length}設問。全10回・200設問を計画しています。`;
    }catch(error){
      el("data-status").textContent="データを読み込めませんでした。";
      setError(`問題データの読込・検証に失敗しました：${error.message}\nGitHub Pages上、またはローカルHTTPサーバで開いてください。`);
      el("start-btn").disabled=true;
    }
  }
  el("start-btn").addEventListener("click",start);
  el("next-btn").addEventListener("click",next);
  el("reset-all").addEventListener("click",resetAll);
  el("exit-quiz").addEventListener("click",()=>{
    if(Object.keys(state.selection).length && !confirm("採点前の回答は保存されません。中断しますか？"))return;
    showScreen("screen-start");renderMastery();updateAvailability();
  });
  el("back-to-start").addEventListener("click",()=>{showScreen("screen-start");renderMastery();updateAvailability();});
  el("toggle-exams").addEventListener("click",()=>{
    const inputs=[...document.querySelectorAll('input[name="exam"]')];
    const all=inputs.every(i=>i.checked);inputs.forEach(i=>i.checked=!all);updateAvailability();
  });
  document.addEventListener("change",event=>{
    if(event.target.matches('input[name="exam"],input[name="format"],input[name="stage"]'))updateAvailability();
  });
  document.addEventListener("keydown",event=>{
    if(el("screen-quiz").hidden||event.altKey||event.ctrlKey||event.metaKey||event.target.closest("input,textarea,button,summary"))return;
    if(/^[1-9]$/.test(event.key)){
      const index=Number(event.key)-1;
      const button=el("answer-area").querySelectorAll("[data-choice]")[index];
      if(button){button.click();event.preventDefault();}
    }
  });
  document.addEventListener("DOMContentLoaded",init);
})();
