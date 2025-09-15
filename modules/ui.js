import * as dom from './dom.js';
import * as state from './state.js';
import { openModal } from './modal.js';
import { advanceCardStatus, performActionAndPreserveScroll } from './gameMode.js';
import { categoryOrder, CSS_CLASSES, CARD_DIMENSIONS } from './constants.js';

export const updateTotalPoints = () => {
    const rosterState = state.getActiveRoster();
    if (!rosterState) return 0;
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
        if (card) total += card.points || 0; // Add points from tactical cards
    });
    dom.totalPointsSpan.textContent = total;
    return total;
};

export const renderRoster = () => {
    dom.unitsContainer.innerHTML = '';
    dom.dronesContainer.innerHTML = '';
    dom.tacticalCardsContainer.innerHTML = '';
    document.querySelectorAll(`.${CSS_CLASSES.SUB_CARDS_CONTAINER}`).forEach(el => el.remove());

    const rosterState = state.isGameMode ? state.gameRoster : state.getActiveRoster();
    if (!rosterState) return;

    Object.keys(rosterState.units).forEach(unitId => {
        const unitElement = createUnitElement(parseInt(unitId), rosterState.units[unitId]);
        dom.unitsContainer.appendChild(unitElement);
    });

    rosterState.drones.forEach((droneData) => {
        if (droneData.rosterId == null) {
            droneData.rosterId = `d_${state.nextDroneId}`;
            state.setNextDroneId(state.nextDroneId + 1);
        }
        addDroneElement(droneData);
    });

    rosterState.tacticalCards.forEach((cardData) => {
        if (cardData.rosterId == null) {
            cardData.rosterId = `t_${state.nextTacticalCardId}`;
            state.setNextTacticalCardId(state.nextTacticalCardId + 1);
        }
        addTacticalCardElement(cardData);
    });

    if (state.isGameMode) {
        const subProjectilesContainer = document.createElement('div');
        subProjectilesContainer.className = CSS_CLASSES.SUB_CARDS_CONTAINER;

        const allCardsInRoster = [];
        Object.values(rosterState.units).forEach(unit => allCardsInRoster.push(...Object.values(unit)));
        allCardsInRoster.push(...rosterState.drones);

        const projectileSubCards = new Set();
        allCardsInRoster.forEach(card => {
            if (card && card.subCards) {
                card.subCards.forEach(subCardFileName => {
                    const subCardData = state.allCards.byFileName.get(subCardFileName);
                    if (subCardData && subCardData.category !== 'Drone') {
                        projectileSubCards.add(subCardFileName);
                    }
                });
            }
        });

        projectileSubCards.forEach(fileName => {
            const cardData = state.allCards.byFileName.get(fileName);
            if (cardData) {
                subProjectilesContainer.appendChild(createCardElement(cardData, false));
            }
        });

        if (subProjectilesContainer.hasChildNodes()) {
            dom.tacticalCardsContainer.after(subProjectilesContainer);
        }
    }

    if (!state.isGameMode) {
        updateTotalPoints();
    }
};

