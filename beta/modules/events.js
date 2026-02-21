import * as dom from './dom.js';
import * as state from './state.js';
import { openDroneModal, closeModal, openTacticalCardModal, openModal, closeCardDetailModal, openImageExportSettingsModal, closeImageExportSettingsModal, openSettingsModal, closeSettingsModal } from './modal.js';
import { setGameMode, performActionAndPreserveScroll } from './gameMode.js';
import { handleExportImage } from './imageExporter.js';
import { adjustOverlayWidths } from './ui.js'; // Imported separately
import { ROSTER_SELECT_ACTIONS, CSS_CLASSES } from './constants.js';
import { showRosterCodeModal, importRosterCode, closeRosterCodeModal, copyCodeToClipboard, downloadWatermelonJson } from './rosterCode.js';

export function setupEventListeners() {
    dom.addUnitButton.addEventListener('click', () => {
        if (state.isGameMode) return;
        const activeRoster = state.getActiveRoster();
        const newUnitId = activeRoster._nextUnitId++; // Use and increment the roster's internal counter
        state.addUnitToActiveRoster(newUnitId); // Use state mutation function
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

    // Roster Code Modal
    dom.rosterCodeBtn.addEventListener('click', showRosterCodeModal);
    dom.rosterCodeModalClose.addEventListener('click', closeRosterCodeModal);
    dom.copyRosterCodeBtn.addEventListener('click', copyCodeToClipboard);
    dom.downloadWatermelonJsonBtn.addEventListener('click', downloadWatermelonJson);
    dom.importRosterBtn.addEventListener('click', importRosterCode);
    dom.rosterCodeModal.addEventListener('click', (event) => {
        if (event.target === dom.rosterCodeModal) closeRosterCodeModal();
    });

    // Image Export Settings Modal
    dom.imageExportSettingsClose.addEventListener('click', closeImageExportSettingsModal);
    dom.cancelExportBtn.addEventListener('click', closeImageExportSettingsModal);
    dom.imageExportSettingsModal.addEventListener('click', (event) => {
        if (event.target === dom.imageExportSettingsModal) closeImageExportSettingsModal();
    });

    // Settings Modal
    dom.settingsBtn.addEventListener('click', openSettingsModal);
    dom.settingsClose.addEventListener('click', closeSettingsModal);
    dom.settingsModal.addEventListener('click', (event) => {
        if (event.target === dom.settingsModal) closeSettingsModal();
    });

    dom.generalSettingsForm.addEventListener('change', () => {
        const newSettings = {
            showUnitCompositeImage: dom.settingShowUnitCompositeImage.checked,
        };
        state.setSettings(newSettings); // This will dispatch 'settingsChanged' event
    });

    document.getElementById('setting-show-points').addEventListener('change', (event) => {
        const subSettings = document.getElementById('points-sub-settings');
        const isChecked = event.target.checked;
        subSettings.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.disabled = !isChecked;
            // Only force-check sub-options on a real user click
            if (isChecked && event.isTrusted) {
                checkbox.checked = true;
            } else if (!isChecked) {
                checkbox.checked = false;
            }
        });
    });

    document.getElementById('points-sub-settings').addEventListener('change', () => {
        const subSettings = document.getElementById('points-sub-settings');
        const subCheckboxes = subSettings.querySelectorAll('input[type="checkbox"]');
        const allUnchecked = Array.from(subCheckboxes).every(checkbox => !checkbox.checked);
        if (allUnchecked) {
            const mainToggle = document.getElementById('setting-show-points');
            mainToggle.checked = false;
            mainToggle.dispatchEvent(new Event('change'));
        }
    });

    const saveImageExportSettings = () => {
        const settings = {
            showTitle: document.getElementById('setting-show-title').checked,
            showDiscarded: document.getElementById('setting-show-discarded').checked,
            showPoints: document.getElementById('setting-show-points').checked,
            showTotalPoints: document.getElementById('setting-show-total-points').checked,
            showCardPoints: document.getElementById('setting-show-card-points').checked,
            showUnitPoints: document.getElementById('setting-show-unit-points').checked,
            showSubCards: document.getElementById('setting-show-sub-cards').checked,
            revealHidden: document.getElementById('setting-reveal-hidden').checked,
        };
        localStorage.setItem('imageExportSettings', JSON.stringify(settings));
        state.setImageExportSettings(settings); // Update state as well
    };

    dom.imageExportSettingsForm.addEventListener('change', saveImageExportSettings);

    dom.imageExportSettingsForm.addEventListener('change', saveImageExportSettings);

    dom.generateImageBtn.addEventListener('click', () => {
        saveImageExportSettings(); // Save one last time
        closeImageExportSettingsModal();
        handleExportImage(state.imageExportSettings, 'image/jpeg');
    });

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
            if (!state.renameRoster(oldName, newName)) { // Use state mutation function
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
            state.deleteRoster(state.activeRosterName); // Use state mutation function
        }
    });

    dom.exportImageBtn.addEventListener('click', openImageExportSettingsModal);
    dom.gameModeBtn.addEventListener('click', () => {
        setGameMode(true);
    });
    dom.exitGameModeBtn.addEventListener('click', () => setGameMode(false));

    dom.factionSelect.addEventListener('change', (e) => {
        if (state.isGameMode) return;
        const newFaction = e.target.value;
        state.setFactionForActiveRoster(newFaction); // Use state mutation function
    });

    document.addEventListener('contextmenu', (event) => {
        const target = event.target;
        if (target.tagName === 'IMG' && (target.closest('.unit-row') || target.closest('#drones-container') || target.closest('.modal-image-container') || target.closest('.sub-cards-container') || target.closest('#card-detail-content'))) {
            event.preventDefault();
        }
    });

    // 공통 카드 변경 로직 함수
    const handleCardChange = async (targetButton) => {
        const unitId = targetButton.dataset.unitId; // 드론은 문자열 ID, 유닛은 숫자 ID
        const cardCategory = targetButton.dataset.cardCategory;

        if (!unitId || !cardCategory) return;

        const activeRoster = state.isGameMode ? state.gameRoster : state.getActiveRoster();
        let currentCard;
        let updateFn;

        // 드론인지, 드론의 백팩인지, 아니면 유닛 부품인지 판별
        if (cardCategory === 'Drone') {
            currentCard = activeRoster.drones.find(d => d.rosterId === unitId);
            updateFn = (newCard) => {
                const idx = activeRoster.drones.findIndex(d => d.rosterId === unitId);
                if (idx !== -1) {
                    activeRoster.drones[idx] = newCard;
                    document.dispatchEvent(new CustomEvent('unitCardUpdated', { 
                        detail: { rosterId: unitId, cardCategory: 'Drone' } 
                    }));
                }
            };
        } else if (cardCategory === 'Back' && !activeRoster.units[parseInt(unitId)]) {
            // 드론의 백팩인 경우 (unitId로 검색했을 때 유닛이 없으면 드론으로 간주)
            const drone = activeRoster.drones.find(d => d.rosterId === unitId);
            if (drone && drone.backCard) {
                currentCard = drone.backCard;
                updateFn = (newCard) => {
                    drone.backCard = newCard;
                    document.dispatchEvent(new CustomEvent('unitCardUpdated', { 
                        detail: { rosterId: unitId, cardCategory: 'Back', isBackCard: true } 
                    }));
                };
            }
        } else {
            const numericUnitId = parseInt(unitId);
            const unitData = activeRoster.units[numericUnitId];
            if (!unitData) return;
            currentCard = unitData[cardCategory];
            updateFn = (newCard) => state.updateUnitCard(numericUnitId, cardCategory, newCard);
        }

        if (!currentCard || !currentCard.changes) return;

        performActionAndPreserveScroll(
            async () => {
                const cycle = [currentCard.fileName, ...currentCard.changes];
                const currentIndex = cycle.indexOf(currentCard.fileName);
                const nextFileName = cycle[(currentIndex + 1) % cycle.length];
                const newCardDataTemplate = state.allCards.byFileName.get(nextFileName);
                if (!newCardDataTemplate) return;

                const runtimePropsToPreserve = {
                    cardStatus: currentCard.cardStatus,
                    currentAmmunition: currentCard.currentAmmunition,
                    currentIntercept: currentCard.currentIntercept,
                    isDropped: currentCard.isDropped,
                    rosterId: currentCard.rosterId,
                    isBlackbox: currentCard.isBlackbox,
                    isCharged: currentCard.isCharged,
                    backCard: currentCard.backCard // 드론의 경우 백팩 정보 유지
                };

                const preservedProps = Object.fromEntries(
                    Object.entries(runtimePropsToPreserve).filter(([_, v]) => v !== undefined)
                );
                
                const newCard = { ...newCardDataTemplate, ...preservedProps };
                updateFn(newCard);
            },
            targetButton
        );
    };

    // 기체 목록의 변경 버튼
    dom.unitsContainer.addEventListener('click', async (e) => {
        const changeButton = e.target.closest(`.${CSS_CLASSES.CHANGE_BUTTON}`);
        if (changeButton) {
            e.stopPropagation();
            await handleCardChange(changeButton);
        }
        
        const dropButton = e.target.closest(`.${CSS_CLASSES.DROP_BUTTON}`);
        if (dropButton) {
            e.stopPropagation();
            const unitId = parseInt(dropButton.dataset.unitId);
            const cardCategory = dropButton.dataset.cardCategory;
            performActionAndPreserveScroll(
                async () => { state.toggleCardIsDropped(unitId, cardCategory); },
                dropButton
            );
        }
    });

    // 드론 목록의 변경 버튼 (추가)
    dom.dronesContainer.addEventListener('click', async (e) => {
        const changeButton = e.target.closest(`.${CSS_CLASSES.CHANGE_BUTTON}`);
        if (changeButton) {
            e.stopPropagation();
            await handleCardChange(changeButton);
        }
    });

    window.addEventListener('resize', adjustOverlayWidths);

    // Sticky summary logic
    const summary = dom.rosterSummary;
    const placeholder = dom.rosterSummaryPlaceholder;
    let summaryTop = summary.offsetTop;

    window.addEventListener('scroll', () => {
        // Update summaryTop on scroll to handle dynamic content changes, but not when sticky
        if (!summary.classList.contains('sticky')) {
            summaryTop = summary.offsetTop;
        }

        if (window.pageYOffset > summaryTop) {
            if (!summary.classList.contains('sticky')) {
                placeholder.style.height = `${summary.offsetHeight}px`;
                placeholder.style.display = 'block';
                summary.classList.add('sticky');
            }
        } else {
            if (summary.classList.contains('sticky')) {
                summary.classList.remove('sticky');
                placeholder.style.display = 'none';
            }
        }
    });
}
