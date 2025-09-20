import * as state from './state.js';
import { openModal } from './modal.js';
import { advanceCardStatus, performActionAndPreserveScroll } from './gameMode.js';
import { CSS_CLASSES } from './constants.js';
import { calculateUnitStats } from './stats.js';

// --- UI Element Creation Helpers ---

const createTokenArea = (cardData, unitData) => {
    const tokenArea = document.createElement('div');
    tokenArea.className = CSS_CLASSES.TOKEN_AREA;

    if (!cardData) {
        return tokenArea;
    }

    if (cardData.ammunition > 0) {
        tokenArea.appendChild(createResourceTracker(cardData, 'ammunition'));
    }
    if (cardData.intercept > 0) {
        tokenArea.appendChild(createResourceTracker(cardData, 'intercept'));
    }
    if (cardData.link > 0) {
        tokenArea.appendChild(createResourceTracker(cardData, 'link'));
    }

    // 파일럿 카드일 경우 유닛 스탯 표시
    if (cardData.category === 'Pilot' && unitData) {
        const stats = calculateUnitStats(unitData);
        const statsContainer = document.createElement('div');
        statsContainer.style.display = 'flex';
        statsContainer.style.alignItems = 'center';
        statsContainer.style.gap = '8px';
        statsContainer.style.marginTop = '5px';

        statsContainer.innerHTML = `
            <img src="icons/stat_electronic.png" style="width: 24px; height: 24px;">
            <span style="font-weight: bold; font-size: 16px;">${stats.electronic}</span>
            <img src="icons/stat_mobility.png" style="width: 24px; height: 24px;">
            <span style="font-weight: bold; font-size: 16px;">${stats.mobility}</span>
        `;
        tokenArea.appendChild(statsContainer);
    }

    if (cardData.charge) {
        const chargeTokenImg = document.createElement('img');
        chargeTokenImg.className = CSS_CLASSES.CHARGE_TOKEN_IMG;
        chargeTokenImg.src = cardData.isCharged ? 'icons/charge_on.png' : 'icons/charge_off.png';
        chargeTokenImg.addEventListener('click', (e) => {
            e.stopPropagation();
            performActionAndPreserveScroll(() => {
                cardData.isCharged = !cardData.isCharged;
            }, e.target);
        });
        tokenArea.appendChild(chargeTokenImg);
    }
    if (cardData.freehand || cardData.isDropped) {
        const freehandIcon = document.createElement('img');
        freehandIcon.src = cardData.isBlackbox ? 'icons/blackbox.png' : 'icons/freehand.png';
        freehandIcon.style.height = '60px';
        freehandIcon.style.width = 'auto';
        freehandIcon.style.cursor = 'pointer';

        freehandIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            performActionAndPreserveScroll(() => {
                cardData.isBlackbox = !cardData.isBlackbox;
            }, e.target);
        });
        tokenArea.appendChild(freehandIcon);
    }
    return tokenArea;
};

const createActionButtons = (cardData, unitData) => {
    // 비어있는 슬롯을 placeholder로 표시
    if (!cardData) {
        const placeholder = document.createElement('div');
        placeholder.className = CSS_CLASSES.ACTION_BUTTON_PLACEHOLDER;
        return placeholder;
    }

    const hasButton = (cardData.drop || (cardData.changes && cardData.changes.length > 0));
    if (!hasButton) {
        const placeholder = document.createElement('div');
        placeholder.className = CSS_CLASSES.ACTION_BUTTON_PLACEHOLDER;
        return placeholder;
    }

    const actionButtonWrapper = document.createElement('div');
    actionButtonWrapper.className = CSS_CLASSES.ACTION_BUTTON_WRAPPER;

    if (cardData.drop) {
        const dropButton = document.createElement('button');
        dropButton.className = `${CSS_CLASSES.ACTION_BUTTON} ${CSS_CLASSES.DROP_BUTTON}`;
        dropButton.classList.toggle(CSS_CLASSES.DROPPED, cardData.isDropped === true);
        dropButton.textContent = cardData.isDropped ? '버리기 취소' : '버리기';
        dropButton.addEventListener('click', (e) => {
            e.stopPropagation();
            performActionAndPreserveScroll(() => { cardData.isDropped = !cardData.isDropped; }, e.target);
        });
        actionButtonWrapper.appendChild(dropButton);
    } else if (cardData.changes && cardData.changes.length > 0) {
        const changeButton = document.createElement('button');
        changeButton.className = `${CSS_CLASSES.ACTION_BUTTON} ${CSS_CLASSES.CHANGE_BUTTON}`;
        changeButton.textContent = '변경';
        changeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            performActionAndPreserveScroll(() => {
                const currentCard = unitData ? unitData[cardData.category] : cardData;
                const cycle = [currentCard.fileName, ...(currentCard.changes || [])];
                const currentIndex = cycle.indexOf(currentCard.fileName);
                const nextCardFileName = cycle[(currentIndex + 1) % cycle.length];
                const newCardData = state.allCards.byFileName.get(nextCardFileName);

                if (!newCardData) return;

                const propsToPreserve = {
                    cardStatus: currentCard.cardStatus,
                    currentAmmunition: currentCard.currentAmmunition,
                    currentIntercept: currentCard.currentIntercept,
                    isDropped: currentCard.isDropped,
                    rosterId: currentCard.rosterId,
                    isBlackbox: currentCard.isBlackbox
                };

                for (const key in currentCard) { delete currentCard[key]; }
                Object.assign(currentCard, newCardData, propsToPreserve);
            }, e.target);
        });
        actionButtonWrapper.appendChild(changeButton);
    }
    return actionButtonWrapper;
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
        Object.assign(icon.style, { width: '24px', height: '24px', cursor: 'pointer' });
        icon.src = i <= cardData[currentProp] ? `icons/${resourceType}_on.png` : `icons/${resourceType}_off.png`;
        icon.dataset.index = i;

        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            cardData[currentProp] = (cardData[currentProp] === i) ? i - 1 : i;
            container.querySelectorAll(`.${CSS_CLASSES.RESOURCE_ICON}`).forEach(ic => {
                ic.src = ic.dataset.index <= cardData[currentProp] ? `icons/${resourceType}_on.png` : `icons/${resourceType}_off.png`;
            });
        });
        container.appendChild(icon);
    }
    return container;
};

