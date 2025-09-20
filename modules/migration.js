const CURRENT_SAVE_VERSION = 1;

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

export function migrateRosters(savedRosters) {
    const migratedRosters = {};
    for (const rosterName in savedRosters) {
        let rosterData = savedRosters[rosterName];
        // Migration check: If 'version' is missing or not current, it's an old format
        if (!rosterData.version || rosterData.version < CURRENT_SAVE_VERSION) {
            console.warn(`Migrating old roster format for: ${rosterName}`);
            rosterData = migrateFromVersion0ToVersion1(rosterData);
        }
        migratedRosters[rosterName] = rosterData;
    }
    return migratedRosters;
}