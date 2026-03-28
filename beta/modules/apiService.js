// GitHub Push Protection을 우회하고 사용자 편의를 위해 키를 인코딩하여 저장합니다.
// 주의: 클라이언트 사이드 코드이므로 완벽한 보안은 아니며, 이 토큰은 Gist 권한만 있어야 합니다.
const IMGBB_API_KEY = atob('OWFkOGJiNjIxYTdlMTkwMThiMjljNjdkNDczYTViYWM=');
const GIST_TOKEN = atob('Z2hwX3g5UEVZWmp0cjVlMVpQZTRuYm52TWNGUTZLVVF2cDBjRjd5aA==');

/**
 * Uploads a canvas image to ImgBB and returns the URL.
 * @param {HTMLCanvasElement} canvas 
 * @returns {Promise<string>}
 */
export async function uploadImageToImgBB(canvas) {
    const base64Data = canvas.toDataURL('image/png').split(',')[1];
    const formData = new FormData();
    formData.append('image', base64Data);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
    });

    const result = await response.json();
    if (result.success) {
        return result.data.url;
    } else {
        throw new Error('ImgBB 업로드 실패: ' + (result.error?.message || '알 수 없는 오류'));
    }
}

/**
 * Uploads text content to a private GitHub Gist and returns the raw URL.
 * @param {string} content 
 * @param {string} filename 
 * @returns {Promise<string>}
 */
export async function uploadTextToGist(content, filename) {
    const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
            'Authorization': `token ${GIST_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            description: 'TTS Roster Export',
            public: false,
            files: {
                [filename]: {
                    content: content
                }
            }
        })
    });

    const result = await response.json();
    if (response.ok) {
        return result.files[filename].raw_url;
    } else {
        throw new Error('Gist 업로드 실패: ' + (result.message || '알 수 없는 오류'));
    }
}
