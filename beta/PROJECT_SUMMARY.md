# 프로젝트 구조 요약 (Project Summary)

이 문서는 '옵시디언 프로토콜 로스터 앱'의 주요 스크립트 구조와 기능을 요약합니다.

## 핵심 파일 (Core Files)

### 1. `index.html`
- 애플리케이션의 기본 HTML 구조.
- 각종 모달(카드 상세, 로스터 코드, 이미지 내보내기 설정 등)의 컨테이너 정의.
- PWA 지원을 위한 `manifest.json` 및 `sw.js` 연결.

### 2. `script.js`
- 애플리케이션의 진입점(Entry Point).
- `state.js`의 `initializeApp`과 `events.js`의 `setupEventListeners`를 호출.
- 서비스 워커(Service Worker) 등록.

### 3. `modules/state.js` (상태 관리)
- **역할:** 로스터 데이터, 모든 카드 데이터, 사용자 설정 등을 관리하는 전역 상태 엔진.
- **주요 기능:**
    - `getActiveRoster()`: 현재 활성화된 로스터 반환.
    - `allCards`: 모든 카드 데이터를 카테고리별, ID별, 파일명별로 인덱싱하여 저장.
    - 로스터 추가, 삭제, 이름 변경 및 유닛/카드 업데이트 로직 포함.
    - `localStorage`를 통한 데이터 영속성 관리.

### 4. `modules/Roster.js` (데이터 모델)
- **역할:** 개별 로스터의 데이터 구조 정의.
- **구조:** `units`(메카), `drones`(드론), `tacticalCards`(전술 카드)를 포함하며, 고유 ID 관리 로직 포함.

### 5. `modules/ui.js` (UI 및 이미지 합성)
- **역할:** 로스터 화면 렌더링 및 복합 이미지 생성.
- **핵심 함수:**
    - `createUnitPartsCompositeImage(unitData, targetSize)`: 메카 파츠(토르소, 섀시 등)를 합성하여 하나의 캔버스 이미지 생성.
    - `renderRoster()`: 전체 로스터 UI 업데이트.

### 6. `modules/rosterCode.js` (코드 및 익스포트 로직)
- **역할:** 로스터를 문자열 코드로 변환하거나, 외부 형식(Watermelon)으로 내보내는 데이터 처리 담당.
- **주요 기능:**
    - `importRosterCode()`: 코드를 읽어 로스터 복구.
    - `downloadWatermelonJson()`: Watermelon02 앱 호환 형식의 JSON 다운로드.
    - `exportToTTS()`: TTS용 명령어를 생성 (출력은 `modal.js`의 `showTTSModal` 호출).

### 7. `modules/ttsExporter.js` (신설: TTS 전용)
- **역할:** 로스터 데이터를 TTS(Tabletop Simulator) 호환 텍스트 형식으로 변환.
- **주요 기능:**
    - 유닛 파츠 ID 추출 및 Drop 카드 매핑.
    - 이미지 합성 및 업로드 프로세스 총괄.

### 8. `modules/apiService.js` (신설: 외부 API)
- **역할:** 외부 서비스(ImgBB, Gist)와의 통신 전담.
- **주요 기능:**
    - `uploadImageToImgBB(canvas)`: 이미지를 ImgBB에 업로드.
    - `uploadTextToGist(content, filename)`: 텍스트를 Gist에 비공개로 업로드.

### 9. `modules/imageExporter.js` (이미지 내보내기)
- **역할:** 전체 로스터 정보를 포함한 고해상도 이미지(PNG/JPG) 생성.
- **기술:** `html2canvas`를 사용하여 DOM 요소를 캔버스로 변환.

### 10. `modules/events.js` (이벤트 핸들링)
- **역할:** 모든 버튼 클릭, 입력 변경 등 사용자 상호작용 이벤트 리스너 설정.
- **특징:** 로직의 실행을 `performActionAndPreserveScroll`로 감싸 스크롤 위치를 유지.

### 11. `modules/cardRenderer.js` (카드 렌더링)
- **역할:** 개별 카드의 HTML 요소 생성 및 렌더링 스타일 관리.

### 12. `modules/constants.js`
- 카테고리 순서(`categoryOrder`), CSS 클래스명 등 프로젝트 전반에서 사용되는 상수 정의.

---
## 개발 참고 사항
- **카드 ID:** `id_watermelon02`속성이 있으면 우선 사용하고, 없으면 `id`를 3자리(001 등)로 패딩하여 사용함.
- **TTS 익스포트:** 메카 이미지는 ImgBB에 업로드되며, 최종 로스터 데이터는 Gist에 텍스트 파일로 저장되어 `!spawn-team-tts-url` 명령어로 제공됨.
- **이미지 합성:** 메카 이미지는 `ui.js`의 `createUnitPartsCompositeImage`를 통해 동적으로 생성 가능.
- **모달 (`modal.js`):** 모든 모달(부품 선택, 카드 상세, 로스터 코드, TTS 명령어 등)의 표시 및 제어를 전담하며, 범용적인 모달 관리 기능을 제공함.
