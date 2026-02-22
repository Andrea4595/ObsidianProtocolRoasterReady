import * as dom from './dom.js';
import * as state from './state.js';
import { currentSort, setCurrentSort, saveCurrentSort } from './state.js';
// import { renderRoster, updateUnitDisplay, updateTotalPoints, addDroneElement, addTacticalCardElement, updateDroneDisplay, updateTacticalCardDisplay } from './ui.js'; // Removed direct UI imports
import { performActionAndPreserveScroll } from './gameMode.js';
import { CSS_CLASSES } from './constants.js';
import { renderCardElement } from './cardRenderer.js';

let currentUnitId = null;
let currentCategory = null;
let isBackCard = false;

export const closeModal = () => {
    dom.modalOverlay.style.display = 'none';
    dom.modalImageContainer.innerHTML = '';
    dom.modalImageContainer.classList.remove(CSS_CLASSES.DRONE_VIEW, CSS_CLASSES.TACTICAL_CARD_VIEW);
    document.body.style.overflow = 'auto';

    const sortButtonsContainer = document.getElementById('modal-sort-options');
    if (sortButtonsContainer.clickHandler) {
        sortButtonsContainer.removeEventListener('click', sortButtonsContainer.clickHandler);
        sortButtonsContainer.clickHandler = null;
    }
};

const addCardToUnit = (cardData) => {
    performActionAndPreserveScroll(
        async () => { // action
            state.addCardToUnitOrDroneBack(currentUnitId, currentCategory, cardData, isBackCard);
            // UI updates are now handled by ui.js reacting to state change events.
            // Specifically, 'cardAddedToUnitOrDroneBack' will trigger appropriate UI updates.
        },
        null, // affectedCardData - not used by performActionAndPreserveScroll's UI update logic, handled here
        null, // affectedUnitData - not used by performActionAndPreserveScroll's UI update logic, handled here
        null  // eventTarget - not relevant here
    );

    closeModal();
};

const addDroneToRoster = (cardData) => {
    performActionAndPreserveScroll(
        () => {
            state.addDroneToRoster(cardData); // Use state mutation function. ui.js will react to 'droneAdded'
            // UI updates are now handled by ui.js reacting to state change events.
        },
        null, // affectedCardData - not used by performActionAndPreserveScroll's UI update logic, handled here
        null, // affectedUnitData - not used by performActionAndPreserveScroll's UI update logic, handled here
        null  // eventTarget - not relevant here
    );
    closeModal();
};

const addTacticalCardToRoster = (cardData) => {
    performActionAndPreserveScroll(
        () => {
            state.addTacticalCardToRoster(cardData); // Use state mutation function. ui.js will react to 'tacticalCardAdded'
            // UI updates are now handled by ui.js reacting to state change events.
        },
        null, // affectedCardData - not used by performActionAndPreserveScroll's UI update logic, handled here
        null, // affectedUnitData - not used by performActionAndPreserveScroll's UI update logic, handled here
        null  // eventTarget - not relevant here
    );
    closeModal();
};

const createCardItem = (cardData, clickHandler) => {
    const cardItem = document.createElement('div');
    cardItem.className = CSS_CLASSES.MODAL_CARD_ITEM;
    
    // Use the centralized renderer
    const cardElement = renderCardElement(cardData, null, { 
        mode: 'modal', 
        showPoints: true, 
        showInfoButton: true, // Enable the info button in the modal
        onClick: () => clickHandler(cardData) 
    });
    
    cardItem.appendChild(cardElement);

    return cardItem;
};

const createDeselectOption = () => {
    const deselect = document.createElement('div');
    deselect.className = CSS_CLASSES.DESELECT_OPTION;
    deselect.textContent = '선택 해제';
    deselect.addEventListener('click', () => addCardToUnit(null));
    return deselect;
};



const populateModal = (cards, clickHandler, isDeselectable = false) => {
    dom.modalImageContainer.innerHTML = ''; // Clear existing cards

    const fragment = document.createDocumentFragment();

    if (isDeselectable) {
        fragment.appendChild(createDeselectOption());
    }

    let sortedCards = [...cards];
    if (state.currentSort === 'points') {
        sortedCards.sort((a, b) => (a.points || 0) - (b.points || 0));
    } else if (state.currentSort === 'name') {
        sortedCards.sort((a, b) => a.name.localeCompare(b.name));
    }
    // 'datasheet' is the default order, so no sorting needed

    sortedCards.forEach(cardData => {
        if (cardData.visible === false) return;
        fragment.appendChild(createCardItem(cardData, clickHandler));
    });

    dom.modalImageContainer.appendChild(fragment); // Append all at once
};

