import { demoSchedule, weekdays } from './demo-data.js';
import { buildDayBlocks, formatTime } from './schedule.js';
import { createApi } from './api.js';
import { config } from './config.js';
import { demoMode, preserveModeLinks } from './feature-ui.js';

const demo = demoMode;
preserveModeLinks();
const locationParams = new URLSearchParams(location.search);
let linkedRoom = { building: locationParams.get('building'), room: locationParams.get('room') };
const api = createApi(config.apiBaseUrl);
const displayStart = 540;
const displayEnd = demo ? 1080 : 1440;
const semester = demo ? demoSchedule.semester : config.semesterLabel;

const buildingSelect = document.querySelector('#building');
const roomSelect = document.querySelector('#room');
const timetable = document.querySelector('#timetable');
const dayButtons = document.querySelector('#day-buttons');
const emptyState = document.querySelector('#empty-state');
const selectionStatus = document.querySelector('#selection-status');
let activeDay = 'MON';
let buildings = [];
let rooms = [];
let requestController;
let retryAction = loadBuildings;

function beginRequest() {
  requestController?.abort();
  requestController = new AbortController();
  return requestController.signal;
}

function errorMessage(error) {
  if (error.name === 'TimeoutError') return '서버 응답이 늦어지고 있어요. 잠시 후 다시 확인해 주세요.';
  return error instanceof TypeError
    ? '백엔드 연결을 확인해 주세요. 서버 실행 주소와 CORS 허용 주소는 README에서 확인할 수 있어요.'
    : error.message;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function showMessage(title, description, retry = false) {
  timetable.hidden = true;
  dayButtons.hidden = true;
  emptyState.hidden = false;
  document.querySelector('#empty-title').textContent = title;
  document.querySelector('#empty-description').textContent = description;
  document.querySelector('#retry').hidden = !retry;
  selectionStatus.textContent = title;
}

function createTimeAxis() {
  const axis = element('div', 'time-axis');
  const times = element('div', 'times');
  for (let time = displayStart; time <= displayEnd; time += 60) {
    const tick = element('span', 'time-label', formatTime(time));
    tick.style.top = `${100 * (time - displayStart) / (displayEnd - displayStart)}%`;
    times.append(tick);
  }
  axis.append(element('div', 'day-heading axis-heading', '시간'), times);
  return axis;
}

function createSlot(block) {
  const slot = element('div', `slot ${block.kind}`);
  const timeRange = `${formatTime(block.start)}–${formatTime(block.end)}`;
  const duration = block.end - block.start;
  slot.style.setProperty('--start', `${100 * (block.start - displayStart) / (displayEnd - displayStart)}%`);
  slot.style.setProperty('--duration', `${100 * duration / (displayEnd - displayStart)}%`);
  slot.setAttribute('aria-label', `${block.title}, ${timeRange}`);
  slot.title = `${block.title} ${timeRange}`;
  const labels = { lesson: '정규 수업', gap: '수업 없음', unknown: '확인 불가' };
  const label = element('span', 'slot-label', labels[block.kind]);
  slot.append(label, element('strong', 'slot-title', block.title), element('span', 'slot-time', timeRange));
  if (duration < 90) slot.classList.add('short');
  if (duration < 45) slot.classList.add('compact');
  return slot;
}

function createDay(day, blocks) {
  const column = element('div', 'day');
  column.dataset.day = day.code;
  column.classList.toggle('active', day.code === activeDay);
  const header = element('h3', 'day-heading', day.label);
  const slots = element('div', 'day-slots');
  slots.append(...blocks.map(createSlot));
  column.append(header, slots);
  return column;
}

async function renderSchedule() {
  const signal = beginRequest();
  retryAction = renderSchedule;
  const building = buildings.find(item => item.id === buildingSelect.value);
  const room = rooms.find(item => item.id === roomSelect.value);
  if (!room) {
    document.querySelector('#schedule-title').textContent = '강의실을 선택해 주세요';
    document.querySelector('#schedule-meta').textContent = '';
    showMessage('등록된 강의실이 없어요', '다른 건물을 선택해 주세요.');
    return;
  }
  document.querySelector('#schedule-title').textContent = `${building.name} ${room.name}`;
  document.querySelector('#schedule-meta').textContent = `${semester} · ${demo ? '예시 시간표' : '서버 시간표'}`;
  if (demo && room.scheduleStatus !== 'ready') {
    showMessage('시간표 정보를 준비하고 있어요', '아직 자료가 확인되지 않은 강의실이에요. 다른 강의실의 예시 시간표를 확인해 보세요.');
    return;
  }
  showMessage('시간표를 불러오는 중이에요', '정규 수업과 미배정 구간을 확인하고 있어요.');
  try {
    const data = demo ? {
      days: weekdays.map(day => buildDayBlocks(demoSchedule.lessons.filter(lesson => lesson.roomId === room.id && lesson.day === day.code), displayStart, displayEnd)),
    } : await api.schedule(building.id, room.id, signal);
    if (signal.aborted) return;
    const columns = weekdays.map((day, index) => createDay(day, data.days[index]));
    timetable.replaceChildren(createTimeAxis(), ...columns);
    timetable.hidden = false;
    dayButtons.hidden = false;
    emptyState.hidden = true;
    if (!demo) {
      const status = { free: '현재 시간표상 미배정', busy: '현재 시간표상 수업 중', unknown: '현재 상태 확인 불가' }[data.status] || '현재 상태 확인 불가';
      const updated = new Date(data.now);
      document.querySelector('#schedule-meta').textContent = `${semester} · ${status}${Number.isNaN(updated.getTime()) ? '' : ` · ${updated.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} 기준`}`;
    }
    selectionStatus.textContent = `${building.name} ${room.name}의 주간 시간표를 표시했어요.`;
  } catch (error) {
    if (signal.aborted) return;
    showMessage('시간표를 확인할 수 없어요', errorMessage(error), true);
  }
}

async function updateRooms() {
  const signal = beginRequest();
  retryAction = updateRooms;
  roomSelect.disabled = true;
  roomSelect.replaceChildren(new Option('불러오는 중', ''));
  rooms = [];
  document.querySelector('#schedule-title').textContent = '강의실을 선택해 주세요';
  document.querySelector('#schedule-meta').textContent = '';
  showMessage('강의실 목록을 불러오는 중이에요', '잠시만 기다려 주세요.');
  try {
    const building = buildings.find(item => item.id === buildingSelect.value);
    const loadedRooms = demo ? building.rooms : await api.rooms(building.id, signal);
    if (signal.aborted) return;
    rooms = loadedRooms;
    roomSelect.replaceChildren(...rooms.map(room => new Option(room.name, room.id)));
    if (linkedRoom?.building === building.name) {
      const target = rooms.find(room => room.name === linkedRoom.room);
      if (target) roomSelect.value = target.id;
      linkedRoom = null;
    }
    roomSelect.disabled = rooms.length === 0;
    await renderSchedule();
  } catch (error) {
    if (signal.aborted) return;
    roomSelect.replaceChildren(new Option('목록을 불러오지 못했어요', ''));
    showMessage('강의실 목록을 확인할 수 없어요', errorMessage(error), true);
  }
}

async function loadBuildings() {
  const signal = beginRequest();
  retryAction = loadBuildings;
  buildingSelect.disabled = true;
  roomSelect.disabled = true;
  showMessage('건물 목록을 불러오는 중이에요', '잠시만 기다려 주세요.');
  try {
    const loadedBuildings = demo ? demoSchedule.buildings : await api.buildings(signal);
    if (signal.aborted) return;
    buildings = loadedBuildings;
    buildingSelect.replaceChildren(...buildings.map(building => new Option(building.name, building.id)));
    if (!buildings.length) {
      buildingSelect.replaceChildren(new Option('등록된 건물이 없어요', ''));
      showMessage('등록된 건물이 없어요', '백엔드에 시간표 자료가 준비되었는지 확인해 주세요.', true);
      return;
    }
    buildingSelect.disabled = false;
    const target = buildings.find(building => building.name === linkedRoom?.building);
    if (target) buildingSelect.value = target.id;
    await updateRooms();
  } catch (error) {
    if (signal.aborted) return;
    buildingSelect.replaceChildren(new Option('서버 연결 확인 필요', ''));
    showMessage('서버에 연결할 수 없어요', errorMessage(error), true);
  }
}

for (const day of weekdays) {
  const button = element('button', 'day-button', day.label);
  button.type = 'button';
  button.setAttribute('aria-pressed', String(day.code === activeDay));
  button.addEventListener('click', () => {
    activeDay = day.code;
    for (const sibling of dayButtons.children) sibling.setAttribute('aria-pressed', String(sibling === button));
    for (const column of timetable.querySelectorAll('.day')) column.classList.toggle('active', column.dataset.day === activeDay);
    selectionStatus.textContent = `${day.label} 시간표를 표시했어요.`;
  });
  dayButtons.append(button);
}

document.querySelector('#semester').value = semester;
document.documentElement.style.setProperty('--day-height', `${displayEnd - displayStart}px`);
document.documentElement.style.setProperty('--display-hours', (displayEnd - displayStart) / 60);
document.querySelector('.range-label').textContent = `표시 범위 · ${formatTime(displayStart)}–${formatTime(displayEnd)}`;
document.querySelector('#data-label').textContent = demo ? 'DEMO' : 'API';
document.querySelector('#data-notice').textContent = demo
  ? '건물·강의실·수업은 예시 데이터입니다.'
  : '서버의 정규 수업 시간표를 조회합니다. 실제 사용·예약 여부는 별도 확인해 주세요.';
document.querySelector('#mode-link').href = demo ? './' : '?demo=1';
document.querySelector('#mode-link').textContent = demo ? '서버 자료 보기' : '예시 화면 보기';
document.querySelector('#footer-source').textContent = `삼육대학교 학생 프로젝트 · ${demo ? '예시 데이터 기반' : '서버 시간표 기반'}`;
buildingSelect.addEventListener('change', () => {
  linkedRoom = null;
  updateRooms();
});
roomSelect.addEventListener('change', renderSchedule);
document.querySelector('#retry').addEventListener('click', () => retryAction());
loadBuildings();
