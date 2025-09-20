export const calculateUnitStats = (unitData) => {
    const stats = { electronic: 0, mobility: 0 };
    if (!unitData) return stats;

    for (const part of Object.values(unitData)) {
        if (part && part.cardStatus !== 2) { // 파괴되지 않은 부품만 계산
            stats.electronic += part.electronic || 0;

            if (part.isDropped && typeof part.dropMobility !== 'undefined') {
                stats.mobility += part.dropMobility;
            } else {
                stats.mobility += part.mobility || 0;
            }
        }
    }
    return stats;
};

export const isUnitOut = (unitData) => {
    if (!unitData) return false;

    // 1. 토르소 파괴 여부 확인 (즉시 파괴 조건)
    if (unitData.Torso && unitData.Torso.cardStatus === 2) {
        return true;
    }

    // 2. 남은 부품 수 확인
    let remainingPartsCount = 0;
    const relevantPartCategories = ['Torso', 'Chassis', 'Left', 'Right', 'Back'];

    for (const category of relevantPartCategories) {
        const part = unitData[category];
        // 부품이 존재하고, 파괴되지 않았으면 "남은 부품"으로 간주
        if (part && part.cardStatus !== 2) {
            remainingPartsCount++;
        }
    }

    return remainingPartsCount <= 2;
};
