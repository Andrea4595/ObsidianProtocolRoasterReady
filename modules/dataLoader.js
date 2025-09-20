export async function loadAllCardData() {
    const allCards = { byCategory: {}, drones: [], tactical: [], byFileName: new Map() };
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
    return allCards;
}