# Campus Flow 프론트엔드

건물과 강의실을 선택해 월~금 정규 수업과 미배정 시간을 확인하는 웹페이지입니다. HTML·CSS·JavaScript로 구성한 첫 MVP 초안이며, 팀 Spring Boot API에 맞춘 연결 코드를 포함합니다.

## 로컬 실행

Node.js 22 이상을 설치한 후 이 레포 폴더에서 실행합니다.

```sh
npm start
```

브라우저에서 `http://127.0.0.1:4187/`을 엽니다. 외부 패키지 설치 과정은 필요하지 않습니다. 기본 화면은 `config.js`에 지정한 백엔드를 호출합니다. 백엔드 없이 디자인을 보려면 `http://127.0.0.1:4187/?demo=1`을 엽니다. 연결 실패 시 예시 데이터로 자동 전환하지 않습니다.

```sh
npm test
```

수업 경계, 연속 수업, 빈 요일, 범위 밖 수업과 함께 API 응답 변환, 한글 쿼리, 미배정 검증 실패, 요청 취소를 검증합니다. API 테스트는 실제 Java 응답 구조에 맞춘 테스트 응답을 사용하며, 실제 서버의 시간표 자료를 검증한 것은 아닙니다.

## 화면과 데이터

- PC에서는 월~금 시간표를 함께 표시하고, 690px 이하에서는 요일 버튼으로 전환합니다.
- 건물 변경 시 강의실 목록과 선택값을 함께 갱신합니다.
- 예시 A관 301호는 자료 미확보 상태입니다. 시간표 준비 안내를 표시합니다.
- 수업이 없는 예시 A관 203호의 화·목요일은 확인된 빈 요일로 표시합니다.
- 서버 자료의 표시 범위는 09:00~24:00이며, 자정 이후 수업은 표시하지 않습니다. 가상 데이터의 범위는 09:00~18:00입니다.
- 수업 미배정은 시간표 기준이며 공간 이용 조건과 실제 점유 여부는 별도 확인이 필요합니다.

| 파일 | 역할 |
| --- | --- |
| `index.html` | 화면 구조와 접근성 라벨 |
| `styles.css` | 색상·여백·반응형 시간표 |
| `app.js` | 선택 동작, 화면 상태, 시간표 표시 |
| `demo-data.js` | 가상 건물·강의실·수업 데이터 |
| `config.js` | 백엔드 주소, 서버 학기 안내 문구 |
| `api.js` | API 호출, 교시 변환, 서버의 미배정 구간 확인 |
| `schedule.js` | 미배정 구간 계산과 시간표 검증 |
| `scripts/serve.mjs` | 로컬 미리보기 서버 |

## Spring Boot 연결 방법

