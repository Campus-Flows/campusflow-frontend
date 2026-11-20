import { buildDayBlocks, formatTime } from './schedule.js';

export function createApi(baseUrl, fetcher = fetch) {
  async function get(path, params, signal) {
    const url = new URL(`${baseUrl.replace(/\/$/, '')}/api/${path}`);
    url.search = new URLSearchParams(params);
    const requestSignal = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000);
    const response = await fetcher(url, { signal: requestSignal, cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(response.status === 404
        ? '해당 건물이나 강의실을 찾을 수 없어요. 목록을 다시 불러와 주세요.'
        : `서버에서 자료를 불러오지 못했어요. (${response.status})`);
    }
    return response.json();
  }

  return {
    async buildings(signal) {
      const data = await get('buildings', {}, signal);
      if (!Array.isArray(data.buildings)) throw new Error('건물 응답 형식을 확인해 주세요.');
      return data.buildings.map(item => ({ id: item.name, name: item.name }));
    },
    async rooms(building, signal) {
      const data = await get('rooms', { building }, signal);
      if (!Array.isArray(data.rooms)) throw new Error('강의실 응답 형식을 확인해 주세요.');
      return data.rooms.map(item => ({ id: item.name, name: item.name }));
    },
    async schedule(building, room, signal) {
      const data = await get('schedule', { building, room }, signal);
      const lessons = normalizeLessons(data.lessons);
      const range = { displayStart: 540, displayEnd: 1440 };
      const days = await Promise.all([1, 2, 3, 4, 5].map(async day => {
        const blocks = buildDayBlocks(lessons.filter(item => item.day === day), range.displayStart, range.displayEnd);
        // 현재 상태(status)는 지금 한 시각의 값이므로 주간 빈 구간 판단에 사용하지 않습니다.
        return Promise.all(blocks.map(async block => {
          if (block.kind === 'lesson') return block;
          try {
            const result = await get('rooms/available', {
              building, day, start: formatTime(block.start), end: formatTime(block.end),
            }, signal);
            if (!Array.isArray(result.rooms)) throw new Error('검색 응답 형식 오류');
            if (result.rooms.some(item => item.building === building && item.room === room)) return block;
          } catch (error) {
            if (signal?.aborted || error.name === 'AbortError') throw error;
          }
          return { ...block, kind: 'unknown', title: '미배정 여부 확인 불가' };
        }));
      }));
      return { ...range, days, status: data.status, now: data.now };
    },
  };
}

export function normalizeLessons(lessons) {
  if (!Array.isArray(lessons)) throw new Error('시간표 응답 형식을 확인해 주세요.');
  return lessons.map(({ title, slot }) => {
    if (!slot || !Number.isInteger(slot.day) || slot.day < 1 || slot.day > 7
      || !Number.isInteger(slot.first) || !Number.isInteger(slot.last)
      || slot.first < 1 || slot.last < slot.first || slot.last > 16 || typeof title !== 'string') {
      throw new Error('수업의 요일·교시 정보를 확인해 주세요.');
    }
    // 백엔드 Timetable.Slot: 1교시 09:00~10:00, 16교시 24:00~01:00.
    const start = (8 + slot.first) * 60;
    const end = Math.min((9 + slot.last) * 60, 1440);
    return { title, day: slot.day, start: formatTime(start), end: formatTime(end), startMinute: start };
  }).filter(lesson => lesson.startMinute < 1440);
}
