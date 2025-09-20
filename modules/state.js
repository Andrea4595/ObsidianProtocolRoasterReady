import { Roster } from './Roster.js';
import { renderRoster, updateRosterSelect } from './ui.js';
import { factionSelect } from './dom.js';
import { saveStateToStorage, loadStateFromStorage } from './storage.js';
import { loadAllCardData } from './dataLoader.js';
import { migrateRosters } from './migration.js';

// --- State Variables ---
export let allCards = { byCategory: {}, drones: [], tactical: [], byFileName: new Map() };
export let allRosters = {}; // This will store Roster instances
export let activeRosterName = '';
export let nextUnitId = 0;
export let nextDroneId = 0;
export let nextTacticalCardId = 0;
export let isGameMode = false;
export let gameRoster = {};

// --- Getters and Setters ---
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

export const saveCurrentState = () => {
    if (isGameMode) return;
    saveStateToStorage(allRosters, activeRosterName);
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
    saveCurrentState();
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
    saveCurrentState();
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

// --- Initialization ---

export const initializeApp = async () => {
    allCards = await loadAllCardData();
    const { savedRosters, savedActiveName } = loadStateFromStorage();

    if (savedRosters && Object.keys(savedRosters).length > 0) {
        const rostersToDeserialize = migrateRosters(savedRosters);
        const deserializedRosters = {};
        for (const rosterName in rostersToDeserialize) {
            deserializedRosters[rosterName] = Roster.deserialize(rosterName, rostersToDeserialize[rosterName], allCards.byFileName);
        }
        allRosters = deserializedRosters;
        activeRosterName = savedActiveName && allRosters[savedActiveName] ? savedActiveName : Object.keys(allRosters)[0];
    } else {
        activeRosterName = '기본 로스터';
        allRosters[activeRosterName] = createNewRoster(activeRosterName);
    }

    factionSelect.value = getActiveRoster().faction || 'RDL';
    calculateNextIds();
    updateRosterSelect();
    renderRoster();
    saveCurrentState(); // Save in new format after migration
};
