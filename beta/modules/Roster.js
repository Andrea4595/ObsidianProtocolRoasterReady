export class Roster {
    constructor({ name, units = {}, drones = [], tacticalCards = [], faction = 'RDL' }) {
        this.name = name;
        this.units = units;
        this.drones = drones;
        this.tacticalCards = tacticalCards;
        this.faction = faction;
        this._nextUnitId = 0;
        this._nextDroneId = 0;
        this._nextTacticalCardId = 0;
    }

    clear() {
        this.units = {};
        this.drones = [];
        this.tacticalCards = [];
    }

    serialize() {
        const serialized = { 
            version: 2, 
            faction: this.faction, 
            units: {}, 
            drones: [], 
            tacticalCards: [],
            nextUnitId: this._nextUnitId,
            nextDroneId: this._nextDroneId,
            nextTacticalCardId: this._nextTacticalCardId,
        };

        for (const unitId in this.units) {
            const unit = this.units[unitId];
            serialized.units[unitId] = {};
            for (const category in unit) {
                if (unit[category]) {
                    serialized.units[unitId][category] = { 
                        category: unit[category].category,
                        name: unit[category].name 
                    };
                }
            }
        }

        // Serialize drones, ensuring rosterId is saved
        serialized.drones = this.drones.map(drone => {
            if (!drone) return null;
            const droneData = { 
                category: drone.category, 
                name: drone.name,
                rosterId: drone.rosterId // Save rosterId
            };
            if (drone.backCard && drone.backCard.name) {
                droneData.backCard = {
                    category: drone.backCard.category,
                    name: drone.backCard.name
                };
            }
            return droneData;
        }).filter(Boolean);

        // Serialize tacticalCards, ensuring rosterId is saved
        serialized.tacticalCards = this.tacticalCards.map(card => {
            if (!card) return null;
            return { 
                category: card.category, 
                name: card.name,
                rosterId: card.rosterId // Save rosterId
            };
        }).filter(Boolean);

        return serialized;
    }

    // Helper function for deserialize to calculate max ID
    static calculateMaxId(ids, defaultValue) {
        if (!Array.isArray(ids) || ids.length === 0) {
            return defaultValue;
        }
        const validIds = ids.filter(id => !isNaN(id));
        return validIds.length > 0 ? Math.max(...validIds) : defaultValue;
    }

    static deserialize(name, savedData, allCardsMap) {
        // Helper function to apply default runtime properties
        const applyRuntimeDefaults = (card) => {
            if (!card) return null;
            const newCard = { ...card }; // Start with a copy of the base card
            
            // Default game state properties if not already set (e.g., from a saved roster)
            newCard.cardStatus = newCard.cardStatus !== undefined ? newCard.cardStatus : 0; // 0 for healthy
            newCard.isDropped = newCard.isDropped !== undefined ? newCard.isDropped : false;
            newCard.isBlackbox = newCard.isBlackbox !== undefined ? newCard.isBlackbox : false;
            newCard.isCharged = newCard.isCharged !== undefined ? newCard.isCharged : false;

            // Resource properties (current value defaults to max if not explicitly set)
            if (newCard.ammunition !== undefined) {
                newCard.currentAmmunition = newCard.currentAmmunition !== undefined ? newCard.currentAmmunition : newCard.ammunition;
            } else {
                newCard.currentAmmunition = newCard.currentAmmunition !== undefined ? newCard.currentAmmunition : 0;
            }

            if (newCard.intercept !== undefined) {
                newCard.currentIntercept = newCard.currentIntercept !== undefined ? newCard.currentIntercept : newCard.intercept;
            } else {
                newCard.currentIntercept = newCard.currentIntercept !== undefined ? newCard.currentIntercept : 0;
            }

            if (newCard.link !== undefined && newCard.category === 'Pilot') { // Only Pilot cards have 'link'
                newCard.currentLink = newCard.currentLink !== undefined ? newCard.currentLink : newCard.link;
            } else {
                newCard.currentLink = newCard.currentLink !== undefined ? newCard.currentLink : 0;
            }

            // rosterId will be assigned during deserialization or when added to roster,
            // not here, to allow for flexible handling of old save formats.

            return newCard;
        };


        const units = {};
        for (const unitId in savedData.units) {
            const savedUnit = savedData.units[unitId];
            units[unitId] = {};
            for (const category in savedUnit) {
                const item = savedUnit[category];
                if (item && item.name) {
                    const key = `${item.category}_${item.name}`;
                    const baseCard = allCardsMap.has(key) ? { ...allCardsMap.get(key) } : null;
                    // Apply runtime defaults
                    units[unitId][category] = applyRuntimeDefaults(baseCard);
                    // No rosterId needed for unit parts, as unitId is the instance identifier
                } else {
                    units[unitId][category] = null;
                }
            }
        }

        let tempDroneRosterIdCounter = 0; // Temporary counter for old saves
        let tempTacticalCardRosterIdCounter = 0; // Temporary counter for old saves

        const drones = (savedData.drones || []).map(item => {
            if (!item || !item.name) return null;
            
            const key = `${item.category}_${item.name}`;
            if (allCardsMap.has(key)) {
                let reconstructedDrone = applyRuntimeDefaults({ ...allCardsMap.get(key) });
                
                // Assign rosterId if it's missing (for old saves) or use saved one
                reconstructedDrone.rosterId = item.rosterId !== undefined ? item.rosterId : `Drone_${tempDroneRosterIdCounter++}`;

                if (item.backCard && item.backCard.name) {
                    const backKey = `${item.backCard.category}_${item.backCard.name}`;
                    if (allCardsMap.has(backKey)) {
                        reconstructedDrone.backCard = applyRuntimeDefaults({ ...allCardsMap.get(backKey) });
                    }
                }
                return reconstructedDrone;
            }
            return null;
        }).filter(Boolean);

        const tacticalCards = (savedData.tacticalCards || []).map(item => {
            if (!item || !item.name) return null;
            const key = `${item.category}_${item.name}`;
            const baseCard = allCardsMap.has(key) ? { ...allCardsMap.get(key) } : null;
            let reconstructedCard = applyRuntimeDefaults(baseCard);

            // Assign rosterId if it's missing (for old saves) or use saved one
            reconstructedCard.rosterId = item.rosterId !== undefined ? item.rosterId : `Tactical_${tempTacticalCardRosterIdCounter++}`;
            return reconstructedCard;
        }).filter(Boolean);

        const roster = new Roster({
            name,
            units,
            drones,
            tacticalCards,
            faction: savedData.faction || 'RDL'
        });

        // Initialize nextId counters from saved data, or calculate for backward compatibility
        roster._nextUnitId = savedData.nextUnitId !== undefined ? savedData.nextUnitId : Roster.calculateMaxId(Object.keys(units).map(id => parseInt(id)), -1) + 1;
        roster._nextDroneId = savedData.nextDroneId !== undefined ? savedData.nextDroneId : Roster.calculateMaxId(drones.map(d => parseInt(d.rosterId.split('_')[1])), -1) + 1;
        roster._nextTacticalCardId = savedData.nextTacticalCardId !== undefined ? savedData.nextTacticalCardId : Roster.calculateMaxId(tacticalCards.map(tc => parseInt(tc.rosterId.split('_')[1])), -1) + 1;

        return roster;
    }
}