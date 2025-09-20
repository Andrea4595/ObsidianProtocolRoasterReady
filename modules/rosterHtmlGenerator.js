import * as state from './state.js';
import { categoryOrder, CARD_DIMENSIONS } from './constants.js';

// --- HTML Generation Helpers ---

export const createElementWithStyles = (tag, styles) => {
    const element = document.createElement(tag);
    Object.assign(element.style, styles);
    return element;
};

const generateCardHtml = (card, shouldHide, imgStyles) => {
    if (!card) return null;

    const container = createElementWithStyles('div', { position: 'relative' });

    const img = createElementWithStyles('img', {
        width: '100%',
        height: 'auto',
        borderRadius: '10px',
        display: 'block',
        ...imgStyles
    });
    img.src = `Cards/${card.category}/${card.fileName}`;
    container.appendChild(img);

    if (shouldHide && card.hidden) {
        const overlay = createElementWithStyles('div', {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgb(80, 80, 80)',
            borderRadius: '10px'
        });

        if (card.hiddenTitle) {
            const hiddenTitleImg = createElementWithStyles('img', {
                position: 'absolute',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                height: '100px',
                width: 'auto',
                boxShadow: 'none'
            });
            hiddenTitleImg.src = `icons/${card.hiddenTitle}`;
            overlay.appendChild(hiddenTitleImg);
        }

        const unknownIcon = createElementWithStyles('img', {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '50%',
            height: 'auto',
            opacity: '0.8'
        });
        unknownIcon.src = 'icons/unknown.png';
        overlay.appendChild(unknownIcon);
        container.appendChild(overlay);
    } else {
        const pointsDiv = createElementWithStyles('div', {
            position: 'absolute',
            top: '5px',
            left: '5px',
            padding: '3px 6px',
            backgroundColor: 'rgba(24, 119, 242, 0.9)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 'bold',
            borderRadius: '8px',
            border: '1px solid #fff'
        });
        pointsDiv.textContent = card.points || 0;
        container.appendChild(pointsDiv);
    }

    return container;
};

export const generateUnitHtml = (unit, shouldHide) => {
    const unitContainer = createElementWithStyles('div', {
        display: 'flex',
        gap: '10px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '15px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        alignItems: 'flex-start',
        position: 'relative' // Added for absolute positioning of unit points
    });

    const unitPoints = Object.values(unit).reduce((sum, card) => sum + (card ? card.points : 0), 0);

    const unitPointsDisplay = createElementWithStyles('div', {
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
    unitPointsDisplay.textContent = `${unitPoints}`;
    unitContainer.appendChild(unitPointsDisplay);

    for (const category of categoryOrder) {
        const card = unit[category];
        const cardSlot = createElementWithStyles('div', {
            width: '180px',
            border: '1px solid #ddd',
            borderRadius: '10px',
            backgroundColor: '#fafafa',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '270px',
            gap: '5px',
            padding: '5px'
        });

        if (card) {
            cardSlot.appendChild(generateCardHtml(card, shouldHide, { width: '100%', height: 'auto', borderRadius: '10px', display: 'block' }));

            const addSeparator = () => {
                cardSlot.appendChild(createElementWithStyles('div', {
                    height: '5px',
                    width: '80%',
                    backgroundColor: '#ccc',
                    margin: '5px 0',
                    borderRadius: '2px'
                }));
            };

            if (card.drop) {
                addSeparator();
                const dropImg = createElementWithStyles('img', { width: '100%', height: 'auto', display: 'block', borderRadius: '10px' });
                dropImg.src = `Cards/${card.category}/${card.drop}`;
                cardSlot.appendChild(dropImg);
            }
            if (card.changes) {
                card.changes.forEach(changeFileName => {
                    const changedCardData = state.allCards.byFileName.get(changeFileName);
                    if (changedCardData) {
                        addSeparator();
                        const changeImg = createElementWithStyles('img', { width: '100%', height: 'auto', display: 'block', borderRadius: '10px' });
                        changeImg.src = `Cards/${changedCardData.category}/${changedCardData.fileName}`;
                        cardSlot.appendChild(changeImg);
                    }
                });
            }
        } else {
            const categoryLabel = createElementWithStyles('span', { fontWeight: 'bold', color: '#65676b' });
            categoryLabel.textContent = category;
            cardSlot.appendChild(categoryLabel);
        }
        unitContainer.appendChild(cardSlot);
    }
    return unitContainer;
};

export const generateDroneEntryHtml = (drone, shouldHide) => {
    const droneContainer = createElementWithStyles('div', {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '15px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    });

    const mainCol = createElementWithStyles('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' });
    mainCol.appendChild(generateCardHtml(drone, shouldHide, { height: '270px', width: 'auto', borderRadius: '10px', display: 'block' }));

    if (drone.changes) {
        drone.changes.forEach(changeFileName => {
            const changedCardData = state.allCards.byFileName.get(changeFileName);
            if (changedCardData) {
                mainCol.appendChild(createElementWithStyles('div', { height: '5px', width: '80%', backgroundColor: '#ccc', margin: '5px 0', borderRadius: '2px' }));
                mainCol.appendChild(generateCardHtml(changedCardData, shouldHide, { height: '270px', width: 'auto', borderRadius: '10px', display: 'block' }));
            }
        });
    }
    droneContainer.appendChild(mainCol);

    if (drone.backCard) {
        const backCardCol = createElementWithStyles('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' });
        backCardCol.appendChild(generateCardHtml(drone.backCard, shouldHide, { height: '270px', width: 'auto', borderRadius: '10px', display: 'block' }));
        droneContainer.appendChild(backCardCol);
    }

    return droneContainer;
};

export const generateTacticalCardHtml = (card, shouldHide) => {
    const cardContainer = createElementWithStyles('div', {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '5px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '15px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        width: '270px'
    });
    cardContainer.appendChild(generateCardHtml(card, shouldHide, { width: '100%', height: 'auto', borderRadius: '10px', display: 'block' }));
    return cardContainer;
};

export const generateSubCardsHtml = (subCardFileNames) => {
    if (subCardFileNames.size === 0) return null;

    const container = document.createElement('div');
    const title = createElementWithStyles('h3', { marginTop: '30px', borderBottom: '1px solid #ccc', paddingBottom: '5px' });
    title.textContent = '서브 카드';
    container.appendChild(title);

    const cardArea = createElementWithStyles('div', {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px',
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginTop: '15px'
    });

    subCardFileNames.forEach(fileName => {
        const card = state.allCards.byFileName.get(fileName);
        if (card) {
            const cardWrapper = createElementWithStyles('div', { position: 'relative', width: 'fit-content' });
            const img = createElementWithStyles('img', {
                height: CARD_DIMENSIONS.UNIT_CARD_HEIGHT,
                width: 'auto',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                display: 'block'
            });
            img.src = `Cards/${card.category}/${card.fileName}`;
            cardWrapper.appendChild(img);
            cardArea.appendChild(cardWrapper);
        }
    });
    container.appendChild(cardArea);
    return container;
};