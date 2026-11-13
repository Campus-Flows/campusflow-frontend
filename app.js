import { demoSchedule, weekdays } from './demo-data.js';
import { buildDayBlocks, formatTime } from './schedule.js';

const buildingSelect = document.querySelector('#building');
const roomSelect = document.querySelector('#room');
const timetable = document.querySelector('#timetable');
const dayButtons = document.querySelector('#day-buttons');
const emptyState = document.querySelector('#empty-state');
const selectionStatus = document.querySelector('#selection-status');
let activeDay = 'MON';

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
  for (let time = demoSchedule.displayStart; time <= demoSchedule.displayEnd; time += 60) {
    const tick = element('span', 'time-label', formatTime(time));
    tick.style.top = `${100 * (time - demoSchedule.displayStart) / (demoSchedule.displayEnd - demoSchedule.displayStart)}%`;
    times.append(tick);
  }
  axis.append(element('div', 'day-heading axis-heading', '시간'), times);
  return axis;
}

function createSlot(block) {
  const slot = element('div', `slot ${block.kind}`);
  const timeRange = `${formatTime(block.start)}–${formatTime(block.end)}`;
  const duration = block.end - block.start;
  slot.style.setProperty('--start', `${100 * (block.start - demoSchedule.displayStart) / (demoSchedule.displayEnd - demoSchedule.displayStart)}%`);
  slot.style.setProperty('--duration', `${100 * duration / (demoSchedule.displayEnd - demoSchedule.displayStart)}%`);
  slot.setAttribute('aria-label', `${block.title}, ${timeRange}`);
  slot.title = `${block.title} ${timeRange}`;
  const label = element('span', 'slot-label', block.kind === 'lesson' ? '정규 수업' : '수업 없음');
  slot.append(label, element('strong', 'slot-title', block.title), element('span', 'slot-time', timeRange));
  if (duration < 90) slot.classList.add('short');
  if (duration < 45) slot.classList.add('compact');
  return slot;
}

function createDay(day, roomId) {
  const column = element('div', 'day');
  column.dataset.day = day.code;
  column.classList.toggle('active', day.code === activeDay);
  const header = element('h3', 'day-heading', day.label);
  const slots = element('div', 'day-slots');
  const lessons = demoSchedule.lessons.filter(lesson => lesson.roomId === roomId && lesson.day === day.code);
  const blocks = buildDayBlocks(lessons, demoSchedule.displayStart, demoSchedule.displayEnd);
  slots.append(...blocks.map(createSlot));
  column.append(header, slots);
  return column;
}

function renderSchedule() {
  const building = demoSchedule.buildings.find(item => item.id === buildingSelect.value);
  const room = building?.rooms.find(item => item.id === roomSelect.value);
  if (!room) {
    document.querySelector('#schedule-title').textContent = '강의실을 선택해 주세요';
    document.querySelector('#schedule-meta').textContent = '';
    showMessage('등록된 강의실이 없어요', '다른 건물을 선택해 주세요.');
    return;
  }
  document.querySelector('#schedule-title').textContent = `${building.name} ${room.name}`;
  document.querySelector('#schedule-meta').textContent = `${room.floor} · ${demoSchedule.semester} · 예시 시간표`;
  if (room.scheduleStatus !== 'ready') {
    showMessage('시간표 정보를 준비하고 있어요', '아직 자료가 확인되지 않은 강의실이에요. 다른 강의실의 예시 시간표를 확인해 보세요.');
    return;
  }
  try {
    const columns = weekdays.map(day => createDay(day, room.id));
    timetable.replaceChildren(createTimeAxis(), ...columns);
    timetable.hidden = false;
    dayButtons.hidden = false;
    emptyState.hidden = true;
    selectionStatus.textContent = `${building.name} ${room.name}의 주간 시간표를 표시했어요.`;
  } catch {
    showMessage('시간표를 확인할 수 없어요', '수업 정보에 확인이 필요한 부분이 있어요. 다른 강의실을 선택하거나 다시 확인해 주세요.', true);
  }
}

function updateRooms() {
  const building = demoSchedule.buildings.find(item => item.id === buildingSelect.value);
  roomSelect.replaceChildren(...building.rooms.map(room => new Option(room.name, room.id)));
  roomSelect.disabled = building.rooms.length === 0;
  renderSchedule();
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

document.querySelector('#semester').value = demoSchedule.semester;
buildingSelect.replaceChildren(...demoSchedule.buildings.map(building => new Option(building.name, building.id)));
buildingSelect.addEventListener('change', updateRooms);
roomSelect.addEventListener('change', renderSchedule);
document.querySelector('#retry').addEventListener('click', renderSchedule);
updateRooms();
