import * as dom from './dom.js';
import * as state from './state.js';
import { renderRoster } from './ui.js';
import { performActionAndPreserveScroll } from './gameMode.js';
import { CSS_CLASSES } from './constants.js';

let currentUnitId = null;
let currentCategory = null;
let isBackCard = false;

export const closeModal = () => {
    dom.modalOverlay.style.display = 'none';
    dom.modalImageContainer.innerHTML = '';
    dom.modalImageContainer.classList.remove(CSS_CLASSES.DRONE_VIEW);
};

const addCardToUnit = (cardData) => {
    performActionAndPreserveScroll(() => {
        const roster = state.getActiveRoster();
        if (isBackCard) {
            const drone = roster.drones.find(d => d.rosterId === currentUnitId);
            if (drone) drone.backCard = cardData;
        } else {
            roster.units[currentUnitId][currentCategory] = cardData;
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

const createCardItem = (cardData, clickHandler) => {
    const cardItem = document.createElement('div');
    cardItem.className = CSS_CLASSES.MODAL_CARD_ITEM;
    const img = document.createElement('img');
    img.src = `Cards/${cardData.category}/${cardData.fileName}`;
    cardItem.appendChild(img);

    const points = document.createElement('div');
    points.className = CSS_CLASSES.CARD_POINTS;
    points.textContent = cardData.points || 0;
    cardItem.appendChild(points);

    cardItem.addEventListener('click', () => clickHandler(cardData));
    return cardItem;
};

const createDeselectOption = () => {
    const deselect = document.createElement('div');
    deselect.className = CSS_CLASSES.DESELECT_OPTION;
    deselect.textContent = '선택 해제';
    deselect.addEventListener('click', () => addCardToUnit(null));
    return deselect;
};

export const openModal = (unitId, category, isBack = false) => {
    currentUnitId = unitId;
    currentCategory = category;
    isBackCard = isBack;
    dom.modalTitle.textContent = `${category} 부품 선택`;

    const cardsToShow = state.allCards.byCategory[category] || [];
    const faction = state.getActiveRoster().faction;
    const factionFilteredCards = cardsToShow.filter(c => c.faction === faction || c.faction === 'Public');

    dom.modalImageContainer.appendChild(createDeselectOption());
    factionFilteredCards.forEach(cardData => {
        if (cardData.visible === false) return;
        dom.modalImageContainer.appendChild(createCardItem(cardData, addCardToUnit));
    });

    dom.modalOverlay.style.display = 'flex';
};

export const openDroneModal = () => {
    dom.modalTitle.textContent = '드론 선택';
    dom.modalImageContainer.classList.add(CSS_CLASSES.DRONE_VIEW);

    const faction = state.getActiveRoster().faction;
    const factionFilteredDrones = state.allCards.drones.filter(d => d.faction === faction || d.faction === 'Public');

    factionFilteredDrones.forEach(cardData => {
        if (cardData.visible === false) return;
        dom.modalImageContainer.appendChild(createCardItem(cardData, addDroneToRoster));
    });

    dom.modalOverlay.style.display = 'flex';
};

export const openTacticalCardModal = () => {
    dom.modalTitle.textContent = '전술 카드 선택';
    dom.modalImageContainer.classList.remove(CSS_CLASSES.DRONE_VIEW);
    dom.modalImageContainer.classList.add(CSS_CLASSES.TACTICAL_CARD_VIEW);

    const faction = state.getActiveRoster().faction;
    const tacticalCards = state.allCards.tactical || [];
    const factionFilteredTacticalCards = tacticalCards.filter(c => c.faction === faction || c.faction === 'Public');

    factionFilteredTacticalCards.forEach(cardData => {
        if (cardData.visible === false) return;
        dom.modalImageContainer.appendChild(createCardItem(cardData, addTacticalCardToRoster)); // Tactical cards are added using addTacticalCardToRoster
    });

    dom.modalOverlay.style.display = 'flex';
};
