// Central registry for future study modules. All paths are relative to each page.
// On GitHub Pages /ipa-exam/a1/, the A-1 JSON is served from ../data/a1/questions.json.
window.IPA_EXAM_CONFIG = Object.freeze({
  a1: Object.freeze({
    title: "共通 科目A-1",
    enabled: true,
    questionUrl: "../data/a1/questions.json",
    expectedQuestionCount: 600,
    maxQuestionNumber: 30,
    sourceExamLabel: "高度試験 午前Ⅰ",
    storageKey: "ipa-a1-common-progress-v1" // Keep V5.2 progress intact on the same origin.
  }),
  scA2: Object.freeze({
    title: "SC 科目A-2", enabled: true,
    questionUrl: "../data/sc-a2/questions.json", expectedQuestionCount: 500,
    maxQuestionNumber: 25, sourceExamLabel: "SC 午前Ⅱ",
    storageKey: "ipa-sc-a2-progress-v1"
  }),
  scB: Object.freeze({ enabled: true, moduleKind: "case-mock", dataDirectory: "data/sc-b/", storageKey: "ipa-sc-b-progress-v1" }),
  pdAiA2: Object.freeze({
    title: "プロフェッショナル（データ・AI） 科目A-2", enabled: true,
    moduleKind: "original-mock", questionUrl: "../../data/pd-ai-a2/questions.json",
    expectedQuestionCount: 230, maxQuestionNumber: 23,
    sourceExamLabel: "オリジナル予想問題", storageKey: "ipa-pd-ai-a2-progress-v2",
    fields: Object.freeze([
      {id:"data-management",label:"データマネジメント"},
      {id:"data-analytics",label:"データ分析・データ利活用"},
      {id:"ai-application",label:"AI利活用"},
      {id:"cloud",label:"クラウド"},
      {id:"database",label:"データベース"},
      {id:"ai-technology",label:"AI技術"},
      {id:"algorithms",label:"アルゴリズム・プログラミング"},
      {id:"privacy",label:"プライバシー関連法規"}
    ])
  }),
  pdAiB: Object.freeze({ enabled: false, dataDirectory: "data/pd-ai-b/" })
});
