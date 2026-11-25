// Zero-padded 24-hour times can be compared directly after validation.
const clockTime = /^(?:09|1[0-9]|2[0-3]):[0-5][0-9]$|^24:00$/;

export function validateLesson(lesson, existingLessons = []) {
  if (!Number.isInteger(lesson?.day) || lesson.day < 1 || lesson.day > 5) {
    return '월요일부터 금요일 중 수업 요일을 선택해 주세요.';
  }
  if (typeof lesson.title !== 'string' || !lesson.title.trim()) {
    return '과목명을 입력해 주세요.';
  }
  const { day, start, end } = lesson;
  if (typeof start !== 'string' || typeof end !== 'string' || !clockTime.test(start) || !clockTime.test(end)) {
    return '시작과 종료 시각을 09:00~24:00 범위에서 HH:mm 형식으로 입력해 주세요.';
  }
  if (start >= end) return '종료 시각은 시작 시각보다 늦어야 합니다.';
  if (existingLessons.some(other => other.day === day && start < other.end && other.start < end)) {
    return '같은 요일에 시간이 겹치는 수업이 있습니다.';
  }
  return '';
}

export function sortedLessons(lessons) {
  return [...lessons].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
}

export function gapsFor(lessons) {
  const sorted = sortedLessons(lessons);
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1];
    const next = sorted[i];
    if (previous.day === next.day && previous.end < next.start) {
      gaps.push({ day: next.day, start: previous.end, end: next.start, nextLesson: next });
    }
  }
  return gaps;
}
