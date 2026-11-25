import { demoSchedule, weekdays } from './demo-data.js';
import { buildDayBlocks, formatTime, toMinutes } from './schedule.js';

function freeRooms({ day, start, end, building }) {
  const from = Math.max(toMinutes(start), demoSchedule.displayStart);
  const through = Math.min(toMinutes(end), demoSchedule.displayEnd);
  if (from >= through) return [];
  return demoSchedule.buildings.filter(item => !building || item.name === building).flatMap(item =>
    item.rooms.filter(room => room.scheduleStatus === 'ready').map(room => {
      const lessons = demoSchedule.lessons.filter(lesson => lesson.roomId === room.id &&
        lesson.day === weekdays[day - 1]?.code);
      const freePeriods = buildDayBlocks(lessons, from, through).filter(block => block.kind === 'gap')
        .map(block => ({ start: formatTime(block.start), end: formatTime(block.end),
          durationMinutes: block.end - block.start }));
      return { building: item.name, room: room.name, freePeriods };
    }),
  );
}

export const demoApi = {
  async buildings() { return demoSchedule.buildings; },
  async rooms(building) { return demoSchedule.buildings.find(item => item.name === building)?.rooms ?? []; },
  async courses(query) {
    const courses = new Map();
    for (const lesson of demoSchedule.lessons) {
      if (!lesson.title.toLowerCase().includes(query.toLowerCase())) continue;
      const building = demoSchedule.buildings.find(item => item.rooms.some(room => room.id === lesson.roomId));
      const room = building.rooms.find(item => item.id === lesson.roomId);
      if (!courses.has(lesson.title)) {
        courses.set(lesson.title, { title: lesson.title, number: String(courses.size + 1), meetings: [] });
      }
      courses.get(lesson.title).meetings.push({
        day: weekdays.findIndex(day => day.code === lesson.day) + 1,
        start: lesson.start, end: lesson.end, building: building.name, room: room.name,
      });
    }
    return [...courses.values()];
  },
  async available(filters) {
    const rooms = freeRooms(filters)
      .filter(room => room.freePeriods.some(period => period.start === filters.start && period.end === filters.end))
      .map(({ building, room }) => ({ building, room }));
    return { rooms };
  },
  async continuous(filters) {
    const rooms = freeRooms(filters).map(room => ({
      ...room, freePeriods: room.freePeriods.filter(period => period.durationMinutes >= filters.minHours * 60),
    })).filter(room => room.freePeriods.length);
    return { rooms };
  },
  async waiting(filters) {
    const rooms = freeRooms(filters).flatMap(({ building, room, freePeriods }) =>
      freePeriods.filter(period => period.end === filters.end).map(period => ({ building, room, start: period.start })),
    );
    return { rooms };
  },
};
