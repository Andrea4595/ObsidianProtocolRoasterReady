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

const initializeSubCards = (gameRoster) => {
    // Roster에 있는 모든 카드를 한 배열에 모읍니다.
    const allCardsInRoster = [];
    Object.values(gameRoster.units).forEach(unit => allCardsInRoster.push(...Object.values(unit)));
    allCardsInRoster.push(...gameRoster.drones);
    gameRoster.drones.forEach(drone => {
        if (drone && drone.backCard) {
            allCardsInRoster.push(drone.backCard);
        }
    });

    const processedFileNames = new Set([
        ...gameRoster.drones.map(d => d.fileName),
        ...gameRoster.tacticalCards.map(t => t.fileName)
    ]);

    allCardsInRoster.forEach(card => {
        // `resolvedSubCards`는 `state.js`에서 생성되며 전체 카드 객체를 포함합니다.
        if (card && card.resolvedSubCards) {
            card.resolvedSubCards.forEach(subCardData => {
                if (subCardData && !processedFileNames.has(subCardData.fileName)) {
                    const subCardInstance = JSON.parse(JSON.stringify(subCardData));

                    if (subCardInstance.category === 'Drone') {
                        subCardInstance.rosterId = `sub-drone-${subCardInstance.fileName}`;
                        gameRoster.drones.push(subCardInstance);
                    } else {
                        // 다른 타입의 서브카드는 별도의 배열에 추가
                        subCardInstance.rosterId = `sub-card-${subCardInstance.fileName}`;
                        gameRoster.subCards.push(subCardInstance);
                    }
                    processedFileNames.add(subCardInstance.fileName);
                }
            });
        }
    });
};

const initializeCardStates = (gameRoster) => {
    const allCardsInGame = [];
    Object.values(gameRoster.units).forEach(unit => allCardsInGame.push(...Object.values(unit)));
    allCardsInGame.push(...gameRoster.drones);
    allCardsInGame.push(...gameRoster.subCards); // 서브카드 추가
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
    gameRoster.subCards = []; // 서브카드 배열 초기화

    initializeSubCards(gameRoster);

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
