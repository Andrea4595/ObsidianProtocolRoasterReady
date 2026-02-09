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

export const renderRoster = async () => {
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

    const unitElementsPromises = Object.keys(rosterState.units).map(async unitId => {
        return await createUnitElement(parseInt(unitId), rosterState.units[unitId]);
    });
    const unitElements = await Promise.all(unitElementsPromises);
    unitElements.forEach(unitElement => {
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
                isInteractive: false, // Sub-cards should NOT be interactive in game mode
                showPoints: false, // Points are not usually shown on sub-cards in game mode
                showInfoButton: true, // Show info button
                // onClick handler is effectively removed by isInteractive: false
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

const createTokenArea = (cardData, unitData, unitId) => {
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
            performActionAndPreserveScroll(
                () => {
                    cardData.isCharged = !cardData.isCharged;
                    if (cardData.category === 'Drone') {
                        updateDroneDisplay(cardData);
                    } else if (unitId !== undefined && unitId !== null) { // Check for valid unitId
                        updateUnitDisplay(unitId, unitData);
                    } else {
                        renderRoster();
                    }
                },
                e.target
            );
        });
        tokenArea.appendChild(chargeTokenImg);
    }
    if (cardData.freehand || cardData.isDropped) {
        const freehandIcon = document.createElement('img');
        freehandIcon.src = cardData.isBlackbox ? 'icons/blackbox.png' : 'icons/freehand.png';
        Object.assign(freehandIcon.style, { height: '60px', width: 'auto', cursor: 'pointer' });
        freehandIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            performActionAndPreserveScroll(
                async () => {
                    cardData.isBlackbox = !cardData.isBlackbox;
                    if (cardData.category === 'Drone') {
                        await updateDroneDisplay(cardData);
                    } else if (unitId !== undefined && unitId !== null) { // Check for valid unitId
                        await updateUnitDisplay(unitId, unitData);
                    } else {
                        renderRoster();
                    }
                },
                e.target
            );
        });
        tokenArea.appendChild(freehandIcon);
    }
    return tokenArea;
};

const createActionButtons = (cardData, unitData, contextUnitId) => {
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
            performActionAndPreserveScroll(
                async () => {
                    cardData.isDropped = !cardData.isDropped;
                    if (cardData.category === 'Drone') {
                        await updateDroneDisplay(cardData);

                    } else if (contextUnitId !== undefined && contextUnitId !== null) { // Check for valid contextUnitId
                        await updateUnitDisplay(contextUnitId, unitData);
                    } else {
                        renderRoster();
                    }
                },
                e.target
            );
        });
        wrapper.appendChild(button);
    } else if (cardData.changes && cardData.changes.length > 0) {
        const button = document.createElement('button');
        button.className = `${CSS_CLASSES.ACTION_BUTTON} ${CSS_CLASSES.CHANGE_BUTTON}`;
        button.textContent = '변경';
        button.dataset.unitId = contextUnitId; // Add data attribute for unitId
        button.dataset.cardCategory = cardData.category; // Add data attribute for cardCategory
        // Event listener moved to event delegation in modules/events.js
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
                        performActionAndPreserveScroll(
                            () => { // action
                                cardData[currentProp] = (cardData[currentProp] === i) ? i - 1 : i;
                                // The UI for resources is updated manually here for immediate feedback,
                                // and the state is saved by performActionAndPreserveScroll.
                                // No further re-render is needed for this specific action.
                                container.querySelectorAll(`.${CSS_CLASSES.RESOURCE_ICON}`).forEach(ic => {
                                    ic.src = ic.dataset.index <= cardData[currentProp] ? `icons/${resourceType}_on.png` : `icons/${resourceType}_off.png`;
                                });
                            },
                            e.target  // eventTarget
                        );
                    });        container.appendChild(icon);
    }
    return container;
};

// --- Card Element Creator (UI-Specific Wrapper) ---