const setupSortButtons = (cards, clickHandler, isDeselectable) => {
    const sortButtonsContainer = document.getElementById('modal-sort-options');
    const sortButtons = sortButtonsContainer.querySelectorAll('button');

    // Set initial active button
    sortButtons.forEach(button => {
        if (button.dataset.sort === state.currentSort) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    // Event delegation
    const sortButtonClickHandler = (event) => {
        const clickedButton = event.target.closest('button');
        if (!clickedButton) return;

        state.setCurrentSort(clickedButton.dataset.sort);
        state.saveCurrentSort();

        sortButtons.forEach(btn => btn.classList.remove('active'));
        clickedButton.classList.add('active');

        populateModal(cards, clickHandler, isDeselectable);
    };

    // Remove old listener before adding new one
    if (sortButtonsContainer.clickHandler) {
        sortButtonsContainer.removeEventListener('click', sortButtonsContainer.clickHandler);
    }
    sortButtonsContainer.addEventListener('click', sortButtonClickHandler);
    sortButtonsContainer.clickHandler = sortButtonClickHandler;
};

export const openModal = (unitId, category, isBack = false) => {
    currentUnitId = unitId;
    currentCategory = category;
    isBackCard = isBack;
    dom.modalTitle.textContent = `${category} 부품 선택`;
    document.getElementById('modal-sort-options').style.display = 'block';


    const cardsToShow = state.allCards.byCategory[category] || [];
    const faction = state.getActiveRoster().faction;
    let factionFilteredCards;

    if (isBack) {
        factionFilteredCards = cardsToShow.filter(c => c.faction === faction && !c.special?.includes('cannot_freighted'));
    } else {
        factionFilteredCards = cardsToShow.filter(c => c.faction === faction || c.faction === 'Public');
    }

    setupSortButtons(factionFilteredCards, addCardToUnit, true);
    populateModal(factionFilteredCards, addCardToUnit, true);

    dom.modalOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

export const openDroneModal = () => {
    dom.modalTitle.textContent = '드론 선택';
    dom.modalImageContainer.classList.add(CSS_CLASSES.DRONE_VIEW);
    document.getElementById('modal-sort-options').style.display = 'block';

    const faction = state.getActiveRoster().faction;
    const factionFilteredDrones = state.allCards.drones.filter(d => d.faction === faction || d.faction === 'Public');

    setupSortButtons(factionFilteredDrones, addDroneToRoster, false);
    populateModal(factionFilteredDrones, addDroneToRoster, false);

    dom.modalOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

export const openTacticalCardModal = () => {
    dom.modalTitle.textContent = '전술 카드 선택';
    dom.modalImageContainer.classList.remove(CSS_CLASSES.DRONE_VIEW);
    dom.modalImageContainer.classList.add(CSS_CLASSES.TACTICAL_CARD_VIEW);
    document.getElementById('modal-sort-options').style.display = 'none';


    const faction = state.getActiveRoster().faction;
    const tacticalCards = state.allCards.tactical || [];
    const factionFilteredTacticalCards = tacticalCards.filter(c => c.faction === faction || c.faction === 'Public');

    dom.modalImageContainer.innerHTML = ''; // Clear existing content
    factionFilteredTacticalCards.forEach(cardData => {
        if (cardData.visible === false) return;
        dom.modalImageContainer.appendChild(createCardItem(cardData, addTacticalCardToRoster));
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

function createRelatedCardsContainer(cardData) {
    const container = document.createElement('div');
    container.className = 'related-cards-section';
    Object.assign(container.style, {
        marginTop: '30px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        alignItems: 'center'
    });

    const createSection = (title, fileNames, category) => {
        if (!fileNames || fileNames.length === 0) return null;
        
        const section = document.createElement('div');
        section.style.width = '100%';
        section.innerHTML = `<h3 style="margin-bottom: 20px; border-bottom: 2px solid #1877f2; padding-bottom: 10px; color: #1c1e21;">${title}</h3>`;
        
        const grid = document.createElement('div');
        Object.assign(grid.style, {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            justifyContent: 'center'
        });

        fileNames.forEach(fileName => {
            // Try to get full card data from the registry
            let cardDataTemplate = state.allCards.byFileName.get(fileName);
            
            // If not found (common for 'drop' variants), create a temporary object based on current card
            if (!cardDataTemplate) {
                cardDataTemplate = { ...cardData, fileName: fileName };
            }

            // Render as a full display card
            const cardElement = renderCardElement(cardDataTemplate, null, {
                mode: 'modal',
                showPoints: true,
                showInfoButton: false, // Don't show recursive info button
                isInteractive: false
            });
            
            grid.appendChild(cardElement);
        });

        section.appendChild(grid);
        return section;
    };

    // 1. Drop Card
    if (cardData.drop) {
        const dropSection = createSection('버리기 시 교체 카드', [cardData.drop], cardData.category);
        if (dropSection) container.appendChild(dropSection);
    }

    // 2. Changes (Variations)
    if (cardData.changes && cardData.changes.length > 0) {
        const changesSection = createSection('변경 가능 목록', cardData.changes, cardData.category);
        if (changesSection) container.appendChild(changesSection);
    }

    // 3. Sub Cards
    if (cardData.resolvedSubCards && cardData.resolvedSubCards.length > 0) {
        const subSection = document.createElement('div');
        subSection.style.width = '100%';
        subSection.innerHTML = `<h3 style="margin-bottom: 20px; border-bottom: 2px solid #1877f2; padding-bottom: 10px; color: #1c1e21;">서브 카드</h3>`;
        
        const grid = document.createElement('div');
        Object.assign(grid.style, {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            justifyContent: 'center'
        });

        cardData.resolvedSubCards.forEach(subCard => {
            // Render as a full display card
            const cardElement = renderCardElement(subCard, null, {
                mode: 'modal',
                showPoints: true,
                showInfoButton: false,
                isInteractive: false
            });
            
            grid.appendChild(cardElement);
        });

        subSection.appendChild(grid);
        container.appendChild(subSection);
    }

    return container.hasChildNodes() ? container : null;
}

export const openCardDetailModal = (cardData) => {
    const modal = document.getElementById('card-detail-modal');
    const cardDetailContent = document.getElementById('card-detail-content');
    const modalContent = document.getElementById('card-detail-modal-content'); // Get the scrolling container
    if (!cardDetailContent || !modal || !modalContent) return;

    // Logic to add a class to the modal for styling based on card type
    modal.classList.remove('detail-view-wide');
    if (cardData.category === 'Drone' || cardData.category === 'Projectile') {
        modal.classList.add('detail-view-wide');
    }

    cardDetailContent.innerHTML = ''; // Clear previous content

    const cardElement = renderCardElement(cardData, null, { mode: 'modal' });
    const img = cardElement.querySelector('img');

    if (state.isGameMode && cardData.isDropped && cardData.drop) {
        img.src = `Cards/${cardData.category}/${cardData.drop}`;
    }

    img.style.width = '100%';
    cardDetailContent.appendChild(cardElement);

    const keywords = (state.isGameMode && cardData.isDropped && cardData.dropKeywords) ? cardData.dropKeywords : cardData.keywords;
    const keywordsContainer = createKeywordElements(keywords);
    if (keywordsContainer) {
        cardDetailContent.appendChild(keywordsContainer);
    }

    // Add related cards (drop, changes, sub-cards)
    const relatedCardsContainer = createRelatedCardsContainer(cardData);
    if (relatedCardsContainer) {
        cardDetailContent.appendChild(relatedCardsContainer);
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Reset scroll position to top after displaying the modal
    requestAnimationFrame(() => {
        modalContent.scrollTop = 0;
    });
};

export const closeCardDetailModal = () => {
    const modal = document.getElementById('card-detail-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('detail-view-wide'); // Clean up class on close
        document.body.style.overflow = 'auto';
    }
};

export const openImageExportSettingsModal = () => {
    // Apply saved settings to the form
    document.getElementById('setting-show-title').checked = state.imageExportSettings.showTitle;
    dom.settingShowUnitCompositeExport.checked = state.imageExportSettings.showUnitComposite;
    document.getElementById('setting-show-total-points').checked = state.imageExportSettings.showTotalPoints;
    document.getElementById('setting-show-details').checked = state.imageExportSettings.showDetails;
    document.getElementById('setting-show-discarded').checked = state.imageExportSettings.showDiscarded;
    document.getElementById('setting-show-card-points').checked = state.imageExportSettings.showCardPoints;
    document.getElementById('setting-show-unit-points').checked = state.imageExportSettings.showUnitPoints;
    document.getElementById('setting-show-sub-cards').checked = state.imageExportSettings.showSubCards;
    document.getElementById('setting-reveal-hidden').checked = state.imageExportSettings.revealHidden;
    document.getElementById('setting-show-tactical').checked = state.imageExportSettings.showTactical;

    // Trigger change event to correctly set sub-option states
    document.getElementById('setting-show-details').dispatchEvent(new Event('change'));


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

export const openSettingsModal = () => {
    // Apply saved settings to the form
    dom.settingShowUnitCompositeImageRoster.checked = state.settings.showUnitCompositeImageRoster;
    dom.settingShowUnitCompositeImageGame.checked = state.settings.showUnitCompositeImageGame;

    dom.settingsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

export const closeSettingsModal = () => {
    dom.settingsModal.style.display = 'none';
    document.body.style.overflow = 'auto';
};
