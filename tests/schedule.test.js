import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDayBlocks, toMinutes } from '../schedule.js';

test('수업 사이 미배정 구간은 시작 및 종료 시각과 일치한다', () => {
  const blocks = buildDayBlocks([
    { start: '13:00', end: '14:30', title: '오후 수업' },
    { start: '09:00', end: '10:30', title: '오전 수업' },
  ], 540, 1080);
  assert.deepEqual(blocks.map(({ start, end, kind }) => [start, end, kind]), [
    [540, 630, 'lesson'], [630, 780, 'gap'], [780, 870, 'lesson'], [870, 1080, 'gap'],
  ]);
});

test('연속 수업 사이에 가짜 미배정 시간을 만들지 않는다', () => {
  const blocks = buildDayBlocks([
    { start: '09:00', end: '10:00', title: '첫 수업' },
    { start: '10:00', end: '11:00', title: '다음 수업' },
  ], 540, 1080);
  assert.deepEqual(blocks.filter(block => block.kind === 'gap'), [
    { start: 660, end: 1080, kind: 'gap', title: '수업 미배정' },
  ]);
});

test('확인된 요일에 수업이 없으면 표시 범위 전체가 미배정이다', () => {
  assert.deepEqual(buildDayBlocks([], 540, 1080), [
    { start: 540, end: 1080, kind: 'gap', title: '수업 미배정' },
  ]);
});

test('표시 범위 밖 수업을 자르고 경계의 미배정 구간을 계산한다', () => {
  const blocks = buildDayBlocks([
    { start: '08:00', end: '10:00', title: '이른 수업' },
    { start: '17:00', end: '19:00', title: '늦은 수업' },
    { start: '20:00', end: '21:00', title: '범위 밖 수업' },
  ], 540, 1080);
  assert.deepEqual(blocks.map(({ start, end, kind }) => [start, end, kind]), [
    [540, 600, 'lesson'], [600, 1020, 'gap'], [1020, 1080, 'lesson'],
  ]);
});

test('잘못된 시간과 겹치는 수업은 오류로 처리한다', () => {
  assert.throws(() => toMinutes('25:00'));
  assert.throws(() => toMinutes('09:75'));
  assert.throws(() => buildDayBlocks([{ start: '11:00', end: '10:00' }], 540, 1080));
  assert.throws(() => buildDayBlocks([
    { start: '09:00', end: '11:00' }, { start: '10:00', end: '12:00' },
  ], 540, 1080));
});