export const createCardElement = (cardData, options = {}) => {
    const { isInteractive = true, unitId = null, unitData = null, onClick = null, onDeleteCallback = null } = options;
    const mode = state.isGameMode ? 'game' : 'builder';
    
    const rendererOptions = {
        mode,
        isInteractive,
        unit: unitData,
        showPoints: mode === 'builder',
        showInfoButton: true, // Info buttons are always shown in the UI
        showDeleteButton: mode === 'builder' && (cardData.category === 'Drone' || cardData.category === 'Tactical'),
        onClick: onClick,
        onDeleteCallback: onDeleteCallback, // Pass the callback to the renderer
        unitId: unitId, // <<< IMPORTANT: Pass unitId to the rendererOptions
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
    if (cardData.special && cardData.special.includes('freight_back')) {
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
            isInteractive: !state.isGameMode, // Make back card non-interactive in game mode
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

// Helper function to get the image path for a character part
const getCharacterPartImagePath = (part) => {
    if (!part) return null;
    if (part.id === 0 && part.name) {
        return `CharacterParts/${part.name}.png`;
    } else if (typeof part.id === 'number' && !isNaN(part.id)) {
        return `CharacterParts/${part.id}.png`;
    }
    return null; // Return null if no valid image source can be determined
};

// Helper function to load a single character part image
const loadCharacterPartImage = (part, partName) => {
    return new Promise(resolve => {
        const imgSrc = getCharacterPartImagePath(part);
        if (!imgSrc) {
            console.warn(`Could not determine image source for part:`, part);
            resolve(null);
            return;
        }

        const img = new Image();
        img.onload = () => resolve({ img, partName });
        img.onerror = () => {
            console.warn(`Failed to load image: ${imgSrc} for part:`, part);
            resolve(null);
        };
        img.src = imgSrc;
    });
};

// Helper function to draw loaded images onto the canvas
const drawLoadedImagesToCanvas = (ctx, loadedImages, canvasWidth, canvasHeight) => {
    loadedImages.forEach(item => {
        if (item && item.img) {
            // Draw image. Position and size might need adjustment based on actual image dimensions
            // For now, draw to fill the canvas.
            ctx.drawImage(item.img, 0, 0, canvasWidth, canvasHeight);
        }
    });
};

const createUnitPartsCompositeImage = async (unitData, targetSize) => {

    const canvas = document.createElement('canvas');

    canvas.width = targetSize;

    canvas.height = targetSize;

    const ctx = canvas.getContext('2d');



    // Clear canvas

    ctx.clearRect(0, 0, canvas.width, canvas.height);



    const overlayOrder = ['Back', 'Left', 'Chassis', 'Torso', 'Right', 'Pilot'];

    const partImagePromises = [];



    for (const partName of overlayOrder) {

        const part = unitData[partName];

        // Ensure part exists and has a valid ID or name

        if (part && (typeof part.id === 'number' && !isNaN(part.id) || (part.id === 0 && part.name))) {

            // Use the new helper to load the image

            partImagePromises.push(loadCharacterPartImage(part, partName));

        }

    }



        const loadedPartImages = await Promise.all(partImagePromises);



    



        drawLoadedImagesToCanvas(ctx, loadedPartImages, canvas.width, canvas.height);



    



        return canvas;



    };

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



    // --- 추가될 로그 시작 (createUnitCardSlot 내부) ---

    console.groupCollapsed(`UI: createUnitCardSlot for Unit ID: ${unitId}, Category: ${category}`);

    console.log(`  - cardData received by createUnitCardSlot:`, JSON.parse(JSON.stringify(cardData)));

    console.groupEnd();

    // --- 추가될 로그 끝 ---



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
            unit: unitData,
            unitId: unitId // <<< PASS THE unitId
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
            // Pass unitId from createUnitCardSlot to createActionButtons
            wrapper.insertBefore(createActionButtons(cardData, unitData, unitId), slot);
        }
        // Pass unitId from createUnitCardSlot to createTokenArea
        wrapper.appendChild(createTokenArea(cardData, unitData, unitId));
    } else {
        // In builder mode, the whole slot is always clickable to change the card.
        slot.addEventListener('click', () => openModal(unitId, category));
    }
    
    return wrapper;
};

