import * as state from './state.js';
import * as dom from './dom.js';
import { renderRoster } from './ui.js';
import { categoryOrder } from './constants.js';

// --- Modal Handling ---

export function showRosterCodeModal() {
    // Generate and display the export code
    const roster = state.getActiveRoster();
    if (!roster) return;

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

    dom.rosterCodeDisplay.value = fullCode;

    // Set title and show modal
    dom.rosterCodeModalTitle.textContent = '로스터 코드';
    dom.rosterCodeInput.value = ''; // Clear previous import input
    dom.rosterCodeModal.style.display = 'flex';
}

export function closeRosterCodeModal() {
    dom.rosterCodeModal.style.display = 'none';
}

// --- Core Functions ---

export function importRosterCode() {
    const code = dom.rosterCodeInput.value.trim();
    if (!code) {
        alert('코드를 입력하세요.');
        return;
    }

    const codeParts = code.split('#');
    let newRosterName;
    let mainCode;

    if (codeParts.length > 1) {
        newRosterName = decodeURIComponent(codeParts[0]);
        mainCode = codeParts.slice(1).join('#');
    } else {
        mainCode = code;
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

        // Set faction
        roster.faction = factionCode || 'RDL';
        dom.factionSelect.value = roster.faction;

        // Import Units
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

        // Import Drones
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

        // Import Tactical Cards
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
        alert(`'${newRosterName}' 로스터를 성공적으로 불러왔습니다.`);

    } catch (error) {
        console.error('Failed to import roster:', error);
        alert('로스터 코드를 불러오는 데 실패했습니다. 코드 형식이 올바른지 확인하세요.');
        // Revert to a stable state if import fails
        state.deleteActiveRoster();
    }
}

export function copyCodeToClipboard() {
    dom.rosterCodeDisplay.select();
    document.execCommand('copy');
    alert('코드가 클립보드에 복사되었습니다.');
}
