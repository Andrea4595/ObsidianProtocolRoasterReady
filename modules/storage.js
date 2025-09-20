export function saveStateToStorage(rosters, activeRosterName) {
    const savableRosters = {};
    for (const rosterName in rosters) {
        savableRosters[rosterName] = rosters[rosterName].serialize();
    }
    localStorage.setItem('rosters', JSON.stringify(savableRosters));
    localStorage.setItem('activeRosterName', activeRosterName);
}

export function loadStateFromStorage() {
    const savedRostersRaw = localStorage.getItem('rosters');
    const savedActiveName = localStorage.getItem('activeRosterName');
    
    const savedRosters = savedRostersRaw ? JSON.parse(savedRostersRaw) : null;

    return { savedRosters, savedActiveName };
}
