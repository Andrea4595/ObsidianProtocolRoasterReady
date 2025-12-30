import * as dom from './dom.js';
import * as state from './state.js';
import { openModal } from './modal.js';
import { advanceCardStatus, performActionAndPreserveScroll } from './gameMode.js';
import { categoryOrder, CSS_CLASSES, CARD_DIMENSIONS } from './constants.js';
import { applyUnitRules, applyDroneRules } from './rules.js';
import { createCardElement as createCardElementFromRenderer } from './cardRenderer.js';

const createElementWithStyles = (tag, styles) => {
    const element = document.createElement(tag);
    Object.assign(element.style, styles);
    return element;
};

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
        renderSubCards(rosterState);
    }

    if (!state.isGameMode) {
        updateTotalPoints();
    }

    adjustOverlayWidths();
};

export const adjustOverlayWidths = () => {
    requestAnimationFrame(() => {
        document.querySelectorAll('.unit-out-overlay').forEach(overlay => {
            const unitRow = overlay.parentElement;
            if (unitRow && unitRow.scrollWidth > unitRow.clientWidth + 1) {
                overlay.style.width = `${unitRow.scrollWidth}px`;
            } else {
                overlay.style.width = '100%';
            }
        });
    });
};

const renderSubCards = (rosterState) => {
    if (!rosterState.subCards || rosterState.subCards.length === 0) return;

    const subCardsContainer = document.createElement('div');
    subCardsContainer.className = CSS_CLASSES.SUB_CARDS_CONTAINER;
    
    const subCardsTitle = document.createElement('h3');
    subCardsTitle.textContent = '서브 카드';
    subCardsTitle.className = 'sub-cards-title';
    subCardsContainer.appendChild(subCardsTitle);

    const cardsArea = createElementWithStyles('div', {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px', // Standard gap for cards
        justifyContent: 'center' // Center the cards horizontally
    });
    cardsArea.className = 'sub-cards-area'; // Keep the class
    
    rosterState.subCards.forEach(cardData => {
        if (cardData) {
            // Options needed for sub-cards in game mode
            const cardElement = createCardElement(cardData, { 
                mode: 'game', 
                isInteractive: true, // Sub-cards should be interactive in game mode
                showPoints: false, // Points are not usually shown on sub-cards in game mode
                showInfoButton: true, // Show info button
                onClick: (e) => performActionAndPreserveScroll(() => advanceCardStatus(cardData), e.target) // Default game mode click action
            });
            cardsArea.appendChild(cardElement);
        }
    });

    subCardsContainer.appendChild(cardsArea);

    if (subCardsContainer.hasChildNodes()) {
        dom.tacticalCardsContainer.after(subCardsContainer);
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

// --- UI Element Creation Helpers (Interactive Parts) ---

const createTokenArea = (cardData, unitData) => {
    const tokenArea = document.createElement('div');
    tokenArea.className = CSS_CLASSES.TOKEN_AREA;
    if (!cardData) return tokenArea;

    if (cardData.ammunition > 0) tokenArea.appendChild(createResourceTracker(cardData, 'ammunition'));
    if (cardData.intercept > 0) tokenArea.appendChild(createResourceTracker(cardData, 'intercept'));
    if (cardData.link > 0) tokenArea.appendChild(createResourceTracker(cardData, 'link'));

    if (cardData.category === 'Pilot' && unitData) {
        const stats = calculateUnitStats(unitData);
        const statsContainer = document.createElement('div');
        statsContainer.innerHTML = `
            <img src="icons/stat_electronic.png" style="width: 24px; height: 24px;">
            <span style="font-weight: bold; font-size: 16px;">${stats.electronic}</span>
            <img src="icons/stat_mobility.png" style="width: 24px; height: 24px;">
            <span style="font-weight: bold; font-size: 16px;">${stats.mobility}</span>
        `;
        Object.assign(statsContainer.style, { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px' });
        tokenArea.appendChild(statsContainer);
    }

    if (cardData.charge) {
        const chargeTokenImg = document.createElement('img');
        chargeTokenImg.className = CSS_CLASSES.CHARGE_TOKEN_IMG;
        chargeTokenImg.src = cardData.isCharged ? 'icons/charge_on.png' : 'icons/charge_off.png';
        chargeTokenImg.addEventListener('click', (e) => {
            e.stopPropagation();
            performActionAndPreserveScroll(() => { cardData.isCharged = !cardData.isCharged; }, e.target);
        });
        tokenArea.appendChild(chargeTokenImg);
    }
    if (cardData.freehand || cardData.isDropped) {
        const freehandIcon = document.createElement('img');
        freehandIcon.src = cardData.isBlackbox ? 'icons/blackbox.png' : 'icons/freehand.png';
        Object.assign(freehandIcon.style, { height: '60px', width: 'auto', cursor: 'pointer' });
        freehandIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            performActionAndPreserveScroll(() => { cardData.isBlackbox = !cardData.isBlackbox; }, e.target);
        });
        tokenArea.appendChild(freehandIcon);
    }
    return tokenArea;
};

const createActionButtons = (cardData, unitData) => {
    const placeholder = () => {
        const p = document.createElement('div');
        p.className = CSS_CLASSES.ACTION_BUTTON_PLACEHOLDER;
        return p;
    };
    if (!cardData || (!cardData.drop && (!cardData.changes || cardData.changes.length === 0))) {
        return placeholder();
    }

    const wrapper = document.createElement('div');
    wrapper.className = CSS_CLASSES.ACTION_BUTTON_WRAPPER;

    if (cardData.drop) {
        const button = document.createElement('button');
        button.className = `${CSS_CLASSES.ACTION_BUTTON} ${CSS_CLASSES.DROP_BUTTON}`;
        button.classList.toggle(CSS_CLASSES.DROPPED, cardData.isDropped === true);
        button.textContent = cardData.isDropped ? '버리기 취소' : '버리기';
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            performActionAndPreserveScroll(() => { cardData.isDropped = !cardData.isDropped; }, e.target);
        });
        wrapper.appendChild(button);
    } else if (cardData.changes && cardData.changes.length > 0) {
        const button = document.createElement('button');
        button.className = `${CSS_CLASSES.ACTION_BUTTON} ${CSS_CLASSES.CHANGE_BUTTON}`;
        button.textContent = '변경';
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            performActionAndPreserveScroll(() => {
                const currentCard = unitData ? unitData[cardData.category] : cardData;
                const cycle = [currentCard.fileName, ...currentCard.changes];
                const currentIndex = cycle.indexOf(currentCard.fileName);
                const nextFileName = cycle[(currentIndex + 1) % cycle.length];
                const newCardData = state.allCards.byFileName.get(nextFileName);
                if (!newCardData) return;
                const propsToPreserve = { cardStatus: currentCard.cardStatus, currentAmmunition: currentCard.currentAmmunition, currentIntercept: currentCard.currentIntercept, isDropped: currentCard.isDropped, rosterId: currentCard.rosterId, isBlackbox: currentCard.isBlackbox };
                for (const key in currentCard) { delete currentCard[key]; }
                Object.assign(currentCard, newCardData, propsToPreserve);
            }, e.target);
        });
        wrapper.appendChild(button);
    }
    return wrapper;
};