export const createUnitElement = async (unitId, unitData) => {
    const unitEntry = document.createElement('div');
    unitEntry.className = CSS_CLASSES.UNIT_ENTRY;
    unitEntry.dataset.unitId = unitId;
    Object.assign(unitEntry.style, {
        position: 'relative',
        display: 'flex', // Use flexbox to align the image and the unit cards
        alignItems: 'center', // Vertically center the items
        gap: '15px', // Space between the composite image and the unit cards
        overflowX: 'auto', // unitEntry itself is now scrollable horizontally
        flexWrap: 'nowrap', // Prevent flex items from wrapping to a new line
        minWidth: '0', // Allow flex item to shrink below its content size
    });

    // Create the new wrapper for content within unitEntry
    const unitEntryContentWrapper = document.createElement('div');
    Object.assign(unitEntryContentWrapper.style, {
        display: 'flex',
        alignItems: 'center', // Vertically align the items
        justifyContent: 'center', // Center content horizontally
        gap: '15px', // Space between the composite image and the unit cards
        minWidth: '100%', // Ensure it takes at least 100% of the parent's width for centering
        width: 'fit-content', // Allows it to grow beyond 100% if content overflows
        flexShrink: '0', // Prevent it from shrinking
    });

    const unitRow = document.createElement('div');
    unitRow.className = CSS_CLASSES.UNIT_ROW;
    Object.assign(unitRow.style, {
        position: 'relative',
        display: 'flex', // Ensure unitRow is also a flex container
        // overflowX: 'auto' // Removed overflow from unitRow, as parent handles it
        // padding: '10px 0' // Removed to allow CSS to control padding
        flexShrink: '0', // Prevent unitRow from shrinking
    });
    if (unitId >= state.nextUnitId) state.setNextUnitId(unitId + 1);

    // Render cards into unitRow first
    categoryOrder.forEach(category => {
        unitRow.appendChild(createUnitCardSlot(category, unitData, unitId));
    });

    // --- New robust height calculation ---
    const clone = unitRow.cloneNode(true);
    Object.assign(clone.style, {
        position: 'absolute',
        left: '-9999px',
        visibility: 'hidden',
        width: 'auto' // Allow it to size naturally based on content
    });
    document.body.appendChild(clone);
            const unitRowHeight = clone.offsetHeight;
            document.body.removeChild(clone);
            // --- End of new robust height calculation ---
    // Create and append the composite image
    if (unitData && unitRowHeight > 0) { // Check for valid height
        const compositeImageCanvas = await createUnitPartsCompositeImage(unitData, unitRowHeight); // Pass dynamic height
        compositeImageCanvas.className = 'composite-unit-image'; // Add the new class
        unitEntryContentWrapper.prepend(compositeImageCanvas); // Prepend to put it before unitRow within the new wrapper
    }

    unitEntryContentWrapper.appendChild(unitRow); // Append unitRow to the new wrapper

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

    unitEntry.appendChild(unitEntryContentWrapper); // Append the new wrapper to unitEntry

    return unitEntry;
};

export const updateUnitDisplay = async (unitId, unitData) => {
    // --- 추가될 로그 시작 (updateUnitDisplay 시작) ---
    console.groupCollapsed(`UI: updateUnitDisplay called for Unit ID: ${unitId}`);
    console.log(`  - unitData received by updateUnitDisplay:`, JSON.parse(JSON.stringify(unitData)));
    // --- 추가될 로그 끝 ---

    const existingUnitEntry = document.querySelector(`.unit-entry[data-unit-id='${unitId}']`);
    if (existingUnitEntry) {
        // Create a new element with the updated content
        const newUnitEntry = await createUnitElement(unitId, unitData);
        existingUnitEntry.replaceWith(newUnitEntry);
    } else {
        console.error(`Could not find unit entry for unitId: ${unitId}`);
    }
    // --- 추가될 로그 시작 (updateUnitDisplay 끝) ---
    console.groupEnd();
    // --- 추가될 로그 끝 ---
};

const createDroneImageElements = (droneData) => {
    // Create the base drone image element
    const droneImg = document.createElement('img');
    const droneImageId = (droneData.id === 0) ? droneData.name : droneData.id;
    droneImg.src = `CharacterParts/${droneImageId}.png`; // Assuming drone images are in CharacterParts and use an ID or name
    droneImg.alt = droneData.name;
    droneImg.className = 'drone-image'; // Add a class for styling

    // Determine size based on droneData.size property
    const droneSize = droneData.size || 3; // Default to size 3 if not specified
    let sizeMultiplier = 1;
    if (droneSize === 2) {
        sizeMultiplier = 2 / 3;
    } else if (droneSize === 1) {
        sizeMultiplier = 1 / 3;
    }
    droneImg.style.setProperty('--drone-image-size-multiplier', sizeMultiplier.toString());
    droneImg.style.width = 'auto'; // Maintain aspect ratio

    // Create a container for the drone image and potential backpack image
    const droneImageContainer = document.createElement('div');
    droneImageContainer.className = 'drone-image-container'; // Add class for styling
    droneImageContainer.appendChild(droneImg);

    // Conditionally add backpack image
    if (droneData.special && droneData.special.includes('freight_back') && droneData.backCard && (droneData.backCard.id !== undefined)) {
        const backpackImg = document.createElement('img');
        const backpackImageId = (droneData.backCard.id === 0) ? droneData.backCard.name : droneData.backCard.id;
        backpackImg.src = `CharacterParts/${backpackImageId}_d.png`; // Backpack image format: [id]_d.png, using backCard's ID or name
        backpackImg.alt = 'Backpack';
        backpackImg.className = 'backpack-image'; // Add class for styling
        droneImageContainer.appendChild(backpackImg);
    }
    return droneImageContainer;
};

