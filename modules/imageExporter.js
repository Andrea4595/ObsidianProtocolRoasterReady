import * as state from './state.js';
import { updateTotalPoints } from './ui.js';
import { categoryOrder } from './constants.js';
import { exportImageBtn } from './dom.js';

// --- HTML Generation Helpers ---

const generateUnitHtml = (unit) => {
    let unitHtml = '<div style="display: flex; gap: 10px; background-color: #fff; border-radius: 12px; padding: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); align-items: flex-start;">';
    for (const category of categoryOrder) {
        const card = unit[category];
        unitHtml += '<div style="width: 180px; border: 1px solid #ddd; border-radius: 10px; background-color: #fafafa; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 270px; gap: 5px; padding: 5px;">';
        if (card) {
            const points = card.points || 0;
            unitHtml += '<div style="position: relative; width: 100%;">';
            unitHtml += `<img src="Cards/${card.category}/${card.fileName}" style="width: 100%; height: auto; border-radius: 10px; display: block;" />`;
            unitHtml += `<div style="position: absolute; top: 5px; left: 5px; padding: 3px 6px; background-color: rgba(24, 119, 242, 0.9); color: #fff; font-size: 14px; font-weight: bold; border-radius: 8px; border: 1px solid #fff;">${points}</div>`;
            unitHtml += '</div>';

            if (card.drop) {
                unitHtml += '<div style="height: 5px; width: 80%; background-color: #ccc; margin: 5px 0; border-radius: 2px;"></div>';
                unitHtml += `<img src="Cards/${card.category}/${card.drop}" style="width: 100%; height: auto; display: block; border-radius: 10px;" />`;
            }
            if (card.changes) {
                card.changes.forEach(changeFileName => {
                    const changedCardData = state.allCards.byFileName.get(changeFileName);
                    if (changedCardData) {
                        unitHtml += '<div style="height: 5px; width: 80%; background-color: #ccc; margin: 5px 0; border-radius: 2px;"></div>';
                        unitHtml += `<img src="Cards/${changedCardData.category}/${changedCardData.fileName}" style="width: 100%; height: auto; display: block; border-radius: 10px;" />`;
                    }
                });
            }
        } else {
            unitHtml += `<span style="font-weight: bold; color: #65676b;">${category}</span>`;
        }
        unitHtml += '</div>';
    }
    unitHtml += '</div>';
    return unitHtml;
};

const generateDroneEntryHtml = (drone) => {
    let droneHtml = '<div style="display: flex; align-items: flex-start; gap: 10px; background-color: #fff; border-radius: 12px; padding: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">';

    // Column for the drone and its 'changes' cards
    droneHtml += '<div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">';
    const points = drone.points || 0;
    droneHtml += '<div style="position: relative; width: fit-content;">';
    droneHtml += `<img src="Cards/${drone.category}/${drone.fileName}" style="height: 270px; width: auto; border-radius: 10px; display: block;" />`;
    droneHtml += `<div style="position: absolute; top: 5px; left: 5px; padding: 3px 6px; background-color: rgba(24, 119, 242, 0.9); color: #fff; font-size: 14px; font-weight: bold; border-radius: 8px; border: 1px solid #fff;">${points}</div>`;
    droneHtml += '</div>';

    if (drone.changes) {
        drone.changes.forEach(changeFileName => {
            const changedCardData = state.allCards.byFileName.get(changeFileName);
            if (changedCardData) {
                const changedPoints = changedCardData.points || 0;
                droneHtml += '<div style="height: 5px; width: 80%; background-color: #ccc; margin: 5px 0; border-radius: 2px;"></div>';
                droneHtml += '<div style="position: relative; width: fit-content;">';
                droneHtml += `<img src="Cards/${changedCardData.category}/${changedCardData.fileName}" style="height: 270px; width: auto; border-radius: 10px; display: block;" />`;
                droneHtml += `<div style="position: absolute; top: 5px; left: 5px; padding: 3px 6px; background-color: rgba(24, 119, 242, 0.9); color: #fff; font-size: 14px; font-weight: bold; border-radius: 8px; border: 1px solid #fff;">${changedPoints}</div>`;
                droneHtml += '</div>';
            }
        });
    }
    droneHtml += '</div>';

    // Column for the backCard
    if (drone.backCard) {
        const backCard = drone.backCard;
        const backCardPoints = backCard.points || 0;
        droneHtml += '<div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">';
        droneHtml += '<div style="position: relative; width: fit-content;">';
        droneHtml += `<img src="Cards/${backCard.category}/${backCard.fileName}" style="height: 270px; width: auto; border-radius: 10px; display: block;" />`;
        droneHtml += `<div style="position: absolute; top: 5px; left: 5px; padding: 3px 6px; background-color: rgba(24, 119, 242, 0.9); color: #fff; font-size: 14px; font-weight: bold; border-radius: 8px; border: 1px solid #fff;">${backCardPoints}</div>`;
        droneHtml += '</div>';
        droneHtml += '</div>';
    }

    droneHtml += '</div>';
    return droneHtml;
};

