import { Roster } from './Roster.js';
import { renderRoster, updateRosterSelect } from './ui.js';
import { factionSelect } from './dom.js';

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
        for (const rosterName in savedRosters) {
            allRosters[rosterName] = Roster.deserialize(rosterName, savedRosters[rosterName], allCards.byFileName);
        }
        activeRosterName = savedActiveName && allRosters[savedActiveName] ? savedActiveName : Object.keys(allRosters)[0];
    } else {
        activeRosterName = '기본 로스터';
        allRosters[activeRosterName] = createNewRoster(activeRosterName);
    }

    factionSelect.value = getActiveRoster().faction || 'RDL';
    calculateNextIds();
    updateRosterSelect();
    renderRoster();
    saveAllRosters(); // Save to migrate any old data format
};