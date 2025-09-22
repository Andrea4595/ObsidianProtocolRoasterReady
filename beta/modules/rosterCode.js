import * as state from './state.js';
import * as dom from './dom.js';
import { renderRoster } from './ui.js';

// --- Modal Handling ---

export function openRosterCodeModal(mode) {
    if (mode === 'export') {
        dom.rosterCodeModalTitle.textContent = '로스터 코드로 내보내기';
        dom.rosterCodeExportContainer.style.display = 'block';
        dom.rosterCodeImportContainer.style.display = 'none';
    } else {
        dom.rosterCodeModalTitle.textContent = '로스터 코드로 불러오기';
        dom.rosterCodeExportContainer.style.display = 'none';
        dom.rosterCodeImportContainer.style.display = 'block';
        dom.rosterCodeInput.value = ''; // Clear previous input
    }
    dom.rosterCodeModal.style.display = 'flex';
}

export function closeRosterCodeModal() {
    dom.rosterCodeModal.style.display = 'none';
}

// --- Core Functions ---

export function exportRosterCode() {
    const roster = state.getActiveRoster();
    if (!roster) return;

    const factionCode = roster.faction || 'RDL';

    const unitsCode = Object.values(roster.units).map(unit => {
        return Object.values(unit)
            .filter(card => card && card.cardId)
            .map(card => card.cardId)
            .join(',');
    }).join('|');

    const dronesCode = roster.drones
        .filter(card => card && card.cardId)
        .map(card => card.cardId)
        .join(',');

    const tacticalCardsCode = roster.tacticalCards
        .filter(card => card && card.cardId)
        .map(card => card.cardId)
        .join(',');

    const fullCode = `${factionCode}~${unitsCode}~${dronesCode}~${tacticalCardsCode}`;

    dom.rosterCodeDisplay.value = fullCode;
    openRosterCodeModal('export');
}

export function importRosterCode() {
    const code = dom.rosterCodeInput.value.trim();
    if (!code) {
        alert('코드를 입력하세요.');
        return;
    }

    const newRosterName = prompt('새 로스터의 이름을 입력하세요:', '가져온 로스터');
    if (!newRosterName) return; // User cancelled

    if (state.allRosters[newRosterName]) {
        if (!confirm(`'${newRosterName}'은(는) 이미 존재합니다. 덮어쓰시겠습니까?`)) {
            return;
        }
        state.switchActiveRoster(newRosterName);
    } else {
        state.addNewRoster(newRosterName);
    }

    const roster = state.getActiveRoster();
    roster.clear();

    try {
        const [factionCode, unitsCode, dronesCode, tacticalCardsCode] = code.split('~');

        // Set faction
        roster.faction = factionCode || 'RDL';
        dom.factionSelect.value = roster.faction;

        // Import Units
        if (unitsCode) {
            const unitGroups = unitsCode.split('|');
            unitGroups.forEach((unitCardIds, i) => {
                const unitId = i;
                roster.units[unitId] = {};
                const cardIds = unitCardIds.split(',');
                cardIds.forEach(cardId => {
                    if (state.allCards.byCardId.has(cardId)) {
                        const card = { ...state.allCards.byCardId.get(cardId) };
                        roster.units[unitId][card.category] = card;
                    }
                });
            });
        }

        // Import Drones
        if (dronesCode) {
            const droneIds = dronesCode.split(',');
            droneIds.forEach(cardId => {
                if (state.allCards.byCardId.has(cardId)) {
                    const card = { ...state.allCards.byCardId.get(cardId) };
                    roster.drones.push(card);
                }
            });
        }

        // Import Tactical Cards
        if (tacticalCardsCode) {
            const tacticalCardIds = tacticalCardsCode.split(',');
            tacticalCardIds.forEach(cardId => {
                if (state.allCards.byCardId.has(cardId)) {
                    const card = { ...state.allCards.byCardId.get(cardId) };
                    roster.tacticalCards.push(card);
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
