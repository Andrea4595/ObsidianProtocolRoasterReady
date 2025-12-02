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
const CURRENT_SAVE_VERSION = 2;

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
        if (card && card.resolvedSubCards) {
            card.resolvedSubCards.forEach(subCardData => {
                if (subCardData) {
                    if (includeDrones || subCardData.category !== 'Drone') {
                        // Add the full card object or a specific identifier. Let's add the object.
                        subCards.add(subCardData); 
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
        version: 1 // Target version is 1
    };

    // ... (rest of the function is unchanged)
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

function migrateFromVersion1ToVersion2(v1Data) {
    const v2Data = {
        version: 2,
        faction: v1Data.faction || 'RDL',
        units: {},
        drones: [],
        tacticalCards: []
    };

    // Create a map from base filename (without extension) to the full card object.
    // This handles the .jpg -> .png transition.
    const mapByBaseName = new Map();
    for (const card of allCards.byFileName.values()) {
        const baseName = card.fileName.substring(0, card.fileName.lastIndexOf('.'));
        mapByBaseName.set(baseName, card);
    }

    const findCard = (fileNameFromV1) => {
        if (!fileNameFromV1) return null;
        const baseName = fileNameFromV1.substring(0, fileNameFromV1.lastIndexOf('.'));
        return mapByBaseName.get(baseName) || null;
    };

    // Migrate units
    for (const unitId in v1Data.units) {
        v2Data.units[unitId] = {};
        const v1Unit = v1Data.units[unitId];
        for (const category in v1Unit) {
            const fileName = v1Unit[category];
            if (fileName) {
                const card = findCard(fileName);
                if (card) {
                    v2Data.units[unitId][category] = { category: card.category, name: card.name };
                } else {
                    v2Data.units[unitId][category] = null;
                }
            } else {
                v2Data.units[unitId][category] = null;
            }
        }
    }

    // Migrate drones
    v2Data.drones = v1Data.drones.map(item => {
        const mainFileName = typeof item === 'string' ? item : (item && item.fileName);
        const backCardFileName = item && item.backCardFileName;

        if (mainFileName) {
            const mainCard = findCard(mainFileName);
            if (mainCard) {
                const newDrone = { category: mainCard.category, name: mainCard.name };
                if (backCardFileName) {
                    const backCard = findCard(backCardFileName);
                    if (backCard) {
                        newDrone.backCard = { category: backCard.category, name: backCard.name };
                    }
                }
                return newDrone;
            }
        }
        return null;
    }).filter(Boolean);

    // Migrate tacticalCards
    v2Data.tacticalCards = v1Data.tacticalCards.map(fileName => {
        if (fileName) {
            const card = findCard(fileName);
            return card ? { category: card.category, name: card.name } : null;
        }
        return null;
    }).filter(Boolean);

    return v2Data;
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
        allCards.byName = new Map();
        
        cardData.forEach(card => {
            // ... (existing code to populate maps)
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
            allCards.byName.set(`${card.category}_${card.name}`, card);

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

        // --- Resolve sub-card references ---
        const mapByBaseName = new Map();
        for (const card of allCards.byFileName.values()) {
            const baseName = card.fileName.substring(0, card.fileName.lastIndexOf('.'));
            mapByBaseName.set(baseName, card);
        }

        cardData.forEach(card => {
            card.resolvedSubCards = [];
            if (card.subCards && Array.isArray(card.subCards)) {
                card.subCards.forEach(subCardFileName => {
                    const baseName = subCardFileName.substring(0, subCardFileName.lastIndexOf('.'));
                    const subCardData = mapByBaseName.get(baseName);
                    if (subCardData) {
                        card.resolvedSubCards.push(subCardData);
                    } else {
                        console.warn(`Could not resolve sub-card for fileName: ${subCardFileName}`);
                    }
                });
            }
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

            // Migration check: If 'version' is missing, it's a v0 save.
            if (!rosterData.version) {
                console.warn(`Migrating v0 roster format for: ${rosterName}`);
                rosterData = migrateFromVersion0ToVersion1(roosterData);
            }

            // If version is 1, migrate to v2.
            if (rosterData.version === 1) {
                console.warn(`Migrating v1 roster format for: ${rosterName}`);
                rosterData = migrateFromVersion1ToVersion2(rosterData);
            }

            // After all migrations, deserialize using the byName map.
            migratedRosters[rosterName] = Roster.deserialize(rosterName, rosterData, allCards.byName);
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
