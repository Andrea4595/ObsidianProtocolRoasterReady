import * as state from './state.js';
import { updateTotalPoints } from './ui.js';
import { categoryOrder, CARD_DIMENSIONS } from './constants.js';
import { exportImageBtn } from './dom.js';

// --- Custom Confirmation Modal ---
const showHiddenCardConfirmation = () => {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 2000;';

        const modal = document.createElement('div');
        modal.style.cssText = 'background-color: #fff; padding: 25px; border-radius: 12px; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.3);';

        const message = document.createElement('p');
        message.textContent = '비공개 카드를 숨기시겠습니까?';
        message.style.cssText = 'margin: 0 0 20px; font-size: 18px;';

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 15px; justify-content: center;';

        const hideBtn = document.createElement('button');
        hideBtn.textContent = '비공개 숨김';
        hideBtn.style.cssText = 'padding: 10px 20px; border-radius: 8px; border: 1px solid #6c757d; background-color: #6c757d; color: white; font-size: 16px; cursor: pointer;';

        const revealBtn = document.createElement('button');
        revealBtn.textContent = '모두 공개';
        revealBtn.style.cssText = 'padding: 10px 20px; border-radius: 8px; border: 1px solid #17a2b8; background-color: #17a2b8; color: white; font-size: 16px; cursor: pointer;';

        hideBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve(true);
        };

        revealBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve(false);
        };

        buttonContainer.appendChild(hideBtn);
        buttonContainer.appendChild(revealBtn);
        modal.appendChild(message);
        modal.appendChild(buttonContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    });
};


// --- HTML Generation Helpers ---

const createElementWithStyles = (tag, styles) => {
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

const generateUnitHtml = (unit, shouldHide) => {
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

const generateDroneEntryHtml = (drone, shouldHide) => {
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

const generateTacticalCardHtml = (card, shouldHide) => {
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

const generateSubCardsHtml = (subCardFileNames) => {
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

export const handleExportImage = async () => {
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

        const allCardsInRosterForCheck = [];
        Object.values(rosterState.units).forEach(unit => allCardsInRosterForCheck.push(...Object.values(unit)));
        allCardsInRosterForCheck.push(...rosterState.drones);
        if (rosterState.tacticalCards) {
            allCardsInRosterForCheck.push(...rosterState.tacticalCards);
        }
        const hasHiddenCards = allCardsInRosterForCheck.some(card => card && card.hidden);

        let shouldHide = false;
        if (hasHiddenCards) {
            shouldHide = await showHiddenCardConfirmation();
        }

        const exportContainer = createElementWithStyles('div', {
            position: 'absolute',
            left: '-9999px',
            width: '1200px',
            backgroundColor: '#f0f2f5',
            padding: '20px',
            fontFamily: 'sans-serif'
        });
        document.body.appendChild(exportContainer);

        const h1 = createElementWithStyles('h1', { textAlign: 'center', color: '#1c1e21' });
        h1.textContent = state.activeRosterName;
        exportContainer.appendChild(h1);

        const h2 = createElementWithStyles('h2', { textAlign: 'center', color: '#1877f2', fontWeight: 'bold' });
        h2.textContent = `총합 포인트: ${updateTotalPoints()}`;
        exportContainer.appendChild(h2);

        if (Object.keys(rosterState.units).length > 0) {
            const unitsTitle = createElementWithStyles('h3', { marginTop: '30px', borderBottom: '1px solid #ccc', paddingBottom: '5px' });
            unitsTitle.textContent = '유닛';
            exportContainer.appendChild(unitsTitle);

            const unitsContainer = createElementWithStyles('div', { display: 'flex', flexDirection: 'column', gap: '20px' });
            for (const unitId in rosterState.units) {
                unitsContainer.appendChild(generateUnitHtml(rosterState.units[unitId], shouldHide));
            }
            exportContainer.appendChild(unitsContainer);
        }

        // 2. Prepare Drone and Sub-card data
        const otherSubCards = state.getAllSubCards(rosterState);

        const allSubCards = state.getAllSubCards(rosterState, { includeDrones: true });
        const subDrones = [...allSubCards]
            .map(fileName => state.allCards.byFileName.get(fileName))
            .filter(card => card && card.category === 'Drone');

        const mainDrones = new Set(rosterState.drones.map(d => d.fileName));
        const uniqueSubDrones = subDrones.filter(subDrone => !mainDrones.has(subDrone.fileName));
        
        const allDronesToRender = [...rosterState.drones, ...uniqueSubDrones];

        if (allDronesToRender.length > 0) {
            const dronesTitle = createElementWithStyles('h3', { marginTop: '30px', borderBottom: '1px solid #ccc', paddingBottom: '5px' });
            dronesTitle.textContent = '드론';
            exportContainer.appendChild(dronesTitle);

            const dronesContainer = createElementWithStyles('div', { display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' });
            allDronesToRender.forEach(drone => {
                dronesContainer.appendChild(generateDroneEntryHtml(drone, shouldHide));
            });
            exportContainer.appendChild(dronesContainer);
        }

        if (rosterState.tacticalCards && rosterState.tacticalCards.length > 0) {
            const tacticalTitle = createElementWithStyles('h3', { marginTop: '30px', borderBottom: '1px solid #ccc', paddingBottom: '5px' });
            tacticalTitle.textContent = '전술 카드';
            exportContainer.appendChild(tacticalTitle);

            const tacticalContainer = createElementWithStyles('div', { display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' });
            rosterState.tacticalCards.forEach(card => {
                tacticalContainer.appendChild(generateTacticalCardHtml(card, shouldHide));
            });
            exportContainer.appendChild(tacticalContainer);
        }

        const subCardsContainer = generateSubCardsHtml(otherSubCards);
        if (subCardsContainer) {
            exportContainer.appendChild(subCardsContainer);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        const canvas = await html2canvas(exportContainer, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#f0f2f5' });

        const dataUrl = canvas.toDataURL('image/png');
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