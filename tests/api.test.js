import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi, normalizeLessons } from '../api.js';

const building = '다니엘관/요한관';
const room = '101호';
const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });

test('실제 백엔드의 건물·강의실 응답 및 한글 쿼리를 사용한다', async () => {
  const api = createApi('http://localhost:8080/', async url => {
    if (url.pathname === '/api/buildings') return json({ buildings: [{ name: building, rooms: 1 }], counts: {} });
    assert.equal(url.pathname, '/api/rooms');
    assert.equal(url.searchParams.get('building'), building);
    return json({ building, now: '2026-11-18T00:00:00Z', rooms: [{ name: room, status: 'unknown' }] });
  });
  assert.deepEqual(await api.buildings(), [{ id: building, name: building }]);
  assert.deepEqual(await api.rooms(building), [{ id: room, name: room }]);
});

test('중첩 slot의 연속 교시를 시각으로 변환하고 자정 범위를 지킨다', () => {
  const actual = normalizeLessons([
    { title: '자료구조', slot: { day: 1, first: 1, last: 3 } },
    { title: '야간수업', slot: { day: 5, first: 15, last: 16 } },
    { title: '자정수업', slot: { day: 5, first: 16, last: 16 } },
  ]);
  assert.equal(actual[0].start, '09:00');
  assert.equal(actual[0].end, '12:00');
  assert.equal(actual[1].start, '23:00');
  assert.equal(actual[1].end, '24:00');
  assert.equal(actual.length, 2);
  assert.throws(() => normalizeLessons([{ title: '오류', slot: { day: 1, first: 2, last: 1 } }]));
});

test('현재 free여도 주간 빈 구간은 서버가 확인한 경우에만 미배정으로 표시한다', async () => {
  const api = createApi('http://localhost:8080', async url => {
    if (url.pathname === '/api/schedule') {
      return json({ building, room, status: 'free', now: '2026-11-18T00:00:00Z',
        lessons: [{ title: '자료구조', slot: { day: 1, first: 1, last: 2 } }] });
    }
    assert.equal(url.pathname, '/api/rooms/available');
    assert.equal(url.searchParams.get('building'), building);
    if (url.searchParams.get('day') === '1') assert.equal(url.searchParams.get('start'), '11:00');
    return json({ rooms: url.searchParams.get('day') === '2' ? [{ building, room }] : [] });
  });
  const schedule = await api.schedule(building, room);
  assert.deepEqual(schedule.days[0].map(block => block.kind), ['lesson', 'unknown']);
  assert.equal(schedule.days[1][0].kind, 'gap');
  assert.equal(schedule.days[2][0].kind, 'unknown');
});

test('검색 실패·응답 오류는 빈 구간으로 바꾸지 않고 확인 불가로 남긴다', async () => {
  for (const result of [() => new Response('', { status: 500 }), () => json({})]) {
    const api = createApi('http://localhost:8080', async url => url.pathname === '/api/schedule'
      ? json({ status: 'busy', lessons: [] }) : result());
    const schedule = await api.schedule(building, room);
    assert.ok(schedule.days.every(blocks => blocks.every(block => block.kind === 'unknown')));
  }
});

test('404와 취소된 요청을 상위 화면으로 전달한다', async () => {
  const missing = createApi('http://localhost:8080', async () => new Response('', { status: 404 }));
  await assert.rejects(missing.rooms(building), /찾을 수 없어요/);
  const controller = new AbortController();
  const api = createApi('http://localhost:8080', async (url, options) => {
    if (url.pathname === '/api/schedule') return json({ lessons: [] });
    controller.abort();
    options.signal.throwIfAborted();
  });
  await assert.rejects(api.schedule(building, room, controller.signal), { name: 'AbortError' });
});
