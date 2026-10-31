import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { modules, questions, glossary, references, topics, examReferences } from '../src/content.js';

const sources = JSON.parse(await readFile(new URL('../src/sources.json', import.meta.url), 'utf8'));
const videos = sources.playlists.flatMap(p => p.videos);
const videoIds = new Set(videos.map(v => v.id));
const moduleIds = new Set(modules.map(m => m.id));
const lessons = modules.flatMap(m => m.lessons.map(l => ({ ...l, moduleId: m.id })));
const lessonById = new Map(lessons.map(l => [l.id, l]));

test('both supplied playlists retain all 17 unique videos in source order', () => {
  assert.deepEqual(sources.playlists.map(p => p.id), [
    'PLwGaDBtzBoU9gjO2xGFxpA_VhYICZZVvj',
    'PLwGaDBtzBoU-S9AfCdiBlDmV1aVuTqqXu'
  ]);
  assert.equal(sources.totalVideos, 17);
  assert.equal(videos.length, 17);
  assert.equal(videoIds.size, 17);
  assert.deepEqual(sources.playlists.map(p => p.videoCount), [10, 7]);
  for (const playlist of sources.playlists) {
    assert.equal(playlist.complete, true);
    assert.equal(playlist.videos.length, playlist.videoCount);
    assert.deepEqual(playlist.videos.map(v => v.playlistIndex),
      Array.from({ length: playlist.videoCount }, (_, i) => i + 1));
    assert.equal(playlist.totalDurationSeconds,
      playlist.videos.reduce((sum, v) => sum + v.durationSeconds, 0));
    for (const video of playlist.videos) {
      assert.match(video.id, /^[A-Za-z0-9_-]{11}$/);
      const watch = new URL(video.url);
      assert.equal(watch.hostname, 'www.youtube.com');
      assert.equal(watch.searchParams.get('v'), video.id);
      assert.equal(watch.searchParams.get('list'), playlist.id);
      assert.equal(new URL(video.embedUrl).pathname, `/embed/${video.id}`);
      const [minutes, seconds] = video.duration.split(':').map(Number);
      assert.equal(video.durationSeconds, minutes * 60 + seconds);
    }
  }
  assert.equal(sources.totalDurationSeconds,
    videos.reduce((sum, v) => sum + v.durationSeconds, 0));
});

test('the curriculum has unique modules and lessons, with complete lesson structure', () => {
  assert.equal(modules.length, 6);
  assert.equal(moduleIds.size, modules.length);
  assert.equal(lessons.length, 12);
  assert.equal(lessonById.size, lessons.length);
  for (const module of modules) {
    assert.ok([1, 2].includes(module.subject));
    assert.ok(module.lessons.length > 0);
    for (const lesson of module.lessons) {
      assert.ok(Number.isFinite(lesson.minutes) && lesson.minutes > 0);
      assert.equal(lesson.objectives.length, 3);
      assert.equal(lesson.sections.length, 3);
      assert.ok(lesson.videoIds.length > 0);
      for (const section of lesson.sections) {
        assert.ok(section.title && section.body && section.example);
      }
      assert.ok(lesson.intro && lesson.takeaway);
      for (const id of lesson.videoIds) assert.ok(videoIds.has(id), `unknown video ${id}`);
    }
  }
});

test('all 16 topical videos are mapped to lessons; exam-sharing video remains a source', () => {
  const examSharingId = 'c-zDrEi-2YM';
  assert.ok(videoIds.has(examSharingId));
  const mapped = new Set(lessons.flatMap(l => l.videoIds));
  const topical = new Set(videos.filter(v => v.id !== examSharingId).map(v => v.id));
  assert.equal(mapped.size, 16);
  assert.deepEqual([...mapped].sort(), [...topical].sort());
});

