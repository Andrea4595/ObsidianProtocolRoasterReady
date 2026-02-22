// modules/cardRenderer.js

/**
 * 이 모듈은 애플리케이션의 모든 카드 렌더링 로직을 중앙에서 관리합니다.
 * UI, 이미지 익스포터 등 다양한 컨텍스트에서 일관된 카드 표현을 보장합니다.
 */

import * as state from './state.js';
import { CSS_CLASSES } from './constants.js';
import { openCardDetailModal } from './modal.js';
// import { advanceCardStatus, performActionAndPreserveScroll } from './gameMode.js'; // Removed advanceCardStatus, will use state.advanceCardStatusInState
import { performActionAndPreserveScroll } from './gameMode.js'; // performActionAndPreserveScroll is still needed

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

const createDeleteButton = (cardData, onDeleteCallback) => {
    const deleteButton = createDomElement('button', { className: CSS_CLASSES.DELETE_DRONE_BUTTON, textContent: '-' });
    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        performActionAndPreserveScroll(
            () => { // action
                if (cardData.category === 'Drone') {
                    state.deleteDrone(cardData.rosterId); // Use state mutation function
                } else if (cardData.category === 'Tactical') {
                    state.deleteTacticalCard(cardData.rosterId); // Use state mutation function
                }
                if (onDeleteCallback) {
                    onDeleteCallback(); // Trigger UI update after state change (e.g., remove element)
                }
            },
            e.target  // eventTarget
        );
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
    const overlay = createDomElement('div', { 
        className: CSS_CLASSES.HIDDEN_CARD_OVERLAY, 
        style: { 
            backgroundColor: 'rgb(80, 80, 80)',
            pointerEvents: 'none' // 클릭 이벤트가 아래의 카드 요소로 전달되도록 설정
        } 
    });
    if (cardData.hiddenTitle) {
        overlay.appendChild(createDomElement('img', { 
            className: CSS_CLASSES.HIDDEN_TITLE_IMAGE, 
            src: `icons/${cardData.hiddenTitle}`,
            style: { pointerEvents: 'none' }
        }));
    }
    overlay.appendChild(createDomElement('img', { 
        className: CSS_CLASSES.UNKNOWN_ICON_IMAGE, 
        src: 'icons/unknown.png',
        style: { pointerEvents: 'none' }
    }));
    return overlay;
};


// --- Main Card Element Creator ---

