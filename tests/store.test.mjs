import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  STORAGE_KEY, emptyState, normalizeState, readState, localDate, streak, shuffle
} from '../src/store.js';

test('missing, malformed, unsupported and unavailable storage safely start fresh', () => {
  const values = [null, '', 'not JSON', '{', 'null', '[]', '{"version":2}', '{"version":"1"}'];
  for (const raw of values) {
    const storage = { getItem(key) { assert.equal(key, STORAGE_KEY); return raw; } };
    assert.deepEqual(readState(storage), emptyState());
  }
  assert.deepEqual(readState({ getItem() { throw new Error('Storage blocked'); } }), emptyState());
  assert.deepEqual(readState(undefined), emptyState());
  const first = readState({ getItem: () => null });
  first.completed.push('ai-basics');
  first.notes['ai-basics'] = 'first tab';
  const second = readState({ getItem: () => null });
  assert.deepEqual(second.completed, []);
  assert.deepEqual(second.notes, {});
});

test('backup normalization rejects unsupported top-level shapes and versions', () => {
  for (const value of [undefined, null, false, 1, 'text', [], {}, { version: 0 }, { version: 2 }, { version: '1' }]) {
    assert.throws(() => normalizeState(value), /不支援的備份格式/);
  }
  assert.deepEqual(normalizeState({ version: 1 }), emptyState());
});

test('valid notes and progress survive storage round trips without modifying input', () => {
  const original = {
    version: 1,
    completed: ['ai-basics', 'ai-basics'],
    notes: { 'ai-basics': '第一行\n第二行：我的理解 <script>alert("test")</script> & symbols' },
    answers: { q01: { selected: 1, correct: true, date: '2026-10-31' } },
    known: ['人工智慧'], activity: ['2026-10-31'], lastLesson: 'ai-basics'
  };
  const before = structuredClone(original);
  const normalized = normalizeState(original);
  assert.deepEqual(original, before);
  assert.equal(normalized.notes['ai-basics'], original.notes['ai-basics']);
  assert.deepEqual(normalized.completed, ['ai-basics']);
  assert.deepEqual(normalized.answers.q01, original.answers.q01);
  const restored = readState({ getItem: () => JSON.stringify(normalized) });
  assert.deepEqual(restored, normalized);
  restored.completed.push('ai-governance');
  assert.deepEqual(normalized.completed, ['ai-basics']);
});

test('untrusted backup fields cannot pollute prototypes or inject arbitrary answer objects', () => {
  const malicious = JSON.parse('{"version":1,"notes":{"__proto__":{"polluted":true},"safe-note":"可保留","bad/id":"不可保留"},"answers":{"__proto__":{"polluted":true},"q01":{"selected":1,"correct":true,"date":"2026-10-31","extra":{"polluted":true}},"q02":{"selected":8,"correct":true}},"completed":["ai-basics",null,42],"lastLesson":"../unsafe"}');
  const cleaned = normalizeState(malicious);
  assert.equal(Object.getPrototypeOf(cleaned.notes), Object.prototype);
  assert.equal(Object.getPrototypeOf(cleaned.answers), Object.prototype);
  assert.equal(Object.hasOwn(cleaned.notes, '__proto__'), false);
  assert.equal(Object.hasOwn(cleaned.answers, '__proto__'), false);
  assert.equal(({}).polluted, undefined);
  assert.deepEqual(cleaned.notes, { 'safe-note': '可保留' });
  assert.deepEqual(cleaned.answers, { q01: { selected: 1, correct: true, date: '2026-10-31' } });
  assert.deepEqual(cleaned.completed, ['ai-basics']);
  assert.equal(cleaned.lastLesson, null);
});

test('invalid optional import values are discarded while valid entries remain', () => {
  const cleaned = normalizeState({
    version: 1,
    notes: { good: '我的筆記', number: 42, 'bad/key': 'discard' },
    answers: {
      q01: { selected: 0, correct: 'true', date: null },
      q02: { selected: -1 }, q03: { selected: 1.5 }, q04: { selected: '1' }
    },
    known: ['人工智慧', '人工智慧', 17], activity: null, completed: null
  });
  assert.deepEqual(cleaned.notes, { good: '我的筆記' });
  assert.deepEqual(cleaned.answers, { q01: { selected: 0, correct: false, date: '' } });
  assert.deepEqual(cleaned.known, ['人工智慧']);
  assert.deepEqual(cleaned.activity, []);
  assert.deepEqual(cleaned.completed, []);
});

test('localDate formats the local calendar date with padded components', () => {
  assert.equal(localDate(new Date(2026, 0, 2, 23, 59, 59)), '2026-01-02');
  assert.equal(localDate(new Date(2026, 9, 31, 0, 0, 0)), '2026-10-31');
});

test('streak counts consecutive study days across month, year and leap-day boundaries', () => {
  assert.equal(streak(['2026-10-30', '2026-10-31', '2026-11-01'], new Date(2026, 10, 1, 13)), 3);
  assert.equal(streak(['2026-12-30', '2026-12-31', '2027-01-01'], new Date(2027, 0, 1, 0, 15)), 3);
  assert.equal(streak(['2028-02-28', '2028-02-29', '2028-03-01'], new Date(2028, 2, 1)), 3);
});

test('yesterday keeps a streak active; gaps, duplicates and unrelated future dates do not extend it', () => {
  const today = new Date(2026, 9, 31, 18, 30);
  assert.equal(streak(['2026-10-29', '2026-10-30'], today), 2);
  assert.equal(streak(['2026-10-28', '2026-10-30', '2026-10-30', '2026-11-01'], today), 1);
  assert.equal(streak(['2026-10-29'], today), 0);
  assert.equal(streak(['2026-11-01'], today), 0);
  assert.equal(streak([], today), 0);
  const originalTime = today.getTime();
  streak(['2026-10-30'], today);
  assert.equal(today.getTime(), originalTime);
});

test('calendar day and streak follow Asia/Taipei at a UTC date boundary', () => {
  const moduleUrl = new URL('../src/store.js', import.meta.url).href;
  const script = `import { localDate, streak } from ${JSON.stringify(moduleUrl)}; const now = new Date('2026-12-31T16:30:00Z'); process.stdout.write(JSON.stringify({date:localDate(now),streak:streak(['2026-12-31','2027-01-01'],now)}));`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    env: { ...process.env, TZ: 'Asia/Taipei' }, encoding: 'utf8'
  });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), { date: '2027-01-01', streak: 2 });
});

test('shuffle returns a separate permutation and never mutates the input', () => {
  const input = Object.freeze(['a', 'b', 'c', 'd']);
  const result = shuffle(input, () => 0);
  assert.notStrictEqual(result, input);
  assert.deepEqual(input, ['a', 'b', 'c', 'd']);
  assert.deepEqual([...result].sort(), [...input].sort());
  assert.notDeepEqual(result, input);
  assert.deepEqual(shuffle([], () => 0), []);
  assert.deepEqual(shuffle(['only'], () => 0), ['only']);
  const duplicateInput = ['a', 'a', 'b'];
  assert.deepEqual(shuffle(duplicateInput, () => 0).sort(), duplicateInput.toSorted());
  const first = { id: 1 }, second = { id: 2 };
  const objectResult = shuffle([first, second], () => 0);
  assert.ok(objectResult.includes(first) && objectResult.includes(second));
});