// --- Card Element Creators ---

const createCardBase = (cardData) => {
    const wrapper = document.createElement('div');
    wrapper.className = CSS_CLASSES.CARD_WRAPPER;

    const card = document.createElement('div');
    card.className = CSS_CLASSES.DISPLAY_CARD;
    card.style.position = 'relative';

    if (cardData.category === 'Drone' || cardData.category === 'Projectile') {
        card.classList.add(CSS_CLASSES.DRONE_DISPLAY_CARD, 'drone-card');
    } else if (cardData.category === 'Tactical') {
        card.classList.add(CSS_CLASSES.TACTICAL_DISPLAY_CARD);
    }
    
    wrapper.appendChild(card);
    return { wrapper, card };
};

const createBuilderModeCard = (card, cardData) => {
    const img = createBuilderModeImage(cardData);
    card.appendChild(img);

    const points = document.createElement('div');
    points.className = CSS_CLASSES.CARD_POINTS;
    points.textContent = cardData.points || 0;
    card.appendChild(points);
};

const createGameModeCard = (card, cardData, isInteractive) => {
    const img = createGameCardImage(cardData);
    card.appendChild(img);

    const isHiddenTacticalCard = cardData.category === 'Tactical' && cardData.hidden === true;
    const isRevealedHiddenTactical = isHiddenTacticalCard && cardData.isRevealedInGameMode === true;

    if (isHiddenTacticalCard && !isRevealedHiddenTactical) {
        card.appendChild(createHiddenCardOverlay(cardData));
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            performActionAndPreserveScroll(() => { cardData.isRevealedInGameMode = !cardData.isRevealedInGameMode; }, e.target);
        });
    } else {
        if (isInteractive && !isRevealedHiddenTactical) {
            appendStatusToken(card, cardData);
        }

        if (isRevealedHiddenTactical) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                performActionAndPreserveScroll(() => { cardData.isRevealedInGameMode = !cardData.isRevealedInGameMode; }, e.target);
            });
        } else if (isInteractive) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', (e) => performActionAndPreserveScroll(() => advanceCardStatus(cardData), e.target));
        }
    }
};

const createHiddenCardOverlay = (cardData) => {
    const overlay = document.createElement('div');
    overlay.className = CSS_CLASSES.HIDDEN_CARD_OVERLAY;
    overlay.style.backgroundColor = 'rgb(80, 80, 80)';

    if (cardData.hiddenTitle) {
        const hiddenTitleImg = document.createElement('img');
        hiddenTitleImg.className = CSS_CLASSES.HIDDEN_TITLE_IMAGE;
        hiddenTitleImg.src = `icons/${cardData.hiddenTitle}`;
        overlay.appendChild(hiddenTitleImg);
    }

    const unknownIcon = document.createElement('img');
    unknownIcon.className = CSS_CLASSES.UNKNOWN_ICON_IMAGE;
    unknownIcon.src = 'icons/unknown.png';
    overlay.appendChild(unknownIcon);

    return overlay;
};

