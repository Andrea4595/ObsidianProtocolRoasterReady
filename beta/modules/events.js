import * as dom from './dom.js';
import * as state from './state.js';
import { openDroneModal, closeModal, openTacticalCardModal, openModal, closeCardDetailModal } from './modal.js';
import { setGameMode } from './gameMode.js';
import { handleExportImage } from './imageExporter.js';
import { renderRoster, updateRosterSelect, adjustOverlayWidths } from './ui.js';
import { ROSTER_SELECT_ACTIONS } from './constants.js';

export function setupEventListeners() {
    dom.addUnitButton.addEventListener('click', () => {
        if (state.isGameMode) return;
        state.getActiveRoster().units[state.nextUnitId] = {};
        state.calculateNextIds();
        renderRoster();
        state.saveAllRosters();
    });

    dom.addDroneButton.addEventListener('click', openDroneModal);

    dom.addTacticalCardButton.addEventListener('click', openTacticalCardModal);

    

    dom.modalClose.addEventListener('click', closeModal);
    dom.modalOverlay.addEventListener('click', (event) => {
        if (event.target === dom.modalOverlay) closeModal();
    });

    // Card Detail Modal
    const cardDetailModal = document.getElementById('card-detail-modal');
    const cardDetailClose = document.getElementById('card-detail-close');

    if (cardDetailModal && cardDetailClose) {
        cardDetailClose.addEventListener('click', closeCardDetailModal);
        cardDetailModal.addEventListener('click', (event) => {
            if (event.target === cardDetailModal) closeCardDetailModal();
        });
    }

    const handleNewRoster = () => {
        const name = prompt('새 로스터의 이름을 입력하세요:', '새 로스터');
        if (name) {
            if (!state.addNewRoster(name)) {
                alert('이미 존재하는 이름입니다.');
                dom.rosterSelect.value = state.activeRosterName;
            }
        } else {
            dom.rosterSelect.value = state.activeRosterName;
        }
    };

    dom.rosterSelect.addEventListener('change', (e) => {
        if (e.target.value === ROSTER_SELECT_ACTIONS.NEW) {
            handleNewRoster();
        } else {
            state.switchActiveRoster(e.target.value);
        }
    });

    dom.renameRosterBtn.addEventListener('click', () => {
        const oldName = state.activeRosterName;
        const newName = prompt('새로운 이름을 입력하세요:', oldName);
        if (newName && newName !== oldName) {
            if (!state.renameActiveRoster(newName)) {
                alert('이미 존재하는 이름입니다.');
            }
        }
    });

    dom.deleteRosterBtn.addEventListener('click', () => {
        if (Object.keys(state.allRosters).length <= 1) {
            alert('마지막 로스터는 삭제할 수 없습니다.');
            return;
        }
        if (confirm(`'${state.activeRosterName}' 로스터를 정말로 삭제하시겠습니까?`)) {
            state.deleteActiveRoster();
        }
    });

    dom.exportImageBtn.addEventListener('click', handleExportImage);
    dom.gameModeBtn.addEventListener('click', () => setGameMode(true));
    dom.exitGameModeBtn.addEventListener('click', () => setGameMode(false));

    dom.factionSelect.addEventListener('change', (e) => {
        if (state.isGameMode) return;
        const newFaction = e.target.value;
        state.getActiveRoster().faction = newFaction;
        state.saveAllRosters();
    });

    document.addEventListener('contextmenu', (event) => {
        const target = event.target;
        if (target.tagName === 'IMG' && (target.closest('.unit-row') || target.closest('#drones-container') || target.closest('.modal-image-container') || target.closest('.sub-cards-container') || target.closest('#card-detail-content'))) {
            event.preventDefault();
        }
    });

    window.addEventListener('resize', adjustOverlayWidths);
}
