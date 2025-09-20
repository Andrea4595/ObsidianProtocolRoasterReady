import * as state from './state.js';
import { openModal } from './modal.js';
import { advanceCardStatus, performActionAndPreserveScroll } from './gameMode.js';
import { categoryOrder, CSS_CLASSES } from './constants.js';
import { isUnitOut } from './stats.js';
import { createBuilderModeImage, createGameCardImage, appendStatusToken, createTokenArea, createActionButtons } from './cardRenderer.js';

const createPartStatusIndicator = (unitData) => {
    const indicatorContainer = document.createElement('div');
    indicatorContainer.className = CSS_CLASSES.ACTION_BUTTON_WRAPPER; // 동일한 스타일 재사용

    const partsOrder = ['Torso', 'Chassis', 'Left', 'Right', 'Back'];

    partsOrder.forEach(partName => {
        const partCard = unitData ? unitData[partName] : null;
        const isOff = !partCard || partCard.cardStatus === 2;
        
        const icon = document.createElement('img');
        icon.src = `icons/parts_${partName.toLowerCase()}_${isOff ? 'off' : 'on'}.png`;
        icon.className = 'part-status-icon'; // 스타일링을 위한 클래스 추가
        Object.assign(icon.style, { width: '24px', height: '24px' }); // 다른 토큰과 동일한 크기

        indicatorContainer.appendChild(icon);
    });

    return indicatorContainer;
};

const createUnitCardSlot = (category, unitData, unitId) => {
    const cardData = unitData ? unitData[category] : null;
    const wrapper = document.createElement('div');
    wrapper.className = CSS_CLASSES.CARD_WRAPPER;

    const slot = document.createElement('div');
    slot.className = CSS_CLASSES.CARD_SLOT;
    
    if (cardData) {
        const img = state.isGameMode ? createGameCardImage(cardData) : createBuilderModeImage(cardData);
        slot.appendChild(img);

        if (!state.isGameMode) {
            const points = document.createElement('div');
            points.className = CSS_CLASSES.CARD_POINTS;
            points.textContent = cardData.points || 0;
            slot.appendChild(points);
        } else {
            if (category !== 'Pilot') {
                appendStatusToken(slot, cardData);
            }
        }
    } else {
        const label = document.createElement('span');
        label.className = CSS_CLASSES.SLOT_LABEL;
        label.textContent = category;
        slot.appendChild(label);
    }
    wrapper.appendChild(slot);

    if (state.isGameMode) {
        if (cardData) {
            wrapper.appendChild(createTokenArea(cardData, unitData));
            if (category !== 'Pilot') {
                slot.style.cursor = 'pointer';
                slot.addEventListener('click', (e) => performActionAndPreserveScroll(() => advanceCardStatus(cardData, unitData), e.target));
                wrapper.insertBefore(createActionButtons(cardData, unitData), slot);
            } else {
                wrapper.insertBefore(createPartStatusIndicator(unitData), slot);
            }
        } else {
            wrapper.insertBefore(createActionButtons(null, unitData), slot);
            wrapper.appendChild(createTokenArea(null, unitData));
        }
    } else {
        slot.style.cursor = 'pointer';
        slot.addEventListener('click', () => openModal(unitId, category));
    }
    
    return wrapper;
};

export const createUnitElement = (unitId, unitData) => {
    const unitEntry = document.createElement('div');
    unitEntry.className = CSS_CLASSES.UNIT_ENTRY;
    unitEntry.dataset.unitId = unitId;

    const unitRow = document.createElement('div');
    unitRow.className = CSS_CLASSES.UNIT_ROW;
    unitRow.style.position = 'relative'; // Set unitRow as the positioning context
    if (unitId >= state.nextUnitId) state.setNextUnitId(unitId + 1);

    categoryOrder.forEach(category => {
        const cardSlot = createUnitCardSlot(category, unitData, unitId);
        unitRow.appendChild(cardSlot);
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
        Object.assign(pointsDisplay.style, {
            position: 'absolute',
            top: '10px',
            left: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            zIndex: '10'
        });
        unitRow.appendChild(pointsDisplay); // Append to unitRow
    }

    const tokenAreas = Array.from(unitRow.querySelectorAll(`.${CSS_CLASSES.TOKEN_AREA}`));
    if (tokenAreas.some(area => area.hasChildNodes())) {
        const resourceAreaHeight = '58px';
        tokenAreas.forEach(area => area.style.minHeight = resourceAreaHeight);
    }

    // 유닛 파괴 조건 충족 시 오버레이 추가
    if (isUnitOut(unitData)) {
        const overlay = document.createElement('div');
        overlay.className = 'unit-out-overlay'; // 식별용 클래스 추가
        Object.assign(overlay.style, {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.15)',
            zIndex: 20,
            pointerEvents: 'none'
        });
        unitRow.appendChild(overlay);
    }

    return unitEntry;
};