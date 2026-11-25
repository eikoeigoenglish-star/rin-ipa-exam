/* SC vocabulary writing trainer V5.10. Dedicated module: legacy engines and storage untouched. */
"use strict";
(() => {
  const STORAGE_KEY = "ipa-sc-vocab-progress-v1";
  const DRAFT_KEY = "ipa-sc-vocab-draft-v2";
  const HOLD_MS = 3000;
  const STAGES = ["new", "miss", "hit", "double", "triple"];
  const STAGE_NAMES = {new:"未出題", miss:"ミス", hit:"ヒット", double:"ダブル", triple:"トリプル"};
  const DIFFICULTY_NAMES = {basic:"基礎", standard:"標準", advanced:"高度"};
  const state = {sets:[], questions:[], policy:new Map(), progress:{}, picked:[], at:0, drafts:{}, answers:[], activeDraft:null};
  const el = id => document.getElementById(id);
  const all = selector => [...document.querySelectorAll(selector)];
  const checked = name => all(`input[name="${name}"]:checked`).map(input=>input.value);
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if(className) node.className = className;
    if(text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };
  const shuffle = input => {
    const a=[...input];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  };
  // In particular: DO NOT strip version numbers (TLS 1.3 != TLS 1.2)
  // and DO NOT strip a universal 「攻撃」 suffix. Only per-question acceptedAnswers are valid.
  function normalize(value){
    return String(value ?? "").normalize("NFKC").toLowerCase()
      .replace(/[\p{White_Space}\p{P}\p{S}\u200B-\u200D\uFEFF]/gu, "");
  }
  function stage(questionId){
    if(!Object.prototype.hasOwnProperty.call(state.progress,questionId)) return "new";
    const score=state.progress[questionId];
    return score>=3?"triple":score===2?"double":score===1?"hit":"miss";
  }
  function loadProgress(){
    try{
      const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
      if(!raw||typeof raw!=="object"||Array.isArray(raw))return {};
      const clean={};
      for(const [id,n] of Object.entries(raw)) if(/^sc-vocab-q\d{3}$/.test(id)&&Number.isInteger(n)&&n>=0&&n<=3)clean[id]=n;
      return clean;
    }catch(_){return {};}
  }
  function saveProgress(){
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state.progress)); }
    catch(_){el("mastery-note").textContent="このブラウザでは進捗を保存できません。";}
  }
  function renderMastery(){
    const counts={new:0,miss:0,hit:0,double:0,triple:0};
    for(const q of state.questions)counts[stage(q.questionId)]++;
    const total=state.questions.length;
    const pct=total?Math.round(100*counts.triple/total):0;
    for(const name of STAGES){
      el(`count-${name}`).textContent=counts[name];
      el(`chip-count-${name}`).textContent=counts[name];
      el(`seg-${name}`).style.width=(total?counts[name]*100/total:0)+"%";
    }
    el("mastery-headline").textContent=`${counts.triple} / ${total}問（${pct}%）`;
    el("mastery-bar").setAttribute("aria-valuenow",String(pct));
  }
  function showScreen(screen){
    for(const id of ["screen-start","screen-quiz","screen-review","screen-result"])el(id).hidden=id!==screen;
    window.scrollTo(0,0);
  }
  function showError(message){ el("start-error").textContent=message;el("start-error").hidden=false; }
  function clearError(){el("start-error").hidden=true;el("start-error").textContent="";}
  function setLabel(q){return `第${q.setNo}回・問${String(q.order).padStart(2,"0")}`;}
  function resetSet(setNo){
    const subset=state.questions.filter(q=>q.setNo===setNo);
    const n=subset.filter(q=>stage(q.questionId)!=="new").length;
    if(!window.confirm(`第${setNo}回の進捗（${n}問分）をリセットしますか？\nこの操作は取り消せません。`))return;
    for(const q of subset)delete state.progress[q.questionId];
    saveProgress();renderMastery();updateAvailability();
  }
  function resetAll(){
    const n=state.questions.filter(q=>stage(q.questionId)!=="new").length;
    if(n===0||!window.confirm(`全${n}問の進捗を消去しますか？\nこの操作は取り消せません。`))return;
    state.progress={};saveProgress();renderMastery();updateAvailability();
  }
  function renderSetOptions(){
    const region=el("set-options");region.replaceChildren();
    state.sets.forEach((s,index)=>{
      const input=make("input");input.type="checkbox";input.name="set";
      input.id=`scv-set-${s.setNo}`;input.value=String(s.setNo);input.checked=index===0;
      const label=make("label","chip",`${s.label}（${s.expectedQuestions}問）`);label.htmlFor=input.id;
      label.title="3秒長押しでこの回だけの進捗をリセット";
      region.append(input,label);
    });
    installLongPress(region);
  }
  function installLongPress(region){
    let timer=null,pressed=null,pointer=null,startX=0,startY=0,suppress=null,suppressUntil=0;
    function clear(){
      if(timer!==null)clearTimeout(timer);
      timer=null;pressed?.classList.remove("is-long-pressing");pressed=null;pointer=null;
    }
    region.addEventListener("pointerdown",event=>{
      clear();if(!event.isPrimary||event.button!==0)return;
      const label=event.target.closest("label.chip");if(!label)return;
      pressed=label;pointer=event.pointerId;startX=event.clientX;startY=event.clientY;
      label.classList.add("is-long-pressing");
      timer=setTimeout(()=>{
        suppress=label;suppressUntil=Date.now()+1200;
        const input=el(label.htmlFor);clear();
        try{navigator.vibrate?.(30);}catch(_){}
        if(input)resetSet(Number(input.value));
      },HOLD_MS);
    });
    region.addEventListener("pointermove",event=>{
      if(pointer===event.pointerId && Math.hypot(event.clientX-startX,event.clientY-startY)>10)clear();
    });
    for(const name of ["pointerup","pointercancel","pointerleave"])region.addEventListener(name,clear);
    window.addEventListener("scroll",clear,true);window.addEventListener("blur",clear);
    region.addEventListener("click",event=>{
      if(suppress&&Date.now()<suppressUntil&&
         (event.target.closest("label")===suppress||event.target.id===suppress.htmlFor)){
        event.preventDefault();event.stopImmediatePropagation();suppress=null;
      }
    },true);
    region.addEventListener("contextmenu",event=>{if(event.target.closest("label.chip"))event.preventDefault();});
  }
  function pool(){
    const sets=new Set(checked("set").map(Number));
    const stages=new Set(checked("stage"));
    const difficulties=new Set(checked("difficulty"));
    return state.questions.filter(q=>sets.has(q.setNo)&&stages.has(stage(q.questionId))&&difficulties.has(q.difficulty));
  }
  function updateAvailability(){
    const count=pool().length;
    el("count-availability").textContent=`対象 ${count}問`;
    el("count-all-num").textContent=count;
    all('input[name="count"]').forEach(input=>input.disabled=input.value!=="all"&&Number(input.value)>count);
    if(document.querySelector('input[name="count"]:checked')?.disabled)el("count-all").checked=true;
    const setInputs=all('input[name="set"]');
    el("toggle-sets").textContent=setInputs.length&&setInputs.every(input=>input.checked)?"すべて解除":"すべて選択";
    el("start-btn").disabled=!state.questions.length;
  }
  function saveDraft(){
    if(!state.picked.length)return;
    const payload={version:2,questionIds:state.picked.map(q=>q.questionId),at:state.at,drafts:{...state.drafts}};
    state.activeDraft=payload;
    try{localStorage.setItem(DRAFT_KEY,JSON.stringify(payload));}
    catch(_){el("mastery-note").textContent="このブラウザでは途中解答を保存できません。";}
    renderResumeButton();
  }
  function clearDraft(){
    state.activeDraft=null;
    try{localStorage.removeItem(DRAFT_KEY);}catch(_){}
    renderResumeButton();
  }
  function loadDraft(){
    try{
      const value=JSON.parse(localStorage.getItem(DRAFT_KEY)||"null");
      if(!value||value.version!==2||!Array.isArray(value.questionIds)||value.questionIds.length<1||value.questionIds.length>200||
         new Set(value.questionIds).size!==value.questionIds.length||!Number.isInteger(value.at)||value.at<0||value.at>=value.questionIds.length||
         !value.drafts||typeof value.drafts!=="object"||Array.isArray(value.drafts))return null;
      const known=new Set(state.questions.map(q=>q.questionId));
      if(!value.questionIds.every(id=>known.has(id)))return null;
      const drafts={};
      for(const id of value.questionIds){
        const answer=value.drafts[id];
        if(typeof answer==="string")drafts[id]=answer.slice(0,160);
      }
      return {...value,drafts};
    }catch(_){return null;}
  }
  function renderResumeButton(){
    const section=el("resume-area");
    section.hidden=!state.activeDraft;
    if(state.activeDraft){
      const count=state.activeDraft.questionIds.filter(id=>Boolean(state.activeDraft.drafts[id]?.trim())).length;
      el("resume-label").textContent=`途中保存：${count} / ${state.activeDraft.questionIds.length}問入力済み`;
    }
  }
  function resumeDraft(){
    const draft=state.activeDraft;
    if(!draft)return;
    const map=new Map(state.questions.map(q=>[q.questionId,q]));
    state.picked=draft.questionIds.map(id=>map.get(id));
    state.drafts={...draft.drafts};state.at=draft.at;state.answers=[];
    showScreen("screen-quiz");renderQuestion();
  }
  function start(){
    clearError();const selected=pool();
    if(!selected.length){showError("選択条件に該当する問題がありません。出題回・出題状態・難易度を確認してください。");return;}
    const count=checked("count")[0]||"all";
    const n=count==="all"?selected.length:Number(count);
    if(!Number.isInteger(n)||n<1||n>selected.length){showError("出題可能な問数を選んでください。");return;}
    if(state.activeDraft&&!window.confirm("途中保存された解答があります。破棄して新しい演習を始めますか？"))return;
    const ordered=checked("order")[0]==="random"?shuffle(selected):[...selected].sort((a,b)=>a.setNo-b.setNo||a.order-b.order);
    state.picked=ordered.slice(0,n);state.at=0;state.drafts={};state.answers=[];
    saveDraft();showScreen("screen-quiz");renderQuestion();
  }
  function saveInput(){
    const q=state.picked[state.at];if(!q)return;
    state.drafts[q.questionId]=el("answer-input").value;
    saveDraft();
    updateQuizProgress();
  }
  function answeredCount(){return state.picked.filter(q=>Boolean(state.drafts[q.questionId]?.trim())).length;}
  function updateQuizProgress(){
    const total=state.picked.length;
    el("answered-counter").textContent=`入力済み ${answeredCount()} / ${total}問`;
    const pct=Math.round(100*answeredCount()/total);
    el("progress-fill").style.width=pct+"%";
    el("progress-bar").setAttribute("aria-valuenow",String(pct));
  }
  function renderQuestion(){
    const q=state.picked[state.at];
    el("question-meta").textContent=setLabel(q);
    const tag=el("question-stage"),st=stage(q.questionId);
    tag.textContent=STAGE_NAMES[st];tag.className=`stage-tag stage-${st}`;
    el("question-counter").textContent=`${state.at+1} / ${state.picked.length}`;
    el("question-label").textContent=`${DIFFICULTY_NAMES[q.difficulty]}・${q.category}`;
    el("question-text").textContent=q.prompt;
    el("answer-input").value=state.drafts[q.questionId]||"";
    el("prev-question").disabled=state.at===0;
    el("next-question").textContent=state.at===state.picked.length-1?"解答一覧へ":"次の問題へ";
    updateQuizProgress();
    window.scrollTo(0,0);
    if(!window.matchMedia?.("(pointer:coarse)").matches)el("answer-input").focus({preventScroll:true});
  }
  function moveTo(index){
    saveInput();
    if(index<0||index>=state.picked.length){renderReview();return;}
    state.at=index;saveDraft();showScreen("screen-quiz");renderQuestion();
  }
  function renderReview(){
    saveInput();
    const total=state.picked.length, count=answeredCount();
    el("review-summary").textContent=`全${total}問のうち${count}問に入力済み、${total-count}問が未回答です。採点するまで正解・解説は表示されません。`;
    const list=el("review-list");list.replaceChildren();
    for(const [i,q] of state.picked.entries()){
      const answer=(state.drafts[q.questionId]||"").trim();
      const item=make("li","scv-review-item"+(answer?" is-answered":""));
      const button=make("button","scv-review-button");button.type="button";
      button.append(make("span","scv-review-number",`${i+1}. ${setLabel(q)}`));
      button.append(make("span","scv-review-state",answer?`入力済み：${answer}`:"未回答"));
      button.addEventListener("click",()=>{state.at=i;saveDraft();showScreen("screen-quiz");renderQuestion();});
      item.append(button);list.append(item);
    }
    showScreen("screen-review");
  }
  function isAccepted(q,answer){
    const key=normalize(answer);
    return key!==""&&q.acceptedAnswers.some(accepted=>normalize(accepted)===key);
  }
  function isRelated(q,answer){
    const key=normalize(answer);
    const p=state.policy.get(q.questionId);
    return key!==""&&p?.relatedAnswers?.some(related=>normalize(related)===key);
  }
  function updateScore(){
    const correctCount=state.answers.filter(a=>a.correct===true).length;
    const undecided=state.answers.filter(a=>a.correct===null).length;
    const total=state.answers.length;
    el("score").textContent=`${correctCount} / ${total}問 正解${undecided?`（${undecided}問保留）`:""}`;
    el("score-percent").textContent=`正答率 ${Math.round(correctCount*100/total)}%${undecided?"（暫定）":""}`;
    el("score-sub").textContent=undecided
      ? `関連回答が${undecided}問あります。下の結果一覧で自己判定すると進捗と得点に反映されます。`
      : "全問の採点が確定しました。進捗はこのブラウザに保存されています。";
  }
  function commitRecord(record,correct){
    if(record.correct!==null)return;
    record.correct=correct;
    const previous=Object.prototype.hasOwnProperty.call(state.progress,record.questionId)?state.progress[record.questionId]:0;
    state.progress[record.questionId]=correct?Math.min(3,previous+1):0;
    record.after=stage(record.questionId);
    saveProgress();renderMastery();updateScore();
    const item=el(`scv-result-${record.questionId}`);
    if(item){
      item.classList.toggle("is-correct",correct);
      item.querySelector(".scv-result-heading").textContent=`${record.index+1}. ${correct?"○ 正解":"× ミス"}　${setLabel(state.picked[record.index])}`;
      item.querySelector(".scv-result-progress").textContent=`進捗：${STAGE_NAMES[record.before]} → ${STAGE_NAMES[record.after]}`;
      item.querySelector(".scv-self-decision").replaceChildren(make("p",correct?"scv-good":"scv-bad",correct?"自己判定：正解として記録しました":"自己判定：ミスとして記録しました"));
    }
  }
  function createResultItem(q,record,index){
    const li=make("li",`scv-result-item${record.correct===true?" is-correct":""}`);
    li.id=`scv-result-${q.questionId}`;
    const verdict=record.correct===null?"△ 関連回答・要自己判定":record.correct?"○ 正解":"× ミス";
    li.append(make("h3","scv-result-heading",`${index+1}. ${verdict}　${setLabel(q)}`));
    li.append(make("p",record.correct===true?"scv-good":"scv-subtle",`あなたの回答：${record.answer||"（未回答）"}`));
    li.append(make("p","scv-result-progress scv-subtle",record.correct===null?`進捗：${STAGE_NAMES[record.before]} → 判定待ち`:`進捗：${STAGE_NAMES[record.before]} → ${STAGE_NAMES[record.after]}`));
    if(record.correct===null){
      const block=make("div","scv-self-decision");
      block.append(make("p",null,"この回答は関連語です。解説を確認し、正解またはミスとして記録してください。"));
      const row=make("div","scv-action-row");
      for(const [label,correct] of [["正解として記録",true],["ミスとして記録",false]]){
        const btn=make("button","btn-secondary",label);btn.type="button";
        btn.addEventListener("click",()=>commitRecord(record,correct));
        row.append(btn);
      }
      block.append(row);li.append(block);
    }
    const details=make("details");details.open=record.correct!==true;
    details.append(make("summary",null,"問題文・正答・解説"));
    details.append(make("p","scv-result-prompt",q.prompt));
    details.append(make("p","scv-good",`正答：${q.answer}`));
    details.append(make("p",null,q.explanation));
    const urls=(q.referenceUrls||[]).filter(url=>typeof url==="string"&&/^https:\/\//.test(url));
    if(urls.length){
      const sources=make("ul","scv-result-sources");
      for(const [num,url] of urls.entries()){
        const li=make("li"),link=make("a",null,`参考資料 ${num+1}（外部サイト）`);
        link.href=url;link.target="_blank";link.rel="noopener noreferrer";li.append(link);sources.append(li);
      }
      details.append(sources);
    }
    li.append(details);return li;
  }
  function gradeAll(){
    if(!state.picked.length||state.answers.length)return;
    const blanks=state.picked.length-answeredCount();
    if(blanks&&!window.confirm(`未回答が${blanks}問あります。未回答はミスとして全問採点しますか？`))return;
    state.answers=state.picked.map((q,index)=>{
      const answer=(state.drafts[q.questionId]||"").trim();
      const kind=isAccepted(q,answer)?"correct":isRelated(q,answer)?"related":"wrong";
      const before=stage(q.questionId);
      return {index,questionId:q.questionId,answer,kind,before,after:null,correct:kind==="related"?null:kind==="correct"};
    });
    // All determinate answers are committed together, only after the final grade action.
    for(const a of state.answers){
      if(a.correct!==null){
        const prev=Object.prototype.hasOwnProperty.call(state.progress,a.questionId)?state.progress[a.questionId]:0;
        state.progress[a.questionId]=a.correct?Math.min(3,prev+1):0;
        a.after=stage(a.questionId);
      }
    }
    saveProgress();
    const list=el("result-list");list.replaceChildren();
    for(const [i,q] of state.picked.entries())list.append(createResultItem(q,state.answers[i],i));
    updateScore();renderMastery();
    clearDraft();
    showScreen("screen-result");
  }
  async function fetchJSON(url){
    const res=await fetch(url,{cache:"no-cache"});
    if(!res.ok)throw Error(`HTTP ${res.status} (${url})`);
    return res.json();
  }
  function validateSet(spec,data,usedQuestionIds,usedTermIds){
    if(data.module!=="sc-vocab-writing"||data.setNo!==spec.setNo||data.setId!==spec.id||!Array.isArray(data.questions)||data.questions.length!==spec.expectedQuestions)
      throw Error(`${spec.label}の問題数・セット情報が不正です`);
    for(const [i,q] of data.questions.entries()){
      const number=(spec.setNo-1)*20+i+1;
      if(q.questionId!==`sc-vocab-q${String(number).padStart(3,"0")}`||q.order!==i+1||!/^sc-vocab-\d{3}$/.test(q.termId)||
         !q.prompt||typeof q.prompt!=="string"||!q.answer||!q.explanation||!Array.isArray(q.acceptedAnswers)||!q.acceptedAnswers.includes(q.answer)||
         !["basic","standard","advanced"].includes(q.difficulty)||typeof q.category!=="string"||!Array.isArray(q.referenceUrls)||
         usedQuestionIds.has(q.questionId)||usedTermIds.has(q.termId))throw Error(`${spec.label}の不正な問題：${q.questionId||"IDなし"}`);
      usedQuestionIds.add(q.questionId);usedTermIds.add(q.termId);
      state.questions.push({...q,setNo:spec.setNo});
    }
  }
  async function init(){
    try{
      const manifestUrl=new URL("../data/sc-vocab/manifest.json",document.baseURI);
      const manifest=await fetchJSON(manifestUrl.href);
      if(!Array.isArray(manifest.sets)||manifest.sets.length!==10||manifest.totalQuestions!==200||manifest.questionsPerSet!==20)
        throw Error("マニフェストのセット数・総問題数が不正です");
      const [files,related]=await Promise.all([
        Promise.all(manifest.sets.map(async spec=>({spec,data:await fetchJSON(new URL(spec.questionsUrl,manifestUrl).href)}))),
        fetchJSON(new URL(manifest.relatedAnswersUrl,manifestUrl).href)
      ]);
      const ids=new Set(),terms=new Set();
      files.sort((a,b)=>a.spec.setNo-b.spec.setNo);
      for(const {spec,data} of files){
        if(!Number.isInteger(spec.setNo)||spec.setNo<1||spec.setNo>10||state.sets.some(s=>s.setNo===spec.setNo)||spec.expectedQuestions!==20)
          throw Error("回次の番号が不正です");
        validateSet(spec,data,ids,terms);state.sets.push(spec);
      }
      if(state.questions.length!==200||terms.size!==200||ids.size!==200)throw Error("200問の網羅性が不正です");
      if(!Array.isArray(related.items)||related.items.length!==200)throw Error("関連回答辞書の件数が不正です");
      const questionMap=new Map(state.questions.map(q=>[q.questionId,q]));
      for(const item of related.items){
        const q=questionMap.get(item.questionId);
        if(!q||q.termId!==item.termId||state.policy.has(item.questionId)||!Array.isArray(item.relatedAnswers)||!Array.isArray(item.incorrectAnswers))
          throw Error(`関連回答辞書の不整合：${item.questionId}`);
        state.policy.set(item.questionId,item);
      }
      state.progress=loadProgress();state.activeDraft=loadDraft();renderSetOptions();renderMastery();updateAvailability();renderResumeButton();
      el("data-status").textContent="10回×20問、全200問を読み込みました。採点は最後にまとめて行います。";
    }catch(error){
      el("data-status").textContent="データを読み込めませんでした。";
      showError(`問題データの読込・検証に失敗しました：${error.message}\nGitHub PagesまたはローカルHTTPサーバで開いてください。`);
      el("start-btn").disabled=true;
    }
  }
  el("answer-form").addEventListener("submit",event=>{
    event.preventDefault();
    if(event.isComposing||composing)return;
    moveTo(state.at+1);
  });
  let composing=false;
  el("answer-input").addEventListener("compositionstart",()=>{composing=true;});
  el("answer-input").addEventListener("compositionend",()=>{composing=false;});
  el("answer-input").addEventListener("keydown",event=>{
    if(event.key==="Enter"&&(event.isComposing||composing||event.keyCode===229))event.preventDefault();
  });
  el("answer-input").addEventListener("input",saveInput);
  el("prev-question").addEventListener("click",()=>moveTo(state.at-1));
  el("to-review").addEventListener("click",renderReview);
  el("review-back").addEventListener("click",()=>{state.at=Math.min(state.at,state.picked.length-1);saveDraft();showScreen("screen-quiz");renderQuestion();});
  el("grade-all").addEventListener("click",gradeAll);
  el("resume-btn").addEventListener("click",resumeDraft);
  el("start-btn").addEventListener("click",start);
  el("reset-all").addEventListener("click",resetAll);
  el("exit-quiz").addEventListener("click",()=>{
    if(!window.confirm("演習を中断して戻りますか？ 入力内容は途中保存され、採点や進捗更新は行われません。"))return;
    saveInput();showScreen("screen-start");renderMastery();updateAvailability();
  });
  el("back-to-start").addEventListener("click",()=>{showScreen("screen-start");renderMastery();updateAvailability();});
  el("toggle-sets").addEventListener("click",()=>{
    const inputs=all('input[name="set"]');const select=!inputs.every(input=>input.checked);
    inputs.forEach(input=>{input.checked=select;});updateAvailability();
  });
  document.addEventListener("change",event=>{
    if(event.target.matches('input[name="set"],input[name="stage"],input[name="difficulty"]'))updateAvailability();
  });
  document.addEventListener("DOMContentLoaded",init);
})();