export const updateRosterSelect = () => {
    dom.rosterSelect.innerHTML = '';
    Object.keys(state.allRosters).forEach(name => {
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

const createTokenArea = (cardData) => {
    const tokenArea = document.createElement('div');
    tokenArea.className = CSS_CLASSES.TOKEN_AREA;

    if (cardData.ammunition > 0) {
        tokenArea.appendChild(createResourceTracker(cardData, 'ammunition'));
    }
    if (cardData.intercept > 0) {
        tokenArea.appendChild(createResourceTracker(cardData, 'intercept'));
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
        dropButton.className = CSS_CLASSES.ACTION_BUTTON + ' ' + CSS_CLASSES.DROP_BUTTON;
        dropButton.classList.toggle(CSS_CLASSES.DROPPED, cardData.isDropped === true);
        dropButton.textContent = cardData.isDropped ? '버리기 취소' : '버리기';
        dropButton.addEventListener('click', (e) => {
            e.stopPropagation();
            performActionAndPreserveScroll(() => {
                cardData.isDropped = !cardData.isDropped;
            }, e.target);
        });
        actionButtonWrapper.appendChild(dropButton);
    } else if (cardData.changes && cardData.changes.length > 0) {
        const changeButton = document.createElement('button');
        changeButton.className = CSS_CLASSES.ACTION_BUTTON + ' ' + CSS_CLASSES.CHANGE_BUTTON;
        changeButton.textContent = '변경';
        changeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            performActionAndPreserveScroll(() => {
                const currentCard = unitData ? unitData[cardData.category] : cardData;
                const cycle = [currentCard.fileName, ...(currentCard.changes || [])];
                const currentIndex = cycle.indexOf(currentCard.fileName);
                const nextIndex = (currentIndex + 1) % cycle.length;
                const nextCardFileName = cycle[nextIndex];
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

                for (const key in currentCard) {
                    delete currentCard[key];
                }
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
    container.style.display = 'flex';
    container.style.flexWrap = 'wrap';
    container.style.gap = '4px';
    container.style.justifyContent = 'center';
    container.style.maxWidth = '180px';
    container.style.marginTop = '5px';

    const currentProp = `current${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`;
    const iconFileName = resourceType;

    for (let i = 1; i <= maxCount; i++) {
        const icon = document.createElement('img');
        icon.className = CSS_CLASSES.RESOURCE_ICON;
        icon.style.width = '24px';
        icon.style.height = '24px';
        icon.style.cursor = 'pointer';
        icon.src = i <= cardData[currentProp] ? `icons/${iconFileName}_on.png` : `icons/${iconFileName}_off.png`;
        icon.dataset.index = i;

        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            const clickedIndex = i;
            cardData[currentProp] = (cardData[currentProp] === clickedIndex) ? clickedIndex - 1 : clickedIndex;
            const allIcons = container.querySelectorAll(`.${CSS_CLASSES.RESOURCE_ICON}`);
            allIcons.forEach(ic => {
                const iconIndex = parseInt(ic.dataset.index);
                ic.src = iconIndex <= cardData[currentProp] ? `icons/${iconFileName}_on.png` : `icons/${iconFileName}_off.png`;
            });
        });
        container.appendChild(icon);
    }
    return container;
};

const createCardElement = (cardData, isInteractive = true) => {
    const mainContainer = document.createElement('div');
    mainContainer.style.display = 'flex';
    mainContainer.style.gap = '0px';
    mainContainer.style.alignItems = 'flex-start';

    const wrapper = document.createElement('div');
    wrapper.className = CSS_CLASSES.CARD_WRAPPER;

    const card = document.createElement('div');
    card.className = CSS_CLASSES.DISPLAY_CARD;

    if (cardData.category === 'Drone' || cardData.category === 'Projectile') {
        card.classList.add(CSS_CLASSES.DRONE_DISPLAY_CARD);
        card.classList.add('drone-card');
    } else if (cardData.category === 'Tactical') {
        card.classList.add(CSS_CLASSES.TACTICAL_DISPLAY_CARD);
    }
    card.style.position = 'relative';

    if (state.isGameMode) {
        const isDestroyed = isInteractive && cardData.cardStatus === 2;
        const img = document.createElement('img');
        img.src = `Cards/${cardData.category}/${cardData.isDropped ? cardData.drop : cardData.fileName}`;
        if (isDestroyed) {
            img.style.filter = 'brightness(50%)';
        }
        card.appendChild(img);

        const isHiddenTacticalCard = cardData.category === 'Tactical' && cardData.hidden === true;

        

        if (isHiddenTacticalCard && cardData.isRevealedInGameMode !== true) {
            const overlay = document.createElement('div');
            overlay.className = CSS_CLASSES.HIDDEN_CARD_OVERLAY;
            overlay.style.backgroundColor = CARD_DIMENSIONS.HIDDEN_OVERLAY_BACKGROUND_COLOR;

            if (cardData.hiddenTitle) {
                const hiddenTitleImg = document.createElement('img');
                hiddenTitleImg.className = CSS_CLASSES.HIDDEN_TITLE_IMAGE;
                hiddenTitleImg.src = `icons/${cardData.hiddenTitle}`;
                hiddenTitleImg.style.height = CARD_DIMENSIONS.HIDDEN_TITLE_HEIGHT;
                hiddenTitleImg.style.width = 'auto';
                overlay.appendChild(hiddenTitleImg);
            }

            const unknownIcon = document.createElement('img');
            unknownIcon.className = CSS_CLASSES.UNKNOWN_ICON_IMAGE;
            unknownIcon.src = 'icons/unknown.png';
            unknownIcon.style.width = CARD_DIMENSIONS.UNKNOWN_ICON_WIDTH;
            unknownIcon.style.opacity = CARD_DIMENSIONS.UNKNOWN_ICON_OPACITY;
            overlay.appendChild(unknownIcon);

            card.appendChild(overlay);

            // Click listener to reveal/hide the card
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                performActionAndPreserveScroll(() => {
                    cardData.isRevealedInGameMode = !cardData.isRevealedInGameMode;
                }, e.target);
            });

        } else { // If not a hidden tactical card or it's revealed, apply normal game mode interactive logic
            const isRevealedHiddenTactical = cardData.category === 'Tactical' && cardData.hidden === true && cardData.isRevealedInGameMode === true;

            if (isInteractive) {
                let tokenSrc = null;
                const isDrone = cardData.category === 'Drone';
                // Prevent status tokens for revealed hidden tactical cards
                if (!isRevealedHiddenTactical) {
                    if (cardData.cardStatus === 1) tokenSrc = isDrone ? 'icons/warning_drone.png' : 'icons/warning.png';
                    if (cardData.cardStatus === 2) tokenSrc = isDrone ? 'icons/destroyed_drone.png' : 'icons/destroyed.png';
                    if (cardData.cardStatus === 3 && !isDrone) tokenSrc = 'icons/repaired.png';
                }

                if (tokenSrc) {
                    const tokenImg = document.createElement('img');
                    tokenImg.className = CSS_CLASSES.STATUS_TOKEN;
                    tokenImg.src = tokenSrc;
                    card.appendChild(tokenImg);
                }
            }

            // Add toggle listener for revealed hidden tactical cards
            if (isRevealedHiddenTactical) {
                card.style.cursor = 'pointer';
                card.addEventListener('click', (e) => {
                    e.stopPropagation();
                    performActionAndPreserveScroll(() => {
                        cardData.isRevealedInGameMode = !cardData.isRevealedInGameMode;
                    }, e.target);
                });
            } else if (isInteractive) { // Original click listener for advanceCardStatus for other interactive cards
                card.style.cursor = 'pointer';
                card.addEventListener('click', (e) => performActionAndPreserveScroll(() => advanceCardStatus(cardData), e.target));
            }
        }
    } else {
        const img = document.createElement('img');
        img.src = `Cards/${cardData.category}/${cardData.fileName}`;
        card.appendChild(img);
        const points = document.createElement('div');
        points.className = CSS_CLASSES.CARD_POINTS;
        points.textContent = cardData.points || 0;
        card.appendChild(points);
    }
    wrapper.appendChild(card); // Append card to wrapper first

    // Create and append delete button to wrapper if it's a drone or tactical card
    if (!state.isGameMode && (cardData.category === 'Drone' || cardData.category === 'Tactical')) {
        const deleteButton = document.createElement('button');
        deleteButton.className = CSS_CLASSES.DELETE_DRONE_BUTTON; // Reusing this class
        deleteButton.textContent = '-';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            performActionAndPreserveScroll(() => {
                if (cardData.category === 'Drone') {
                    state.allRosters[state.activeRosterName].drones = state.allRosters[state.activeRosterName].drones.filter(d => d.rosterId !== cardData.rosterId);
                } else if (cardData.category === 'Tactical') {
                    state.allRosters[state.activeRosterName].tacticalCards = state.allRosters[state.activeRosterName].tacticalCards.filter(t => t.rosterId !== cardData.rosterId);
                }
            }, e.target);
        });
        wrapper.appendChild(deleteButton); // Append to wrapper
    }

    if (state.isGameMode && isInteractive) {
        wrapper.insertBefore(createActionButtons(cardData), card);
    }
    
    mainContainer.appendChild(wrapper);

    const hasFreight = cardData.special && cardData.special.includes('freight_back');
    if (hasFreight) {
        const backCardData = cardData.backCard;
        const backCardWrapper = document.createElement('div');
        backCardWrapper.className = CSS_CLASSES.CARD_WRAPPER;

        const backSlot = document.createElement('div');
        backSlot.className = CSS_CLASSES.CARD_SLOT;

        if (backCardData) {
            const isDestroyed = state.isGameMode && backCardData.cardStatus === 2;
            const img = document.createElement('img');
            img.src = `Cards/${backCardData.category}/${backCardData.isDropped ? backCardData.drop : backCardData.fileName}`;
            if (isDestroyed) img.style.filter = 'brightness(50%)';
            // Ensure the image covers the slot, consistent with other cards
            if (!state.isGameMode) {
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover'; // Changed from 'contain' for consistency
            }
            backSlot.appendChild(img);

            if (state.isGameMode) {
                let tokenSrc = null;
                if (backCardData.cardStatus === 1) tokenSrc = 'icons/warning.png';
                if (backCardData.cardStatus === 2) tokenSrc = 'icons/destroyed.png';
                if (backCardData.cardStatus === 3) tokenSrc = 'icons/repaired.png';

                if (tokenSrc) {
                    const tokenImg = document.createElement('img');
                    tokenImg.className = CSS_CLASSES.STATUS_TOKEN;
                    tokenImg.src = tokenSrc;
                    backSlot.appendChild(tokenImg);
                }
            } else {
                const points = document.createElement('div');
                points.className = CSS_CLASSES.CARD_POINTS;
                points.textContent = backCardData.points || 0;
                backSlot.appendChild(points);
            }
        }
        else {
            const label = document.createElement('span');
            label.className = CSS_CLASSES.SLOT_LABEL;
            label.textContent = 'Back';
            backSlot.appendChild(label);
        }
        backCardWrapper.appendChild(backSlot);

        if (state.isGameMode) {
            if (backCardData) {
                // backSlot.style.cursor = 'pointer'; // Removed cursor change for non-interactive
                // backSlot.addEventListener('click', (e) => performActionAndPreserveScroll(() => advanceCardStatus(backCardData), e.target)); // Removed listener

                backCardWrapper.appendChild(createTokenArea(backCardData));
                backCardWrapper.insertBefore(createActionButtons(backCardData), backSlot);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = CSS_CLASSES.ACTION_BUTTON_PLACEHOLDER;
                backCardWrapper.insertBefore(placeholder, backSlot);
            }
        } else if (!state.isGameMode) { // Roster builder mode for backCardData
            backSlot.style.cursor = 'pointer';
            backSlot.addEventListener('click', () => openModal(cardData.rosterId, 'Back', true));
        }
        mainContainer.appendChild(backCardWrapper);
    }

    return mainContainer;
};