export const createDroneElement = (droneData) => {
    // Create the card element (the drone card itself)
    const cardElement = createCardElement(droneData, {
        unitId: droneData.rosterId,
        onDeleteCallback: () => {
            droneEntry.remove(); // Remove the drone's UI element
            updateTotalPoints(); // Update total points after deletion
        }
    });

    // Create a container for the drone image and the card
    const droneEntry = document.createElement('div');
    droneEntry.className = 'drone-entry'; // Add a class for styling
    droneEntry.dataset.rosterId = droneData.rosterId; // Add rosterId for easier selection

    const droneImageContainer = createDroneImageElements(droneData); // Use the new helper function

    // Append the image container and the card to the new entry container
    droneEntry.appendChild(droneImageContainer);
    droneEntry.appendChild(cardElement);

    return droneEntry; // Return the new container
};

export const addDroneElement = (droneData) => { // New function to append
    const cardElement = createDroneElement(droneData);
    dom.dronesContainer.appendChild(cardElement);
};

export const updateDroneDisplay = (droneData) => {
    const existingDroneEntry = document.querySelector(`.drone-entry[data-roster-id='${droneData.rosterId}']`);
    if (existingDroneEntry) {
        // Update the card part
        const existingCardElement = existingDroneEntry.querySelector('.roster-card-container');
        if (existingCardElement) {
            const newCardElement = createCardElement(droneData, {
                unitId: droneData.rosterId,
                onDeleteCallback: () => {
                    existingDroneEntry.remove(); // Remove the drone's UI element
                    updateTotalPoints(); // Update total points after deletion
                }
            });
            existingCardElement.replaceWith(newCardElement);
        } else {
            console.error(`Could not find .roster-card-container within .drone-entry[data-roster-id='${droneData.rosterId}']`);
        }

        // Update the drone image and backpack (droneImageContainer)
        const existingDroneImageContainer = existingDroneEntry.querySelector('.drone-image-container');
        if (existingDroneImageContainer) {
            const newDroneImageContainer = createDroneImageElements(droneData);
            existingDroneImageContainer.replaceWith(newDroneImageContainer);
        } else {
            console.error(`Could not find .drone-image-container within .drone-entry[data-roster-id='${droneData.rosterId}']`);
        }

    } else {
        console.warn(`Could not find drone entry for rosterId: ${droneData.rosterId} for update. Re-rendering all drones.`);
        dom.dronesContainer.innerHTML = '';
        state.getActiveRoster().drones.forEach(d => addDroneElement(d));
    }
};

export const createTacticalCardElement = (cardData) => { // Renamed to createTacticalCardElement
    const cardElement = createCardElement(cardData, {
        unitId: cardData.rosterId,
        onDeleteCallback: () => {
            cardElement.remove(); // Remove the tactical card's UI element
            updateTotalPoints(); // Update total points after deletion
        }
    });
    return cardElement; // Return the created element
};

export const addTacticalCardElement = (cardData) => { // New function to append
    const cardElement = createTacticalCardElement(cardData);
    dom.tacticalCardsContainer.appendChild(cardElement);
};

export const updateTacticalCardDisplay = (cardData) => {
    const existingTacticalCardElement = document.querySelector(`.roster-card-container[data-roster-id='${cardData.rosterId}']`);
    if (existingTacticalCardElement) {
        const newTacticalCardElement = createTacticalCardElement(cardData);
        existingTacticalCardElement.replaceWith(newTacticalCardElement);
    } else {
        console.warn(`Could not find tactical card entry for rosterId: ${cardData.rosterId} for update. Re-rendering all tactical cards.`);
        dom.tacticalCardsContainer.innerHTML = '';
        state.getActiveRoster().tacticalCards.forEach(tc => addTacticalCardElement(tc));
    }
};
