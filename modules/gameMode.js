import * as dom from './dom.js';
import * as state from './state.js';
import { renderRoster } from './ui.js';

export function advanceCardStatus(card, unit) {
    if (!card) return;
    let currentStatus = card.cardStatus || 0;
    
    let hasFrame = card.frame === true;
    // Special rule for '앙세르' pilot
    if (unit && card.category === 'Chassis') {
        const pilot = unit.Pilot;
        if (pilot && pilot.special && pilot.special.includes('chassis_have_frame')) {
            hasFrame = true;
        }
    }

    const isDrone = card.category === 'Drone';

    if (isDrone) {
        if (currentStatus === 0) { card.cardStatus = hasFrame ? 1 : 2; }
        else if (currentStatus === 1) { card.cardStatus = 2; }
        else if (currentStatus === 2) { card.cardStatus = 0; }
    } else {
        if (currentStatus === 0) { card.cardStatus = hasFrame ? 1 : 2; }
        else if (currentStatus === 1) { card.cardStatus = 2; }
        else if (currentStatus === 2) { card.cardStatus = 3; }
        else if (currentStatus === 3) { card.cardStatus = 0; }
    }
}

export function performActionAndPreserveScroll(action, eventTarget) {
    const allUnitRows = document.querySelectorAll('.unit-row');
    const unitScrolls = Array.from(allUnitRows).map(row => ({
        id: row.parentElement.dataset.unitId,
        scrollLeft: row.scrollLeft
    }));
    const windowScroll = {
        y: window.scrollY,
        x: window.scrollX
    };

    action();

    renderRoster();

    requestAnimationFrame(() => {
        unitScrolls.forEach(scrollInfo => {
            if (scrollInfo.id) {
                const newUnitRow = document.querySelector(`.unit-entry[data-unit-id='${scrollInfo.id}'] .unit-row`);
                if (newUnitRow) {
                    newUnitRow.scrollLeft = scrollInfo.scrollLeft;
                }
            }
        });
        window.scrollTo(windowScroll.x, windowScroll.y);
    });
}

const createGameRosterState = (roster) => {
    const gameRoster = JSON.parse(JSON.stringify(roster));

    const allCardsInRoster = [];
    Object.values(gameRoster.units).forEach(unit => allCardsInRoster.push(...Object.values(unit)));
    allCardsInRoster.push(...gameRoster.drones);

    const processedSubDrones = new Set(gameRoster.drones.map(d => d.fileName));

    allCardsInRoster.forEach(card => {
        if (card && card.subCards) {
            card.subCards.forEach(subCardFileName => {
                const subCardData = state.allCards.byFileName.get(subCardFileName);
                if (subCardData && subCardData.category === 'Drone') {
                    if (!processedSubDrones.has(subCardFileName)) {
                        const subDroneInstance = JSON.parse(JSON.stringify(subCardData));
                        subDroneInstance.rosterId = `sub-drone-${subCardFileName}`;
                        gameRoster.drones.push(subDroneInstance);
                        processedSubDrones.add(subCardFileName);
                    }
                }
            });
        }
    });

    Object.values(gameRoster.units).forEach(unit => {
        Object.values(unit).forEach(card => {
            if (!card) return;
            card.cardStatus = 0;
            if (card.ammunition > 0) card.currentAmmunition = card.ammunition;
            if (card.intercept > 0) card.currentIntercept = card.intercept;
            if (card.charge) card.isCharged = false;
            card.isBlackbox = false;
        });
    });

    gameRoster.drones.forEach(drone => {
        drone.cardStatus = 0;
        if (drone.ammunition > 0) drone.currentAmmunition = drone.ammunition;
        if (drone.intercept > 0) drone.currentIntercept = drone.intercept;
        if (drone.charge) drone.isCharged = false;
        drone.isBlackbox = false;

        if (drone.backCard) {
            const backCard = drone.backCard;
            backCard.cardStatus = 0;
            if (backCard.ammunition > 0) backCard.currentAmmunition = backCard.ammunition;
            if (backCard.intercept > 0) backCard.currentIntercept = backCard.intercept;
            if (backCard.charge) backCard.isCharged = false;
            backCard.isBlackbox = false;
        }
    });

    return gameRoster;
};

export function setGameMode(enabled) {
    state.setGameMode(enabled);
    dom.rosterControls.style.display = enabled ? 'none' : 'flex';
    dom.rosterSummary.style.display = enabled ? 'none' : 'block';
    dom.gameModeHeader.style.display = enabled ? 'block' : 'none';
    dom.addButtonContainer.style.display = enabled ? 'none' : 'flex';
    dom.appTitle.textContent = enabled ? state.activeRosterName : '로스터';
    dom.appTitle.style.display = enabled ? 'block' : 'none';

    if (enabled) {
        const gameRoster = createGameRosterState(state.getActiveRoster());
        state.setGameRosterState(gameRoster);
    } else {
        state.setGameRosterState({});
    }
    renderRoster();
}