import { categoryOrder } from './constants.js';
import { renderRoster, updateRosterSelect } from './ui.js';
import { factionSelect } from './dom.js';

// State Variables
export let allCards = { byCategory: {}, drones: [], tactical: [], byFileName: new Map() };
export let allRosters = {};
export let activeRosterName = '';
export let nextUnitId = 0;
export let nextDroneId = 0;
export let nextTacticalCardId = 0;
export let isGameMode = false;
export let gameRoster = {};

const prepareRostersForSaving = (rosters) => {
    const savableRosters = JSON.parse(JSON.stringify(rosters));
    for (const rosterName in savableRosters) {
        const roster = savableRosters[rosterName];
        if (roster.units) {
            for (const unitId in roster.units) {
                const unit = roster.units[unitId];
                for (const category in unit) {
                    if (unit[category]) {
                        unit[category] = unit[category].fileName;
                    }
                }
            }
        }
        roster.drones = (roster.drones || []).map(drone => {
            if (!drone) return null;
            if (drone.backCard && drone.backCard.fileName) {
                return {
                    fileName: drone.fileName,
                    backCardFileName: drone.backCard.fileName
                };
            } else {
                return drone.fileName;
            }
        }).filter(Boolean);
        roster.tacticalCards = (roster.tacticalCards || []).map(card => card ? card.fileName : null).filter(Boolean);
    }
    return savableRosters;
};

const reconstructRostersFromSave = (savedRosters, allCardsMap) => {
    const reconstructedRosters = JSON.parse(JSON.stringify(savedRosters));
    for (const rosterName in reconstructedRosters) {
        const roster = reconstructedRosters[rosterName];
        if (!roster.faction) roster.faction = 'RDL';

        if (roster.units) {
            for (const unitId in roster.units) {
                const unit = roster.units[unitId];
                for (const category in unit) {
                    const savedItem = unit[category];
                    let fileName = null;
                    if (typeof savedItem === 'string') {
                        fileName = savedItem;
                    } else if (savedItem && typeof savedItem === 'object' && savedItem.fileName) {
                        fileName = savedItem.fileName;
                    }
                    unit[category] = fileName && allCardsMap.has(fileName) ? { ...allCardsMap.get(fileName) } : null;
                }
            }
        }

        roster.drones = (roster.drones || []).map(item => {
            let mainFileName = null;
            let backCardFileName = null;

            if (typeof item === 'string') {
                mainFileName = item;
            } else if (item && typeof item === 'object') {
                mainFileName = item.fileName;
                if (item.backCardFileName) {
                    backCardFileName = item.backCardFileName;
                } else if (item.backCard && item.backCard.fileName) {
                    backCardFileName = item.backCard.fileName;
                }
            }

            if (mainFileName && allCardsMap.has(mainFileName)) {
                const reconstructedDrone = { ...allCardsMap.get(mainFileName) };
                if (backCardFileName && allCardsMap.has(backCardFileName)) {
                    reconstructedDrone.backCard = { ...allCardsMap.get(backCardFileName) };
                }
                return reconstructedDrone;
            }
            return null;
        }).filter(Boolean);

        roster.tacticalCards = (roster.tacticalCards || []).map(item => {
            const fileName = typeof item === 'string' ? item : (item && item.fileName);
            return fileName && allCardsMap.has(fileName) ? { ...allCardsMap.get(fileName) } : null;
        }).filter(Boolean);
    }
    return reconstructedRosters;
};

export function getActiveRoster() {
    return allRosters[activeRosterName];
}

export function setGameRosterState(roster) {
    gameRoster = roster;
}

export function setActiveRosterName(name) {
    activeRosterName = name;
}

export function setNextUnitId(id) {
    nextUnitId = id;
}

export function setNextDroneId(id) {
    nextDroneId = id;
}

export function setNextTacticalCardId(id) {
    nextTacticalCardId = id;
}

export function setGameMode(mode) {
    isGameMode = mode;
}

export const saveAllRosters = () => {
    if (isGameMode) return;
    const savableRosters = prepareRostersForSaving(allRosters);
    localStorage.setItem('rosters', JSON.stringify(savableRosters));
    localStorage.setItem('activeRosterName', activeRosterName);
};