test('351 detailed questions have valid choices, traceable sources and consistent lesson references', () => {
  assert.equal(questions.length, 351);
  const topicCodes=new Set(topics.map(t=>t.code));
  const referenceIds=new Set(examReferences.map(r=>r.id));
  assert.equal(new Set(questions.map(q => q.id)).size, questions.length);
  for (const question of questions) {
    assert.ok(moduleIds.has(question.moduleId), `unknown module ${question.moduleId}`);
    const lesson = lessonById.get(question.lessonId);
    assert.ok(lesson, `unknown lesson ${question.lessonId}`);
    assert.equal(lesson.moduleId, question.moduleId);
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options).size, 4);
    assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4);
    assert.ok(question.prompt && question.explanation);
    assert.ok(topicCodes.has(question.code),`unknown assessment code ${question.code}`);
    assert.equal(question.subject,question.code.startsWith('L11')?1:2);
    assert.ok(['基礎','應用','進階'].includes(question.difficulty));
    assert.ok(['觀念','情境','計算','比較'].includes(question.type));
    assert.equal(question.optionExplanations.length,4);
    for(const text of question.optionExplanations) assert.ok(text.length>=20,`${question.id}: option explanation too short`);
    assert.ok(question.explanation.length>=70,`${question.id}: insufficient reasoning`);
    assert.ok(question.extension.length>=35,`${question.id}: missing extended learning`);
    assert.ok(question.pitfall.length>=12 && question.memoryTip.length>=8,`${question.id}: missing misconception or memory cue`);
    assert.ok(question.tags.length>=2);
    assert.ok(question.referenceIds.length>0);
    for(const id of question.referenceIds)assert.ok(referenceIds.has(id),`${question.id}: missing source ${id}`);
  }
  for (const lesson of lessons) {
    assert.ok(questions.some(q => q.lessonId === lesson.id), `no practice for ${lesson.id}`);
  }
});

test('all 16 official reference topics receive 15 new questions across three difficulty levels',()=>{
  const expected=['L11101','L11102','L11201','L11202','L11203','L11301','L11302','L11401','L11402','L12101','L12102','L12201','L12202','L12301','L12302','L12303'];
  assert.deepEqual(topics.map(t=>t.code),expected);
  for(const topic of topics){
    const items=questions.filter(q=>q.code===topic.code&&q.id.startsWith('ex-'));
    assert.equal(items.length,15,topic.code);
    assert.deepEqual(['基礎','應用','進階'].map(level=>items.filter(q=>q.difficulty===level).length),[5,6,4],topic.code);
    assert.ok(items.filter(q=>['情境','計算'].includes(q.type)).length>=6,`${topic.code}: insufficient scenario practice`);
    assert.ok(topic.summary.length>=150);
    assert.ok(topic.essentials.length>=5 && topic.contrasts.length>=1 && topic.checklist.length>=3);
    for(const id of topic.lessonIds)assert.ok(lessonById.has(id));
    for(const id of topic.referenceIds)assert.ok(examReferences.some(r=>r.id===id));
  }
  assert.ok(questions.filter(q=>q.type==='計算').length>=9);
  assert.equal(new Set(questions.map(q=>q.prompt)).size,questions.length,'duplicate prompts');
});

test('primary-level material questions cover every topic with original items and study points',()=>{
  const material=questions.filter(q=>q.set==='material');
  assert.equal(material.length,75);
  for(const q of material)assert.match(q.id,/^mt-l1\d{4}-\d{2}$/);
  for(const topic of topics){
    assert.ok(material.filter(q=>q.code===topic.code).length>=4,`${topic.code}: needs material questions`);
    assert.ok(topic.materialPoints.length>=4,`${topic.code}: needs study points`);
  }
  const positions=[0,1,2,3].map(i=>material.filter(q=>q.answer===i).length);
  assert.ok(Math.min(...positions)>=12,`answer positions unbalanced: ${positions}`);
});

test('original question IDs, options and correct indices remain unchanged for saved progress',async()=>{
  const legacy=JSON.parse(await readFile(new URL('./fixtures/legacy-questions.json',import.meta.url),'utf8'));
  for(const original of legacy){
    const current=questions.find(q=>q.id===original.id);
    assert.ok(current,original.id);
    for(const key of ['id','moduleId','lessonId','prompt','options','answer'])assert.deepEqual(current[key],original[key],`${original.id}: changed ${key}`);
  }
});

test('knowledge cards and primary reference links are valid', () => {
  assert.equal(glossary.length, 24);
  assert.equal(new Set(glossary.map(g => g.term)).size, glossary.length);
  for (const card of glossary) {
    assert.ok(moduleIds.has(card.moduleId));
    assert.ok(card.term && card.en && card.definition);
  }
  for (const reference of references) {
    assert.equal(new URL(reference.url).protocol, 'https:');
    assert.ok(reference.title && reference.topics.length);
  }
});
