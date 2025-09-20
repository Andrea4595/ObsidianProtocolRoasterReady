import * as state from './state.js';
import { updateTotalPoints } from './ui.js';
import { exportImageBtn } from './dom.js';
import { showHiddenCardConfirmation } from './confirmationModal.js';
import { generateUnitHtml, generateDroneEntryHtml, generateTacticalCardHtml, generateSubCardsHtml, createElementWithStyles } from './rosterHtmlGenerator.js';


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