/**
 * API 서비스 모듈
 * ImgBB 이미지 업로드 및 GitHub Gist 텍스트 업로드 기능을 담당합니다.
 */

// 토큰 초기화
let IMGBB_API_KEY = '';
let GIST_TOKEN = '';

/**
 * 환경 변수 및 로컬 env.js 파일로부터 토큰을 로드합니다.
 */
async function loadTokens() {
    // 1. 이미 로드되었는지 확인
    if (IMGBB_API_KEY && GIST_TOKEN) return;

    // 2. 환경 변수 확인 (빌드 도구나 특정 환경용)
    if (typeof process !== 'undefined' && process.env) {
        IMGBB_API_KEY = process.env.IMGBB_API_TOKEN || IMGBB_API_KEY;
        GIST_TOKEN = process.env.GIT_GIST_API_TOKEN || GIST_TOKEN;
    }

    // 3. env.js 로드 시도 (404 에러 방지를 위해 fetch로 존재 확인)
    try {
        const checkResponse = await fetch('./modules/env.js', { method: 'HEAD' });
        if (checkResponse.ok) {
            const localEnv = await import(`./env.js?t=${new Date().getTime()}`);
            if (localEnv && localEnv.env) {
                let { IMGBB_API_TOKEN, GIT_GIST_API_TOKEN, isEncoded } = localEnv.env;
                
                // 난독화된 경우 디코딩
                if (isEncoded) {
                    try {
                        IMGBB_API_TOKEN = atob(IMGBB_API_TOKEN);
                        GIT_GIST_API_TOKEN = atob(GIT_GIST_API_TOKEN);
                    } catch (e) {
                        console.error('토큰 디코딩 실패:', e);
                    }
                }

                if (IMGBB_API_TOKEN && !IMGBB_API_TOKEN.includes('여기에')) {
                    IMGBB_API_KEY = IMGBB_API_TOKEN.trim();
                }
                if (GIT_GIST_API_TOKEN && !GIT_GIST_API_TOKEN.includes('여기에')) {
                    GIST_TOKEN = GIT_GIST_API_TOKEN.trim();
                }
            }
        }
    } catch (e) {
        // 로드 실패 시 무시
    }
}

// 초기 로드
loadTokens();

/**
 * 지수 백오프를 이용한 재시도 로직이 포함된 fetch 함수
 */
async function fetchWithRetry(url, options = {}, retries = 3, backoff = 1000) {
    try {
        const response = await fetch(url, options);
        
        // 429(Too Many Requests)나 5xx 서버 에러일 때만 재시도
        if (!response.ok && (response.status === 429 || response.status >= 500) && retries > 0) {
            console.warn(`API 요청 실패 (${response.status}). ${backoff}ms 후 재시도... (남은 횟수: ${retries})`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        
        return response;
    } catch (error) {
        if (retries > 0) {
            console.warn(`네트워크 에러 발생. ${backoff}ms 후 재시도... (남은 횟수: ${retries})`, error);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw error;
    }
}

/**
 * 공통 API 호출 래퍼
 */
async function apiCall(url, options = {}) {
    const response = await fetchWithRetry(url, options);
    const result = await response.json();

    if (!response.ok) {
        const error = new Error(result.message || result.error?.message || '알 수 없는 API 오류');
        error.status = response.status;
        error.data = result;
        throw error;
    }

    return result;
}

/**
 * Uploads a canvas image to ImgBB and returns the URL.
 */
export async function uploadImageToImgBB(canvas) {
    if (!IMGBB_API_KEY) await loadTokens();
    if (!IMGBB_API_KEY) throw new Error('ImgBB API 키가 없습니다. modules/env.js를 확인하세요.');

    const base64Data = canvas.toDataURL('image/png').split(',')[1];
    const formData = new FormData();
    formData.append('image', base64Data);

    try {
        const result = await apiCall(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        return result.data.url;
    } catch (error) {
        if (error.status === 400 && error.data?.error?.message?.includes('Rate limit')) {
            throw new Error('ImgBB 요청 한도 초과! 약 15분 후에 다시 시도해 주세요.');
        }
        throw new Error(`ImgBB 업로드 실패: ${error.message}`);
    }
}

/**
 * Uploads text content to a private GitHub Gist and returns the raw URL.
 */
export async function uploadTextToGist(content, filename) {
    if (!GIST_TOKEN) await loadTokens();
    if (!GIST_TOKEN) throw new Error('Gist 토큰이 없습니다. modules/env.js를 확인하세요.');

    try {
        const result = await apiCall('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': `token ${GIST_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                description: 'TTS Roster Export',
                public: false,
                files: { [filename]: { content } }
            })
        });
        return result.files[filename].raw_url;
    } catch (error) {
        if (error.status === 401) {
            throw new Error('GitHub 인증 실패: 토큰이 만료되었거나 권한(gist)이 없습니다.');
        }
        throw new Error(`Gist 업로드 실패: ${error.message}`);
    }
}