const createGameCardImage = (cardData) => {
    const isDestroyed = cardData.cardStatus === 2;
    const img = document.createElement('img');
    img.src = `Cards/${cardData.category}/${cardData.isDropped ? cardData.drop : cardData.fileName}`;
    if (isDestroyed) {
        img.style.filter = 'brightness(50%)';
    }
    return img;
};

export const createBuilderModeImage = (cardData) => {
    const img = document.createElement('img');
    img.src = `Cards/${cardData.category}/${cardData.fileName}`;
    return img;
};

const appendStatusToken = (card, cardData) => {
    let tokenSrc = null;
    const isDrone = cardData.category === 'Drone';
    if (cardData.cardStatus === 1) tokenSrc = isDrone ? 'icons/warning_drone.png' : 'icons/warning.png';
    if (cardData.cardStatus === 2) tokenSrc = isDrone ? 'icons/destroyed_drone.png' : 'icons/destroyed.png';
    if (cardData.cardStatus === 3 && !isDrone) tokenSrc = 'icons/repaired.png';

    if (tokenSrc) {
        const tokenImg = document.createElement('img');
        tokenImg.className = CSS_CLASSES.STATUS_TOKEN;
        tokenImg.src = tokenSrc;
        card.appendChild(tokenImg);
    }
};

const createFreightBackCardSlot = (cardData) => {
    const backCardWrapper = document.createElement('div');
    backCardWrapper.className = CSS_CLASSES.CARD_WRAPPER;

    const backSlot = document.createElement('div');
    backSlot.className = CSS_CLASSES.CARD_SLOT;

    const backCardData = cardData.backCard;
    if (backCardData) {
        if (state.isGameMode) {
            const img = createGameCardImage(backCardData);
            backSlot.appendChild(img);
            appendStatusToken(backSlot, backCardData);
        } else {
            const img = document.createElement('img');
            img.src = `Cards/${backCardData.category}/${backCardData.fileName}`;
            Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover' });
            backSlot.appendChild(img);

            const points = document.createElement('div');
            points.className = CSS_CLASSES.CARD_POINTS;
            points.textContent = backCardData.points || 0;
            backSlot.appendChild(points);
        }
    } else {
        const label = document.createElement('span');
        label.className = CSS_CLASSES.SLOT_LABEL;
        label.textContent = 'Back';
        backSlot.appendChild(label);
    }
    backCardWrapper.appendChild(backSlot);

    if (state.isGameMode) {
        if (backCardData) {
            backCardWrapper.appendChild(createTokenArea(backCardData, null));
            backCardWrapper.insertBefore(createActionButtons(backCardData), backSlot);
        } else {
            backCardWrapper.insertBefore(createActionButtons(null), backSlot);
        }
    } else {
        backSlot.style.cursor = 'pointer';
        backSlot.addEventListener('click', () => openModal(cardData.rosterId, 'Back', true));
    }
    return backCardWrapper;
};

export const createCardElement = (cardData, isInteractive = true) => {
    const mainContainer = document.createElement('div');
    mainContainer.style.display = 'flex';
    mainContainer.style.gap = '0px';
    mainContainer.style.alignItems = 'flex-start';

    const { wrapper, card } = createCardBase(cardData);

    if (state.isGameMode) {
        createGameModeCard(card, cardData, isInteractive);
    } else {
        createBuilderModeCard(card, cardData);
    }
    
    if (!state.isGameMode && (cardData.category === 'Drone' || cardData.category === 'Tactical')) {
        const deleteButton = document.createElement('button');
        deleteButton.className = CSS_CLASSES.DELETE_DRONE_BUTTON;
        deleteButton.textContent = '-';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            performActionAndPreserveScroll(() => {
                if (cardData.category === 'Drone') {
                    state.getActiveRoster().drones = state.getActiveRoster().drones.filter(d => d.rosterId !== cardData.rosterId);
                } else if (cardData.category === 'Tactical') {
                    state.getActiveRoster().tacticalCards = state.getActiveRoster().tacticalCards.filter(t => t.rosterId !== cardData.rosterId);
                }
            }, e.target);
        });
        wrapper.appendChild(deleteButton);
    }

    if (state.isGameMode && isInteractive) {
        wrapper.insertBefore(createActionButtons(cardData), card);
        wrapper.appendChild(createTokenArea(cardData, null));
    }
    
    mainContainer.appendChild(wrapper);

    if (cardData.hasFreightBack === true) {
        mainContainer.appendChild(createFreightBackCardSlot(cardData));
    }

    return mainContainer;
};

export { createGameCardImage, appendStatusToken, createTokenArea, createActionButtons };