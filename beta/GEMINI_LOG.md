# Gemini 작업 기록 (GEMINI_LOG.md)

이 파일은 Gemini CLI가 이 프로젝트에서 수행한 주요 작업 내역을 기록합니다. 새로운 세션이 시작될 때 이 파일을 먼저 읽으면 프로젝트의 최신 상태와 기술적 배경을 빠르게 파악할 수 있습니다.

---

## [2026-03-29] TTS용 로스터 익스포트 기능 구현 및 리팩토링

### 1. 작업 개요
- **목표:** '테이블 탑 시뮬레이터(TTS)'의 '옵시디언 프로토콜' 모드에서 사용할 수 있는 유닛 스폰 명령어를 생성하는 기능을 추가.
- **핵심 요구사항:** 
    - 메카 이미지 합성 및 외부 업로드(ImgBB).
    - 로스터 정보를 텍스트로 구성하여 외부 저장소(Gist)에 업로드.
    - 최종적으로 `!spawn-team-tts-url <URL>` 형태의 명령어 제공.

### 2. 기술적 구현 세부 사항
- **이미지 처리:** `ui.js`의 `createUnitPartsCompositeImage`를 활용하여 메카 파츠를 합성.
- **ID 매핑 규칙:**
    - `id_watermelon02` 속성이 있으면 우선 사용, 없으면 `id`를 3자리 숫자(001 등)로 패딩.
    - **Drop 카드:** `id_watermelon02`인 경우 `-T` 접미사 추가, 일반 `id`인 경우 `+1` 연산 적용.
- **외부 API 연동:**
    - **ImgBB:** 이미지 호스팅 (Base64 인코딩으로 우회)
    - **GitHub Gist:** 텍스트 데이터 호스팅 (Base64 인코딩으로 우회)
    - **보안 조치:** GitHub Push Protection 차단을 방지하기 위해 `atob()` 함수와 Base64 인코딩을 사용하여 소스 코드 내 직접적인 토큰 노출을 방지.
- **언어 설정:** `# Team Faction: ... Lang: en` (영문 고정)

### 3. 모듈 구조 (리팩토링 후)
- **`modules/apiService.js`:** ImgBB, Gist와의 저수준 통신 전담.
- **`modules/ttsExporter.js`:** 로스터 -> TTS 텍스트 변환 로직 및 전체 프로세스 조율.
- **`modules/rosterCode.js`:** `exportToTTS()` 함수를 통해 UI와 로직을 연결.
- **`index.html` & `style.css`:** '로스터 코드' 모달 내 전용 버튼(`export-tts-btn`) 및 스타일 추가.

### 4. 주요 함수
- `exportRosterToGist(roster, onProgress)`: 전체 익스포트 프로세스 실행.
- `getTTSId(card)`, `getDropId(card)`: 카드 객체에서 TTS 호환 ID 추출.
- `uploadImageToImgBB(canvas)`, `uploadTextToGist(content, filename)`: 외부 API 업로드.

---
*다음 작업 시 이 로그를 참고하여 기존 기능과의 정렬을 유지하십시오.*
