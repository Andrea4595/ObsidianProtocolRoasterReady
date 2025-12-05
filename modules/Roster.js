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
        const units = {};
        for (const unitId in savedData.units) {
            const savedUnit = savedData.units[unitId];
            units[unitId] = {};
            for (const category in savedUnit) {
                const item = savedUnit[category];
                if (item && item.name) {
                    const key = `${item.category}_${item.name}`;
                    units[unitId][category] = allCardsMap.has(key) ? { ...allCardsMap.get(key) } : null;
                } else {
                    units[unitId][category] = null;
                }
            }
        }

        const drones = (savedData.drones || []).map(item => {
            if (!item || !item.name) return null;
            
            const key = `${item.category}_${item.name}`;
            if (allCardsMap.has(key)) {
                const reconstructedDrone = { ...allCardsMap.get(key) };
                if (item.backCard && item.backCard.name) {
                    const backKey = `${item.backCard.category}_${item.backCard.name}`;
                    if (allCardsMap.has(backKey)) {
                        reconstructedDrone.backCard = { ...allCardsMap.get(backKey) };
                    }
                }
                return reconstructedDrone;
            }
            return null;
        }).filter(Boolean);

        const tacticalCards = (savedData.tacticalCards || []).map(item => {
            if (!item || !item.name) return null;
            const key = `${item.category}_${item.name}`;
            return allCardsMap.has(key) ? { ...allCardsMap.get(key) } : null;
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