const createUnitCardSlot = (category, unitData, unitId) => {
    const cardData = unitData ? unitData[category] : null;
    const wrapper = document.createElement('div');
    wrapper.className = CSS_CLASSES.CARD_WRAPPER;

    const slot = document.createElement('div');
    slot.className = CSS_CLASSES.CARD_SLOT;
    
    if (cardData) {
        const isDestroyed = state.isGameMode && cardData.cardStatus === 2;
        const img = document.createElement('img');
        img.src = `Cards/${cardData.category}/${cardData.isDropped ? cardData.drop : cardData.fileName}`;
        if (isDestroyed) img.style.filter = 'brightness(50%)';
        slot.appendChild(img);

        if (!state.isGameMode) {
            const points = document.createElement('div');
            points.className = CSS_CLASSES.CARD_POINTS;
            points.textContent = cardData.points || 0;
            slot.appendChild(points);
        } else {
            let tokenSrc = null;
            if (cardData.cardStatus === 1) tokenSrc = 'icons/warning.png';
            if (cardData.cardStatus === 2) tokenSrc = 'icons/destroyed.png';
            if (cardData.cardStatus === 3) tokenSrc = 'icons/repaired.png';

            if (tokenSrc && category !== 'Pilot') {
                const tokenImg = document.createElement('img');
                tokenImg.className = CSS_CLASSES.STATUS_TOKEN;
                tokenImg.src = tokenSrc;
                slot.appendChild(tokenImg);
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
            if (category !== 'Pilot') {
                slot.style.cursor = 'pointer';
                slot.addEventListener('click', (e) => performActionAndPreserveScroll(() => advanceCardStatus(cardData, unitData), e.target));
            }

            wrapper.appendChild(createTokenArea(cardData));
            wrapper.insertBefore(createActionButtons(cardData, unitData), slot);

        } else {
            const placeholder = document.createElement('div');
            placeholder.className = CSS_CLASSES.ACTION_BUTTON_PLACEHOLDER;
            wrapper.insertBefore(placeholder, slot);

            const tokenArea = document.createElement('div');
            tokenArea.className = CSS_CLASSES.TOKEN_AREA;
            wrapper.appendChild(tokenArea);
        }
    } else {
        slot.style.cursor = 'pointer';
        slot.addEventListener('click', () => openModal(unitId, category));
    }
    
    return wrapper;
};

const createUnitElement = (unitId, unitData) => {
    const unitEntry = document.createElement('div');
    unitEntry.className = CSS_CLASSES.UNIT_ENTRY;
    unitEntry.dataset.unitId = unitId;

    const unitRow = document.createElement('div');
    unitRow.className = CSS_CLASSES.UNIT_ROW;
    if (unitId >= state.nextUnitId) state.setNextUnitId(unitId + 1);

    categoryOrder.forEach(category => {
        const cardSlot = createUnitCardSlot(category, unitData, unitId);
        unitRow.appendChild(cardSlot);
    });

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
    }
    
    unitEntry.appendChild(unitRow);

    const tokenAreas = Array.from(unitRow.querySelectorAll(`.${CSS_CLASSES.TOKEN_AREA}`));
    if (tokenAreas.some(area => area.hasChildNodes())) {
        const resourceAreaHeight = '58px';
        tokenAreas.forEach(area => area.style.minHeight = resourceAreaHeight);
    }

    return unitEntry;
};

const addDroneElement = (droneData) => {
    dom.dronesContainer.appendChild(createCardElement(droneData));
};

const addTacticalCardElement = (cardData) => {
    dom.tacticalCardsContainer.appendChild(createCardElement(cardData));
};