const generateSubCardsHtml = (subCardFileNames) => {
    if (subCardFileNames.size === 0) return '';

    let html = '<h3 style="margin-top: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">서브 카드</h3>';
    html += '<div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; align-items: flex-start; margin-top: 15px;">';
    subCardFileNames.forEach(fileName => {
        const card = state.allCards.byFileName.get(fileName);
        if (card) {
            html += '<div style="position: relative; width: fit-content;">';
            html += `<img src="Cards/${card.category}/${card.fileName}" style="height: 270px; width: auto; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: block;" />`;
            html += '</div>';
        }
    });
    html += '</div>';
    return html;
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

        const exportContainer = document.createElement('div');
        document.body.appendChild(exportContainer);

        exportContainer.style.position = 'absolute';
        exportContainer.style.left = '-9999px';
        exportContainer.style.width = '1200px';
        exportContainer.style.backgroundColor = '#f0f2f5';
        exportContainer.style.padding = '20px';
        exportContainer.style.fontFamily = 'sans-serif';

        let html = `<h1 style="text-align: center; color: #1c1e21;">${state.activeRosterName}</h1>`;
        html += `<h2 style="text-align: center; color: #1877f2; font-weight: bold;">총합 포인트: ${updateTotalPoints()}</h2>`;

        // 1. Render Units
        if (Object.keys(rosterState.units).length > 0) {
            html += '<h3 style="margin-top: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">유닛</h3>';
            html += '<div style="display: flex; flex-direction: column; gap: 20px;">';
            for (const unitId in rosterState.units) {
                html += generateUnitHtml(rosterState.units[unitId]);
            }
            html += '</div>';
        }

        // 2. Prepare Drone and Sub-card data
        const allCardsInRoster = [];
        Object.values(rosterState.units).forEach(unit => allCardsInRoster.push(...Object.values(unit)));
        allCardsInRoster.push(...rosterState.drones);

        const allDronesToRender = [];
        const processedDrones = new Set();
        rosterState.drones.forEach(drone => {
            if (drone && !processedDrones.has(drone.fileName)) {
                allDronesToRender.push(drone);
                processedDrones.add(drone.fileName);
            }
        });
        allCardsInRoster.forEach(card => {
            if (card && card.subCards) {
                card.subCards.forEach(subCardFileName => {
                    const subCardData = state.allCards.byFileName.get(subCardFileName);
                    if (subCardData && subCardData.category === 'Drone' && !processedDrones.has(subCardFileName)) {
                        allDronesToRender.push(subCardData);
                        processedDrones.add(subCardFileName);
                    }
                });
            }
        });
        
        const otherSubCards = new Set();
        allCardsInRoster.forEach(card => {
            if (card && card.subCards) {
                card.subCards.forEach(subCardFileName => {
                    const subCardData = state.allCards.byFileName.get(subCardFileName);
                    if (subCardData && subCardData.category !== 'Drone') {
                        otherSubCards.add(subCardFileName);
                    }
                });
            }
        });

        // 3. Render Drones
        if (allDronesToRender.length > 0) {
            html += '<h3 style="margin-top: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">드론</h3>';
            html += '<div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: center;">';
            allDronesToRender.forEach(drone => {
                html += generateDroneEntryHtml(drone);
            });
            html += '</div>';
        }

        // 4. Render Sub-Cards
        html += generateSubCardsHtml(otherSubCards);

        exportContainer.innerHTML = html;

        await new Promise(resolve => setTimeout(resolve, 1000));

        const canvas = await html2canvas(exportContainer, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#f0f2f5' });

        const link = document.createElement('a');
        link.download = `${state.activeRosterName.replace(/[\\/]/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

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