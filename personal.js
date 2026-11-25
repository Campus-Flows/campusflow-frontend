import { gapsFor, sortedLessons, validateLesson } from './personal-timetable-model.mjs';
import { rankRooms } from './room-ranking.mjs';
import { createApi } from './api.js';
import { config } from './config.js';
import { demoApi } from './feature-demo.js';
import { demoMode, node, preserveModeLinks, roomLink } from './feature-ui.js';
import { weekdays as days } from './demo-data.js';

preserveModeLinks();
const api = demoMode ? demoApi : createApi(config.apiBaseUrl);
const storageKey = 'campusflow.personal-timetable.v1' + (demoMode ? '.demo' : '');
const weekdays = days.map(day => day.label);
const form = document.querySelector('#lesson-form');
const feedback = document.querySelector('#lesson-feedback');
const lessonList = document.querySelector('#lesson-list');
const gapList = document.querySelector('#gap-list');
const manualEntry = document.querySelector('#manual-entry');
const fields = form.elements;
const hour = value => String(value).padStart(2, '0') + ':00';
const locations = fetch('./locations.json')
  .then(response => response.ok ? response.json() : {})
  .catch(() => ({}));
const courseSearch = document.querySelector('#course-search');
const searchStatus = document.querySelector('#course-status');
const courseResults = document.querySelector('#course-results');
let courseRequest;
let editing;
let recommendations;

function readLessons() {
  const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
  if (!Array.isArray(saved)) throw new Error('Invalid timetable');
  const lessons = [];
  for (const lesson of saved) {
    if (validateLesson(lesson, lessons)) throw new Error('Invalid lesson');
    lessons.push(lesson);
  }
  return lessons;
}

function saveLessons(lessons) {
  localStorage.setItem(storageKey, JSON.stringify(lessons));
  render(lessons);
}

const storageError = '시간표 저장소를 열 수 없습니다. 브라우저의 사이트 데이터 설정을 확인해 주세요.';

function sameLesson(a, b) {
  return a.day === b.day && a.start === b.start && a.end === b.end && a.title === b.title
    && a.building === b.building && a.room === b.room;
}

function registerLessons(additions, original) {
  try {
    const current = readLessons();
    if (original && !current.some(lesson => sameLesson(lesson, original))) {
      return '다른 창에서 이 수업이 변경되었습니다. 수정할 수업을 다시 선택해 주세요.';
    }
    const next = original ? current.filter(lesson => !sameLesson(lesson, original)) : current;
    for (const lesson of additions) {
      const error = validateLesson(lesson, next);
      if (error) return additions.length > 1 ? weekdays[lesson.day - 1] + ' ' + lesson.start + ' · ' + error : error;
      next.push(lesson);
    }
    saveLessons(next);
    return '';
  } catch {
    return storageError;
  }
}

function removeLesson(lesson) {
  try {
    const current = readLessons();
    const remaining = current.filter(other => !sameLesson(other, lesson));
    saveLessons(remaining);
    if (editing && sameLesson(editing, lesson)) resetForm();
    feedback.textContent = lesson.title + ' 수업을 삭제했습니다.';
  } catch {
    feedback.textContent = storageError;
  }
}

function renderLessons(lessons) {
  lessonList.replaceChildren();
  let previousDay;
  for (const lesson of sortedLessons(lessons)) {
    const dayLabel = weekdays[lesson.day - 1];
    if (previousDay !== lesson.day) lessonList.append(node('h3', dayLabel));
    previousDay = lesson.day;

    const row = node('div', undefined, 'lesson-row');
    const info = node('div');
    info.append(node('strong', lesson.title), lesson.start + '–' + lesson.end);
    if (lesson.building) info.append(node('div', [lesson.building, lesson.room].filter(Boolean).join(' · '), 'place-note'));
    const edit = node('button', '수정', 'secondary-button');
    edit.type = 'button';
    edit.setAttribute('aria-label', dayLabel + ' ' + lesson.start + ' ' + lesson.title + ' 수정');
    edit.addEventListener('click', () => editLesson(lesson));
    const remove = node('button', '삭제', 'secondary-button');
    remove.type = 'button';
    remove.setAttribute('aria-label', dayLabel + ' ' + lesson.start + ' ' + lesson.title + ' 삭제');
    remove.addEventListener('click', () => removeLesson(lesson));
    const actions = node('div', undefined, 'lesson-actions');
    actions.append(edit, remove);
    row.append(info, actions);
    lessonList.append(row);
  }
  if (!lessons.length) lessonList.append(node('p', '등록한 수업이 없습니다.', 'hint'));
}

