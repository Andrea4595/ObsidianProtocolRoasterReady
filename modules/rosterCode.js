import * as state from './state.js';
import * as dom from './dom.js';
import { renderRoster } from './ui.js';
import { categoryOrder } from './constants.js';

// --- Compression Helpers ---




// --- Modal Handling ---

export async function showRosterCodeModal() {
    const roster = state.getActiveRoster();
    if (!roster) return;

    dom.rosterCodeDisplay.value = '';
    dom.rosterCodeModalTitle.textContent = '로스터 코드';
    dom.rosterCodeInput.value = '';
    dom.rosterCodeModal.style.display = 'flex';

    const encodedRosterName = encodeURIComponent(roster.name);
    const factionCode = roster.faction || 'RDL';

    const unitsCode = Object.values(roster.units).map(unit => {
        return categoryOrder.map(category => {
            const card = unit[category];
            return card ? card.name : '';
        }).join('/');
    }).join('|');

    const droneNames = roster.drones
        .filter(card => card && card.name)
        .map(card => {
            if (card.special?.includes('freight_back') && card.backCard) {
                return `${card.name}:${card.backCard.name}`;
            }
            return card.name;
        });
    const dronesCode = droneNames.length > 0 ? `Drone:${droneNames.join(',')}` : '';

    const tacticalNames = roster.tacticalCards
        .filter(card => card && card.name)
        .map(card => card.name);
    const tacticalCardsCode = tacticalNames.length > 0 ? `Tactical:${tacticalNames.join(',')}` : '';

    const dataCode = `${factionCode}~${unitsCode}~${dronesCode}~${tacticalCardsCode}`;
    const fullCode = `${encodedRosterName}#${dataCode}`;

    dom.rosterCodeDisplay.value = fullCode;
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
                        const key = `${category}_${modelId}`;
                        if (state.allCards.byName.has(key)) {
                            const card = { ...state.allCards.byName.get(key) };
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
                    const [droneName, backCardName] = modelId.split(':');
                    const key = `Drone_${droneName}`;
                    if (state.allCards.byName.has(key)) {
                        const card = { ...state.allCards.byName.get(key) };
                        if (backCardName) {
                            const backCardKey = `Back_${backCardName}`;
                            if (state.allCards.byName.has(backCardKey)) {
                                card.backCard = { ...state.allCards.byName.get(backCardKey) };
                            }
                        }
                        roster.drones.push(card);
                    }
                }
            });
        }

        if (tacticalCardsCode && tacticalCardsCode.startsWith('Tactical:')) {
            const modelIds = tacticalCardsCode.substring('Tactical:'.length).split(',');
            modelIds.forEach(modelId => {
                if (modelId) {
                    const key = `Tactical_${modelId}`;
                    if (state.allCards.byName.has(key)) {
                        const card = { ...state.allCards.byName.get(key) };
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
