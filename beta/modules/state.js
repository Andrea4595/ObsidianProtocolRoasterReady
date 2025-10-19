import { Roster } from './Roster.js';
import { renderRoster, updateRosterSelect } from './ui.js';
import { factionSelect } from './dom.js';

// --- State Variables ---
export let allCards = { byCategory: {}, drones: [], tactical: [], byFileName: new Map() };
export let allKeywords = new Map();
export let allRosters = {}; // This will store Roster instances
export let activeRosterName = '';
export let nextUnitId = 0;
export let nextDroneId = 0;
export let nextTacticalCardId = 0;
export let isGameMode = false;
export let gameRoster = {};
export let imageExportSettings = {
    showTitle: true,
    showDiscarded: true,
    showPoints: true,
    showTotalPoints: true,
    showCardPoints: true,
    showUnitPoints: true,
    showSubCards: true,
    revealHidden: true,
};

export let currentSort = 'datasheet';

export function setCurrentSort(sort) {
    currentSort = sort;
}

export const saveCurrentSort = () => {
    localStorage.setItem('currentSort', currentSort);
};

export const loadCurrentSort = () => {
    const savedSort = localStorage.getItem('currentSort');
    if (savedSort) {
        currentSort = savedSort;
    }
};

// --- Save Versioning ---
const CURRENT_SAVE_VERSION = 1;

// --- Getters and Setters ---

export function setImageExportSettings(settings) {
    imageExportSettings = settings;
}
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

// --- Roster Management ---

export const createNewRoster = (name) => new Roster({ name });

export const saveAllRosters = () => {
    if (isGameMode) return;
    const savableRosters = {};
    for (const rosterName in allRosters) {
        savableRosters[rosterName] = allRosters[rosterName].serialize();
    }
    localStorage.setItem('rosters', JSON.stringify(savableRosters));
    localStorage.setItem('activeRosterName', activeRosterName);
};

