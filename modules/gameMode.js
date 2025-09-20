import * as dom from './dom.js';
import * as state from './state.js';
import { renderRoster } from './ui.js';
import { applyUnitRules, applyDroneRules, unitHasAbility } from './rules.js';

const cardStatusTransitions = {
    drone: {
        0: (hasFrame) => hasFrame ? 1 : 2,
        1: () => 2,
        2: () => 0,
    },
    unit: {
        0: (hasFrame) => hasFrame ? 1 : 2,
        1: () => 2,
        2: (unit) => unitHasAbility(unit, 'can_repair') ? 3 : 0, // 수리 가능 여부 확인
        3: () => 0,
    }
};

export function advanceCardStatus(card, unit) {
    if (!card) return;

    const currentStatus = card.cardStatus || 0;
    const cardType = card.category === 'Drone' ? 'drone' : 'unit';
    const hasFrame = card.frame === true;

    const nextStateFn = cardStatusTransitions[cardType][currentStatus];

    if (nextStateFn) {
        let arg;
        if (cardType === 'unit') {
            if (currentStatus === 0) {
                arg = hasFrame;
            } else if (currentStatus === 2) {
                arg = unit;
            }
        } else if (cardType === 'drone') {
            if (currentStatus === 0) {
                arg = hasFrame;
            }
        }
        card.cardStatus = nextStateFn(arg);
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

const initializeSubDrones = (gameRoster) => {
    const allUnitAndDroneCards = [];
    Object.values(gameRoster.units).forEach(unit => allUnitAndDroneCards.push(...Object.values(unit)));
    allUnitAndDroneCards.push(...gameRoster.drones);

    const processedSubDrones = new Set(gameRoster.drones.map(d => d.fileName));
    allUnitAndDroneCards.forEach(card => {
        if (card && card.subCards) {
            card.subCards.forEach(subCardFileName => {
                const subCardData = state.allCards.byFileName.get(subCardFileName);
                if (subCardData && subCardData.category === 'Drone' && !processedSubDrones.has(subCardFileName)) {
                    const subDroneInstance = JSON.parse(JSON.stringify(subCardData));
                    subDroneInstance.rosterId = `sub-drone-${subCardFileName}`;
                    gameRoster.drones.push(subDroneInstance);
                    processedSubDrones.add(subCardFileName);
                }
            });
        }
    });
};

const initializeCardStates = (gameRoster) => {
    const allCardsInGame = [];
    Object.values(gameRoster.units).forEach(unit => allCardsInGame.push(...Object.values(unit)));
    allCardsInGame.push(...gameRoster.drones);
    if (gameRoster.tacticalCards) {
        allCardsInGame.push(...gameRoster.tacticalCards);
    }
    gameRoster.drones.forEach(drone => {
        if (drone.backCard) {
            allCardsInGame.push(drone.backCard);
        }
    });

    allCardsInGame.forEach(card => {
        if (!card) return;
        card.cardStatus = 0;
        if (card.ammunition > 0) card.currentAmmunition = card.ammunition;
        if (card.intercept > 0) card.currentIntercept = card.intercept;
        if (card.link > 0) card.currentLink = card.link;
        if (card.charge) card.isCharged = false;
        card.isBlackbox = false;
        if (card.hidden) {
            card.isConcealed = true;
        }
    });
};

const createGameRosterState = (roster) => {
    const gameRoster = JSON.parse(JSON.stringify(roster));

    initializeSubDrones(gameRoster);

    // Apply special rules before initializing for game mode
    Object.values(gameRoster.units).forEach(unit => {
        applyUnitRules(unit);
        unit.isOut = false; // 유닛 파괴 상태 초기화
    });
    gameRoster.drones.forEach(drone => applyDroneRules(drone));

    initializeCardStates(gameRoster);

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
