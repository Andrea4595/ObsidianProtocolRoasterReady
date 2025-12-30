import * as state from './state.js';
import { updateTotalPoints } from './ui.js';
import { categoryOrder } from './constants.js';
import { exportImageBtn } from './dom.js';
import { createCardElement } from './cardRenderer.js';

// --- HTML Generation Helpers ---

const createElementWithStyles = (tag, styles) => {
    const element = document.createElement(tag);
    Object.assign(element.style, styles);
    return element;
};

/**
 * Creates a single, consistently styled card element for the exporter.
 * It determines the correct dimensions based on the card type.
 */
const generateCardHtml = (cardData, settings) => {
    const isDroneLike = cardData.category === 'Drone' || cardData.category === 'Projectile';
    const slotWidth = isDroneLike ? '390px' : '200px';
    const slotHeight = '287px'; // Consistent height for all cards in export

    const cardSlot = createElementWithStyles('div', {
        width: slotWidth,
        height: slotHeight,
        border: '1px solid #ddd',
        borderRadius: '10px',
        backgroundColor: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: '5px'
    });

    const cardElement = createCardElement(cardData, { mode: 'export', exportSettings: settings });
    
    // The card renderer produces a complex element; we need to ensure its contents are sized correctly.
    const displayCard = cardElement.querySelector('.display-card');
    const img = cardElement.querySelector('.card-image');

    if (displayCard) {
        displayCard.style.width = '100%';
        displayCard.style.height = '100%';
    }
    if (img) {
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
    }

    cardSlot.appendChild(cardElement);
    return cardSlot;
};


const generateUnitHtml = (unit, shouldHide, settings) => {
    const unitContainer = createElementWithStyles('div', {
        display: 'flex',
        gap: '10px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '15px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        alignItems: 'flex-start',
        position: 'relative'
    });

    if (settings.showUnitPoints) {
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
    }

    for (const category of categoryOrder) {
        const card = unit[category];
        
        // Use the new helper for both empty and filled slots
        const cardSlot = generateCardHtml(card || { category }, settings);
        
        // If the slot was empty, clear the generated content and add the label
        if (!card) {
            cardSlot.innerHTML = '';
            const categoryLabel = createElementWithStyles('span', { fontWeight: 'bold', color: '#65676b' });
            categoryLabel.textContent = category;
            cardSlot.appendChild(categoryLabel);
            // Re-apply some styles for empty slot
            Object.assign(cardSlot.style, {
                justifyContent: 'center',
                padding: '0'
            });
        }
        
        // Append discarded/changed cards if the setting is enabled
        if (card && settings.showDiscarded) {
            const addSeparator = () => {
                cardSlot.appendChild(createElementWithStyles('div', {
                    height: '5px',
                    width: '80%',
                    backgroundColor: '#ccc',
                    margin: '5px auto',
                    borderRadius: '2px',
                    flexShrink: '0'
                }));
            };

            if (card.drop) {
                addSeparator();
                const dropImg = createElementWithStyles('img', { width: 'calc(100% - 10px)', height: 'auto', display: 'block', borderRadius: '10px' });
                dropImg.src = `Cards/${card.category}/${card.drop}`;
                cardSlot.appendChild(dropImg);
            }
            if (card.changes) {
                card.changes.forEach(changeFileName => {
                    const changedCardData = state.allCards.byFileName.get(changeFileName);
                    if (changedCardData) {
                        addSeparator();
                        const changeImg = createElementWithStyles('img', { width: 'calc(100% - 10px)', height: 'auto', display: 'block', borderRadius: '10px' });
                        changeImg.src = `Cards/${changedCardData.category}/${changedCardData.fileName}`;
                        cardSlot.appendChild(changeImg);
                    }
                });
            }
             // If we added discarded cards, the container needs to be allowed to grow
            if (card.drop || card.changes) {
                cardSlot.style.height = 'auto';
            }
        }
        unitContainer.appendChild(cardSlot);
    }
    return unitContainer;
};

