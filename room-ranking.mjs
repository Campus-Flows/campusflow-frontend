import { buildingCoordinates } from './campus-locations.mjs';

const names = new Intl.Collator('ko', {numeric: true});

function roomKey(name) {
  return String(name ?? '').trim().replace(/\s*호$/, '').trim().toUpperCase();
}

// The final two digits are the room number on a floor (e.g. 208-1 or B101).
// Use contiguous floor indexes: B1 is immediately below 1F.
function floorIndex(key) {
  const match = /^(B?)([1-9]\d?)\d{2}(?:-\d+)?[A-Z]?$/.exec(key);
  if (!match) return null;
  const floor = Number(match[2]);
  return match[1] ? -floor : floor - 1;
}

function distanceMetres(a, b) {
  const radians = Math.PI / 180;
  const dx = (a[1] - b[1]) * Math.cos((a[0] + b[0]) / 2 * radians);
  return Math.hypot(a[0] - b[0], dx) * radians * 6371000;
}

export function rankRooms(rooms, nextLesson, locations) {
  const building = nextLesson?.building?.trim();
  const targetRoom = roomKey(nextLesson?.room);
  const targetFloor = floorIndex(targetRoom);
  const targetPoint = buildingCoordinates(locations, building);

  function rank(candidate) {
    if (!building) return {group: 4, distance: 0, reason: ''};
    if (candidate.building === building) {
      const key = roomKey(candidate.room);
      if (targetRoom && key === targetRoom) return {group: 0, distance: 0, reason: '다음 수업 강의실'};
      const floor = floorIndex(key);
      if (targetFloor === null || floor === null) return {group: 2, distance: 0, reason: '같은 건물'};
      const distance = Math.abs(targetFloor - floor);
      const reason = distance ? '같은 건물 · ' + distance + '개 층 차이 추정' : '같은 건물 · 같은 층 추정';
      return {group: 1, distance, reason};
    }
    const point = buildingCoordinates(locations, candidate.building);
    if (!targetPoint || !point) return {group: 4, distance: 0, reason: '다른 건물 · 거리 정보 없음'};
    const distance = distanceMetres(targetPoint, point);
    const reason = distance === 0 ? '다음 건물과 같은 지도 좌표' : '건물 간 직선거리 약 ' + Math.round(distance) + 'm';
    return {group: 3, distance, reason};
  }

  return rooms.map(candidate => ({...candidate, ...rank(candidate)}))
    .sort((a, b) => a.group - b.group || a.distance - b.distance ||
      names.compare(a.building, b.building) || names.compare(a.room, b.room))
    .map(({building, room, start, reason}) => ({building, room, ...(start && {start}), reason}));
}