const createResourceTracker = (cardData, resourceType) => {
    const maxCount = cardData[resourceType];
    const container = document.createElement('div');
    container.className = CSS_CLASSES.RESOURCE_CONTAINER;
    Object.assign(container.style, { display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center', maxWidth: '180px', marginTop: '5px' });

    const currentProp = `current${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`;

    for (let i = 1; i <= maxCount; i++) {
        const icon = document.createElement('img');
        icon.className = CSS_CLASSES.RESOURCE_ICON;
        icon.src = i <= cardData[currentProp] ? `icons/${resourceType}_on.png` : `icons/${resourceType}_off.png`;
        icon.dataset.index = i;
        Object.assign(icon.style, { width: '24px', height: '24px', cursor: 'pointer' });
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            cardData[currentProp] = (cardData[currentProp] === i) ? i - 1 : i;
            container.querySelectorAll(`.${CSS_CLASSES.RESOURCE_ICON}`).forEach(ic => {
                ic.src = ic.dataset.index <= cardData[currentProp] ? `icons/${resourceType}_on.png` : `icons/${resourceType}_off.png`;
            });
        });
        container.appendChild(icon);
    }
    return container;
};

// --- Card Element Creator (UI-Specific Wrapper) ---

export const createCardElement = (cardData, options = {}) => {
    const { isInteractive = true, unitId = null, unitData = null, onClick = null } = options;
    const mode = state.isGameMode ? 'game' : 'builder';
    
    const rendererOptions = {
        mode,
        isInteractive,
        unit: unitData,
        showPoints: mode === 'builder',
        showInfoButton: true, // Info buttons are always shown in the UI
        showDeleteButton: mode === 'builder' && (cardData.category === 'Drone' || cardData.category === 'Tactical'),
        onClick: onClick,
    };
    
    const cardElement = createCardElementFromRenderer(cardData, rendererOptions);
    
    // Add game-mode-only interactive elements after the base card is created
    if (mode === 'game' && isInteractive) {
        const wrapper = cardElement.querySelector(`.${CSS_CLASSES.CARD_WRAPPER}`);
        const card = wrapper.querySelector(`.${CSS_CLASSES.DISPLAY_CARD}`);
        wrapper.insertBefore(createActionButtons(cardData, unitData), card);
        wrapper.appendChild(createTokenArea(cardData, unitData));
    }
    
    // Handle special freight back card
    if (cardData.hasFreightBack === true) {
        cardElement.appendChild(createFreightBackCardSlot(cardData));
    }

    return cardElement;
};