export const calculateNextIds = () => {
    const roster = getActiveRoster();
    if (!roster) {
        nextUnitId = 0;
        nextDroneId = 0;
        nextTacticalCardId = 0;
        return;
    }

    let maxUnitId = -1;
    if (roster.units && Object.keys(roster.units).length > 0) {
        const unitIds = Object.keys(roster.units).map(id => parseInt(id)).filter(id => !isNaN(id));
        if(unitIds.length > 0) {
             maxUnitId = Math.max(...unitIds);
        }
    }
    nextUnitId = maxUnitId + 1;

    let maxDroneId = -1;
    if (roster.drones && roster.drones.length > 0) {
        const droneIds = roster.drones
            .map(d => d.rosterId ? parseInt(d.rosterId.split('_')[1]) : -1)
            .filter(id => !isNaN(id));
        if (droneIds.length > 0) {
            maxDroneId = Math.max(...droneIds);
        }
    }
    nextDroneId = maxDroneId + 1;

    let maxTacticalCardId = -1;
    if (roster.tacticalCards && roster.tacticalCards.length > 0) {
        const tacticalCardIds = roster.tacticalCards
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
    factionSelect.value = getActiveRoster().faction || 'RDL';
    calculateNextIds();
    renderRoster();
    updateRosterSelect();
    saveAllRosters();
};

export function addNewRoster(name) {
    if (!name || allRosters[name]) {
        return false; // 이름이 없거나 중복
    }
    allRosters[name] = createNewRoster(name);
    switchActiveRoster(name);
    return true;
}

export function renameActiveRoster(newName) {
    if (!newName || allRosters[newName]) {
        return false; // 새 이름이 없거나 중복
    }
    const oldName = activeRosterName;
    allRosters[newName] = allRosters[oldName];
    allRosters[newName].name = newName;
    delete allRosters[oldName];
    
    setActiveRosterName(newName);
    updateRosterSelect();
    saveAllRosters();
    return true;
}

export function deleteActiveRoster() {
    if (Object.keys(allRosters).length <= 1) {
        return false; // 마지막 로스터는 삭제 불가
    }
    const oldName = activeRosterName;
    delete allRosters[oldName];
    const newActiveName = Object.keys(allRosters)[0];
    switchActiveRoster(newActiveName);
    return true;
}

export const getAllSubCards = (rosterState, { includeDrones = false } = {}) => {
    const allCardsInRoster = [];
    Object.values(rosterState.units).forEach(unit => allCardsInRoster.push(...Object.values(unit)));
    allCardsInRoster.push(...rosterState.drones);
    rosterState.drones.forEach(drone => {
        if (drone && drone.backCard) {
            allCardsInRoster.push(drone.backCard);
        }
    });

    const subCards = new Set();
    allCardsInRoster.forEach(card => {
        if (card && card.subCards) {
            card.subCards.forEach(subCardFileName => {
                const subCardData = allCards.byFileName.get(subCardFileName);
                if (subCardData) {
                    if (includeDrones || subCardData.category !== 'Drone') {
                        subCards.add(subCardFileName);
                    }
                }
            });
        }
    });
    return subCards;
};

// --- Data Migration ---
function migrateFromVersion0ToVersion1(oldRosterData) {
    const newRosterData = {
        faction: oldRosterData.faction || 'RDL',
        units: {},
        drones: [],
        tacticalCards: [],
        version: CURRENT_SAVE_VERSION
    };

    // Migrate units
    for (const unitId in oldRosterData.units) {
        const oldUnit = oldRosterData.units[unitId];
        newRosterData.units[unitId] = {};
        for (const category in oldUnit) {
            if (oldUnit[category] && oldUnit[category].fileName) {
                newRosterData.units[unitId][category] = oldUnit[category].fileName;
            } else {
                newRosterData.units[unitId][category] = null; // Handle missing card gracefully
            }
        }
    }

    // Migrate drones
    newRosterData.drones = oldRosterData.drones.map(oldDrone => {
        if (!oldDrone) return null;
        const newDrone = { fileName: oldDrone.fileName };
        if (oldDrone.backCard && oldDrone.backCard.fileName) {
            newDrone.backCardFileName = oldDrone.backCard.fileName;
        }
        return newDrone;
    }).filter(Boolean);

    // Migrate tacticalCards (assuming they were full objects in old format)
    newRosterData.tacticalCards = (oldRosterData.tacticalCards || []).map(oldCard => {
        return oldCard && oldCard.fileName ? oldCard.fileName : null;
    }).filter(Boolean);

    return newRosterData;
}

// --- Initialization ---

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
        allCards.byCardId = new Map();
        
        cardData.forEach(card => {
            // Generate and set the unique cardId
            const nameOnly = card.fileName.substring(0, card.fileName.lastIndexOf('.'));
            const parts = nameOnly.split('_');
            let startIndex;
            if (parts[0] === 'Part') {
                startIndex = 3;
            } else { // Drone, Dial, etc.
                startIndex = 2;
            }
            let idParts = parts.slice(startIndex);
            if (idParts.length > 1 && idParts[idParts.length - 1] === 'Front') {
                idParts.pop();
            }
            const modelId = idParts.join('_');
            const cardId = `${card.category}_${modelId}`;
            card.cardId = cardId;

            allCards.byFileName.set(card.fileName, card);
            allCards.byCardId.set(cardId, card);

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

async function loadKeywordData() {
    try {
        const response = await fetch(`data/keywords.json?v=${new Date().getTime()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for file keywords.json`);
        }
        const keywordData = await response.json();
        allKeywords = new Map(keywordData.map(kw => [kw.keyword, kw]));
    } catch (error) {
        console.error("Could not load keyword data:", error);
    }
}

export const initializeApp = async () => {
    await Promise.all([loadImageData(), loadKeywordData()]);

    loadCurrentSort();

    const savedSettingsRaw = localStorage.getItem('imageExportSettings');
    if (savedSettingsRaw) {
        const savedSettings = JSON.parse(savedSettingsRaw);
        imageExportSettings = { ...imageExportSettings, ...savedSettings };
    }

    const savedRostersRaw = localStorage.getItem('rosters');
    let savedRosters = savedRostersRaw ? JSON.parse(savedRostersRaw) : null;
    const savedActiveName = localStorage.getItem('activeRosterName');

    if (savedRosters && Object.keys(savedRosters).length > 0) {
        const migratedRosters = {};
        for (const rosterName in savedRosters) {
            let rosterData = savedRosters[rosterName];
            // Migration check: If 'version' is missing or not current, it's an old format
            if (!rosterData.version || rosterData.version < CURRENT_SAVE_VERSION) {
                console.warn(`Migrating old roster format for: ${rosterName}`);
                rosterData = migrateFromVersion0ToVersion1(rosterData);
            }
            migratedRosters[rosterName] = Roster.deserialize(rosterName, rosterData, allCards.byFileName);
        }
        allRosters = migratedRosters;
        activeRosterName = savedActiveName && allRosters[savedActiveName] ? savedActiveName : Object.keys(allRosters)[0];
    } else {
        activeRosterName = '기본 로스터';
        allRosters[activeRosterName] = createNewRoster(activeRosterName);
    }

    factionSelect.value = getActiveRoster().faction || 'RDL';
    calculateNextIds();
    updateRosterSelect();
    renderRoster();
    saveAllRosters(); // Save in new format after migration
};
