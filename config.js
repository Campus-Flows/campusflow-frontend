const localFrontend = ['localhost', '127.0.0.1', '[::1]'].includes(globalThis.location?.hostname);

export const config = {
  apiBaseUrl: localFrontend
    ? 'http://127.0.0.1:8080'
    : 'https://campusflow-hc83.onrender.com',
  // 현재 API에는 학기 필드/학기 선택이 없어, 서버에 불러온 자료로 표시합니다.
  semesterLabel: '서버에 불러온 학기',
};