function roomList(rooms, end) {
  const list = node('ol', undefined, 'gap-rooms');
  for (const {building, room, start, reason} of rooms) {
    const item = node('li');
    item.append(roomLink(building, room));
    item.append(node('small', [start + '–' + end, reason].filter(Boolean).join(' · ')));
    list.append(item);
  }
  return list;
}

async function showRooms(gap, status, results, signal) {
  try {
    const {day, start, end, nextLesson} = gap;
    const [{rooms, emptyReason, unplacedLesson}, coordinates] = await Promise.all([
      api.waiting({ day, start, end }, signal), locations,
    ]);
    if (signal.aborted) return;
    if (!rooms.length) {
      const reasons = {
        noDayData: '이 요일의 강의실 배정 자료가 없습니다.',
        noWaitingRooms: '다음 수업 시작까지 기다릴 만한 강의실을 찾지 못했습니다.'
      };
      status.textContent = reasons[emptyReason] ?? reasons.noWaitingRooms;
      return;
    }
    const ranked = rankRooms(rooms, nextLesson, coordinates);
    if (unplacedLesson) results.append(node('p', '장소가 등록된 수업을 기준으로 추천합니다. 입실 전 이용 가능 여부를 확인하세요.', 'hint'));
    results.append(roomList(ranked.slice(0, 5), end));
    if (ranked.length > 5) {
      const more = node('details', undefined, 'more-rooms');
      more.append(node('summary', '다른 강의실 ' + (ranked.length - 5) + '개 보기'), roomList(ranked.slice(5), end));
      results.append(more);
    }
    status.textContent = '추천 강의실 ' + rooms.length + '개' + (nextLesson.building ? '' : ' · 다음 수업 장소를 입력하면 가까운 순으로 표시합니다.');
  } catch {
    if (!signal.aborted) status.textContent = '추천 강의실 조회에 실패했습니다. 페이지를 새로고침해 다시 시도해 주세요.';
  }
}

function render(lessons) {
  recommendations?.abort();
  recommendations = new AbortController();
  renderLessons(lessons);
  gapList.replaceChildren();
  const gaps = gapsFor(lessons);
  if (!gaps.length) gapList.append(node('p', '수업 사이에 공강이 없습니다.', 'hint'));
  for (const gap of gaps) {
    const section = node('section');
    const title = weekdays[gap.day - 1] + ' ' + gap.start + '–' + gap.end;
    const status = node('p', '추천 강의실을 조회하는 중입니다.', 'hint');
    status.setAttribute('role', 'status');
    const results = node('div');
    const next = gap.nextLesson;
    section.append(node('h3', title), node('p', '다음 수업 · ' + [next.title, next.building, next.room].filter(Boolean).join(' · '), 'place-note'), status, results);
    gapList.append(section);
    showRooms(gap, status, results, recommendations.signal);
  }
}

function showTimeMode() {
  for (const label of form.querySelectorAll('[data-mode]')) {
    label.hidden = label.dataset.mode !== fields.timeMode.value;
  }
}

for (let period = 1; period <= 15; period++) {
  const label = period + '교시 (' + hour(period + 8) + '–' + hour(period + 9) + ')';
  fields.first.add(new Option(label, period));
  fields.last.add(new Option(label, period));
}
fields.first.addEventListener('change', () => {
  if (+fields.last.value < +fields.first.value) fields.last.value = fields.first.value;
});
fields.timeMode.addEventListener('change', showTimeMode);

const roomNames = document.querySelector('#room-names');
async function suggestRooms() {
  const building = fields.building.value.trim();
  roomNames.replaceChildren();
  if (!building) return;
  try {
    const rooms = await api.rooms(building);
    if (fields.building.value.trim() === building) roomNames.replaceChildren(...rooms.map(r => new Option(r.name)));
  } catch { /* Users can still type a room name. */ }
}
api.buildings().then(buildings => {
  document.querySelector('#building-names').replaceChildren(...buildings.map(b => new Option(b.name)));
}).catch(() => {});
fields.building.addEventListener('change', () => {
  fields.room.value = '';
  suggestRooms();
});

function resetForm() {
  editing = null;
  form.reset();
  roomNames.replaceChildren();
  showTimeMode();
  document.querySelector('#save-lesson').textContent = '수업 추가';
  document.querySelector('#cancel-edit').hidden = true;
}

