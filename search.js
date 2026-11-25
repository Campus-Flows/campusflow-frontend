import { createApi } from './api.js';
import { config } from './config.js';
import { demoApi } from './feature-demo.js';
import { demoMode, node, preserveModeLinks, roomLink } from './feature-ui.js';
import { formatTime, toMinutes } from './schedule.js';
import { weekdays } from './demo-data.js';

preserveModeLinks();
const api = demoMode ? demoApi : createApi(config.apiBaseUrl);
const form = document.querySelector('#room-search');
const { day, start, end, building, minHours } = form.elements;
const feedback = document.querySelector('#search-feedback');
const results = document.querySelector('#search-results');
const empty = document.querySelector('#search-empty');
const retryBuildings = document.querySelector('#retry-buildings');
const buildingStatus = document.querySelector('#search-building-status');
let request;

for (const [index, weekday] of weekdays.entries()) day.add(new Option(weekday.label, index + 1));
for (let minute = 540; minute <= (demoMode ? 1080 : 1440); minute += 30) {
  const time = formatTime(minute);
  if (minute < (demoMode ? 1080 : 1440)) start.add(new Option(time, time));
  if (minute > 540) end.add(new Option(time, time));
}
for (let hours = 1; hours <= (demoMode ? 9 : 15); hours++) {
  minHours.add(new Option(hours + '시간 이상 연속', hours));
}
day.value = '3';
start.value = '13:00';
end.value = '15:00';

async function loadBuildingOptions() {
  building.disabled = true;
  retryBuildings.hidden = true;
  buildingStatus.textContent = '건물을 불러오는 중이에요.';
  try {
    const buildings = await api.buildings();
    building.replaceChildren(new Option('전체 건물', ''), ...buildings.map(item => new Option(item.name, item.name)));
    building.disabled = false;
    buildingStatus.textContent = '';
  } catch {
    buildingStatus.textContent = '건물 목록을 불러오지 못했어요. 전체 건물로 검색할 수 있어요.';
    retryBuildings.hidden = false;
  }
}
retryBuildings.addEventListener('click', loadBuildingOptions);
loadBuildingOptions();

function clearSearch() {
  request?.abort();
  feedback.textContent = '';
  results.replaceChildren();
  results.setAttribute('aria-busy', 'false');
  empty.hidden = true;
}
form.addEventListener('change', clearSearch);

function resultCard({ building, room, freePeriods }, filters) {
  const card = node('li', undefined, 'result-card');
  card.append(node('p', building, 'result-building'));
  const heading = node('h3');
  const link = roomLink(building, room);
  link.textContent = room;
  link.setAttribute('aria-label', building + ' ' + room + ' 주간 시간표');
  heading.append(link);
  card.append(heading);
  const periods = freePeriods ?? [{ start: filters.start, end: filters.end,
    durationMinutes: toMinutes(filters.end) - toMinutes(filters.start) }];
  const list = node('ul', undefined, 'free-periods');
  for (const period of periods) {
    const duration = period.durationMinutes;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    const label = [hours && hours + '시간', minutes && minutes + '분'].filter(Boolean).join(' ');
    const row = node('li', period.start + '–' + period.end);
    row.append(node('span', label, 'period-length'));
    list.append(row);
  }
  card.append(list);
  return card;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  clearSearch();
  const filters = { day: Number(day.value), start: start.value, end: end.value, building: building.value };
  const duration = toMinutes(filters.end) - toMinutes(filters.start);
  const minimum = Number(minHours.value);
  if (duration <= 0 || minimum * 60 > duration) {
    feedback.textContent = duration <= 0 ? '종료 시각은 시작 시각보다 늦어야 해요.'
      : '검색 범위를 넓히거나 최소 연속 시간을 줄여 주세요.';
    end.focus();
    return;
  }
  request = new AbortController();
  const { signal } = request;
  feedback.textContent = '조건에 맞는 강의실을 찾는 중이에요.';
  results.setAttribute('aria-busy', 'true');
  try {
    const data = minimum
      ? await api.continuous({ ...filters, minHours: minimum }, signal)
      : await api.available(filters, signal);
    if (signal.aborted) return;
    feedback.textContent = weekdays[filters.day - 1].label + ' ' + filters.start + '–' + filters.end + ' · '
      + data.rooms.length + '개 강의실';
    empty.textContent = data.emptyReason === 'noDayData' ? '이 요일의 시간표 자료를 확인할 수 없어요.'
      : '조건에 맞는 강의실을 찾지 못했어요. 검색 시간이나 건물을 바꿔 보세요.';
    empty.hidden = Boolean(data.rooms.length);
    results.replaceChildren(...data.rooms.map(room => resultCard(room, filters)));
  } catch {
    if (!signal.aborted) feedback.textContent = '검색에 실패했어요. 백엔드 연결을 확인하고 다시 검색해 주세요.';
  } finally {
    if (!signal.aborted) results.setAttribute('aria-busy', 'false');
  }
});
