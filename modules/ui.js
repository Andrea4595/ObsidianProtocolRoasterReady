import * as dom from './dom.js';
import * as state from './state.js';
import { applyUnitRules, applyDroneRules } from './rules.js';
import { createCardElement } from './cardRenderer.js';
import { createUnitElement } from './unitRenderer.js';
import { CSS_CLASSES } from './constants.js';

// --- Main Render Functions ---

export const updateTotalPoints = () => {
    const rosterState = state.getActiveRoster();
    if (!rosterState) return 0;
    let total = 0;
    Object.values(rosterState.units).forEach(unit => {
        Object.values(unit).forEach(card => {
            if (card) total += card.points || 0;
        });
    });
    rosterState.drones.forEach(drone => {
        if (drone) {
            total += drone.points || 0;
            if (drone.backCard) total += drone.backCard.points || 0;
        }
    });
    rosterState.tacticalCards.forEach(card => {
        if (card) total += card.points || 0;
    });
    dom.totalPointsSpan.textContent = total;
    return total;
};

export const renderRoster = () => {
    dom.unitsContainer.innerHTML = '';
    dom.dronesContainer.innerHTML = '';
    dom.tacticalCardsContainer.innerHTML = '';
    document.querySelectorAll(`.${CSS_CLASSES.SUB_CARDS_CONTAINER}`).forEach(el => el.remove());

    const rosterState = state.isGameMode ? state.gameRoster : state.getActiveRoster();
    if (!rosterState) return;

    if (!state.isGameMode) {
        Object.values(rosterState.units).forEach(unit => applyUnitRules(unit));
        rosterState.drones.forEach(drone => applyDroneRules(drone));
    }

    Object.keys(rosterState.units).forEach(unitId => {
        const unitElement = createUnitElement(parseInt(unitId), rosterState.units[unitId]);
        dom.unitsContainer.appendChild(unitElement);
    });

    rosterState.drones.forEach((droneData) => {
        if (droneData.rosterId == null) {
            droneData.rosterId = `d_${state.nextDroneId}`;
            state.setNextDroneId(state.nextDroneId + 1);
        }
        addDroneElement(droneData);
    });

    rosterState.tacticalCards.forEach((cardData) => {
        if (cardData.rosterId == null) {
            cardData.rosterId = `t_${state.nextTacticalCardId}`;
            state.setNextTacticalCardId(state.nextTacticalCardId + 1);
        }
        addTacticalCardElement(cardData);
    });

    if (state.isGameMode) {
        renderSubProjectiles(rosterState);
    }

    if (!state.isGameMode) {
        updateTotalPoints();
    }

    adjustOverlayWidths();
};

export const adjustOverlayWidths = () => {
    requestAnimationFrame(() => {
        // 한 프레임을 더 기다려서 브라우저의 레이아웃 계산이
        // 완전히 끝날 시간을 확실히 확보합니다.
        requestAnimationFrame(() => {
            document.querySelectorAll('.unit-out-overlay').forEach(overlay => {
                const unitRow = overlay.parentElement;
                if (unitRow) {
                    overlay.style.width = `${unitRow.scrollWidth}px`;
                }
            });
        });
    });
};

const renderSubProjectiles = (rosterState) => {
    const subProjectilesContainer = document.createElement('div');
    subProjectilesContainer.className = CSS_CLASSES.SUB_CARDS_CONTAINER;

    const projectileSubCards = state.getAllSubCards(rosterState);

    projectileSubCards.forEach(fileName => {
        const cardData = state.allCards.byFileName.get(fileName);
        if (cardData) {
            subProjectilesContainer.appendChild(createCardElement(cardData, false));
        }
    });

    if (subProjectilesContainer.hasChildNodes()) {
        dom.tacticalCardsContainer.after(subProjectilesContainer);
    }
};

export const updateRosterSelect = () => {
    dom.rosterSelect.innerHTML = '';
    Object.keys(state.allRosters).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        if (name === state.activeRosterName) option.selected = true;
        dom.rosterSelect.appendChild(option);
    });

    const newRosterOption = document.createElement('option');
    newRosterOption.value = '__NEW__';
    newRosterOption.textContent = '< 새 로스터 추가 >';
    dom.rosterSelect.appendChild(newRosterOption);
};

const addDroneElement = (droneData) => {
    dom.dronesContainer.appendChild(createCardElement(droneData));
};

const addTacticalCardElement = (cardData) => {
    dom.tacticalCardsContainer.appendChild(createCardElement(cardData));
};