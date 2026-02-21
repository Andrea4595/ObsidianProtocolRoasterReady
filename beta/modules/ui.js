import * as dom from './dom.js';
import * as state from './state.js';
import { openModal } from './modal.js';
import { advanceCardStatus, performActionAndPreserveScroll } from './gameMode.js';
import { categoryOrder, CSS_CLASSES, CARD_DIMENSIONS } from './constants.js';
import { applyUnitRules, applyDroneRules } from './rules.js';
import { renderCardElement } from './cardRenderer.js';

const createElementWithStyles = (tag, styles) => {
    const element = document.createElement(tag);
    Object.assign(element.style, styles);
    return element;
};

// --- Internal Render Functions ---

const _updateTotalPoints = () => {
    const rosterState = state.getActiveRoster();
    if (!rosterState) {

        return 0;
    }
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

const _renderRoster = async () => {





    const rosterState = state.isGameMode ? state.gameRoster : state.getActiveRoster();
    if (!rosterState) {
        console.warn("UI: _renderRoster - No roster state to render.");
        return;
    }


    if (!state.isGameMode) {
        Object.values(rosterState.units).forEach(unit => applyUnitRules(unit));
        rosterState.drones.forEach(drone => applyDroneRules(drone));
    }




    // Unit rendering optimization
    const existingUnitElements = new Map();
    dom.unitsContainer.querySelectorAll('.unit-entry').forEach(el => {
        existingUnitElements.set(el.dataset.unitId, el);
    });

    const unitsToAdd = [];
    const unitsToUpdate = [];
    const unitsToRemove = new Set(existingUnitElements.keys());

    for (const unitId in rosterState.units) {
        if (existingUnitElements.has(unitId)) {
            unitsToUpdate.push({ id: parseInt(unitId), data: rosterState.units[unitId] });
            unitsToRemove.delete(unitId);
        } else {
            unitsToAdd.push({ id: parseInt(unitId), data: rosterState.units[unitId] });
        }
    }

    // Remove obsolete units
    unitsToRemove.forEach(unitId => {
        existingUnitElements.get(unitId).remove();
    });

    // Add new units
    for (const unit of unitsToAdd) {
        const newElement = await createUnitElement(unit.id, unit.data);
        dom.unitsContainer.appendChild(newElement);
    }

    // Update existing units
    for (const unit of unitsToUpdate) {
        await _updateUnitDisplay(unit.id, unit.data);
    }




    // Drone rendering optimization
    const existingDroneElements = new Map();
    dom.dronesContainer.querySelectorAll('.drone-entry').forEach(el => {
        existingDroneElements.set(el.dataset.rosterId, el);
    });

    const dronesToAdd = [];
    const dronesToUpdate = [];
    const dronesToRemove = new Set(existingDroneElements.keys());

    for (const droneData of rosterState.drones) {
        if (existingDroneElements.has(droneData.rosterId)) {
            dronesToUpdate.push(droneData);
            dronesToRemove.delete(droneData.rosterId);
        } else {
            dronesToAdd.push(droneData);
        }
    }

    // Remove obsolete drones
    dronesToRemove.forEach(rosterId => {
        existingDroneElements.get(rosterId).remove();
    });

    // Add new drones
    for (const drone of dronesToAdd) {
        await _addDroneElement(drone);
    }

    // Update existing drones
    for (const drone of dronesToUpdate) {
        await _updateDroneDisplay(drone);
    }



    // Tactical cards rendering optimization
    const existingTacticalCardElements = new Map();
    dom.tacticalCardsContainer.querySelectorAll('.roster-card-container').forEach(el => {
        existingTacticalCardElements.set(el.dataset.rosterId, el);
    });

    const tacticalCardsToAdd = [];
    const tacticalCardsToUpdate = [];
    const tacticalCardsToRemove = new Set(existingTacticalCardElements.keys());

    for (const cardData of rosterState.tacticalCards) {
        if (existingTacticalCardElements.has(cardData.rosterId)) {
            tacticalCardsToUpdate.push(cardData);
            tacticalCardsToRemove.delete(cardData.rosterId);
        } else {
            tacticalCardsToAdd.push(cardData);
        }
    }

    // Remove obsolete tactical cards
    tacticalCardsToRemove.forEach(rosterId => {
        existingTacticalCardElements.get(rosterId).remove();
    });

    // Add new tactical cards
    for (const card of tacticalCardsToAdd) {
        const cardElement = createCardElement(card, null, {
            unitId: card.rosterId,
            onDeleteCallback: () => {
                state.deleteTacticalCard(card.rosterId);
            }
        });
        dom.tacticalCardsContainer.appendChild(cardElement);
    }

    // Update existing tactical cards
    for (const card of tacticalCardsToUpdate) {
        _updateTacticalCardDisplay(card);
    }



    // Sub-card rendering optimization
    // Always remove and re-add the sub-cards container for simplicity for now,
    // as their content is highly dynamic based on resolved sub-cards.
    // This can be further optimized if needed, but for now, full re-render for sub-cards is acceptable.
    document.querySelectorAll(`.${CSS_CLASSES.SUB_CARDS_CONTAINER}`).forEach(el => el.remove());

    if (state.isGameMode) {
        _renderSubCards(rosterState);
    }



        adjustOverlayWidths();







    };

const _renderSubCards = (rosterState) => {
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
            // 서브 카드는 게임 모드에서 단순히 정보를 보여주는 용도이므로 상호작용을 비활성화합니다.
            const cardElement = createCardElement(cardData, null, {
                mode: state.isGameMode ? 'game' : 'builder',
                isInteractive: false, 
                showPoints: false,
                showInfoButton: true
            });
            cardsArea.appendChild(cardElement);
        }
    });

    subCardsContainer.appendChild(cardsArea);

    if (subCardsContainer.hasChildNodes()) {
        dom.tacticalCardsContainer.after(subCardsContainer);
    }

};


