import * as dom from './dom.js';
import * as state from './state.js';
import { renderRoster } from './ui.js';
import { createBuilderModeImage } from './cardRenderer.js';
import { performActionAndPreserveScroll } from './gameMode.js';
import { CSS_CLASSES } from './constants.js';

// --- Helper Functions ---

const createCardItem = (cardData, clickHandler) => {
    const cardItem = document.createElement('div');
    cardItem.className = CSS_CLASSES.MODAL_CARD_ITEM;
    const img = createBuilderModeImage(cardData);
    cardItem.appendChild(img);

    const points = document.createElement('div');
    points.className = CSS_CLASSES.CARD_POINTS;
    points.textContent = cardData.points || 0;
    cardItem.appendChild(points);

    cardItem.addEventListener('click', () => clickHandler(cardData));
    return cardItem;
};

const createDeselectOption = (clickHandler) => {
    const deselect = document.createElement('div');
    deselect.className = CSS_CLASSES.DESELECT_OPTION;
    deselect.textContent = '선택 해제';
    deselect.addEventListener('click', clickHandler);
    return deselect;
};

// --- Modal Core Logic ---

export const closeModal = () => {
    dom.modalOverlay.style.display = 'none';
    dom.modalImageContainer.innerHTML = '';
    // Reset container classes
    dom.modalImageContainer.className = 'modal-image-container';
};

const _openModal = ({ title, cards, onCardClick, containerClasses = [], showDeselect = false, deselectHandler }) => {
    dom.modalTitle.textContent = title;
    dom.modalImageContainer.innerHTML = '';
    dom.modalImageContainer.className = 'modal-image-container';
    containerClasses.forEach(cls => dom.modalImageContainer.classList.add(cls));

    const faction = state.getActiveRoster().faction;
    const factionFilteredCards = cards.filter(c => c.faction === faction || c.faction === 'Public');

    if (showDeselect && deselectHandler) {
        dom.modalImageContainer.appendChild(createDeselectOption(deselectHandler));
    }

    factionFilteredCards.forEach(cardData => {
        if (cardData.visible === false) return;
        dom.modalImageContainer.appendChild(createCardItem(cardData, onCardClick));
    });

    dom.modalOverlay.style.display = 'flex';
};

// --- Card Action Handlers ---

const createCardToUnitHandler = (unitId, category, isBack) => (cardData) => {
    performActionAndPreserveScroll(() => {
        const roster = state.getActiveRoster();
        if (isBack) {
            const drone = roster.drones.find(d => d.rosterId === unitId);
            if (drone) drone.backCard = cardData;
        } else {
            roster.units[unitId][category] = cardData;
        }
    });

    state.saveAllRosters();
    closeModal();
};

const addDroneToRoster = (cardData) => {
    const newDrone = { ...cardData, rosterId: `d_${state.nextDroneId}` };
    state.setNextDroneId(state.nextDroneId + 1);
    state.getActiveRoster().drones.push(newDrone);
    renderRoster();
    state.saveAllRosters();
    closeModal();
};

const addTacticalCardToRoster = (cardData) => {
    const newTacticalCard = { ...cardData, rosterId: `t_${state.nextTacticalCardId}` };
    state.setNextTacticalCardId(state.nextTacticalCardId + 1);
    state.getActiveRoster().tacticalCards.push(newTacticalCard);
    renderRoster();
    state.saveAllRosters();
    closeModal();
};


// --- Public-Facing Modal Openers ---

export const openModal = (unitId, category, isBack = false) => {
    const clickHandler = createCardToUnitHandler(unitId, category, isBack);
    _openModal({
        title: `${category} 부품 선택`,
        cards: state.allCards.byCategory[category] || [],
        onCardClick: clickHandler,
        showDeselect: true,
        deselectHandler: () => clickHandler(null)
    });
};

export const openDroneModal = () => {
    _openModal({
        title: '드론 선택',
        cards: state.allCards.drones,
        onCardClick: addDroneToRoster,
        containerClasses: [CSS_CLASSES.DRONE_VIEW]
    });
};

export const openTacticalCardModal = () => {
    _openModal({
        title: '전술 카드 선택',
        cards: state.allCards.tactical || [],
        onCardClick: addTacticalCardToRoster,
        containerClasses: [CSS_CLASSES.TACTICAL_CARD_VIEW]
    });
};
