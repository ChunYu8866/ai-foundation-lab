import { shuffle } from './store.js';

export function isMastered(id, state) {
  return (state.questionStats?.[id]?.streak || 0) >= 2 && !(state.flagged || []).includes(id);
}

export function isWeak(question, state) {
  return (state.flagged || []).includes(question.id) || state.answers[question.id]?.correct === false;
}

export function filterQuestions(bank, filters, state) {
  const query = (filters.query || '').trim().toLocaleLowerCase();
  return bank.filter(q => {
    if (filters.subject && filters.subject !== 'all' && String(q.subject) !== filters.subject) return false;
    if (filters.code && filters.code !== 'all' && q.code !== filters.code) return false;
    if (filters.difficulty && filters.difficulty !== 'all' && q.difficulty !== filters.difficulty) return false;
    if (filters.set === 'material' && q.set !== 'material') return false;
    if (filters.set === 'core' && q.set === 'material') return false;
    if (filters.status === 'unseen' && state.answers[q.id]) return false;
    if (filters.status === 'weak' && !isWeak(q,state)) return false;
    if (filters.status === 'flagged' && !(state.flagged || []).includes(q.id)) return false;
    if (!query) return true;
    return [q.id,q.code,q.prompt,...q.options,q.explanation,q.extension,q.pitfall,...q.tags].join(' ').toLocaleLowerCase().includes(query);
  });
}

// Rotate across assessment topics; within each topic prioritize weak and unseen items.
export function selectQuestions(pool, count, state, random = Math.random) {
  const groups = new Map();
  for (const question of shuffle(pool,random)) {
    if(!groups.has(question.code)) groups.set(question.code,[]);
    groups.get(question.code).push(question);
  }
  const rank = q => isWeak(q,state) ? 0 : !state.answers[q.id] ? 1 : isMastered(q.id,state) ? 3 : 2;
  for(const group of groups.values()) group.sort((a,b)=>rank(a)-rank(b));
  const codes = shuffle([...groups.keys()],random);
  const selected=[];
  const limit = Math.min(count === 'all' ? pool.length : Number(count),pool.length);
  while(selected.length < limit) {
    let added=false;
    for(const code of codes) {
      const q=groups.get(code).shift();
      if(q){selected.push(q);added=true;}
      if(selected.length>=limit) break;
    }
    if(!added) break;
  }
  return selected;
}

export function recordAnswer(state, question, selected, date) {
  if(!Number.isInteger(selected) || selected<0 || selected>3) throw new RangeError('答案選項超出範圍');
  const correct=selected===question.answer;
  state.answers[question.id]={selected,correct,date};
  state.questionStats ||= {};
  const previous=state.questionStats[question.id] || {attempts:0,correct:0,wrong:0,streak:0};
  state.questionStats[question.id]={attempts:previous.attempts+1,correct:previous.correct+(correct?1:0),wrong:previous.wrong+(correct?0:1),streak:correct?previous.streak+1:0};
  return correct;
}

export function chooseAnswer(session,state,question,selected,date) {
  if(!session || session.finished || !session.ids.includes(question.id)) return false;
  if(!Number.isInteger(selected) || selected<0 || selected>3) return false;
  if(session.mode==='learn' && session.checked.includes(question.id)) return false;
  session.choices[question.id]=selected;
  if(session.mode==='learn') {
    recordAnswer(state,question,selected,date);
    session.checked.push(question.id);
  }
  return true;
}

export function createSession(items,label,mode='learn',minutes=75,now=Date.now()) {
  return {version:2,ids:items.map(q=>q.id),label,mode,index:0,choices:{},checked:[],finished:false,deadline:mode==='exam'?now+minutes*60000:null};
}

export function normalizeSession(data,bank) {
  if(!data || data.version!==2 || !['learn','exam'].includes(data.mode) || !Array.isArray(data.ids)) return null;
  const known=new Set(bank.map(q=>q.id));
  const ids=[...new Set(data.ids.filter(id=>known.has(id)))].slice(0,500);
  // A changed/malformed question list must not silently change an in-progress exam.
  if(!ids.length || ids.length!==data.ids.length) return null;
  const choices={};
  for(const id of ids) if(Number.isInteger(data.choices?.[id]) && data.choices[id]>=0 && data.choices[id]<4) choices[id]=data.choices[id];
  const checked=[...new Set((Array.isArray(data.checked)?data.checked:[]).filter(id=>ids.includes(id) && Object.hasOwn(choices,id)))];
  return {version:2,ids,label:typeof data.label==='string'?data.label.slice(0,150):'觀念練習',mode:data.mode,index:Math.min(Math.max(Number.isInteger(data.index)?data.index:0,0),ids.length-1),choices,checked,finished:data.finished===true,deadline:data.mode==='exam' && Number.isFinite(data.deadline) && data.deadline>0?data.deadline:null};
}

export function sessionResults(session,bank) {
  const byId=new Map(bank.map(q=>[q.id,q]));
  return session.ids.map(id=>({question:byId.get(id),selected:session.choices[id]??null,correct:session.choices[id]===byId.get(id).answer}));
}
