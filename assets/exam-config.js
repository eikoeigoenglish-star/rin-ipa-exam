// Central registry for future study modules. All paths are relative to each page.
// On GitHub Pages /ipa-exam/a1/, the A-1 JSON is served from ../data/a1/questions.json.
window.IPA_EXAM_CONFIG = Object.freeze({
  a1: Object.freeze({
    title: "共通 科目A-1",
    enabled: true,
    questionUrl: "../data/a1/questions.json",
    expectedQuestionCount: 600,
    storageKey: "ipa-a1-common-progress-v1" // Keep V5.2 progress intact on the same origin.
  }),
  scA2: Object.freeze({ enabled: false, dataDirectory: "data/sc-a2/" }),
  scB: Object.freeze({ enabled: false, dataDirectory: "data/sc-b/" }),
  pdAiA2: Object.freeze({ enabled: false, dataDirectory: "data/pd-ai-a2/" }),
  pdAiB: Object.freeze({ enabled: false, dataDirectory: "data/pd-ai-b/" })
});
