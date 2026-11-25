/* SC Vocabulary Guide V5.11: read-only, no scoring or persistence. */
(() => {
  "use strict";
  const DATA_URL = "../data/sc-vocab/sc-vocab-guide-200.json";
  const PAGE_SIZE = 20;
  const DIFFICULTY = {basic:"基礎",standard:"標準",advanced:"高度"};
  const $ = (id) => document.getElementById(id);
  const state = {entries:[], page:1, pages:10};

  function elt(tag, className, value) {
    const node=document.createElement(tag);
    if (className) node.className=className;
    if (value!==undefined) node.textContent=String(value);
    return node;
  }
  function readPageFromURL() {
    const raw=new URLSearchParams(window.location.search).get("page");
    const n=raw===null?1:Number(raw);
    return Number.isInteger(n)&&n>=1&&n<=state.pages?n:1;
  }
  function setPage(next, {history=true, scroll=true}={}) {
    if (!state.entries.length || !Number.isInteger(next) || next<1 || next>state.pages) return;
    state.page=next;
    if(history){
      const url=new URL(window.location.href);
      if(next===1)url.searchParams.delete("page");
      else url.searchParams.set("page",String(next));
      window.history.pushState({vocabPage:next},"",url.pathname+url.search+url.hash);
    }
    render();
    if(scroll)window.scrollTo({top:0,behavior:"auto"});
  }
  function pageButtons(target) {
    const nav=elt("div","guide-page-nav");
    for(let p=1;p<=state.pages;p++){
      const button=elt("button","guide-page-button",String(p));
      button.type="button";
      button.setAttribute("aria-label",`第${p}ページを表示`);
      if(p===state.page)button.setAttribute("aria-current","page");
      button.addEventListener("click",()=>setPage(p));
      nav.append(button);
    }
    target.append(nav);
  }
  function renderControls() {
    const top=$("page-nav-top");top.replaceChildren();
    for(let p=1;p<=state.pages;p++){
      const button=elt("button","guide-page-button",String(p));
      button.type="button";
      button.setAttribute("aria-label",`第${p}ページを表示`);
      if(p===state.page)button.setAttribute("aria-current","page");
      button.addEventListener("click",()=>setPage(p));
      top.append(button);
    }
    const bottom=$("page-nav-bottom");bottom.replaceChildren();
    pageButtons(bottom);
    const controls=elt("div","guide-paging-controls");
    const prev=elt("button","guide-step","← 前の20語");
    prev.type="button";prev.disabled=state.page===1;
    prev.addEventListener("click",()=>setPage(state.page-1));
    const count=elt("span","guide-page-meta",`${state.page} / ${state.pages} ページ`);
    const next=elt("button","guide-step","次の20語 →");
    next.type="button";next.disabled=state.page===state.pages;
    next.addEventListener("click",()=>setPage(state.page+1));
    controls.append(prev,count,next);
    bottom.append(controls);
  }
  function addSection(card,title,content,className) {
    const section=elt("section",`term-block ${className}`);
    section.append(elt("h4","term-block-heading",title));
    section.append(elt("p","",content));
    card.append(section);
  }
  function addReferences(card,urls) {
    const valid=urls.filter(url=>{
      try{return ["https:","http:"].includes(new URL(url).protocol);}
      catch(_){return false;}
    });
    if(!valid.length)return;
    const details=elt("details","reference-area");
    const summary=elt("summary","",`参考資料（${valid.length}件）`);
    const list=elt("ul","reference-list");
    for(const [index,url] of valid.entries()){
      const li=elt("li","");const a=elt("a","",`資料${index+1}：${url}`);
      a.href=url;a.target="_blank";a.rel="noopener noreferrer";
      li.append(a);list.append(li);
    }
    details.append(summary,list);card.append(details);
  }
  function renderTerms(){
    const start=(state.page-1)*PAGE_SIZE;
    const group=state.entries.slice(start,start+PAGE_SIZE);
    const list=$("term-list");list.replaceChildren();
    list.start=start+1;
    const fragment=document.createDocumentFragment();
    for(const item of group){
      const li=elt("li","term-card");li.id=`term-${String(item.number).padStart(3,"0")}`;
      const top=elt("div","term-top");
      const titleGroup=elt("div","term-title-group");
      titleGroup.append(elt("span","term-num",String(item.number).padStart(3,"0")));
      titleGroup.append(elt("h3","term-name",item.term));
      const tags=elt("div","term-tags");
      tags.append(elt("span","term-tag",item.category));
      tags.append(elt("span",`term-tag difficulty-${item.difficulty}`,DIFFICULTY[item.difficulty]));
      top.append(titleGroup,tags);li.append(top);
      addSection(li,"定義",item.definition,"definition");
      addSection(li,"詳しい解説",item.explanation,"explanation");
      addSection(li,"類似語との違い",item.distinction,"distinction");
      addReferences(li,item.referenceUrls);
      fragment.append(li);
    }
    list.append(fragment);
    $("entries-title").textContent=`第${state.page}ページの20語`;
    $("range-count").textContent=`${start+1}〜${start+group.length} / ${state.entries.length}語`;
    $("page-count").textContent=`第${state.page}ページ・${start+1}〜${start+group.length}語`;
    document.title=`SC用語解説 第${state.page}ページ｜専門用語200語`;
  }
  function render(){renderControls();renderTerms();}
  async function init(){
    try{
      const response=await fetch(DATA_URL,{cache:"no-store"});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      const items=data.entries;
      if(!Array.isArray(items)||data.totalTerms!==200||data.termsPerPage!==PAGE_SIZE||items.length!==200){
        throw new Error("用語数またはページ構成が正しくありません");
      }
      if(new Set(items.map(t=>t.questionId)).size!==200 || new Set(items.map(t=>t.termId)).size!==200){
        throw new Error("用語IDが重複しています");
      }
      if(items.some((t,i)=>t.number!==i+1||!["basic","standard","advanced"].includes(t.difficulty)||
        !["term","definition","explanation","distinction","category"].every(k=>typeof t[k]==="string"&&t[k].trim())||
        !Array.isArray(t.referenceUrls))){
        throw new Error("用語データに欠損があります");
      }
      state.entries=items;state.pages=Math.ceil(items.length/PAGE_SIZE);
      state.page=readPageFromURL();
      $("guide-status").hidden=true;
      render();
      window.addEventListener("popstate",()=>setPage(readPageFromURL(),{history:false,scroll:true}));
    }catch(error){
      const status=$("guide-status");
      status.classList.add("is-error");
      status.textContent=`用語データを読み込めませんでした。Webサーバ経由でページを開いてください。（${error.message}）`;
      $("page-count").textContent="読込エラー";
    }
  }
  init();
})();
