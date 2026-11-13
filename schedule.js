export function toMinutes(time) {
  if (time === '24:00') return 24 * 60;
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error('시간 형식을 확인해 주세요.');
  }
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatTime(minutes) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  return `${hours}:${String(minutes % 60).padStart(2, '0')}`;
}

// 자료가 확인된 요일의 정규 수업만 전달합니다. 자료 미확보는 호출 전에 구분합니다.
export function buildDayBlocks(lessons, rangeStart, rangeEnd) {
  if (!Number.isInteger(rangeStart) || !Number.isInteger(rangeEnd)
      || rangeStart < 0 || rangeEnd > 1440 || rangeStart >= rangeEnd) {
    throw new Error('표시할 시간 범위를 확인해 주세요.');
  }
  const classes = lessons.map(lesson => {
    const start = toMinutes(lesson.start);
    const end = toMinutes(lesson.end);
    if (start >= end) throw new Error('수업 종료 시각을 확인해 주세요.');
    return { start: Math.max(start, rangeStart), end: Math.min(end, rangeEnd), title: lesson.title };
  }).filter(lesson => lesson.start < lesson.end)
    .sort((first, second) => first.start - second.start);

  const blocks = [];
  let cursor = rangeStart;
  for (const lesson of classes) {
    if (lesson.start < cursor) throw new Error('겹치는 수업 정보를 확인해 주세요.');
    if (lesson.start > cursor) {
      blocks.push({ start: cursor, end: lesson.start, kind: 'gap', title: '수업 미배정' });
    }
    blocks.push({ ...lesson, kind: 'lesson' });
    cursor = lesson.end;
  }
  if (cursor < rangeEnd) blocks.push({ start: cursor, end: rangeEnd, kind: 'gap', title: '수업 미배정' });
  return blocks;
}