const generateDroneEntryHtml = (drone, shouldHide, settings) => {
    const droneContainer = createElementWithStyles('div', {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '15px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    });
    
    // Main drone card
    const mainCardSlot = generateCardHtml(drone, settings);
    droneContainer.appendChild(mainCardSlot);

    // Drone's back card (if it exists)
    if (drone.backCard) {
        const backCardSlot = generateCardHtml(drone.backCard, settings);
        droneContainer.appendChild(backCardSlot);
    }

    return droneContainer;
};

const generateTacticalCardHtml = (card, shouldHide, settings) => {
    // Tactical cards have their own unique size, so we don't use generateCardHtml
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
    cardContainer.appendChild(createCardElement(card, { mode: 'export', exportSettings: settings }));
    return cardContainer;
};

const generateSubCardsHtml = (subCards, settings) => {
    if (subCards.size === 0) return null;

    const container = document.createElement('div');
    const title = createElementWithStyles('h3', { marginTop: '30px', borderBottom: '1px solid #ccc', paddingBottom: '5px' });
    title.textContent = '서브 카드';
    container.appendChild(title);

    const cardArea = createElementWithStyles('div', {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px',
        justifyContent: 'center'
    });

    subCards.forEach(card => {
        if (card) {
            // Sub-cards are rendered like Drones for consistency
            const subCardContainer = createElementWithStyles('div', {
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '15px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            });
            const cardSlot = generateCardHtml(card, settings);
            subCardContainer.appendChild(cardSlot);
            cardArea.appendChild(subCardContainer);
        }
    });
    container.appendChild(cardArea);
    return container;
};


// --- Main Export Function ---

let html2canvasLoaded = false;

function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
        if (html2canvasLoaded) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = () => { html2canvasLoaded = true; resolve(); };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

export const handleExportImage = async (settings, format = 'image/png') => {
    const exportIcon = exportImageBtn.querySelector('img');
    if (!exportIcon) return;

    exportIcon.style.display = 'none';
    exportImageBtn.disabled = true;
    const loadingText = document.createElement('span');
    loadingText.textContent = '생성 중...';
    exportImageBtn.appendChild(loadingText);

    try {
        await loadHtml2Canvas();
        const rosterState = state.getActiveRoster();
        if (!rosterState) return;

        const shouldHide = !settings.revealHidden;

        const exportContainer = createElementWithStyles('div', {
            position: 'absolute',
            left: '-9999px',
            width: '1200px',
            backgroundColor: '#f0f2f5',
            padding: '20px',
            fontFamily: 'sans-serif'
        });

        document.body.appendChild(exportContainer);

        if (settings.showTitle) {
            const h1 = createElementWithStyles('h1', { textAlign: 'center', color: '#1c1e21' });
            h1.textContent = state.activeRosterName;
            exportContainer.appendChild(h1);
        }

        if (settings.showTotalPoints) {
            const h2 = createElementWithStyles('h2', { textAlign: 'center', color: '#1877f2', fontWeight: 'bold' });
            h2.textContent = `총합 포인트: ${updateTotalPoints()}`;
            exportContainer.appendChild(h2);
        }

        if (Object.keys(rosterState.units).length > 0) {
            const unitsTitle = createElementWithStyles('h3', { marginTop: '30px', borderBottom: '1px solid #ccc', paddingBottom: '5px' });
            unitsTitle.textContent = '유닛';
            exportContainer.appendChild(unitsTitle);

            const unitsContainer = createElementWithStyles('div', { display: 'flex', flexDirection: 'column', gap: '20px' });
            for (const unitId in rosterState.units) {
                unitsContainer.appendChild(generateUnitHtml(rosterState.units[unitId], shouldHide, settings));
            }
            exportContainer.appendChild(unitsContainer);
        }

        // 드론 및 서브카드 데이터 준비
        const allSubCardsSet = state.getAllSubCards(rosterState, { includeDrones: true });

        const mainDroneFileNames = new Set(rosterState.drones.map(d => d.fileName));
        
        const subDrones = [];
        const otherSubCards = new Set();

        allSubCardsSet.forEach(card => {
            if (card.category === 'Drone') {
                if (!mainDroneFileNames.has(card.fileName)) {
                    subDrones.push(card);
                }
            } else {
                otherSubCards.add(card);
            }
        });

        const allDronesToRender = [...rosterState.drones, ...subDrones];

        if (allDronesToRender.length > 0) {
            const dronesTitle = createElementWithStyles('h3', { marginTop: '30px', borderBottom: '1px solid #ccc', paddingBottom: '5px' });
            dronesTitle.textContent = '드론';
            exportContainer.appendChild(dronesTitle);

            const dronesContainer = createElementWithStyles('div', { display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' });
            allDronesToRender.forEach(drone => {
                dronesContainer.appendChild(generateDroneEntryHtml(drone, shouldHide, settings));
            });
            exportContainer.appendChild(dronesContainer);
        }

        if (rosterState.tacticalCards && rosterState.tacticalCards.length > 0) {
            const tacticalTitle = createElementWithStyles('h3', { marginTop: '30px', borderBottom: '1px solid #ccc', paddingBottom: '5px' });
            tacticalTitle.textContent = '전술 카드';
            exportContainer.appendChild(tacticalTitle);

            const tacticalContainer = createElementWithStyles('div', { display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' });
            rosterState.tacticalCards.forEach(card => {
                tacticalContainer.appendChild(generateTacticalCardHtml(card, shouldHide, settings));
            });
            exportContainer.appendChild(tacticalContainer);
        }

        if (settings.showSubCards) {
            const subCardsContainer = generateSubCardsHtml(otherSubCards, settings);
            if (subCardsContainer) {
                exportContainer.appendChild(subCardsContainer);
            }
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        const canvas = await html2canvas(exportContainer, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#f0f2f5' });

        const dataUrl = canvas.toDataURL(format);
        const newTab = window.open();
        newTab.document.write(`
            <html style="height: 100%; margin: 0; padding: 0;">
                <head><title>${state.activeRosterName}</title></head>
                <body style="height: 100%; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background-color: #555;">
                    <img src="${dataUrl}" style="max-width: 100%; max-height: 100%;" />
                </body>
            </html>
        `);
        newTab.document.close();

        document.body.removeChild(exportContainer);

    } catch (error) {
        console.error('Error exporting image:', error);
        alert('이미지 생성에 실패했습니다. 콘솔을 확인해주세요.');
    } finally {
        exportIcon.style.display = 'block';
        exportImageBtn.removeChild(loadingText);
        exportImageBtn.disabled = false;
    }
};