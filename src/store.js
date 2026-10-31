export const STORAGE_KEY = 'zhixu-ai-v1';
export function emptyState() {
  return {version:1,completed:[],notes:{},answers:{},known:[],activity:[],lastLesson:null,flagged:[],topicChecks:[],questionStats:{}};
}
export function normalizeState(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1) throw new Error('不支援的備份格式');
  const clean = emptyState();
  for (const key of ['completed','known','activity','flagged','topicChecks']) clean[key] = [...new Set((Array.isArray(data[key]) ? data[key] : []).filter(v => typeof v === 'string' && v.length < 100))];
  for (const [id,note] of Object.entries(data.notes || {})) if (/^[a-z0-9-]+$/.test(id) && typeof note === 'string') clean.notes[id] = note.slice(0,20000);
  for (const [id,answer] of Object.entries(data.answers || {})) if (/^[a-z0-9-]+$/.test(id) && answer && typeof answer === 'object' && Number.isInteger(answer.selected) && answer.selected >= 0 && answer.selected < 4) clean.answers[id] = {selected:answer.selected,correct:answer.correct === true,date:typeof answer.date === 'string'?answer.date:''};
  clean.lastLesson = typeof data.lastLesson === 'string' && /^[a-z0-9-]+$/.test(data.lastLesson) ? data.lastLesson : null;
  for(const [id,stats] of Object.entries(data.questionStats || {})) {
    if(!/^[a-z0-9-]+$/.test(id) || !stats || typeof stats!=='object') continue;
    const valid=n=>Number.isInteger(n) && n>=0 && n<=1000000;
    if(![stats.correct,stats.wrong,stats.streak].every(valid)) continue;
    const attempts=stats.correct+stats.wrong;
    if(attempts>1000000 || stats.streak>stats.correct) continue;
    clean.questionStats[id]={attempts,correct:stats.correct,wrong:stats.wrong,streak:stats.streak};
  }
  return clean;
}
export function readState(storage) {
  try {const raw = storage.getItem(STORAGE_KEY);return raw ? normalizeState(JSON.parse(raw)) : emptyState();} catch {return emptyState();}
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function streak(activity, today = new Date()) {
  const dates = new Set(activity);
  const day = new Date(today.getFullYear(),today.getMonth(),today.getDate());
  if (!dates.has(localDate(day))) day.setDate(day.getDate()-1);
  let count=0;
  while(dates.has(localDate(day))){count++;day.setDate(day.getDate()-1);}
  return count;
}
export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}
