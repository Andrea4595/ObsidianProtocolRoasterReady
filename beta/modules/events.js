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
    dom.gameModeBtn.addEventListener('click', () => setGameMode(true));
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

    // Event delegation for change and drop buttons on dynamically added unit cards
    dom.unitsContainer.addEventListener('click', async (e) => {
        const changeButton = e.target.closest(`.${CSS_CLASSES.CHANGE_BUTTON}`);
        const dropButton = e.target.closest(`.${CSS_CLASSES.DROP_BUTTON}`);

                    if (changeButton) {
                        e.stopPropagation();
        
                        const unitId = parseInt(changeButton.dataset.unitId);
                        const cardCategory = changeButton.dataset.cardCategory;
        
                        if (isNaN(unitId) || !cardCategory) {
                            console.error('Missing unitId or cardCategory for change button action.');
                            return;
                        }
        
                        const rosterState = state.getActiveRoster();
                        const unitData = rosterState.units[unitId];
                        if (!unitData) {
                            console.error(`Unit data not found for unitId: ${unitId}`);
                            return;
                        }
                        const cardData = unitData[cardCategory];
                        if (!cardData) {
                            console.error(`Card data not found for category: ${cardCategory} in unitId: ${unitId}`);
                            return;
                        }
            performActionAndPreserveScroll(
                async () => {
                    const currentCard = unitData[cardCategory];
                    const cycle = [currentCard.fileName, ...currentCard.changes];
                    const currentIndex = cycle.indexOf(currentCard.fileName);
                    const nextFileName = cycle[(currentIndex + 1) % cycle.length];
                    const newCardDataTemplate = state.allCards.byFileName.get(nextFileName);
                    if (!newCardDataTemplate) return;

                    // Define the runtime properties that should be carried over to the new card.
                    const runtimePropsToPreserve = {
                        cardStatus: currentCard.cardStatus,
                        currentAmmunition: currentCard.currentAmmunition,
                        currentIntercept: currentCard.currentIntercept,
                        isDropped: currentCard.isDropped,
                        rosterId: currentCard.rosterId,
                        isBlackbox: currentCard.isBlackbox,
                        isCharged: currentCard.isCharged
                    };

                    // Filter out any properties that are undefined on the current card
                    // to avoid accidentally overwriting values on the new template.
                    const preservedProps = Object.fromEntries(
                        Object.entries(runtimePropsToPreserve).filter(([_, v]) => v !== undefined)
                    );
                    
                    // Create a new card object by combining the template and preserved runtime state.
                    const newCard = { ...newCardDataTemplate, ...preservedProps };

                    // Replace the old card object in the unit's state with the new one.
                    state.updateUnitCard(unitId, cardCategory, newCard); // Use state mutation function
                    // UI update for unit is now handled by ui.js reacting to 'unitCardUpdated' event.
                },
                changeButton // eventTarget
            );        }

        if (dropButton) {
            e.stopPropagation();

            const unitId = parseInt(dropButton.dataset.unitId);
            const cardCategory = dropButton.dataset.cardCategory;

            if (isNaN(unitId) || !cardCategory) {
                console.error('Missing unitId or cardCategory for drop button action.');
                return;
            }

            const rosterState = state.getActiveRoster();
            const unitData = rosterState.units[unitId];
            if (!unitData) {
                console.error(`Unit data not found for unitId: ${unitId}`);
                return;
            }
            const cardData = unitData[cardCategory];
            if (!cardData) {
                console.error(`Card data not found for category: ${cardCategory} in unitId: ${unitId}`);
                return;
            }

            performActionAndPreserveScroll(
                async () => { // action
                    state.toggleCardIsDropped(unitId, cardCategory); // Use state mutation function
                    // UI update for unit is now handled by ui.js reacting to 'unitCardStatusChanged' event.
                },
                dropButton // eventTarget
            );        }
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