const createFreightBackCardSlot = (cardData) => {
    const wrapper = document.createElement('div');
    wrapper.className = CSS_CLASSES.CARD_WRAPPER;
    const slot = document.createElement('div');
    slot.className = CSS_CLASSES.CARD_SLOT;

    const backCardData = cardData.backCard;
    if (backCardData) {
        // Just get the visual part from the renderer
        const cardElement = createCardElementFromRenderer(backCardData, { 
            mode: state.isGameMode ? 'game' : 'builder',
            showPoints: !state.isGameMode,
            showInfoButton: true
        });
        const cardInner = cardElement.querySelector(`.${CSS_CLASSES.DISPLAY_CARD}`);
        if(cardInner) slot.appendChild(cardInner);
    } else {
        const label = document.createElement('span');
        label.className = CSS_CLASSES.SLOT_LABEL;
        label.textContent = 'Back';
        slot.appendChild(label);
    }
    wrapper.appendChild(slot);

    // Now, manually add the game mode interactions around the slot
    if (state.isGameMode) {
        wrapper.insertBefore(createActionButtons(backCardData, null), slot);
        wrapper.appendChild(createTokenArea(backCardData, null));
    } else {
        slot.addEventListener('click', () => openModal(cardData.rosterId, 'Back', true));
    }
    return wrapper;
};

// ... (rest of the file remains, createUnitCardSlot, createUnitElement, etc.)
const createPartStatusIndicator = (unitData) => {
    const indicatorContainer = document.createElement('div');
    indicatorContainer.className = CSS_CLASSES.ACTION_BUTTON_WRAPPER;

    const partsOrder = ['Torso', 'Chassis', 'Left', 'Right', 'Back'];
    partsOrder.forEach(partName => {
        const partCard = unitData ? unitData[partName] : null;
        const isOff = !partCard || partCard.cardStatus === 2;
        const icon = document.createElement('img');
        icon.src = `icons/parts_${partName.toLowerCase()}_${isOff ? 'off' : 'on'}.png`;
        icon.className = 'part-status-icon';
        icon.style.width = '24px';
        icon.style.height = '24px';
        indicatorContainer.appendChild(icon);
    });
    return indicatorContainer;
};

const calculateUnitStats = (unitData) => {
    const stats = { electronic: 0, mobility: 0 };
    if (!unitData) return stats;

    for (const part of Object.values(unitData)) {
        if (part && part.cardStatus !== 2) {
            stats.electronic += part.electronic || 0;
            if (part.isDropped && typeof part.dropMobility !== 'undefined') {
                stats.mobility += part.dropMobility;
            } else {
                stats.mobility += part.mobility || 0;
            }
        }
    }
    return stats;
};

