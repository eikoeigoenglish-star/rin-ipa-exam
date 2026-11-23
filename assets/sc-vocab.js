/* SC vocabulary writing trainer V5.9. Dedicated module: legacy engines and storage untouched. */
"use strict";
(() => {
  const STORAGE_KEY = "ipa-sc-vocab-progress-v1";
  const HOLD_MS = 3000;
  const STAGES = ["new", "miss", "hit", "double", "triple"];
  const STAGE_NAMES = {new:"未出題", miss:"ミス", hit:"ヒット", double:"ダブル", triple:"トリプル"};
  const DIFFICULTY_NAMES = {basic:"基礎", standard:"標準", advanced:"高度"};
  const state = {sets:[], questions:[], policy:new Map(), progress:{}, picked:[], at:0, answers:[], currentResult:null};
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
    for(const id of ["screen-start","screen-quiz","screen-result"])el(id).hidden=id!==screen;
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
      const label=make("label","chip",`${s.label}（50問）`);label.htmlFor=input.id;
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
  function start(){
    clearError();const selected=pool();
    if(!selected.length){showError("選択条件に該当する問題がありません。出題回・出題状態・難易度を確認してください。");return;}
    const count=checked("count")[0]||"all";
    const n=count==="all"?selected.length:Number(count);
    if(!Number.isInteger(n)||n<1||n>selected.length){showError("出題可能な問数を選んでください。");return;}
    const ordered=checked("order")[0]==="random"?shuffle(selected):[...selected].sort((a,b)=>a.setNo-b.setNo||a.order-b.order);
    state.picked=ordered.slice(0,n);state.at=0;state.answers=[];state.currentResult=null;
    showScreen("screen-quiz");renderQuestion();
  }
  function renderQuestion(){
    const q=state.picked[state.at];
    state.currentResult=null;
    el("question-meta").textContent=setLabel(q);
    const tag=el("question-stage"),st=stage(q.questionId);
    tag.textContent=STAGE_NAMES[st];tag.className=`stage-tag stage-${st}`;
    el("question-counter").textContent=`${state.at+1} / ${state.picked.length}`;
    const pct=Math.round(100*state.at/state.picked.length);
    el("progress-fill").style.width=pct+"%";el("progress-bar").setAttribute("aria-valuenow",String(pct));
    el("question-label").textContent=`${DIFFICULTY_NAMES[q.difficulty]}・${q.category}`;
    el("question-text").textContent=q.prompt;
    el("answer-form").hidden=false;
    el("answer-input").value="";
    el("feedback").hidden=true;el("feedback").className="scv-feedback";
    el("related-decision").hidden=true;
    el("next-btn").hidden=true;
    el("next-btn").textContent=state.at===state.picked.length-1?"結果を見る":"次の問題へ";
    window.scrollTo(0,0);
    // Avoid unexpectedly popping the virtual keyboard on touch devices.
    if(!window.matchMedia?.("(pointer:coarse)").matches)el("answer-input").focus({preventScroll:true});
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
  function displayFeedback(q,answer,type){
    const section=el("feedback");section.hidden=false;
    section.className=`scv-feedback is-${type}`;
    const title=type==="correct"?"○ 正解":type==="related"?"関連する回答・自己判定":"× ミス";
    el("feedback-heading").textContent=title;
    el("feedback-your-answer").textContent=`あなたの回答：${answer||"（未回答）"}`;
    el("feedback-correct-answer").textContent=`教材の正答：${q.answer}`;
    el("feedback-explanation").textContent=q.explanation;
    const sourceList=el("feedback-sources");sourceList.replaceChildren();
    const urls=(q.referenceUrls||[]).filter(url=>typeof url==="string"&&/^https:\/\//.test(url));
    for(const [index,url] of urls.entries()){
      const li=make("li"),link=make("a",null,`参考資料 ${index+1}（外部サイト）`);
      link.href=url;link.target="_blank";link.rel="noopener noreferrer";
      li.append(link);sourceList.append(li);
    }
    el("feedback").querySelector(".scv-sources").hidden=urls.length===0;
  }
  function submit(answer,skip=false){
    if(state.currentResult)return;
    const q=state.picked[state.at];
    if(!skip&&!answer.trim()){
      el("answer-input").focus();el("answer-input").placeholder="用語を入力するか、スキップを押してください";return;
    }
    const correct=!skip&&isAccepted(q,answer);
    const related=!skip&&!correct&&isRelated(q,answer);
    const kind=correct?"correct":related?"related":"wrong";
    state.currentResult={questionId:q.questionId,answer:skip?"":answer,kind,decided:false,correct:false};
    el("answer-form").hidden=true;
    displayFeedback(q,state.currentResult.answer,kind);
    if(related){el("related-decision").hidden=false;}
    else commit(correct);
  }
  function commit(correct){
    const record=state.currentResult;
    if(!record||record.decided)return;
    record.decided=true;record.correct=correct;
    const q=state.picked[state.at];
    const before=stage(q.questionId);
    const prev=Object.prototype.hasOwnProperty.call(state.progress,q.questionId)?state.progress[q.questionId]:0;
    state.progress[q.questionId]=correct?Math.min(3,prev+1):0;
    saveProgress();
    const after=stage(q.questionId);
    state.answers.push({questionId:q.questionId,answer:record.answer,correct,kind:record.kind,before,after});
    renderMastery();el("related-decision").hidden=true;
    if(record.kind==="related"){
      el("feedback-heading").textContent=correct?"○ 自己判定：正解":"× 自己判定：ミス";
      el("feedback").className=`scv-feedback is-${correct?"correct":"wrong"}`;
    }
    el("next-btn").hidden=false;
    const pct=Math.round(100*(state.at+1)/state.picked.length);
    el("progress-fill").style.width=pct+"%";el("progress-bar").setAttribute("aria-valuenow",String(pct));
    el("next-btn").focus({preventScroll:true});
  }
  function next(){
    if(!state.currentResult?.decided)return;
    if(state.at===state.picked.length-1){renderResults();return;}
    state.at++;renderQuestion();
  }
  function renderResults(){
    const correctCount=state.answers.filter(a=>a.correct).length;
    const total=state.picked.length;
    el("score").textContent=`${correctCount} / ${total}問 正解`;
    el("score-percent").textContent=`正答率 ${Math.round(correctCount*100/total)}%`;
    el("score-sub").textContent="判定した問題の進捗は保存済みです。関連回答を自己判定した場合もその結果を反映しています。";
    const list=el("result-list");list.replaceChildren();
    for(let i=0;i<total;i++){
      const q=state.picked[i],a=state.answers[i];
      const li=make("li",`scv-result-item${a.correct?" is-correct":""}`);
      li.append(make("h3",null,`${i+1}. ${a.correct?"○ 正解":"× ミス"}　${setLabel(q)}`));
      li.append(make("p",a.correct?"scv-good":"scv-bad",`あなたの回答：${a.answer||"（スキップ）"}`));
      li.append(make("p","scv-subtle",`進捗：${STAGE_NAMES[a.before]} → ${STAGE_NAMES[a.after]}`));
      const details=make("details");details.open=!a.correct;
      details.append(make("summary",null,"問題文・正答・解説"));
      details.append(make("p","scv-result-prompt",q.prompt));
      details.append(make("p","scv-good",`正答：${q.answer}`));
      details.append(make("p",null,q.explanation));
      li.append(details);list.append(li);
    }
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
      const number=(spec.setNo-1)*50+i+1;
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
      const manifestUrl=new URL("../data/sc-vocab/manifest.json",location.href);
      const manifest=await fetchJSON(manifestUrl.href);
      if(!Array.isArray(manifest.sets)||manifest.sets.length!==4||manifest.totalQuestions!==200)
        throw Error("マニフェストのセット数・総問題数が不正です");
      const [files,related]=await Promise.all([
        Promise.all(manifest.sets.map(async spec=>({spec,data:await fetchJSON(new URL(spec.questionsUrl,manifestUrl).href)}))),
        fetchJSON(new URL(manifest.relatedAnswersUrl,manifestUrl).href)
      ]);
      const ids=new Set(),terms=new Set();
      files.sort((a,b)=>a.spec.setNo-b.spec.setNo);
      for(const {spec,data} of files){
        if(!Number.isInteger(spec.setNo)||spec.setNo<1||spec.setNo>4||state.sets.some(s=>s.setNo===spec.setNo))throw Error("回次の番号が不正です");
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
      state.progress=loadProgress();renderSetOptions();renderMastery();updateAvailability();
      el("data-status").textContent="4回×50問、全200問を読み込みました。";
    }catch(error){
      el("data-status").textContent="データを読み込めませんでした。";
      showError(`問題データの読込・検証に失敗しました：${error.message}\nGitHub PagesまたはローカルHTTPサーバで開いてください。`);
      el("start-btn").disabled=true;
    }
  }
  el("answer-form").addEventListener("submit",event=>{
    event.preventDefault();
    // A Japanese IME composition shouldn't submit an unfinished term.
    if(event.isComposing||state.currentResult||el("answer-form").hidden)return;
    submit(el("answer-input").value);
  });
  let composing=false;
  el("answer-input").addEventListener("compositionstart",()=>{composing=true;});
  el("answer-input").addEventListener("compositionend",()=>{composing=false;});
  el("answer-input").addEventListener("keydown",event=>{
    if(event.key==="Enter"&&(event.isComposing||composing||event.keyCode===229))event.preventDefault();
  });
  el("skip-answer").addEventListener("click",()=>submit("",true));
  el("related-accept").addEventListener("click",()=>commit(true));
  el("related-reject").addEventListener("click",()=>commit(false));
  el("start-btn").addEventListener("click",start);
  el("next-btn").addEventListener("click",next);
  el("reset-all").addEventListener("click",resetAll);
  el("exit-quiz").addEventListener("click",()=>{
    if(!window.confirm("演習を中断しますか？ 判定済みの設問の進捗は保存されています。未判定の回答は保存されません。"))return;
    showScreen("screen-start");renderMastery();updateAvailability();
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
