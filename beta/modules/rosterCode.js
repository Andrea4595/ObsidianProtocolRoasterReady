import * as state from './state.js';
import * as dom from './dom.js';
import { renderRoster } from './ui.js';
import { categoryOrder } from './constants.js';

// --- Compression Helpers ---

async function compressString(str) {
    const stream = new Blob([str], { type: 'text/plain' }).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const chunks = [];
    const reader = compressedStream.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    const blob = new Blob(chunks);

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',', 2)[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function decompressString(base64) {
    try {
        const blob = await (await fetch(`data:application/octet-stream;base64,${base64}`)).blob();
        const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
        const reader = stream.getReader();
        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }
        const decompressedBlob = new Blob(chunks);
        return await decompressedBlob.text();
    } catch (error) {
        console.error("Decompression failed:", error);
        return null; // Indicate failure
    }
}


// --- Modal Handling ---

export async function showRosterCodeModal() {
    const roster = state.getActiveRoster();
    if (!roster) return;

    dom.rosterCodeDisplay.value = '압축 중...';
    dom.rosterCodeModalTitle.textContent = '로스터 코드';
    dom.rosterCodeInput.value = '';
    dom.rosterCodeModal.style.display = 'flex';

    const encodedRosterName = encodeURIComponent(roster.name);
    const factionCode = roster.faction || 'RDL';

    const unitsCode = Object.values(roster.units).map(unit => {
        return categoryOrder.map(category => {
            const card = unit[category];
            return card ? card.cardId.split('_').slice(1).join('_') : '';
        }).join('/');
    }).join('|');

    const droneModelIds = roster.drones
        .filter(card => card && card.cardId)
        .map(card => card.cardId.split('_').slice(1).join('_'));
    const dronesCode = droneModelIds.length > 0 ? `Drone:${droneModelIds.join(',')}` : '';

    const tacticalModelIds = roster.tacticalCards
        .filter(card => card && card.cardId)
        .map(card => card.cardId.split('_').slice(1).join('_'));
    const tacticalCardsCode = tacticalModelIds.length > 0 ? `Tactical:${tacticalModelIds.join(',')}` : '';

    const dataCode = `${factionCode}~${unitsCode}~${dronesCode}~${tacticalCardsCode}`;
    const fullCode = `${encodedRosterName}#${dataCode}`;

    try {
        const compressed = await compressString(fullCode);
        dom.rosterCodeDisplay.value = `z;${compressed}`;
    } catch (error) {
        console.error("Compression failed, falling back to uncompressed:", error);
        dom.rosterCodeDisplay.value = fullCode;
    }
}

export function closeRosterCodeModal() {
    dom.rosterCodeModal.style.display = 'none';
}

// --- Core Functions ---

export async function importRosterCode() {
    const code = dom.rosterCodeInput.value.trim();
    if (!code) {
        alert('코드를 입력하세요.');
        return;
    }

    let mainCode = code;
    if (code.startsWith('z;')) {
        const compressedPart = code.substring(2);
        const decompressed = await decompressString(compressedPart);
        if (!decompressed) {
            alert('코드 압축 해제에 실패했습니다. 코드가 올바른지 확인하세요.');
            return;
        }
        mainCode = decompressed;
    }

    const codeParts = mainCode.split('#');
    let newRosterName;
    if (codeParts.length > 1) {
        newRosterName = decodeURIComponent(codeParts[0]);
        mainCode = codeParts.slice(1).join('#');
    } else {
        newRosterName = '가져온 로스터'; // Default name if not in code
    }

    let finalRosterName = newRosterName;
    let counter = 1;
    while (state.allRosters[finalRosterName]) {
        finalRosterName = `${newRosterName} (${counter})`;
        counter++;
    }

    state.addNewRoster(finalRosterName);
    const roster = state.getActiveRoster();
    roster.clear();

    try {
        const [factionCode, unitsCode, dronesCode, tacticalCardsCode] = mainCode.split('~');

        roster.faction = factionCode || 'RDL';
        dom.factionSelect.value = roster.faction;

        if (unitsCode) {
            const unitGroups = unitsCode.split('|');
            unitGroups.forEach((unitString, i) => {
                const unitId = i;
                roster.units[unitId] = {};
                const modelIds = unitString.split('/');
                modelIds.forEach((modelId, index) => {
                    if (modelId) {
                        const category = categoryOrder[index];
                        const cardId = `${category}_${modelId}`;
                        if (state.allCards.byCardId.has(cardId)) {
                            const card = { ...state.allCards.byCardId.get(cardId) };
                            roster.units[unitId][category] = card;
                        }
                    }
                });
            });
        }

        if (dronesCode && dronesCode.startsWith('Drone:')) {
            const modelIds = dronesCode.substring('Drone:'.length).split(',');
            modelIds.forEach(modelId => {
                if (modelId) {
                    const cardId = `Drone_${modelId}`;
                    if (state.allCards.byCardId.has(cardId)) {
                        const card = { ...state.allCards.byCardId.get(cardId) };
                        roster.drones.push(card);
                    }
                }
            });
        }

        if (tacticalCardsCode && tacticalCardsCode.startsWith('Tactical:')) {
            const modelIds = tacticalCardsCode.substring('Tactical:'.length).split(',');
            modelIds.forEach(modelId => {
                if (modelId) {
                    const cardId = `Tactical_${modelId}`;
                    if (state.allCards.byCardId.has(cardId)) {
                        const card = { ...state.allCards.byCardId.get(cardId) };
                        roster.tacticalCards.push(card);
                    }
                }
            });
        }

        state.calculateNextIds();
        renderRoster();
        state.saveAllRosters();
        closeRosterCodeModal();
        alert(`'${finalRosterName}' 로스터를 성공적으로 불러왔습니다.`);

    } catch (error) {
        console.error('Failed to import roster:', error);
        alert('로스터 코드를 불러오는 데 실패했습니다. 코드 형식이 올바른지 확인하세요.');
        state.deleteActiveRoster();
    }
}

export function copyCodeToClipboard() {
    dom.rosterCodeDisplay.select();
    document.execCommand('copy');
    alert('코드가 클립보드에 복사되었습니다.');
}
