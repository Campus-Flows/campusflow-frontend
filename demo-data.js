// 실제 강의실 정보와 구분하기 위해 모든 이름에 예시임을 표시합니다.
export const weekdays = [
  { code: 'MON', label: '월요일', shortLabel: '월' },
  { code: 'TUE', label: '화요일', shortLabel: '화' },
  { code: 'WED', label: '수요일', shortLabel: '수' },
  { code: 'THU', label: '목요일', shortLabel: '목' },
  { code: 'FRI', label: '금요일', shortLabel: '금' },
];

export const demoSchedule = {
  semester: '2026학년도 2학기',
  displayStart: 9 * 60,
  displayEnd: 18 * 60,
  buildings: [
    {
      id: 'a', name: '예시 A관',
      rooms: [
        { id: 'a101', name: '101호', floor: '1층', scheduleStatus: 'ready' },
        { id: 'a203', name: '203호', floor: '2층', scheduleStatus: 'ready' },
        { id: 'a301', name: '301호', floor: '3층', scheduleStatus: 'pending' },
      ],
    },
    {
      id: 'b', name: '예시 B관',
      rooms: [{ id: 'b302', name: '302호', floor: '3층', scheduleStatus: 'ready' }],
    },
  ],
  lessons: [
    { roomId: 'a101', day: 'MON', start: '09:00', end: '10:30', title: '글쓰기 기초' },
    { roomId: 'a101', day: 'MON', start: '13:00', end: '14:30', title: '디지털 리터러시' },
    { roomId: 'a101', day: 'TUE', start: '10:00', end: '11:30', title: '대학 영어' },
    { roomId: 'a101', day: 'TUE', start: '14:30', end: '16:00', title: '데이터의 이해' },
    { roomId: 'a101', day: 'WED', start: '09:30', end: '11:00', title: '사회와 문화' },
    { roomId: 'a101', day: 'WED', start: '12:00', end: '13:30', title: '글쓰기 기초' },
    { roomId: 'a101', day: 'THU', start: '11:00', end: '12:30', title: '대학 영어' },
    { roomId: 'a101', day: 'THU', start: '15:00', end: '16:30', title: '데이터의 이해' },
    { roomId: 'a101', day: 'FRI', start: '10:30', end: '12:00', title: '사회와 문화' },
    { roomId: 'a203', day: 'MON', start: '11:00', end: '12:30', title: '디자인 기초' },
    { roomId: 'a203', day: 'WED', start: '14:00', end: '15:30', title: '프로젝트 워크숍' },
    { roomId: 'a203', day: 'FRI', start: '09:00', end: '10:30', title: '디자인 기초' },
    { roomId: 'b302', day: 'TUE', start: '09:00', end: '11:00', title: '소프트웨어 기초' },
    { roomId: 'b302', day: 'THU', start: '13:00', end: '15:00', title: '문제 해결 실습' },
  ],
};
