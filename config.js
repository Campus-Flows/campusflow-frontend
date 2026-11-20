// 백엔드 실행 주소를 입력합니다. 배포할 때는 백엔드의 HTTPS 주소로 바꾸세요.
export const config = {
  apiBaseUrl: 'http://127.0.0.1:8080',
  // 현재 API에는 학기 필드/학기 선택이 없어, 서버에 불러온 자료로 표시합니다.
  semesterLabel: '서버에 불러온 학기',
};
