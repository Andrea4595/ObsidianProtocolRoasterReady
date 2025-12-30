// modules/cardRenderer.js

/**
 * 이 모듈은 애플리케이션의 모든 카드 렌더링 로직을 중앙에서 관리합니다.
 * UI, 이미지 익스포터 등 다양한 컨텍스트에서 일관된 카드 표현을 보장합니다.
 */

import * as state from './state.js';
import { CSS_CLASSES } from './constants.js';
import { openModal, openCardDetailModal } from './modal.js';
import { advanceCardStatus, performActionAndPreserveScroll } from './gameMode.js';

// --- Helper Functions ---

const createDomElement = (tag, options = {}) => {
    const element = document.createElement(tag);
    if (options.className) element.className = options.className;
    if (options.textContent) element.textContent = options.textContent;
    if (options.src) element.src = options.src;
    if (options.style) Object.assign(element.style, options.style);
    if (options.dataset) {
        for (const key in options.dataset) {
            element.dataset[key] = options.dataset[key];
        }
    }
    return element;
};

const createCardImage = (cardData, mode) => {
    const isDestroyed = mode === 'game' && cardData.cardStatus === 2;
    const imgSrc = `Cards/${cardData.category}/${(mode === 'game' && cardData.isDropped) ? cardData.drop : cardData.fileName}`;
    
    const img = createDomElement('img', {
        className: 'card-image',
        src: imgSrc
    });

    if (isDestroyed) {
        img.style.filter = 'brightness(50%)';
    }
    return img;
};

const appendStatusToken = (cardElement, cardData) => {
    let tokenSrc = null;
    const isDrone = cardData.category === 'Drone';
    if (cardData.cardStatus === 1) tokenSrc = 'icons/warning.png';
    if (cardData.cardStatus === 2) tokenSrc = 'icons/destroyed.png';
    if (cardData.cardStatus === 3 && !isDrone) tokenSrc = 'icons/repaired.png';

    if (tokenSrc) {
        const tokenImg = createDomElement('img', {
            src: tokenSrc,
            className: `${CSS_CLASSES.STATUS_TOKEN} ${isDrone ? 'drone-status-token' : ''}`
        });
        cardElement.appendChild(tokenImg);
    }
};

const createHiddenCardOverlay = (cardData) => {
    const overlay = createDomElement('div', {
        className: CSS_CLASSES.HIDDEN_CARD_OVERLAY,
        style: { backgroundColor: 'rgb(80, 80, 80)' }
    });

    if (cardData.hiddenTitle) {
        overlay.appendChild(createDomElement('img', {
            className: CSS_CLASSES.HIDDEN_TITLE_IMAGE,
            src: `icons/${cardData.hiddenTitle}`
        }));
    }

    overlay.appendChild(createDomElement('img', {
        className: CSS_CLASSES.UNKNOWN_ICON_IMAGE,
        src: 'icons/unknown.png'
    }));

    return overlay;
};

function setupCardInteractions(element, cardData, clickCallback) {
    if (clickCallback) {
        element.addEventListener('click', clickCallback);
    }

    if (cardData && cardData.category !== 'Tactical') {
        const infoButton = createDomElement('img', {
            src: 'icons/information.png',
            className: 'info-button'
        });
        infoButton.addEventListener('click', (e) => {
            e.stopPropagation();
            openCardDetailModal(cardData);
        });
        element.appendChild(infoButton);
    }
}


// --- Main Card Element Creator ---

/**
 * @param {object} cardData - The card data object.
 * @param {object} options
 * @param {'game' | 'builder' | 'export'} options.mode - The rendering mode.
 * @param {boolean} [options.isInteractive=true] - Whether the card should have game mode interactions.
 * @param {object} [options.exportSettings] - Settings for image export.
 * @param {string} [options.unitId] - The unit ID for builder mode interactions.
 * @returns {HTMLElement} - The generated card element.
 */
export const createCardElement = (cardData, options) => {
    const { mode, isInteractive = true, exportSettings = {}, unitId = null } = options;

    const mainContainer = createDomElement('div', { style: { display: 'flex', gap: '0px', alignItems: 'flex-start' } });
    const wrapper = createDomElement('div', { className: CSS_CLASSES.CARD_WRAPPER });
    const card = createDomElement('div', { className: `${CSS_CLASSES.DISPLAY_CARD}` });
    
    if (mode !== 'modal') {
        if (cardData.category === 'Drone' || cardData.category === 'Projectile') {
            card.classList.add(CSS_CLASSES.DRONE_DISPLAY_CARD, 'drone-card');
        } else if (cardData.category === 'Tactical') {
            card.classList.add(CSS_CLASSES.TACTICAL_DISPLAY_CARD);
        }
    }

    card.style.position = 'relative';
    wrapper.appendChild(card);
    mainContainer.appendChild(wrapper);

    // --- Card Content ---
    const img = createCardImage(cardData, mode);
    card.appendChild(img);

    if (mode === 'export') {
        if (exportSettings.showCardPoints) {
            card.appendChild(createDomElement('div', {
                className: CSS_CLASSES.CARD_POINTS, // A new class for export points might be needed if styles differ
                textContent: cardData.points || 0,
                style: {
                    position: 'absolute', top: '5px', left: '5px',
                    padding: '3px 6px', backgroundColor: 'rgba(24, 119, 242, 0.9)',
                    color: '#fff', fontSize: '14px', fontWeight: 'bold',
                    borderRadius: '8px', border: '1px solid #fff'
                }
            }));
        }
        // Handle hidden overlay for export
        if (exportSettings.revealHidden === false && cardData.hidden) {
             card.appendChild(createHiddenCardOverlay(cardData));
        }

    } else if (mode === 'builder') {
        card.appendChild(createDomElement('div', {
            className: CSS_CLASSES.CARD_POINTS,
            textContent: cardData.points || 0
        }));
        
        // The modal-opening click listener is now handled in ui.js
        // We only setup the info button interaction here.
        setupCardInteractions(card, cardData, null);

         if (cardData.category === 'Drone' || cardData.category === 'Tactical') {
            const deleteButton = createDomElement('button', {
                className: CSS_CLASSES.DELETE_DRONE_BUTTON,
                textContent: '-'
            });
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
            wrapper.appendChild(deleteButton);
        }

    } else if (mode === 'modal') {
        // In modal view, render a plain card, no interactions attached from the renderer.
        // Points are handled by the modal's own functions.
        // No info or delete buttons.
        
    } else if (mode === 'game') {
        const isHiddenTactical = cardData.hidden && !cardData.isRevealedInGameMode;
        let clickCallback = null;

        if (isInteractive) {
            card.style.cursor = 'pointer';
            if (cardData.hidden) {
                clickCallback = (e) => performActionAndPreserveScroll(() => {
                    cardData.isRevealedInGameMode = !cardData.isRevealedInGameMode;
                }, e.target);
            } else {
                clickCallback = (e) => performActionAndPreserveScroll(() => advanceCardStatus(cardData), e.target);
            }
        }
        
        setupCardInteractions(card, cardData, clickCallback);
        
        if (isHiddenTactical) {
            card.appendChild(createHiddenCardOverlay(cardData));
        } else if (isInteractive) {
            appendStatusToken(card, cardData);
        }
    }
    
    // TODO: Add action buttons, token areas etc. based on mode.
    // This is complex and interactive, might be better to handle it in ui.js
    // by passing the wrapper/mainContainer back and letting ui.js append to it.
    
    return mainContainer;
};