const _updateRosterSelect = () => {

    dom.rosterSelect.innerHTML = '';
    const rosterNames = Object.keys(state.allRosters);

    rosterNames.forEach(name => {
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
                        _updateDroneDisplay(cardData);
                    } else if (unitId !== undefined && unitId !== null) { // Check for valid unitId
                        _updateUnitDisplay(unitId, unitData);
                    } else {
                        _renderRoster();
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
                        await _updateDroneDisplay(cardData);
                    } else if (unitId !== undefined && unitId !== null) { // Check for valid unitId
                        await _updateUnitDisplay(unitId, unitData);
                    } else {
                        _renderRoster();
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
    const wrapper = document.createElement('div');
    wrapper.className = CSS_CLASSES.ACTION_BUTTON_WRAPPER;

    if (!cardData || (!cardData.drop && (!cardData.changes || cardData.changes.length === 0))) {
        const p = document.createElement('div');
        p.className = CSS_CLASSES.ACTION_BUTTON_PLACEHOLDER;
        wrapper.appendChild(p);
        return wrapper;
    }

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
                        await _updateDroneDisplay(cardData);

                    } else if (contextUnitId !== undefined && contextUnitId !== null) { // Check for valid contextUnitId
                        await _updateUnitDisplay(contextUnitId, unitData);
                    } else {
                        _renderRoster();
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
        button.dataset.cardCategory = cardData.category; // cardData.category를 직접 사용하여 정확한 카테고리 전달
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

export const createCardElement = (cardData, existingCardElement = null, options = {}) => {
    const { isInteractive = true, unitId = null, unitData = null, onClick = null, onDeleteCallback = null } = options;
    const mode = state.isGameMode ? 'game' : 'builder';
    
    const renderOptions = {
        mode,
        isInteractive,
        unit: unitData,
        showPoints: mode === 'builder',
        showInfoButton: true, // Info buttons are always shown in the UI
        showDeleteButton: mode === 'builder' && (cardData.category === 'Drone' || cardData.category === 'Tactical'),
        onClick: onClick,
        onDeleteCallback: onDeleteCallback,
        unitId: unitId,
    };
    
    // Call the refactored renderCardElement from cardRenderer.js
    return renderCardElement(cardData, existingCardElement, renderOptions);
};

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

// Helper function to apply status-based tinting to an image on a canvas
const drawTintedImage = (ctx, img, x, y, width, height, status) => {
    if (status === 1 || status === 2) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');

        // 1. 원본 이미지 그리기
        tempCtx.drawImage(img, 0, 0, width, height);

        // 2. Multiply 블렌딩 모드로 색상 입히기 (이미지 디테일 유지)
        tempCtx.globalCompositeOperation = 'multiply';
        tempCtx.fillStyle = (status === 2) ? '#444444' : '#FFAAAA';
        tempCtx.fillRect(0, 0, width, height);

        // 3. 투명도 마스킹
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(img, 0, 0, width, height);

        // 4. 메인 캔버스에 그리기
        ctx.drawImage(tempCanvas, x, y);
    } else {
        ctx.drawImage(img, x, y, width, height);
    }
};

// Helper function to draw loaded images onto the canvas with status-based tinting
const drawLoadedImagesToCanvas = (ctx, loadedImages, canvasWidth, canvasHeight, unitData) => {
    loadedImages.forEach(item => {
        if (item && item.img) {
            const partCard = unitData[item.partName];
            const status = partCard ? partCard.cardStatus : 0;
            drawTintedImage(ctx, item.img, 0, 0, canvasWidth, canvasHeight, status);
        }
    });
};

export const createUnitPartsCompositeImage = async (unitData, targetSize) => {


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



    



        drawLoadedImagesToCanvas(ctx, loadedPartImages, canvas.width, canvas.height, unitData);



    



    
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

// Helper function for robust height calculation
const getUnitRowRenderedHeight = (unitRowElement) => {
    const clone = unitRowElement.cloneNode(true);
    Object.assign(clone.style, {
        position: 'absolute',
        left: '-9999px',
        visibility: 'hidden',
        width: 'auto' // Allow it to size naturally based on content
    });
    document.body.appendChild(clone);
    const height = clone.offsetHeight;
    document.body.removeChild(clone);
    return height;
};

const createUnitCardSlot = (category, unitData, unitId, existingCardSlot = null) => {

    const cardData = unitData ? unitData[category] : null;



    


    let wrapper;
    let slot;

    if (!existingCardSlot) {
        wrapper = document.createElement('div');
        wrapper.className = CSS_CLASSES.CARD_WRAPPER;
        slot = document.createElement('div');
        slot.className = CSS_CLASSES.CARD_SLOT;
    } else {
        wrapper = existingCardSlot.parentElement; // Assuming parent is the wrapper
        slot = existingCardSlot;
        slot.innerHTML = ''; // Clear existing content for re-render
    }

    if (cardData) {
        const isPilot = category === 'Pilot';
        // In createUnitCardSlot, we need to pass the existing .roster-card-container element to createCardElement
        // for in-place updates, or null if it doesn't exist.
        // The `slot` itself is the .card-slot or similar, which will contain the .roster-card-container.
        const existingRosterCardContainer = slot.querySelector('.roster-card-container'); // This is the element renderCardElement expects for updates.
        const cardElement = createCardElement(cardData, existingRosterCardContainer, { 
            mode: state.isGameMode ? 'game' : 'builder',
            isInteractive: !isPilot,
            showPoints: !state.isGameMode,
            showInfoButton: true,
            unit: unitData,
            unitId: unitId // <<< IMPORTANT: Pass unitId to the rendererOptions
        });
        // createCardElement already handles appending/replacing within the slot's existing content.
        // We only append if createCardElement created a *new* roster-card-container (i.e., existingRosterCardContainer was null).
        if (cardElement && !existingRosterCardContainer) { 
            slot.appendChild(cardElement);
        }
                } else {
                    // No card data, so ensure slot is empty or has a label
                    slot.innerHTML = ''; // Clear slot content
                    const label = document.createElement('span');
                    label.className = CSS_CLASSES.SLOT_LABEL;
                    label.textContent = category;
                    slot.appendChild(label);
                }
            if (!existingCardSlot) { // Only append if it's a new slot wrapper
                wrapper.appendChild(slot);
            }
    // Handle all game-mode additions outside the renderer call
    if (state.isGameMode) {
        // 게임 모드에서 카드 상단 영역(상태 표시 혹은 액션 버튼)을 하나로 통합하여 높이를 맞춥니다.
        let headerElement;
        if (category === 'Pilot') {
            headerElement = createPartStatusIndicator(unitData);
        } else {
            headerElement = createActionButtons(cardData, unitData, unitId);
        }

        // 기존에 이미 붙어있는 상태 표시기나 액션 버튼이 있다면 제거/교체합니다.
        const existingHeader = wrapper.querySelector(`.${CSS_CLASSES.ACTION_BUTTON_WRAPPER}`);
        if (existingHeader) {
            existingHeader.replaceWith(headerElement);
        } else {
            wrapper.insertBefore(headerElement, slot);
        }

        // Token Area - 정렬을 위해 게임 모드에서는 항상 추가합니다.
        const newTokenArea = createTokenArea(cardData, unitData, unitId);
        let tokenArea = wrapper.querySelector(`.${CSS_CLASSES.TOKEN_AREA}`);
        if (tokenArea) {
            tokenArea.replaceWith(newTokenArea);
        } else {
            wrapper.appendChild(newTokenArea);
        }

        // Remove builder-mode click listener
        if (slot.onclick) slot.onclick = null;
    } else {
        // Not in game mode, ensure game-mode specific elements are removed
        const existingHeader = wrapper.querySelector(`.${CSS_CLASSES.ACTION_BUTTON_WRAPPER}`);
        if (existingHeader) existingHeader.remove();
        
        const tokenArea = wrapper.querySelector(`.${CSS_CLASSES.TOKEN_AREA}`);
        if (tokenArea) tokenArea.remove();

        // In builder mode, the whole slot is clickable
        if (!slot.onclick) {
             slot.addEventListener('click', () => openModal(unitId, category));
        }
    }
    
    return wrapper;
};

const createUnitElement = async (unitId, unitData, existingUnitEntry = null) => {

    let unitEntry;
    let unitEntryContentWrapper;
    let unitRow;
    let compositeImageCanvas = null; // Declare here to be accessible in both branches

    if (!existingUnitEntry) {
        // --- Creation Path ---
        unitEntry = document.createElement('div');
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

        unitEntryContentWrapper = document.createElement('div');
        unitEntryContentWrapper.className = CSS_CLASSES.UNIT_ENTRY_CONTENT_WRAPPER; // Add this class
        Object.assign(unitEntryContentWrapper.style, {
            display: 'flex',
            alignItems: 'center', // Vertically align the items
            justifyContent: 'center', // Center content horizontally
            gap: '15px', // Space between the composite image and the unit cards
            minWidth: '100%', // Ensure it takes at least 100% of the parent's width for centering
            width: 'fit-content', // Allows it to grow beyond 100% if content overflows
            flexShrink: '0', // Prevent it from shrinking
        });

        unitRow = document.createElement('div');
        unitRow.className = CSS_CLASSES.UNIT_ROW;
        Object.assign(unitRow.style, {
            position: 'relative',
            display: 'flex', // Ensure unitRow is also a flex container
            // overflowX: 'auto' // Removed overflow from unitRow, as parent handles it
            // padding: '10px 0' // Removed to allow CSS to control padding
            flexShrink: '0', // Prevent it from shrinking
        });

        unitEntryContentWrapper.appendChild(unitRow); // Append unitRow to the new wrapper
        unitEntry.appendChild(unitEntryContentWrapper); // Append the new wrapper to unitEntry

    } else {
        // --- Update Path ---
        unitEntry = existingUnitEntry;
        // Find existing elements within the unitEntry
        unitEntryContentWrapper = unitEntry.querySelector(`.${CSS_CLASSES.UNIT_ENTRY_CONTENT_WRAPPER}`); // Query by class
        unitRow = unitEntryContentWrapper.querySelector(`.${CSS_CLASSES.UNIT_ROW}`);
        compositeImageCanvas = unitEntryContentWrapper.querySelector('.composite-unit-image');
        // Clear unitRow's innerHTML only if it's currently populated
        if (unitRow && unitRow.childElementCount > 0) {
            unitRow.innerHTML = ''; 
        }
    }

    // --- Common Logic (or logic that needs to be conditionally applied/updated) ---
    // Render cards into unitRow
    // Using for...of loop for async operations to ensure order and proper await
    for (const category of categoryOrder) {
        const existingCardSlot = unitRow.querySelector(`.card-slot[data-category="${category}"]`) || unitRow.querySelector(`.${category}-slot`);
        const newSlotWrapper = createUnitCardSlot(category, unitData, unitId, existingCardSlot);
        if (!existingCardSlot) { // If a new slot was created, append it to unitRow
            unitRow.appendChild(newSlotWrapper);
        }
    }

    // Use the new helper function for robust height calculation
    const unitRowHeight = getUnitRowRenderedHeight(unitRow);
    // Create and append/update the composite image
    const showCompositeSetting = state.isGameMode ? state.settings.showUnitCompositeImageGame : state.settings.showUnitCompositeImageRoster;
    if (showCompositeSetting && unitData && unitRowHeight > 0) { // Check for valid height and setting
        if (!compositeImageCanvas) { // Create if it doesn't exist
            compositeImageCanvas = await createUnitPartsCompositeImage(unitData, unitRowHeight); // Pass dynamic height
            compositeImageCanvas.className = 'composite-unit-image'; // Add the new class
            unitEntryContentWrapper.prepend(compositeImageCanvas); // Prepend to put it before unitRow within the new wrapper
        }
        // If it exists, update it (e.g., redraw if unitData changed) - for now, re-create.
        // For truly granular updates, createUnitPartsCompositeImage should also support update-in-place.
        // For this refactoring, re-prepending if it already exists will still be a DOM change.
        // A simpler approach for now: if setting is true, always create/update.
        else {
            const newCompositeImageCanvas = await createUnitPartsCompositeImage(unitData, unitRowHeight);
            newCompositeImageCanvas.className = 'composite-unit-image';
            compositeImageCanvas.replaceWith(newCompositeImageCanvas);
            compositeImageCanvas = newCompositeImageCanvas;
        }
    } else {
        if (compositeImageCanvas) { // Remove if setting is off
            compositeImageCanvas.remove();
            compositeImageCanvas = null;
        }
    }

    // --- Delete Button and Points Display (Builder Mode) ---
    let deleteButton = unitRow.querySelector(`.${CSS_CLASSES.DELETE_UNIT_BUTTON}`);
    let pointsDisplay = unitRow.querySelector('.unit-points-overlay');

    if (!state.isGameMode) {
        if (!deleteButton) {
            deleteButton = document.createElement('button');
            deleteButton.className = CSS_CLASSES.DELETE_UNIT_BUTTON;
            deleteButton.textContent = '-';
            deleteButton.addEventListener('click', () => {
                state.deleteUnit(unitId); // Use state mutation function
            });
            unitRow.appendChild(deleteButton);
        }
        // Update points
        const unitPoints = Object.values(unitData).reduce((sum, card) => sum + (card ? card.points : 0), 0);
        if (!pointsDisplay) {
            pointsDisplay = document.createElement('div');
            pointsDisplay.className = 'unit-points-overlay';
            unitRow.appendChild(pointsDisplay);
        }
        pointsDisplay.textContent = `${unitPoints}`;
    } else {
        if (deleteButton) deleteButton.remove();
        if (pointsDisplay) pointsDisplay.remove();
    }
    
    // --- Token Areas and Unit Out Overlay ---
    // These parts are currently recreated by createUnitCardSlot.
    // Need to ensure they are properly updated in game mode.

    const tokenAreas = Array.from(unitRow.querySelectorAll(`.${CSS_CLASSES.TOKEN_AREA}`));
    if (tokenAreas.some(area => area.hasChildNodes())) {
        const resourceAreaHeight = '58px';
        tokenAreas.forEach(area => area.style.minHeight = resourceAreaHeight);
    }

    let unitOutOverlay = unitRow.querySelector('.unit-out-overlay');
    if (isUnitOut(unitData)) {
        if (!unitOutOverlay) {
            unitOutOverlay = document.createElement('div');
            unitOutOverlay.className = 'unit-out-overlay';
            Object.assign(unitOutOverlay.style, {
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.15)', zIndex: 20, pointerEvents: 'none'
            });
            unitRow.appendChild(unitOutOverlay);
        }
    } else {
        if (unitOutOverlay) unitOutOverlay.remove();
    }
    

    return unitEntry;


    return unitEntry;
};

const _updateUnitDisplay = async (unitId, unitData) => {
    const existingUnitEntry = document.querySelector(`.unit-entry[data-unit-id='${unitId}']`);
    if (existingUnitEntry) {
        // Update the existing element with the updated content
        await createUnitElement(unitId, unitData, existingUnitEntry);
    } else {
        await _renderRoster(); // Fallback to full render if specific update fails
    }
};

// Helper to load an image from a path
const loadSingleImage = (src) => {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
};

export const createDroneImageElements = async (droneData, targetHeight) => {
    const droneImageId = (droneData.id === 0) ? droneData.name : droneData.id;
    const droneSize = droneData.size || 3;
    const sizeMultiplier = droneSize === 2 ? 2/3 : (droneSize === 1 ? 1/3 : 1);
    
    // 드론 이미지 로드
    const droneImg = await loadSingleImage(`CharacterParts/${droneImageId}.png`);
    if (!droneImg) return document.createElement('div');

    // 캔버스 크기 결정 (이미지 비율 유지)
    const aspectRatio = droneImg.width / droneImg.height;
    const canvasHeight = targetHeight * sizeMultiplier;
    const canvasWidth = canvasHeight * aspectRatio;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // 1. 드론 본체 그리기 (상태에 따른 틴트 적용)
    drawTintedImage(ctx, droneImg, 0, 0, canvasWidth, canvasHeight, droneData.cardStatus);

    // 2. 백팩 이미지(있는 경우) 그리기
    if (droneData.special && droneData.special.includes('freight_back') && droneData.backCard && (droneData.backCard.id !== undefined)) {
        const backpackImageId = (droneData.backCard.id === 0) ? droneData.backCard.name : droneData.backCard.id;
        const backpackImg = await loadSingleImage(`CharacterParts/${backpackImageId}_d.png`);
        if (backpackImg) {
            const backStatus = droneData.backCard.cardStatus || 0;
            drawTintedImage(ctx, backpackImg, 0, 0, canvasWidth, canvasHeight, backStatus);
        }
    }

    const container = document.createElement('div');
    container.className = 'drone-image-container';
    container.appendChild(canvas);
    return container;
};

const createDroneElement = async (droneData) => {
    const droneEntry = document.createElement('div');
    droneEntry.className = 'drone-entry';
    droneEntry.dataset.rosterId = droneData.rosterId;

    const showCompositeSetting = state.isGameMode ? state.settings.showUnitCompositeImageGame : state.settings.showUnitCompositeImageRoster;
    if (showCompositeSetting) {
        // 드론 이미지 상단에도 공백을 추가하여 카드와 높이를 맞춥니다.
        const imgWrapper = document.createElement('div');
        imgWrapper.className = CSS_CLASSES.CARD_WRAPPER;
        
        if (state.isGameMode) {
            const header = document.createElement('div');
            header.className = CSS_CLASSES.ACTION_BUTTON_WRAPPER;
            const p = document.createElement('div');
            p.className = CSS_CLASSES.ACTION_BUTTON_PLACEHOLDER;
            header.appendChild(p);
            imgWrapper.appendChild(header);
        }
        
        const droneImageContainer = await createDroneImageElements(droneData, 270);
        imgWrapper.appendChild(droneImageContainer);

        if (state.isGameMode) {
            // 이미지 하단에도 빈 토큰 영역을 추가하여 수직 정렬을 맞춥니다.
            const footer = document.createElement('div');
            footer.className = CSS_CLASSES.TOKEN_AREA;
            imgWrapper.appendChild(footer);
        }

        droneEntry.appendChild(imgWrapper);
    }

    const cardElement = createCardElement(droneData, null, {
        unitId: droneData.rosterId,
        onDeleteCallback: () => {
            state.deleteDrone(droneData.rosterId);
        },
        onClick: (state.isGameMode && !droneData.hidden) ? () => state.advanceCardStatusInState('Drone', droneData.rosterId) : null,
        isInteractive: true,
    });

    if (state.isGameMode) {
        const wrapper = cardElement.querySelector(`.${CSS_CLASSES.CARD_WRAPPER}`);
        const slot = wrapper.querySelector(`.${CSS_CLASSES.DISPLAY_CARD}`);
        const actionButtons = createActionButtons(droneData, null, droneData.rosterId);
        wrapper.insertBefore(actionButtons, slot);

        // 드론 카드 하단에 토큰 영역 추가
        const tokenArea = createTokenArea(droneData, null, droneData.rosterId);
        wrapper.appendChild(tokenArea);
    }

    droneEntry.appendChild(cardElement);

    // freight_back 속성이 있는 경우 백팩 카드 슬롯 추가
    if (droneData.special && droneData.special.includes('freight_back')) {
        const backCardSlot = createFreightBackCardSlot(droneData);
        droneEntry.appendChild(backCardSlot);
    }

    return droneEntry;
};

const createFreightBackCardSlot = (cardData) => {
    const wrapper = document.createElement('div');
    wrapper.className = CSS_CLASSES.CARD_WRAPPER;
    const slot = document.createElement('div');
    slot.className = CSS_CLASSES.CARD_SLOT;

    const backCardData = cardData.backCard;
    if (backCardData) {
        // 백팩 카드를 게임 모드 혹은 빌더 모드에 맞춰 렌더링
        const cardElement = createCardElement(backCardData, null, { 
            mode: state.isGameMode ? 'game' : 'builder',
            isInteractive: true,
            showPoints: !state.isGameMode,
            showInfoButton: true,
            unitId: cardData.rosterId // 드론의 rosterId를 상속받아 업데이트 가능하게 함
        });
        slot.appendChild(cardElement);
    } else {
        const label = document.createElement('span');
        label.className = CSS_CLASSES.SLOT_LABEL;
        label.textContent = 'Backpack';
        slot.appendChild(label);
    }
    wrapper.appendChild(slot);

    // 게임 모드에서 조작 UI 추가
    if (state.isGameMode) {
        // 백팩 카드가 있든 없든 헤더 영역(액션 버튼 혹은 공백)을 추가하여 높이를 맞춥니다.
        const actionButtons = createActionButtons(backCardData, null, cardData.rosterId);
        wrapper.insertBefore(actionButtons, slot);
        
        // 하단 토큰 영역 항상 추가 (정렬용)
        const tokenArea = createTokenArea(backCardData, null, cardData.rosterId);
        wrapper.appendChild(tokenArea);
    } else if (!state.isGameMode) {
        // 빌더 모드에서 클릭 시 백팩 모달 오픈
        slot.addEventListener('click', () => openModal(cardData.rosterId, 'Back', true));
    }
    return wrapper;
};

const _addDroneElement = async (droneData) => {
    const cardElement = await createDroneElement(droneData);
    dom.dronesContainer.appendChild(cardElement);

};

const _updateDroneDisplay = async (droneData) => {
    const existingDroneEntry = document.querySelector(`.drone-entry[data-roster-id='${droneData.rosterId}']`);
    if (existingDroneEntry) {
        // 드론 엔트리 전체를 새로 생성하여 교체 (백팩 슬롯 포함 갱신)
        const newDroneEntry = await createDroneElement(droneData);
        existingDroneEntry.replaceWith(newDroneEntry);
    } else {
        console.warn(`UI: _updateDroneDisplay - Could not find drone entry for rosterId: ${droneData.rosterId} for update. Re-rendering all drones.`);
        dom.dronesContainer.innerHTML = '';
        state.getActiveRoster().drones.forEach(d => _addDroneElement(d));
    }
};





const _updateTacticalCardDisplay = (cardData) => {
    const existingTacticalCardElement = document.querySelector(`.roster-card-container[data-roster-id='${cardData.rosterId}']`);
    if (existingTacticalCardElement) {
        createCardElement(cardData, existingTacticalCardElement, {
            unitId: cardData.rosterId,
            mode: state.isGameMode ? 'game' : 'builder',
            isInteractive: true, // 게임 모드와 빌더 모드 모두에서 상호작용 가능해야 함
            onDeleteCallback: () => {
                state.deleteTacticalCard(cardData.rosterId);
            }
        });
    } else {
        console.warn(`UI: _updateTacticalCardDisplay - Could not find tactical card entry for rosterId: ${cardData.rosterId} for update. Re-rendering all tactical cards.`);

        dom.tacticalCardsContainer.innerHTML = '';
        state.getActiveRoster().tacticalCards.forEach(tc => _addTacticalCardElement(tc));

    }

};

// --- Event Handler ---
const handleStateChange = async (event) => {
    // Always update roster select, as roster names or active roster might have changed
    _updateRosterSelect();
    _updateTotalPoints(); // Always update total points as any change might affect it

    // 1. 전체 렌더링이 필요한 주요 이벤트들을 먼저 처리합니다.
    if (event.type === 'appInitialized' || 
        event.type === 'rosterSwitched' || 
        event.type === 'rosterAdded' || 
        event.type === 'rosterRenamed' || 
        event.type === 'rosterDeleted' ||
        event.type === 'rosterLoadedFromCode' ||
        event.type === 'rosterCleared' ||
        event.type === 'gameModeChanged' ||
        event.type === 'settingsChanged' ||
        event.type === 'unitAdded' || 
        event.type === 'unitDeleted' || 
        event.type === 'droneAdded' || 
        event.type === 'droneDeleted' || 
        event.type === 'tacticalCardAdded' || 
        event.type === 'tacticalCardDeleted' ||
        event.type === 'rosterFactionChanged') {

        await _renderRoster();

        if (event.type === 'gameModeChanged') {
            const enabled = event.detail.isGameMode;
            dom.rosterControls.style.display = enabled ? 'none' : 'flex';
            dom.rosterSummary.style.display = enabled ? 'none' : 'block';
            dom.gameModeHeader.style.display = enabled ? 'block' : 'none';
            dom.addButtonContainer.style.display = enabled ? 'none' : 'flex';
            dom.appTitle.textContent = enabled ? state.activeRosterName : '로스터';
            dom.appTitle.style.display = enabled ? 'block' : 'none';
        }
        adjustOverlayWidths();
        return; // 전체 렌더링을 했으므로 종료
    }
    
    // 2. 특정 카드 업데이트 등 부분 렌더링 처리
    if (event.type === 'unitCardUpdated' || 
        event.type === 'unitCardStatusChanged' ||
        event.type === 'cardRevealedStatusToggled' ||
        event.type === 'cardStatusAdvanced' ||
        event.type === 'cardAddedToUnitOrDroneBack') {

        const { unitId, cardCategory, rosterId, isBackCard } = event.detail;
        const activeRoster = state.isGameMode ? state.gameRoster : state.getActiveRoster();
        let updated = false;

        // 우선 유닛(기체) 내의 카드인지 확인
        if (!isBackCard && unitId !== undefined && unitId !== null && activeRoster.units[unitId]) {
            await _updateUnitDisplay(unitId, activeRoster.units[unitId]);
            updated = true;
        } 
        
        // 드론이거나 드론의 백팩 카드인 경우 확인
        const searchId = rosterId || unitId;
        if (!updated && searchId) {
            const droneData = activeRoster.drones.find(d => d.rosterId === searchId) ||
                              (activeRoster.subCards && activeRoster.subCards.find(sc => sc.rosterId === searchId && sc.category === 'Drone'));
            if (droneData) {
                _updateDroneDisplay(droneData);
                updated = true;
            }
        }

        // 전술 카드인지 확인
        if (!updated && rosterId) {
            const tacticalCardData = activeRoster.tacticalCards.find(tc => tc.rosterId === rosterId) ||
                                     (activeRoster.subCards && activeRoster.subCards.find(sc => sc.rosterId === rosterId && sc.category === 'Tactical'));
            if (tacticalCardData) {
                _updateTacticalCardDisplay(tacticalCardData);
                updated = true;
            }
        }

        if (!updated) {
            await _renderRoster();
        }
    }

    adjustOverlayWidths();
};

// --- Event Listeners ---
document.addEventListener('appInitialized', handleStateChange);
document.addEventListener('rosterSwitched', handleStateChange);
document.addEventListener('activeRosterChanged', handleStateChange);
document.addEventListener('rosterAdded', handleStateChange);
document.addEventListener('rosterRenamed', handleStateChange);
document.addEventListener('rosterDeleted', handleStateChange);
document.addEventListener('rosterFactionChanged', handleStateChange);
document.addEventListener('unitAdded', handleStateChange);
document.addEventListener('unitDeleted', handleStateChange);
document.addEventListener('droneAdded', handleStateChange);
document.addEventListener('droneDeleted', handleStateChange);
document.addEventListener('tacticalCardAdded', handleStateChange);
document.addEventListener('tacticalCardDeleted', handleStateChange);
document.addEventListener('cardAddedToUnitOrDroneBack', handleStateChange);
document.addEventListener('unitCardUpdated', handleStateChange);
document.addEventListener('unitCardStatusChanged', handleStateChange);
document.addEventListener('cardRevealedStatusToggled', handleStateChange);
document.addEventListener('cardStatusAdvanced', handleStateChange);
document.addEventListener('gameModeChanged', handleStateChange);
document.addEventListener('sortOptionChanged', handleStateChange);
document.addEventListener('imageExportSettingsChanged', handleStateChange);
document.addEventListener('rosterLoadedFromCode', handleStateChange);
document.addEventListener('rosterCleared', handleStateChange);
document.addEventListener('settingsChanged', handleStateChange);