export const renderCardElement = (cardData, existingElement = null, options = {}) => {
    const { 
        mode = 'builder', 
        isInteractive = true, 
        showPoints = false,
        showInfoButton = false,
        showDeleteButton = false,
        onClick = null,
        unit = null, // Pass unit data for game mode logic
        onDeleteCallback = null, // New: Callback for when delete button is pressed
        unitId = null // This is the rosterId for drones/tactical cards, or unitId for unit parts
    } = options;

    let mainContainer;
    let wrapper;
    let card;
    let img;
    let pointsElement;
    let infoButtonElement;
    let deleteButtonElement;

    if (existingElement === null || existingElement === undefined) {
        mainContainer = createDomElement('div', { 
            className: 'roster-card-container', // Add a selectable class
            style: { display: 'flex', gap: '0px', alignItems: 'flex-start' } 
        });
        if (unitId !== null) {
            mainContainer.dataset.rosterId = unitId;
        }
        wrapper = createDomElement('div', { className: CSS_CLASSES.CARD_WRAPPER });
        card = createDomElement('div', { className: CSS_CLASSES.DISPLAY_CARD, style: { position: 'relative' } });

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
        img = createCardImage(cardData, mode);
        card.appendChild(img);

        // --- Overlays and Buttons ---
        if (showPoints) {
            pointsElement = createPointsElement(cardData);
            card.appendChild(pointsElement);
        }

        if (showInfoButton) {
            infoButtonElement = createInfoButton(cardData);
            if (infoButtonElement) card.appendChild(infoButtonElement);
        }

        if (showDeleteButton) {
            deleteButtonElement = createDeleteButton(cardData, onDeleteCallback);
            wrapper.appendChild(deleteButtonElement);
        }

        // --- Game Mode Specifics ---
        if (mode === 'game') {
            const isHiddenTactical = cardData.hidden && !cardData.isRevealedInGameMode;
            
            // Remove any existing listeners first
            if (card.gameClickCallback) {
                card.removeEventListener('click', card.gameClickCallback);
                card.gameClickCallback = null;
            }

            if (isInteractive) {
                card.style.cursor = 'pointer';
                const gameClickCallback = (e) => {
                    e.stopPropagation();
                    performActionAndPreserveScroll(
                        async () => {
                            if (cardData.hidden && !cardData.isRevealedInGameMode) {
                                state.toggleCardRevealedStatus(cardData.category, cardData.rosterId, unitId);
                            } else {
                                state.advanceCardStatusInState(cardData.category, cardData.rosterId, unitId);
                            }
                        },
                        e.target
                    );
                };
                card.addEventListener('click', gameClickCallback);
                card.gameClickCallback = gameClickCallback;
            }
            
            if (isHiddenTactical) {
                card.appendChild(createHiddenCardOverlay(cardData));
            } else if (isInteractive) {
                appendStatusToken(card, cardData);
            }
        } else {
            // Builder Mode: remove game listeners and add builder listener
            if (card.gameClickCallback) {
                card.removeEventListener('click', card.gameClickCallback);
                card.gameClickCallback = null;
            }
            if (onClick) {
                card.style.cursor = 'pointer';
                card.addEventListener('click', onClick);
                card.gameClickCallback = onClick; // Store to allow removal later
            }
        }
    } else {
        // --- Update Existing Element ---
        mainContainer = existingElement;
        wrapper = mainContainer.querySelector(`.${CSS_CLASSES.CARD_WRAPPER}`);
        card = wrapper.querySelector(`.${CSS_CLASSES.DISPLAY_CARD}`);
        
        // Update card image
        img = card.querySelector('.card-image');
        if (img) {
            const newImgSrc = `Cards/${cardData.category}/${(mode === 'game' && cardData.isDropped) ? cardData.drop : cardData.fileName}`;
            if (img.src !== newImgSrc) {
                img.src = newImgSrc;
            }
            const isDestroyed = mode === 'game' && cardData.cardStatus === 2;
            img.style.filter = isDestroyed ? 'brightness(50%)' : '';
        }

        // Update points
        pointsElement = card.querySelector(`.${CSS_CLASSES.CARD_POINTS}`);
        if (showPoints) {
            if (pointsElement) {
                pointsElement.textContent = cardData.points || 0;
            } else {
                card.appendChild(createPointsElement(cardData));
            }
        } else if (pointsElement) {
            pointsElement.remove();
        }

        // Update info button
        infoButtonElement = card.querySelector('.info-button');
        if (showInfoButton) {
            // Always remove and recreate the info button to ensure the event listener 
            // has the most up-to-date cardData (fixes stale closure issues)
            if (infoButtonElement) {
                infoButtonElement.remove();
            }
            const newInfoButton = createInfoButton(cardData);
            if (newInfoButton) card.appendChild(newInfoButton);
        } else if (infoButtonElement) {
            infoButtonElement.remove();
        }

        // Update delete button
        deleteButtonElement = wrapper.querySelector(`.${CSS_CLASSES.DELETE_DRONE_BUTTON}`);
        if (showDeleteButton) {
            if (!deleteButtonElement) {
                wrapper.appendChild(createDeleteButton(cardData, onDeleteCallback));
            }
        } else if (deleteButtonElement) {
            deleteButtonElement.remove();
        }

        // Update Game Mode Specifics (Status Tokens, Hidden Overlay)
        const existingStatusToken = card.querySelector(`.${CSS_CLASSES.STATUS_TOKEN}`);
        const existingHiddenOverlay = card.querySelector(`.${CSS_CLASSES.HIDDEN_CARD_OVERLAY}`);
        
        if (mode === 'game') {
            const isHiddenTactical = cardData.hidden && !cardData.isRevealedInGameMode;
            if (isHiddenTactical) {
                if (!existingHiddenOverlay) {
                    card.appendChild(createHiddenCardOverlay(cardData));
                }
                if (existingStatusToken) existingStatusToken.remove(); // Remove token if hidden
            } else {
                if (existingHiddenOverlay) existingHiddenOverlay.remove(); // Remove overlay if not hidden
                if (isInteractive) {
                    if (!existingStatusToken) {
                        appendStatusToken(card, cardData);
                    } else {
                        // Update existing token's src
                        let tokenSrc = null;
                        const isDrone = cardData.category === 'Drone';
                        if (cardData.cardStatus === 1) tokenSrc = 'icons/warning.png';
                        if (cardData.cardStatus === 2) tokenSrc = 'icons/destroyed.png';
                        if (cardData.cardStatus === 3 && !isDrone) tokenSrc = 'icons/repaired.png';
                        
                        if (tokenSrc && existingStatusToken.src !== tokenSrc) {
                            existingStatusToken.src = tokenSrc;
                        } else if (!tokenSrc && existingStatusToken) {
                            existingStatusToken.remove(); // Remove token if status is 0
                        }
                    }
                } else if (existingStatusToken) {
                    existingStatusToken.remove(); // Remove token if not interactive
                }
            }

            // Update click handler for game mode
            // Remove existing listener to prevent duplicates
            const oldGameClickCallback = card.gameClickCallback; // Store callback on element for easy removal
            if (oldGameClickCallback) {
                card.removeEventListener('click', oldGameClickCallback);
            }
            
            if (isInteractive) {
                let newGameClickCallback;
                if (!onClick) { // Default game mode click action
                    if (cardData.hidden) {
                        newGameClickCallback = (e) => performActionAndPreserveScroll(
                            async () => { state.toggleCardRevealedStatus(cardData.category, cardData.rosterId, unitId); },
                            e.target
                        );
                    } else {
                        newGameClickCallback = (e) => performActionAndPreserveScroll(
                            async () => { state.advanceCardStatusInState(cardData.category, cardData.rosterId, unitId); },
                            e.target
                        );
                    }
                } else {
                    newGameClickCallback = onClick;
                }
                card.addEventListener('click', newGameClickCallback);
                card.gameClickCallback = newGameClickCallback; // Store new callback
            } else {
                card.style.cursor = ''; // Remove pointer cursor if not interactive
            }
        } else { // Not in game mode, ensure game mode specific overlays/tokens are removed
            if (existingHiddenOverlay) existingHiddenOverlay.remove();
            if (existingStatusToken) existingStatusToken.remove();
            
            // Update click handler for other modes
            // Remove existing game mode listener if any
            const oldGameClickCallback = card.gameClickCallback;
            if (oldGameClickCallback) {
                card.removeEventListener('click', oldGameClickCallback);
                card.gameClickCallback = null;
            }
            if(onClick) card.addEventListener('click', onClick); // Re-apply or apply other mode click
        }
    }
    
    return mainContainer;
}