export const getNewRosterState = () => ({ units: {}, drones: [], tacticalCards: [], faction: 'RDL' });

export const calculateNextIds = () => {
    const rosterState = allRosters[activeRosterName];
    if (!rosterState) {
        nextUnitId = 0;
        nextDroneId = 0;
        nextTacticalCardId = 0;
        return;
    }

    let maxUnitId = -1;
    if (rosterState.units && Object.keys(rosterState.units).length > 0) {
        const unitIds = Object.keys(rosterState.units).map(id => parseInt(id)).filter(id => !isNaN(id));
        if(unitIds.length > 0) {
             maxUnitId = Math.max(...unitIds);
        }
    }
    nextUnitId = maxUnitId + 1;

    let maxDroneId = -1;
    if (rosterState.drones && rosterState.drones.length > 0) {
        const droneIds = rosterState.drones
            .map(d => d.rosterId ? parseInt(d.rosterId.split('_')[1]) : -1)
            .filter(id => !isNaN(id));
        if (droneIds.length > 0) {
            maxDroneId = Math.max(...droneIds);
        }
    }
    nextDroneId = maxDroneId + 1;

    let maxTacticalCardId = -1;
    if (rosterState.tacticalCards && rosterState.tacticalCards.length > 0) {
        const tacticalCardIds = rosterState.tacticalCards
            .map(d => d.rosterId ? parseInt(d.rosterId.split('_')[1]) : -1)
            .filter(id => !isNaN(id));
        if (tacticalCardIds.length > 0) {
            maxTacticalCardId = Math.max(...tacticalCardIds);
        }
    }
    nextTacticalCardId = maxTacticalCardId + 1;
};

export const switchActiveRoster = (rosterName) => {
    if (!allRosters[rosterName] || isGameMode) return;
    activeRosterName = rosterName;
    factionSelect.value = allRosters[activeRosterName].faction || 'RDL';
    calculateNextIds();
    renderRoster();
    updateRosterSelect();
    saveAllRosters();
};

async function loadImageData() {
    try {
        const categoryFiles = [
            'Pilot.json', 'Drone.json', 'Back.json', 'Chassis.json',
            'Left.json', 'Right.json', 'Torso.json', 'Projectile.json', 'Tactical.json'
        ];

        const fetchPromises = categoryFiles.map(file =>
            fetch(`data/${file}?v=${new Date().getTime()}`).then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for file ${file}`);
                return res.json();
            })
        );

        const arraysOfCards = await Promise.all(fetchPromises);
        const cardData = arraysOfCards.flat();

        allCards.byCategory = {};
        allCards.drones = [];
        allCards.tactical = [];
        allCards.byFileName = new Map();
        
        cardData.forEach(card => {
            allCards.byFileName.set(card.fileName, card);

            if (card.category === "Tactical" && card.hidden === true) {
                card.isRevealedInGameMode = false;
            } else {
                card.isRevealedInGameMode = true;
            }

            if (card.category === "Drone") {
                allCards.drones.push(card);
            } else if (card.category === "Tactical") {
                allCards.tactical.push(card);
            } 

            if (!allCards.byCategory[card.category]) {
                allCards.byCategory[card.category] = [];
            }
            allCards.byCategory[card.category].push(card);
        });
    } catch (error) {
        console.error("Could not load image data:", error);
    }
}

export const initializeApp = async () => {
    await loadImageData();
    const savedRostersRaw = localStorage.getItem('rosters');
    const savedRosters = savedRostersRaw ? JSON.parse(savedRostersRaw) : null;
    const savedActiveName = localStorage.getItem('activeRosterName');

    if (savedRosters && Object.keys(savedRosters).length > 0) {
        allRosters = reconstructRostersFromSave(savedRosters, allCards.byFileName);
        activeRosterName = savedActiveName && allRosters[savedActiveName] ? savedActiveName : Object.keys(allRosters)[0];
        saveAllRosters(); // Immediately save to migrate data to the new format
    } else {
        activeRosterName = '기본 로스터';
        allRosters[activeRosterName] = getNewRosterState();
    }

    factionSelect.value = allRosters[activeRosterName].faction || 'RDL';
    calculateNextIds();
    updateRosterSelect();
    renderRoster();
};