function editLesson(lesson) {
  editing = lesson;
  manualEntry.open = true;
  for (const name of ['title', 'day', 'start', 'end', 'building', 'room']) {
    fields[name].value = lesson[name] ?? '';
  }
  const wholePeriods = lesson.start.endsWith(':00') && lesson.end.endsWith(':00');
  fields.timeMode.value = wholePeriods ? 'period' : 'clock';
  if (wholePeriods) {
    fields.first.value = Number(lesson.start.slice(0, 2)) - 8;
    fields.last.value = Number(lesson.end.slice(0, 2)) - 9;
  }
  showTimeMode();
  suggestRooms();
  document.querySelector('#save-lesson').textContent = '수정 저장';
  document.querySelector('#cancel-edit').hidden = false;
  fields.title.focus();
}
document.querySelector('#cancel-edit').addEventListener('click', resetForm);

form.addEventListener('submit', event => {
  event.preventDefault();
  const byPeriod = fields.timeMode.value === 'period';
  const lesson = {
    ...editing, day: Number(fields.day.value), title: fields.title.value.trim(),
    start: byPeriod ? hour(+fields.first.value + 8) : fields.start.value.trim(),
    end: byPeriod ? hour(+fields.last.value + 9) : fields.end.value.trim(),
    building: fields.building.value.trim(), room: fields.room.value.trim()
  };
  if (!lesson.title) {
    feedback.textContent = '과목명을 입력해 주세요.';
    fields.title.focus();
    return;
  }
  if (lesson.room && !lesson.building) {
    feedback.textContent = '강의실을 입력할 때는 건물도 함께 입력해 주세요.';
    fields.building.focus();
    return;
  }
  const error = registerLessons([lesson], editing);
  feedback.textContent = error || lesson.title + ' 수업을 저장했습니다.';
  if (!error) {
    resetForm();
    fields.title.focus();
  }
});

function courseRow(course) {
  const row = node('article', undefined, 'course-row');
  const text = node('div');
  text.append(node('strong', course.title), node('span', '강좌번호 ' + course.number + (course.section ? ' · ' + course.section + '분반' : ''), 'course-number'));
  for (const meeting of course.meetings) {
    const place = [meeting.building, meeting.room].filter(Boolean).join(' ') || '강의실 정보 없음';
    text.append(node('div', weekdays[meeting.day - 1] + ' ' + meeting.start + '–' + meeting.end + ' · ' + place));
  }
  row.append(text);
  if (course.issue || !course.meetings.length) {
    text.append(node('p', course.issue || '등록할 강좌 일정이 없어요.', 'place-note'));
  } else {
    const add = node('button', '시간표에 등록', 'secondary-button');
    const result = node('p', '', 'course-feedback');
    result.setAttribute('role', 'status');
    add.type = 'button';
    add.addEventListener('click', () => {
      const additions = course.meetings.map(meeting => ({...meeting, title:course.title}));
      const error = registerLessons(additions);
      result.textContent = error || course.title + ' 수업 ' + additions.length + '개 일정을 등록했습니다.';
    });
    row.append(add);
    text.append(result);
  }
  return row;
}

function clearSearch() {
  courseRequest?.abort();
  courseResults.replaceChildren();
  searchStatus.textContent = '';
}
courseSearch.elements.query.addEventListener('input', clearSearch);
courseSearch.addEventListener('submit', async event => {
  event.preventDefault();
  clearSearch();
  const query = courseSearch.elements.query.value.trim();
  if (!query) {
    searchStatus.textContent = '검색할 과목명을 입력해 주세요.';
    return;
  }
  courseRequest = new AbortController();
  const {signal} = courseRequest;
  searchStatus.textContent = '과목을 찾는 중입니다.';
  try {
    const courses = await api.courses(query, signal);
    if (signal.aborted) return;
    courseResults.replaceChildren(...courses.map(courseRow));
    searchStatus.textContent = courses.length ? courses.length + '개 강좌 · 강좌번호와 수업 시간을 확인해 선택하세요.' : '검색 결과가 없습니다. 아래에서 수업을 직접 입력할 수 있습니다.';
  } catch {
    if (!signal.aborted) searchStatus.textContent = '과목을 불러오지 못했습니다. 다시 검색해 주세요.';
  }
});

function restore() {
  try {
    render(readLessons());
    feedback.textContent = '';
  } catch {
    feedback.textContent = storageError;
  }
}

window.addEventListener('storage', event => {
  if (event.key === storageKey || event.key === null) restore();
});
restore();
