import { categoryOrder } from './constants.js';
import { renderRoster, updateRosterSelect } from './ui.js';
import { factionSelect } from './dom.js';

// State Variables
export let allCards = { byCategory: {}, drones: [], byFileName: new Map() };
export let allRosters = {};
export let activeRosterName = '';
export let nextUnitId = 0;
export let nextDroneId = 0;
export let isGameMode = false;
export let gameRoster = {};

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

export function setGameMode(mode) {
    isGameMode = mode;
}

// Data & State Management
export const saveAllRosters = () => {
    if (isGameMode) return;
    localStorage.setItem('rosters', JSON.stringify(allRosters));
    localStorage.setItem('activeRosterName', activeRosterName);
};

export const getNewRosterState = () => ({ units: {}, drones: [], faction: 'RDL' });

export const calculateNextIds = () => {
    const rosterState = allRosters[activeRosterName];
    if (!rosterState) {
        nextUnitId = 0;
        nextDroneId = 0;
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
        const response = await fetch('image-list.json?v=' + new Date().getTime());
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const cardData = await response.json();
        
        categoryOrder.forEach(cat => allCards.byCategory[cat] = []);
        allCards.drones = [];
        
        cardData.forEach(card => {
            allCards.byFileName.set(card.fileName, card);
            if (card.category === "Drone") {
                allCards.drones.push(card);
            } 
            if (allCards.byCategory[card.category]) {
                allCards.byCategory[card.category].push(card);
            }
        });
    } catch (error) {
        console.error("Could not load image data:", error);
    }
}

const updateRostersData = (rosters, allCards) => {
    let wasUpdated = false;
    const updatedRosters = JSON.parse(JSON.stringify(rosters)); // Work on a deep copy

    Object.values(updatedRosters).forEach(roster => {
        if (!roster.faction) {
            roster.faction = 'RDL';
            wasUpdated = true;
        }
        Object.values(roster.units).forEach(unit => {
            Object.keys(unit).forEach(category => {
                const savedCard = unit[category];
                if (savedCard && allCards.byFileName.has(savedCard.fileName)) {
                    const masterCard = allCards.byFileName.get(savedCard.fileName);
                    const newCardData = { ...masterCard, ...savedCard };
                    if (JSON.stringify(newCardData) !== JSON.stringify(savedCard)) {
                        unit[category] = newCardData;
                        wasUpdated = true;
                    }
                }
            });
        });
        roster.drones.forEach((savedDrone, index) => {
            if (savedDrone && allCards.byFileName.has(savedDrone.fileName)) {
                const masterCard = allCards.byFileName.get(savedDrone.fileName);
                const newDroneData = { ...masterCard, ...savedDrone };
                if (JSON.stringify(newDroneData) !== JSON.stringify(savedDrone)) {
                    roster.drones[index] = newDroneData;
                    wasUpdated = true;
                }
            }
        });
    });

    return { updatedRosters, wasUpdated };
};

// Main App Initialization
export const initializeApp = async () => {
    await loadImageData();
    const savedRosters = JSON.parse(localStorage.getItem('rosters'));
    const savedActiveName = localStorage.getItem('activeRosterName');

    if (savedRosters && Object.keys(savedRosters).length > 0) {
        const migrationResult = updateRostersData(savedRosters, allCards);
        allRosters = migrationResult.updatedRosters;
        activeRosterName = savedActiveName && allRosters[savedActiveName] ? savedActiveName : Object.keys(allRosters)[0];
        
        if (migrationResult.wasUpdated) {
            console.log('Rosters updated with new data from image-list.json!');
            saveAllRosters();
        }
    } else {
        activeRosterName = '기본 로스터';
        allRosters[activeRosterName] = getNewRosterState();
    }

    factionSelect.value = allRosters[activeRosterName].faction || 'RDL';
    calculateNextIds();
    updateRosterSelect();
    renderRoster();
};