확인한 백엔드: [jhyhack/campusflow](https://github.com/jhyhack/campusflow), 커밋 `be9e885ec277c8410841a33eff7f3b533456e16f`.

1. 백엔드 담당자가 Java 21·Maven으로 서버를 실행하고 `CAMPUS_DATA_DIR`에 실제 시간표 JSON 경로를 설정합니다. 자세한 빌드 방법은 백엔드 README를 따릅니다.
2. **백엔드 실행 터미널에서**, 서버 실행 전에 아래 환경 변수를 설정합니다. 현재 백엔드 기본 CORS는 프론트 5173 포트만 허용하므로 이 설정이 필요합니다.

   ```powershell
   $env:CAMPUS_CORS_ALLOWED_ORIGINS = 'http://127.0.0.1:4187,http://localhost:4187'
   ```

3. 프론트 `config.js`의 `apiBaseUrl`을 확인합니다. 같은 PC에서는 기본 `http://127.0.0.1:8080`을 사용합니다. 다른 팀원의 PC에서 실행 중인 서버는 그 PC의 접근 가능한 주소가 필요합니다. `localhost`는 각자 자신의 PC를 가리킵니다.
4. 프론트 폴더에서 `npm start` 후 건물 → 강의실 → 주간 시간표를 확인합니다. `localhost` 주소 대신 **GitHub 저장소 링크를 API 주소로 넣으면 안 됩니다.** GitHub는 소스를 보관하며 API는 실행 중인 Spring Boot 서버가 제공합니다.

| 화면 동작 | 실제 API |
| --- | --- |
| 건물 선택 목록 | `GET /api/buildings` → `buildings[].name` |
| 선택 건물의 강의실 목록 | `GET /api/rooms?building=건물명` → `rooms[].name` |
| 강의실 주간 수업 | `GET /api/schedule?building=건물명&room=강의실명` → `lessons[]` |
| 각 빈 구간의 미배정 확인 | `GET /api/rooms/available?building=건물명&day=1&start=10:00&end=12:00` → `rooms[]` |

이름을 식별자로 사용하고 쿼리는 `URLSearchParams`로 인코딩합니다. 수업은 `title`, `slot.day`(월=1), `slot.first`, `slot.last`를 읽습니다. 1교시는 09:00~10:00이며 연속 교시는 마지막 교시 종료까지 표시합니다. 응답에 층과 학기 필드는 없으므로 임의로 만들지 않습니다. 기준 학기는 '서버에 불러온 학기'로 안내합니다.

`status`의 `free/busy/unknown`은 현재 한 시각의 판정입니다. 주간 전체의 자료 완전성을 의미하지 않으므로, 수업 사이 구간은 검색 API에서 해당 강의실이 반환될 때만 초록색 미배정으로 표시합니다. 결과에 없거나 확인 요청이 실패하면 회색 확인 불가로 표시합니다. 큰 구간 일부가 불확실하면 전체 구간을 확인 불가로 표시하는 보수적인 방식입니다. 한 강의실을 열 때 빈 구간 수만큼 추가 GET 요청이 발생합니다.

로딩, 빈 목록, 404, 서버 연결 실패, 15초 응답 지연, 재시도를 처리하며 빠르게 선택을 바꾸면 이전 요청은 취소합니다. 겹치는 수업은 원본 확인이 필요한 오류로 안내합니다.

## 팀과 남은 확인 사항

- 실제 시간표 JSON을 불러온 서버에서 건물명·강의실명·수업 시각·확인 불가 판정 대조
- 백엔드 배포 HTTPS 주소와 프론트 배포 출처 공유 후 `apiBaseUrl`·`CAMPUS_CORS_ALLOWED_ORIGINS` 설정
- 빈 구간 추가 호출을 줄이려면 주간 시간표 API에 요일·구간별 확인 상태를 포함하도록 후속 협의
- 요일·시간 조건 검색 UI는 아직 추가하지 않았습니다. 이번 연결 범위는 건물 → 강의실 → 주간 시간표입니다.
- 이 프론트에는 관리용 `/api/reload`, `/api/import` 호출을 추가하지 않습니다.

## 디자인 참고

- [oh-my-design의 Toss](https://oh-my-design.kr/design-systems/toss)에서 밝은 바탕, 글자 위계, 여백을 참고했습니다.
- [Recent의 AI Spreadsheet Fill](https://recent.design/i/1pd6afn-ai-spreadsheet-fill-interaction)에서 얇은 표 구분선과 상태 표현을 참고했습니다.

Campus Flow에 맞춰 파란색 강조, 48px 입력창, 12px 모서리, 수업·미배정·자료 없음의 세 상태를 구성했습니다. 글꼴은 각 기기의 시스템 한글 글꼴로 표시됩니다.

## Render 정적 배포

Static Site에 이 레포의 배포할 브랜치를 연결합니다. Build Command는 `echo static-site`, Publish Directory는 `.`으로 설정합니다. 배포 전에 `config.js`의 API 주소를 백엔드 HTTPS 주소로 바꾸고 백엔드 CORS에 프론트 출처를 등록합니다. 이 구성은 빌드 도구가 없으므로 Render 환경 변수만 추가해도 브라우저의 `config.js` 값이 자동 변경되지는 않습니다. 실제 배포와 실데이터 통합 검증은 아직 하지 않았습니다.
