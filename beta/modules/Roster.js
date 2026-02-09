export class Roster {
    constructor({ name, units = {}, drones = [], tacticalCards = [], faction = 'RDL' }) {
        this.name = name;
        this.units = units;
        this.drones = drones;
        this.tacticalCards = tacticalCards;
        this.faction = faction;
    }

    clear() {
        this.units = {};
        this.drones = [];
        this.tacticalCards = [];
    }

    serialize() {
        const serialized = { version: 2, faction: this.faction, units: {}, drones: [], tacticalCards: [] };

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

        serialized.drones = this.drones.map(drone => {
            if (!drone) return null;
            const droneData = { category: drone.category, name: drone.name };
            if (drone.backCard && drone.backCard.name) {
                droneData.backCard = {
                    category: drone.backCard.category,
                    name: drone.backCard.name
                };
            }
            return droneData;
        }).filter(Boolean);

        serialized.tacticalCards = this.tacticalCards.map(card => {
            return card ? { category: card.category, name: card.name } : null;
        }).filter(Boolean);

        return serialized;
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

            // Ensure rosterId is present for game mode tracking (will be assigned later if null)
            newCard.rosterId = newCard.rosterId !== undefined ? newCard.rosterId : null;

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
                } else {
                    units[unitId][category] = null;
                }
            }
        }

        const drones = (savedData.drones || []).map(item => {
            if (!item || !item.name) return null;
            
            const key = `${item.category}_${item.name}`;
            if (allCardsMap.has(key)) {
                let reconstructedDrone = applyRuntimeDefaults({ ...allCardsMap.get(key) }); // Apply defaults to the drone itself
                
                if (item.backCard && item.backCard.name) {
                    const backKey = `${item.backCard.category}_${item.backCard.name}`;
                    if (allCardsMap.has(backKey)) {
                        reconstructedDrone.backCard = applyRuntimeDefaults({ ...allCardsMap.get(backKey) }); // Apply defaults to the backCard
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
            return applyRuntimeDefaults(baseCard); // Apply defaults to tactical cards
        }).filter(Boolean);

        return new Roster({
            name,
            units,
            drones,
            tacticalCards,
            faction: savedData.faction || 'RDL'
        });
    }
}
