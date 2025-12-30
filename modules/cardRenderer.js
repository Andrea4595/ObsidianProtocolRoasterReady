// modules/cardRenderer.js

/**
 * 이 모듈은 애플리케이션의 모든 카드 렌더링 로직을 중앙에서 관리합니다.
 * UI, 이미지 익스포터 등 다양한 컨텍스트에서 일관된 카드 표현을 보장합니다.
 */

import * as state from './state.js';
import { CSS_CLASSES } from './constants.js';
import { openCardDetailModal } from './modal.js';
import { advanceCardStatus, performActionAndPreserveScroll } from './gameMode.js';

// --- Internal Helper Functions ---

const createDomElement = (tag, options = {}) => {
    const element = document.createElement(tag);
    if (options.className) element.className = options.className;
    if (options.textContent) element.textContent = options.textContent;
    if (options.src) element.src = options.src;
    if (options.style) Object.assign(element.style, options.style);
    return element;
};

const createCardImage = (cardData, mode) => {
    const isDestroyed = mode === 'game' && cardData.cardStatus === 2;
    const imgSrc = `Cards/${cardData.category}/${(mode === 'game' && cardData.isDropped) ? cardData.drop : cardData.fileName}`;
    
    const img = createDomElement('img', { className: 'card-image', src: imgSrc });

    if (isDestroyed) img.style.filter = 'brightness(50%)';
    
    return img;
};

const createPointsElement = (cardData) => {
    return createDomElement('div', {
        className: CSS_CLASSES.CARD_POINTS,
        textContent: cardData.points || 0
    });
};

const createInfoButton = (cardData) => {
    if (!cardData || cardData.category === 'Tactical') return null;
    const infoButton = createDomElement('img', { src: 'icons/information.png', className: 'info-button' });
    infoButton.addEventListener('click', (e) => {
        e.stopPropagation();
        openCardDetailModal(cardData);
    });
    return infoButton;
};

const createDeleteButton = (cardData) => {
    const deleteButton = createDomElement('button', { className: CSS_CLASSES.DELETE_DRONE_BUTTON, textContent: '-' });
    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        performActionAndPreserveScroll(() => {
            if (cardData.category === 'Drone') {
                state.getActiveRoster().drones = state.getActiveRoster().drones.filter(d => d.rosterId !== cardData.rosterId);
            } else if (cardData.category === 'Tactical') {
                state.getActiveRoster().tacticalCards = state.getActiveRoster().tacticalCards.filter(t => t.rosterId !== cardData.rosterId);
            }
        });
    });
    return deleteButton;
};

const appendStatusToken = (cardElement, cardData) => {
    let tokenSrc = null;
    const isDrone = cardData.category === 'Drone';
    if (cardData.cardStatus === 1) tokenSrc = 'icons/warning.png';
    if (cardData.cardStatus === 2) tokenSrc = 'icons/destroyed.png';
    if (cardData.cardStatus === 3 && !isDrone) tokenSrc = 'icons/repaired.png';

    if (tokenSrc) {
        const tokenImg = createDomElement('img', { src: tokenSrc, className: `${CSS_CLASSES.STATUS_TOKEN} ${isDrone ? 'drone-status-token' : ''}` });
        cardElement.appendChild(tokenImg);
    }
};

const createHiddenCardOverlay = (cardData) => {
    const overlay = createDomElement('div', { className: CSS_CLASSES.HIDDEN_CARD_OVERLAY, style: { backgroundColor: 'rgb(80, 80, 80)' } });
    if (cardData.hiddenTitle) {
        overlay.appendChild(createDomElement('img', { className: CSS_CLASSES.HIDDEN_TITLE_IMAGE, src: `icons/${cardData.hiddenTitle}` }));
    }
    overlay.appendChild(createDomElement('img', { className: CSS_CLASSES.UNKNOWN_ICON_IMAGE, src: 'icons/unknown.png' }));
    return overlay;
};


// --- Main Card Element Creator ---

export const createCardElement = (cardData, options = {}) => {
    const { 
        mode = 'builder', 
        isInteractive = true, 
        showPoints = false,
        showInfoButton = false,
        showDeleteButton = false,
        onClick = null,
        unit = null // Pass unit data for game mode logic
    } = options;

    const mainContainer = createDomElement('div', { style: { display: 'flex', gap: '0px', alignItems: 'flex-start' } });
    const wrapper = createDomElement('div', { className: CSS_CLASSES.CARD_WRAPPER });
    const card = createDomElement('div', { className: CSS_CLASSES.DISPLAY_CARD, style: { position: 'relative' } });

    // Apply sizing classes only when not in a modal context that handles its own sizing
    if (mode !== 'modal' && mode !== 'export') {
        if (cardData.category === 'Drone' || cardData.category === 'Projectile') {
            card.classList.add(CSS_CLASSES.DRONE_DISPLAY_CARD, 'drone-card');
        } else if (cardData.category === 'Tactical') {
            card.classList.add(CSS_CLASSES.TACTICAL_DISPLAY_CARD);
        }
    }
    
    wrapper.appendChild(card);
    mainContainer.appendChild(wrapper);

    // --- Card Content ---
    const img = createCardImage(cardData, mode);
    card.appendChild(img);

    // --- Overlays and Buttons ---
    if (showPoints) {
        card.appendChild(createPointsElement(cardData));
    }

    if (showInfoButton) {
        const infoButton = createInfoButton(cardData);
        if (infoButton) card.appendChild(infoButton);
    }

    if (showDeleteButton) {
        wrapper.appendChild(createDeleteButton(cardData));
    }
    
    // --- Game Mode Specifics ---
    if (mode === 'game') {
        const isHiddenTactical = cardData.hidden && !cardData.isRevealedInGameMode;
        if (isInteractive) {
            card.style.cursor = 'pointer';
            let gameClickCallback = onClick;
            if (!gameClickCallback) { // Default game mode click action
                 if (cardData.hidden) {
                    gameClickCallback = (e) => performActionAndPreserveScroll(() => { cardData.isRevealedInGameMode = !cardData.isRevealedInGameMode; }, e.target);
                } else {
                    gameClickCallback = (e) => performActionAndPreserveScroll(() => advanceCardStatus(cardData, unit), e.target);
                }
            }
             if(gameClickCallback) card.addEventListener('click', gameClickCallback);

        }
        
        if (isHiddenTactical) {
            card.appendChild(createHiddenCardOverlay(cardData));
        } else if (isInteractive) {
            appendStatusToken(card, cardData);
        }
    } else {
        // All other modes (builder, modal, export)
        if(onClick) card.addEventListener('click', onClick);
    }
    
    return mainContainer;
};
