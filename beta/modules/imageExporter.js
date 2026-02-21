import * as state from './state.js';
// import { updateTotalPoints } from './ui.js'; // Removed direct import of updateTotalPoints
import { categoryOrder } from './constants.js';
import { exportImageBtn } from './dom.js';
import { renderCardElement } from './cardRenderer.js';
import { createUnitPartsCompositeImage, createDroneImageElements } from './ui.js';

// --- HTML Generation Helpers ---

const createElementWithStyles = (tag, styles) => {
    const element = document.createElement(tag);
    Object.assign(element.style, styles);
    return element;
};

// Helper to calculate total points for the export image
const calculateTotalPointsForExport = () => {
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
        if (card) total += card.points || 0;
    });
    return total;
};


/**
 * Creates a single, consistently styled card element for the exporter.
 * It determines the correct dimensions based on the card type.
 */
const generateCardHtml = (cardData, settings) => {
    const isDroneLike = cardData.category === 'Drone' || cardData.category === 'Projectile';
    const slotWidth = isDroneLike ? '450px' : '230px'; // 200 -> 230, 390 -> 450
    const slotHeight = '330px'; // 287 -> 330

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

    const cardElement = renderCardElement(cardData, null, { mode: 'export', exportSettings: settings });
    
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


const generateUnitHtml = async (unit, shouldHide, settings) => {
    const unitContainer = createElementWithStyles('div', {
        display: 'flex',
        gap: '10px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '15px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        alignItems: 'flex-start',
        position: 'relative',
        width: 'fit-content',
        margin: '0 auto' // Center the card row
    });

    if (settings.showUnitPoints) {
        const unitPoints = Object.values(unit).reduce((sum, card) => sum + (card ? card.points : 0), 0);
        const unitPointsDisplay = createElementWithStyles('div', {
            position: 'absolute', top: '10px', left: '10px', backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', zIndex: '10'
        });
        unitPointsDisplay.textContent = `${unitPoints}`;
        unitContainer.appendChild(unitPointsDisplay);
    }

    for (const category of categoryOrder) {
        const card = unit[category];
        const cardSlot = generateCardHtml(card || { category }, settings);
        if (!card) {
            cardSlot.innerHTML = '';
            const categoryLabel = createElementWithStyles('span', { fontWeight: 'bold', color: '#65676b' });
            categoryLabel.textContent = category;
            cardSlot.appendChild(categoryLabel);
            Object.assign(cardSlot.style, { justifyContent: 'center', padding: '0' });
        }
        
        if (card && settings.showDiscarded) {
            const addSeparator = () => {
                cardSlot.appendChild(createElementWithStyles('div', {
                    height: '5px', width: '80%', backgroundColor: '#ccc', margin: '5px auto', borderRadius: '2px', flexShrink: '0'
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
            if (card.drop || card.changes) cardSlot.style.height = 'auto';
        }
        unitContainer.appendChild(cardSlot);
    }
    
    return unitContainer;
};

const generateDroneEntryHtml = async (drone, shouldHide, settings) => {
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
    cardContainer.appendChild(renderCardElement(card, null, { mode: 'export', exportSettings: settings }));
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

// Helper to wait for all images within an element to load
const waitForAllImages = (container) => {
    const imgs = Array.from(container.querySelectorAll('img'));
    const promises = imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve; // Continue even if an image fails
        });
    });
    return Promise.all(promises);
};

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
            top: '0',
            left: '-9999px', // 다시 멀리 보냄
            width: '1500px',
            backgroundColor: '#f0f2f5',
            padding: '20px',
            fontFamily: 'sans-serif',
            opacity: '1' // 투명도 제거
        });
        exportContainer.id = 'export-container-root'; // ID 부여

        document.body.appendChild(exportContainer);

        if (settings.showTitle) {
            const h1 = createElementWithStyles('h1', { textAlign: 'center', color: '#1c1e21' });
            h1.textContent = state.activeRosterName;
            exportContainer.appendChild(h1);
        }

        if (settings.showTotalPoints) {
            const h2 = createElementWithStyles('h2', { textAlign: 'center', color: '#1877f2', fontWeight: 'bold' });
            h2.textContent = `총합 포인트: ${calculateTotalPointsForExport()}`; // Use new helper
            exportContainer.appendChild(h2);
        }

        // --- 조합 이미지 섹션 (총합 포인트 아래) ---
        if (settings.showUnitComposite) {
            const compositeSection = createElementWithStyles('div', {
                display: 'flex',
                flexWrap: 'wrap',
                gap: '20px',
                justifyContent: 'center',
                alignItems: 'flex-end',
                marginTop: '20px',
                marginBottom: '30px',
                padding: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '15px'
            });

            // 유닛 이미지 추가
            for (const unitId in rosterState.units) {
                const unit = rosterState.units[unitId];
                const canvas = await createUnitPartsCompositeImage(unit, 300);
                if (canvas) {
                    canvas.style.height = '300px';
                    canvas.style.width = 'auto';
                    canvas.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))';
                    compositeSection.appendChild(canvas);
                }
            }

            // 드론 이미지 추가
            for (const drone of rosterState.drones) {
                // createDroneImageElements는 내부적으로 size에 따른 scaling을 수행합니다.
                // targetHeight를 유닛과 동일한 300으로 주면 size 3은 300, 2는 200, 1은 100이 됩니다.
                const droneImgContainer = await createDroneImageElements(drone, 300);
                if (droneImgContainer) {
                    const canvas = droneImgContainer.querySelector('canvas');
                    if (canvas) {
                        canvas.style.height = 'auto'; // 내부에서 설정된 높이 유지
                        canvas.style.width = 'auto';
                        canvas.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))';
                        compositeSection.appendChild(canvas);
                    }
                }
            }

            if (compositeSection.hasChildNodes()) {
                exportContainer.appendChild(compositeSection);
            }
        }

        if (settings.showDetails && Object.keys(rosterState.units).length > 0) {
            const unitsTitle = createElementWithStyles('h3', { marginTop: '30px', borderBottom: '1px solid #ccc', paddingBottom: '5px' });
            unitsTitle.textContent = '유닛';
            exportContainer.appendChild(unitsTitle);

            const unitsContainer = createElementWithStyles('div', { display: 'flex', flexDirection: 'column', gap: '20px' });
            for (const unitId in rosterState.units) {
                unitsContainer.appendChild(await generateUnitHtml(rosterState.units[unitId], shouldHide, settings));
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

        if (settings.showDetails && allDronesToRender.length > 0) {
            const dronesTitle = createElementWithStyles('h3', { marginTop: '30px', borderBottom: '1px solid #ccc', paddingBottom: '5px' });
            dronesTitle.textContent = '드론';
            exportContainer.appendChild(dronesTitle);

            const dronesContainer = createElementWithStyles('div', { display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' });
            for (const drone of allDronesToRender) {
                dronesContainer.appendChild(await generateDroneEntryHtml(drone, shouldHide, settings));
            }
            exportContainer.appendChild(dronesContainer);
        }

        if (settings.showTactical && rosterState.tacticalCards && rosterState.tacticalCards.length > 0) {
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

        // 1. 모든 이미지가 실제로 로드될 때까지 대기
        await waitForAllImages(exportContainer);
        
        // 2. 브라우저가 레이아웃을 계산할 수 있도록 지연시간 부여
        await new Promise(resolve => setTimeout(resolve, 500));

        // 3. html2canvas 실행
        const canvas = await html2canvas(exportContainer, { 
            scale: 1.5, 
            backgroundColor: '#f0f2f5',
            useCORS: true,
            logging: false,
            width: 1500,
            onclone: (clonedDoc) => {
                // 클론된 문서에서 컨테이너 위치를 0으로 잡아 캡처 영역을 확보함
                const clonedContainer = clonedDoc.getElementById('export-container-root');
                if (clonedContainer) {
                    clonedContainer.style.left = '0';
                    clonedContainer.style.position = 'relative';
                }
            }
        });

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