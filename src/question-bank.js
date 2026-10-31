import { foundationQuestions, foundationTopics, foundationReferences } from './exam-foundations.js';
import { modelQuestions, modelTopics, modelReferences } from './exam-models.js';
import { applicationQuestions, applicationTopics, applicationReferences } from './exam-applications.js';
import { materialQuestionsS1, materialPointsS1, materialReferencesS1 } from './exam-materials-s1.js';
import { materialQuestionsS2, materialPointsS2, materialReferencesS2 } from './exam-materials-s2.js';

export const questions = [...foundationQuestions,...modelQuestions,...applicationQuestions,...materialQuestionsS1,...materialQuestionsS2].sort((a,b)=>a.id.localeCompare(b.id));
const materialPoints = {...materialPointsS1,...materialPointsS2};
export const topics = [...foundationTopics,...modelTopics,...applicationTopics].sort((a,b)=>a.code.localeCompare(b.code)).map(topic=>({...topic,materialPoints:materialPoints[topic.code]||[]}));
const referenceMap = new Map([...foundationReferences,...modelReferences,...applicationReferences,...materialReferencesS1,...materialReferencesS2].map(reference=>[reference.id,reference]));
referenceMap.set('ipas-11506',{id:'ipas-11506',title:'iPAS 官方 · 評鑑內容範圍參考（115.06）',url:'https://www.ipas.org.tw/api/proxy/uploads/certification_attachment/8039a24c849c4fb4a6dd7f942576d4f8/AI應用規劃師能力鑑定_評鑑內容範圍參考_11506_20260602161501.pdf'});
export const examReferences = [...referenceMap.values()];
export const examInfo = {version:'115.06',checked:'2026-10-31',officialUrl:referenceMap.get('ipas-11506').url};
