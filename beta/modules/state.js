import { Roster } from './Roster.js';
import { renderRoster, updateRosterSelect } from './ui.js';
import { factionSelect } from './dom.js';

// --- State Variables ---
export let allCards = { byCategory: {}, drones: [], tactical: [], byFileName: new Map() };
export let allKeywords = new Map();
export let allRosters = {}; // This will store Roster instances
export let activeRosterName = '';
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

export const switchActiveRoster = (rosterName) => {
    if (!allRosters[rosterName] || isGameMode) return;
    activeRosterName = rosterName;
    factionSelect.value = getActiveRoster().faction || 'RDL';
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

// --- NEW STATE MUTATION FUNCTIONS ---

// Adds a new empty unit to the active roster
export function addUnitToActiveRoster(unitId) {
    const roster = getActiveRoster();
    if (roster) {
        roster.units[unitId] = {};
        // Note: _nextUnitId is incremented in events.js when adding (so it's ready for the next one)
        saveAllRosters();
        renderRoster();
    }
}

// Renames an existing roster
export function renameRoster(oldName, newName) {
    if (!newName || allRosters[newName]) {
        return false; // New name is empty or already exists
    }
    const roster = allRosters[oldName];
    if (roster) {
        allRosters[newName] = roster;
        allRosters[newName].name = newName;
        delete allRosters[oldName];
        if (activeRosterName === oldName) {
            setActiveRosterName(newName);
        }
        updateRosterSelect();
        saveAllRosters();
        return true;
    }
    return false;
}

// Deletes a roster
export function deleteRoster(rosterName) {
    if (Object.keys(allRosters).length <= 1) {
        return false; // Cannot delete the last roster
    }
    delete allRosters[rosterName];
    if (activeRosterName === rosterName) {
        const newActiveName = Object.keys(allRosters)[0];
        setActiveRosterName(newActiveName);
        factionSelect.value = getActiveRoster().faction || 'RDL'; // Update faction select
        renderRoster();
    }
    updateRosterSelect();
    saveAllRosters();
    return true;
}

// Sets the faction for the active roster
export function setFactionForActiveRoster(newFaction) {
    const roster = getActiveRoster();
    if (roster) {
        roster.faction = newFaction;
        saveAllRosters();
    }
}

// Updates a card within a unit (replaces the card object)
export function updateUnitCard(unitId, cardCategory, newCard) {
    const roster = getActiveRoster();
    if (roster && roster.units[unitId]) {
        roster.units[unitId][cardCategory] = newCard;
        saveAllRosters();
        // UI update for unit is handled by the caller (events.js performActionAndPreserveScroll)
    }
}

// Toggles the isDropped status of a card within a unit
export function toggleCardIsDropped(unitId, cardCategory) {
    const roster = getActiveRoster();
    if (roster && roster.units[unitId] && roster.units[unitId][cardCategory]) {
        const card = roster.units[unitId][cardCategory];
        card.isDropped = !card.isDropped;
        saveAllRosters();
        // UI update for unit is handled by the caller (events.js performActionAndPreserveScroll)
    }
}

// Adds a card to a unit slot or assigns a back card to a drone
export function addCardToUnitOrDroneBack(currentUnitId, currentCategory, cardData, isBackCard) {
    const roster = getActiveRoster();
    if (roster) {
        if (isBackCard) {
            const drone = roster.drones.find(d => d.rosterId === currentUnitId);
            if (drone) {
                drone.backCard = cardData;
            }
        } else {
            if (roster.units[currentUnitId]) {
                roster.units[currentUnitId][currentCategory] = cardData;
            }
        }
        saveAllRosters();
    }
}

// Adds a new drone to the active roster
export function addDroneToRoster(cardData) {
    const roster = getActiveRoster();
    if (roster) {
        const newDrone = { ...cardData, rosterId: `d_${roster._nextDroneId}` };
        roster._nextDroneId++;
        roster.drones.push(newDrone);
        saveAllRosters();
        return newDrone; // Return the new drone for UI update
    }
    return null;
}

// Adds a new tactical card to the active roster
export function addTacticalCardToRoster(cardData) {
    const roster = getActiveRoster();
    if (roster) {
        const newTacticalCard = { ...cardData, rosterId: `t_${roster._nextTacticalCardId}` };
        roster._nextTacticalCardId++;
        roster.tacticalCards.push(newTacticalCard);
        saveAllRosters();
        return newTacticalCard; // Return the new tactical card for UI update
    }
    return null;
}

// Deletes a specific unit from the active roster
export function deleteUnit(unitId) {
    const roster = getActiveRoster();
    if (roster && roster.units[unitId]) {
        delete roster.units[unitId];
        saveAllRosters();
        renderRoster(); // Rerender to reflect the change
    }
}

// Deletes a specific drone from the active roster
export function deleteDrone(rosterId) {
    const roster = getActiveRoster();
    if (roster) {
        const initialLength = roster.drones.length;
        roster.drones = roster.drones.filter(drone => drone.rosterId !== rosterId);
        if (roster.drones.length < initialLength) {
            saveAllRosters();
            renderRoster(); // Rerender to reflect the change
            return true;
        }
    }
    return false;
}

// Deletes a specific tactical card from the active roster
export function deleteTacticalCard(rosterId) {
    const roster = getActiveRoster();
    if (roster) {
        const initialLength = roster.tacticalCards.length;
        roster.tacticalCards = roster.tacticalCards.filter(card => card.rosterId !== rosterId);
        if (roster.tacticalCards.length < initialLength) {
            saveAllRosters();
            renderRoster(); // Rerender to reflect the change
            return true;
        }
    }
    return false;
}


// --- END NEW STATE MUTATION FUNCTIONS ---

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
            throw new Error(`HTTP error! status: ${res.status} for file keywords.json`);
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
                rosterData = migrateFromVersion0ToVersion1(rosterData);
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
    updateRosterSelect();
    renderRoster();
    saveAllRosters(); // Save in new format after migration
};