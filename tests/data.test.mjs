import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { modules, questions, glossary, references } from '../src/content.js';

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

test('36 original questions have valid answer choices and consistent module/lesson references', () => {
  assert.equal(questions.length, 36);
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
  }
  for (const lesson of lessons) {
    assert.ok(questions.some(q => q.lessonId === lesson.id), `no practice for ${lesson.id}`);
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