const isUnitOut = (unitData) => {
    if (!unitData || (unitData.Torso && unitData.Torso.cardStatus === 2)) return true;
    const relevantParts = ['Torso', 'Chassis', 'Left', 'Right', 'Back'];
    let remainingPartsCount = 0;
    for (const category of relevantParts) {
        if (unitData[category] && unitData[category].cardStatus !== 2) {
            remainingPartsCount++;
        }
    }
    return remainingPartsCount <= 2;
};

const createUnitCardSlot = (category, unitData, unitId) => {
    const cardData = unitData ? unitData[category] : null;
    const wrapper = document.createElement('div');
    wrapper.className = CSS_CLASSES.CARD_WRAPPER;
    const slot = document.createElement('div');
    slot.className = CSS_CLASSES.CARD_SLOT;

    if (cardData) {
        const isPilot = category === 'Pilot';
        const cardElement = createCardElementFromRenderer(cardData, { 
            mode: state.isGameMode ? 'game' : 'builder',
            isInteractive: !isPilot,
            showPoints: !state.isGameMode,
            showInfoButton: true,
            unit: unitData
        });
        const cardInner = cardElement.querySelector(`.${CSS_CLASSES.DISPLAY_CARD}`);
        if(cardInner) slot.appendChild(cardInner);
    } else {
        const label = document.createElement('span');
        label.className = CSS_CLASSES.SLOT_LABEL;
        label.textContent = category;
        slot.appendChild(label);
    }
    wrapper.appendChild(slot);

    // Handle all game-mode additions outside the renderer call
    if (state.isGameMode) {
        if (category === 'Pilot') {
            wrapper.insertBefore(createPartStatusIndicator(unitData), slot);
        } else {
            wrapper.insertBefore(createActionButtons(cardData, unitData), slot);
        }
        wrapper.appendChild(createTokenArea(cardData, unitData));
    } else {
        // In builder mode, the whole slot is always clickable to change the card.
        slot.addEventListener('click', () => openModal(unitId, category));
    }
    
    return wrapper;
};

const createUnitElement = (unitId, unitData) => {
    const unitEntry = document.createElement('div');
    unitEntry.className = CSS_CLASSES.UNIT_ENTRY;
    unitEntry.dataset.unitId = unitId;

    const unitRow = document.createElement('div');
    unitRow.className = CSS_CLASSES.UNIT_ROW;
    unitRow.style.position = 'relative';
    if (unitId >= state.nextUnitId) state.setNextUnitId(unitId + 1);

    categoryOrder.forEach(category => {
        unitRow.appendChild(createUnitCardSlot(category, unitData, unitId));
    });

    unitEntry.appendChild(unitRow);

    if (!state.isGameMode) {
        const deleteButton = document.createElement('button');
        deleteButton.className = CSS_CLASSES.DELETE_UNIT_BUTTON;
        deleteButton.textContent = '-';
        deleteButton.addEventListener('click', () => {
            delete state.allRosters[state.activeRosterName].units[unitId];
            renderRoster();
            state.saveAllRosters();
        });
        unitRow.appendChild(deleteButton);

        const unitPoints = Object.values(unitData).reduce((sum, card) => sum + (card ? card.points : 0), 0);
        const pointsDisplay = document.createElement('div');
        pointsDisplay.className = 'unit-points-overlay';
        pointsDisplay.textContent = `${unitPoints}`;
        unitRow.appendChild(pointsDisplay);
    }

    const tokenAreas = Array.from(unitRow.querySelectorAll(`.${CSS_CLASSES.TOKEN_AREA}`));
    if (tokenAreas.some(area => area.hasChildNodes())) {
        const resourceAreaHeight = '58px';
        tokenAreas.forEach(area => area.style.minHeight = resourceAreaHeight);
    }

    if (isUnitOut(unitData)) {
        const overlay = document.createElement('div');
        overlay.className = 'unit-out-overlay';
        Object.assign(overlay.style, {
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.15)', zIndex: 20, pointerEvents: 'none'
        });
        unitRow.appendChild(overlay);
    }

    return unitEntry;
};

const addDroneElement = (droneData) => {
    dom.dronesContainer.appendChild(createCardElement(droneData, { unitId: droneData.rosterId }));
};

const addTacticalCardElement = (cardData) => {
    dom.tacticalCardsContainer.appendChild(createCardElement(cardData, { unitId: cardData.rosterId }));
};