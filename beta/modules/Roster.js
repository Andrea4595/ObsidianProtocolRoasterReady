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
        const serialized = { version: 1, faction: this.faction, units: {}, drones: [], tacticalCards: [] };

        for (const unitId in this.units) {
            const unit = this.units[unitId];
            serialized.units[unitId] = {};
            for (const category in unit) {
                if (unit[category]) {
                    serialized.units[unitId][category] = unit[category].fileName;
                }
            }
        }

        serialized.drones = this.drones.map(drone => {
            if (!drone) return null;
            if (drone.backCard && drone.backCard.fileName) {
                return { fileName: drone.fileName, backCardFileName: drone.backCard.fileName };
            }
            return drone.fileName;
        }).filter(Boolean);

        serialized.tacticalCards = this.tacticalCards.map(card => card ? card.fileName : null).filter(Boolean);

        return serialized;
    }

    static deserialize(name, savedData, allCardsMap) {
        const units = {};
        for (const unitId in savedData.units) {
            const savedUnit = savedData.units[unitId];
            units[unitId] = {};
            for (const category in savedUnit) {
                const fileName = savedUnit[category];
                units[unitId][category] = fileName && allCardsMap.has(fileName) ? { ...allCardsMap.get(fileName) } : null;
            }
        }

        const drones = (savedData.drones || []).map(item => {
            const mainFileName = typeof item === 'string' ? item : (item && item.fileName);
            const backCardFileName = item && item.backCardFileName;

            if (mainFileName && allCardsMap.has(mainFileName)) {
                const reconstructedDrone = { ...allCardsMap.get(mainFileName) };
                if (backCardFileName && allCardsMap.has(backCardFileName)) {
                    reconstructedDrone.backCard = { ...allCardsMap.get(backCardFileName) };
                }
                return reconstructedDrone;
            }
            return null;
        }).filter(Boolean);

        const tacticalCards = (savedData.tacticalCards || []).map(item => {
            const fileName = typeof item === 'string' ? item : (item && item.fileName);
            return fileName && allCardsMap.has(fileName) ? { ...allCardsMap.get(fileName) } : null;
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
