import * as dom from './dom.js';
import * as state from './state.js';
import { Roster } from './Roster.js';
// import { renderRoster } from './ui.js'; // Removed direct import of renderRoster
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

export async function performActionAndPreserveScroll(action, eventTarget = null) {
    // Capture scroll from .unit-entry elements, not .unit-row, as .unit-entry has overflow-x: auto
    const allUnitEntries = document.querySelectorAll('.unit-entry');
    const unitScrolls = Array.from(allUnitEntries).map(entry => ({
        id: entry.dataset.unitId,
        scrollLeft: entry.scrollLeft
    }));
    const windowScroll = {
        y: window.scrollY,
        x: window.scrollX
    };

    await action(); // Executes the UI update (which calls state mutation functions that dispatch events)

    // Force a repaint/reflow here to make sure visual updates are applied immediately
    // before scroll restoration, potentially reducing perceived delay.
    if (eventTarget && eventTarget.offsetHeight !== undefined) {
        void eventTarget.offsetHeight; // Force reflow, but don't use the value
    }
    // state.saveAllRosters(); // Removed: state mutation functions now handle saving via event dispatch

    // Use setTimeout to ensure the browser has completed layout calculations
    // for the new elements before we try to restore scroll positions.
    setTimeout(() => {
        unitScrolls.forEach(scrollInfo => {
            if (scrollInfo.id) {
                // Restore scroll to the .unit-entry element
                const newUnitEntry = document.querySelector(`.unit-entry[data-unit-id='${scrollInfo.id}']`);
                if (newUnitEntry) {
                    newUnitEntry.scrollLeft = scrollInfo.scrollLeft;
                }
            }
        });
        window.scrollTo(windowScroll.x, windowScroll.y);
    }, 0);
}

const initializeSubCards = (rosterToInitialize) => { // Renamed parameter for clarity
    // Roster에 있는 모든 카드를 한 배열에 모읍니다.
    const allCardsInRoster = [];
    Object.values(rosterToInitialize.units).forEach(unit => allCardsInRoster.push(...Object.values(unit)));
    allCardsInRoster.push(...rosterToInitialize.drones);
    rosterToInitialize.drones.forEach(drone => {
        if (drone && drone.backCard) {
            allCardsInRoster.push(drone.backCard);
        }
    });

    // Ensure subCards array exists on the roster if it doesn't
    rosterToInitialize.subCards = rosterToInitialize.subCards || [];

    const processedFileNames = new Set([
        ...rosterToInitialize.drones.map(d => d.fileName),
        ...rosterToInitialize.tacticalCards.map(t => t.fileName)
    ]);

    allCardsInRoster.forEach(card => {
        // `resolvedSubCards`는 `state.js`에서 생성되며 전체 카드 객체를 포함합니다.
        if (card && card.resolvedSubCards) {
            card.resolvedSubCards.forEach(subCardData => {
                if (subCardData && !processedFileNames.has(subCardData.fileName)) {
                    const subCardInstance = JSON.parse(JSON.stringify(subCardData));

                    if (subCardInstance.category === 'Drone') {
                        subCardInstance.rosterId = `sub-drone-${subCardInstance.fileName}`;
                        rosterToInitialize.drones.push(subCardInstance);
                    } else {
                        // 다른 타입의 서브카드는 별도의 배열에 추가
                        subCardInstance.rosterId = `sub-card-${subCardInstance.fileName}`;
                        rosterToInitialize.subCards.push(subCardInstance);
                    }
                    processedFileNames.add(subCardInstance.fileName);
                }
            });
        }
    });
};

const initializeCardStates = (rosterToInitialize) => {
    const allCardsInGame = [];
    Object.values(rosterToInitialize.units).forEach(unit => allCardsInGame.push(...Object.values(unit)));
    allCardsInGame.push(...rosterToInitialize.drones);
    if (rosterToInitialize.subCards) { // 서브카드가 있을 경우에만 추가
        allCardsInGame.push(...rosterToInitialize.subCards);
    }
    if (rosterToInitialize.tacticalCards) {
        allCardsInGame.push(...rosterToInitialize.tacticalCards);
    }
    rosterToInitialize.drones.forEach(drone => {
        if (drone.backCard) {
            allCardsInGame.push(drone.backCard);
        }
    });

    allCardsInGame.forEach(card => {
        if (!card) return;
        // Only initialize if undefined, preserving existing values
        card.cardStatus = card.cardStatus !== undefined ? card.cardStatus : 0;
        card.currentAmmunition = card.currentAmmunition !== undefined ? card.currentAmmunition : (card.ammunition || 0);
        card.currentIntercept = card.currentIntercept !== undefined ? card.currentIntercept : (card.intercept || 0);
        card.currentLink = card.currentLink !== undefined ? card.currentLink : (card.link || 0);
        card.isCharged = card.isCharged !== undefined ? card.isCharged : false;
        card.isBlackbox = card.isBlackbox !== undefined ? card.isBlackbox : false;
        card.isRevealedInGameMode = card.isRevealedInGameMode !== undefined ? card.isRevealedInGameMode : (!card.hidden); // hidden 카드만 false, 아니면 true

        // Ensure rosterId is set if missing (should be handled by deserialize, but as a fallback)
        if (!card.rosterId) {
            card.rosterId = `${card.category}_${card.name}_${Math.random().toString(36).substr(2, 9)}`;
        }
    });
};

// No longer creates a deep copy, instead prepares the active roster for game mode
const prepareActiveRosterForGameMode = (roster) => {
    // Ensure subCards array exists for the active roster
    roster.subCards = roster.subCards || [];

    // Reset unit isOut status if it exists
    Object.values(roster.units).forEach(unit => {
        if (unit.isOut !== undefined) {
            unit.isOut = false;
        }
    });

    initializeSubCards(roster);
    initializeCardStates(roster); // Apply defaults / ensure existence
    
    // Apply rules that might depend on fully initialized card states
    Object.values(roster.units).forEach(unit => applyUnitRules(unit));
    roster.drones.forEach(drone => applyDroneRules(drone));

    return roster; // Return reference to the same roster
};

export function setGameMode(enabled) {
    if (enabled) {
        const activeRoster = state.getActiveRoster();
        // 깊은 복사본 생성
        const rosterData = activeRoster.serialize();
        const gameRosterInstance = Roster.deserialize(activeRoster.name, rosterData, state.allCards.byName);
        
        prepareActiveRosterForGameMode(gameRosterInstance);
        state.setGameRosterState(gameRosterInstance);
    } else {
        // 종료 시 플래그를 먼저 꺼서 getActiveRoster()가 원본을 보게 한 뒤 저장합니다.
        state.setGameMode(false);
        state.saveAllRosters();
        state.setGameRosterState({});
        return;
    }
    state.setGameMode(enabled);
}