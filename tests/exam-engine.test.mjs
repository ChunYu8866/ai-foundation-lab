import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, normalizeState } from '../src/store.js';
import { filterQuestions, selectQuestions, recordAnswer, chooseAnswer, createSession, normalizeSession, sessionResults, isWeak, isMastered } from '../src/exam-engine.js';

const fixture=(id,code,extra={})=>({id,code,subject:code.startsWith('L11')?1:2,difficulty:'應用',prompt:`情境 ${id}`,options:['甲','乙','丙','丁'],answer:1,explanation:'解析與泛化',extension:'延伸資料',pitfall:'資料洩漏',tags:['召回率'],...extra});
const bank=[fixture('a','L11101'),fixture('b','L11101'),fixture('c','L11201'),fixture('d','L11201'),fixture('e','L12101'),fixture('f','L12101')];

test('filters combine subject, code, difficulty, learning status and explanation search',()=>{
  const state=emptyState();
  state.answers.a={selected:1,correct:true,date:'2026-10-31'};
  state.answers.c={selected:0,correct:false,date:'2026-10-31'};
  state.flagged=['b'];
  assert.deepEqual(filterQuestions(bank,{subject:'2'},state).map(q=>q.id),['e','f']);
  assert.deepEqual(filterQuestions(bank,{code:'L11101',status:'unseen'},state).map(q=>q.id),['b']);
  assert.deepEqual(filterQuestions(bank,{status:'weak'},state).map(q=>q.id),['b','c']);
  assert.deepEqual(filterQuestions(bank,{status:'flagged'},state).map(q=>q.id),['b']);
  assert.equal(filterQuestions(bank,{query:'泛化',difficulty:'應用'},state).length,6);
  assert.equal(filterQuestions(bank,{query:'不存在'},state).length,0);
  assert.equal(filterQuestions(bank,{difficulty:'進階'},state).length,0);
  const mixed=[...bank,fixture('m','L11101',{set:'material'})];
  assert.deepEqual(filterQuestions(mixed,{set:'material'},state).map(q=>q.id),['m']);
  assert.equal(filterQuestions(mixed,{set:'core'},state).length,bank.length);
});

test('practice selection spreads across topics and prioritizes unseen/weak items without repeats',()=>{
  const state=emptyState();
  for(const id of ['a','c','e']){state.answers[id]={selected:1,correct:true};state.questionStats[id]={attempts:2,correct:2,wrong:0,streak:2};}
  const selected=selectQuestions(bank,3,state,()=>0);
  assert.equal(new Set(selected.map(q=>q.code)).size,3);
  assert.deepEqual(selected.map(q=>q.id).sort(),['b','d','f']);
  assert.equal(selectQuestions(bank,'all',state,()=>0).length,bank.length);
  assert.equal(new Set(selectQuestions(bank,100,state).map(q=>q.id)).size,bank.length);
  assert.deepEqual(bank.map(q=>q.id),['a','b','c','d','e','f']);
  state.flagged=['a'];
  const afterFlag=selectQuestions(bank,3,state,()=>0);
  assert.ok(afterFlag.some(q=>q.id==='a'));
});

test('small quizzes grade immediately once, lock the answer and update confidence history',()=>{
  const state=emptyState(),question=bank[0],session=createSession([question],'快速練習');
  assert.equal(chooseAnswer(session,state,question,0,'2026-10-31'),true);
  assert.equal(state.answers.a.correct,false);
  assert.deepEqual(session.checked,['a']);
  assert.equal(chooseAnswer(session,state,question,1,'2026-10-31'),false);
  assert.equal(state.questionStats.a.attempts,1);
  assert.equal(session.choices.a,0);
  assert.ok(isWeak(question,state));
  recordAnswer(state,question,1,'2026-10-31');
  assert.equal(isMastered('a',state),false);
  recordAnswer(state,question,1,'2026-10-31');
  assert.equal(isMastered('a',state),true);
  state.flagged.push('a');
  assert.equal(isMastered('a',state),false);
  recordAnswer(state,question,2,'2026-10-31');
  assert.equal(state.questionStats.a.streak,0);
  assert.deepEqual(state.questionStats.a,{attempts:4,correct:2,wrong:2,streak:0});
});

test('custom simulation permits changing choices and defers grading until hand-in',()=>{
  const state=emptyState(),session=createSession(bank,'自訂模擬','exam',75,100000);
  assert.equal(session.deadline,4600000);
  chooseAnswer(session,state,bank[0],0,'2026-10-31');
  chooseAnswer(session,state,bank[0],1,'2026-10-31');
  assert.equal(session.choices.a,1);
  assert.deepEqual(state.answers,{});
  assert.deepEqual(session.checked,[]);
  const result=sessionResults(session,bank);
  assert.equal(result[0].correct,true);
  assert.equal(result[1].selected,null);
  assert.equal(result[1].correct,false);
  session.finished=true;
  assert.equal(chooseAnswer(session,state,bank[0],2,'2026-10-31'),false);
});

test('session restore preserves selected/checked answers and rejects stale or injected question lists',()=>{
  const state=emptyState(),session=createSession(bank,'進行中');
  chooseAnswer(session,state,bank[0],1,'2026-10-31');
  session.index=2;
  const restored=normalizeSession(JSON.parse(JSON.stringify(session)),bank);
  assert.deepEqual(restored,session);
  assert.equal(chooseAnswer(restored,state,bank[0],0,'2026-10-31'),false);
  assert.equal(normalizeSession({...session,ids:['unknown']},bank),null);
  assert.equal(normalizeSession({...session,ids:['a','a']},bank),null);
  assert.equal(normalizeSession({...session,version:9},bank),null);
  const invalid=normalizeSession({...session,index:99,choices:{a:8,b:0},checked:['a','b','unknown']},bank);
  assert.equal(invalid.index,5);
  assert.deepEqual(invalid.choices,{b:0});
  assert.deepEqual(invalid.checked,['b']);
});

test('old backups remain readable; flags/checklists/statistics survive new backups safely',()=>{
  const old=normalizeState({version:1,answers:{q01:{selected:1,correct:true,date:'2026-10-31'}}});
  assert.deepEqual(old.flagged,[]);
  assert.deepEqual(old.questionStats,{});
  const state=emptyState();state.flagged=['a'];state.topicChecks=['l11101-0'];
  recordAnswer(state,bank[0],1,'2026-10-31');
  assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(state))),state);
  const invalid=normalizeState({version:1,questionStats:{a:{attempts:0,correct:-1,wrong:1,streak:0},b:{correct:2,wrong:1,streak:9},c:{correct:2,wrong:1,streak:1}},flagged:['a','a',2]});
  assert.deepEqual(invalid.flagged,['a']);
  assert.deepEqual(invalid.questionStats,{c:{attempts:3,correct:2,wrong:1,streak:1}});
  assert.throws(()=>recordAnswer(state,bank[0],4,'2026-10-31'),RangeError);
});
