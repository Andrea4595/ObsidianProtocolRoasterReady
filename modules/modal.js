import * as dom from './dom.js';
import * as state from './state.js';
import { renderRoster, createBuilderModeImage, createGameCardImage } from './ui.js';
import { performActionAndPreserveScroll } from './gameMode.js';
import { CSS_CLASSES } from './constants.js';

let currentUnitId = null;
let currentCategory = null;
let isBackCard = false;

export const closeModal = () => {
    dom.modalOverlay.style.display = 'none';
    dom.modalImageContainer.innerHTML = '';
    dom.modalImageContainer.classList.remove(CSS_CLASSES.DRONE_VIEW, CSS_CLASSES.TACTICAL_CARD_VIEW);
    document.body.style.overflow = 'auto';
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
    const img = createBuilderModeImage(cardData);
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
    let factionFilteredCards;

    if (isBack) {
        factionFilteredCards = cardsToShow.filter(c => c.faction === faction && !c.special?.includes('cannot_freighted'));
    } else {
        factionFilteredCards = cardsToShow.filter(c => c.faction === faction || c.faction === 'Public');
    }

    dom.modalImageContainer.appendChild(createDeselectOption());
    factionFilteredCards.forEach(cardData => {
        if (cardData.visible === false) return;
        dom.modalImageContainer.appendChild(createCardItem(cardData, addCardToUnit));
    });
    dom.modalOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
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
    document.body.style.overflow = 'hidden';
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
    document.body.style.overflow = 'hidden';
};

function createKeywordElements(keywords) {
    if (!keywords || keywords.length === 0) {
        return null;
    }

    const keywordsContainer = document.createElement('div');
    keywordsContainer.className = 'keywords-container';

    keywords.forEach(keywordStr => {
        const match = keywordStr.match(/(.+?)(?:\((\d+)\))?$/);
        if (!match) return;

        const keywordName = match[1];
        const keywordValue = match[2];

        const keywordData = state.allKeywords.get(keywordName) || state.allKeywords.get(`${keywordName}#`);

        if (keywordData) {
            const keywordElement = document.createElement('div');
            keywordElement.className = 'keyword-item';

            const nameElement = document.createElement('div');
            nameElement.className = 'keyword-name';
            nameElement.textContent = keywordData.name.replace('#', keywordValue || '').trim();

            const infoElement = document.createElement('div');
            infoElement.className = 'keyword-info';
            infoElement.innerHTML = keywordData.information.replace('#', keywordValue || '').replace(/\n/g, '<br>').trim();

            keywordElement.appendChild(nameElement);
            keywordElement.appendChild(infoElement);
            keywordsContainer.appendChild(keywordElement);
        }
    });

    return keywordsContainer;
}

export const openCardDetailModal = (cardData) => {
    const cardDetailContent = document.getElementById('card-detail-content');
    if (!cardDetailContent) return;

    cardDetailContent.innerHTML = ''; // Clear previous content

    const img = createBuilderModeImage(cardData);
    if (state.isGameMode && cardData.isDropped && cardData.drop) {
        img.src = `Cards/${cardData.category}/${cardData.drop}`;
    }
    img.style.width = '100%';
    img.style.height = 'auto';
    cardDetailContent.appendChild(img);

    const keywords = (state.isGameMode && cardData.isDropped && cardData.dropKeywords) ? cardData.dropKeywords : cardData.keywords;
    const keywordsContainer = createKeywordElements(keywords);
    if (keywordsContainer) {
        cardDetailContent.appendChild(keywordsContainer);
    }

    const modal = document.getElementById('card-detail-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

export const closeCardDetailModal = () => {
    const modal = document.getElementById('card-detail-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

export const openImageExportSettingsModal = () => {
    // Apply saved settings to the form
    document.getElementById('setting-show-title').checked = state.imageExportSettings.showTitle;
    document.getElementById('setting-show-discarded').checked = state.imageExportSettings.showDiscarded;
    document.getElementById('setting-show-points').checked = state.imageExportSettings.showPoints;
    document.getElementById('setting-show-total-points').checked = state.imageExportSettings.showTotalPoints;
    document.getElementById('setting-show-card-points').checked = state.imageExportSettings.showCardPoints;
    document.getElementById('setting-show-unit-points').checked = state.imageExportSettings.showUnitPoints;
    document.getElementById('setting-show-sub-cards').checked = state.imageExportSettings.showSubCards;
    document.getElementById('setting-reveal-hidden').checked = state.imageExportSettings.revealHidden;

    // Trigger change event to correctly set sub-option states
    document.getElementById('setting-show-points').dispatchEvent(new Event('change'));


    const rosterState = state.getActiveRoster();
    if (!rosterState) return;

    const allCardsInRoster = [];
    Object.values(rosterState.units).forEach(unit => allCardsInRoster.push(...Object.values(unit)));
    allCardsInRoster.push(...rosterState.drones);
    if (rosterState.tacticalCards) {
        allCardsInRoster.push(...rosterState.tacticalCards);
    }
    const hasHiddenCards = allCardsInRoster.some(card => card && card.hidden);

    if (hasHiddenCards) {
        dom.settingRevealHiddenRow.style.display = 'flex';
    } else {
        dom.settingRevealHiddenRow.style.display = 'none';
    }

    dom.imageExportSettingsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

export const closeImageExportSettingsModal = () => {
    dom.imageExportSettingsModal.style.display = 'none';
    document.body.style.overflow = 'auto';
};
