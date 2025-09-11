const fs = require('fs');
const path = require('path');

const cardsDirectory = path.join(__dirname, 'Cards');
const outputFilePath = path.join(__dirname, 'image-list.json');
const categories = ['Back', 'Chassis', 'Drone', 'Left', 'Pilot', 'Projectile', 'Right', 'Torso'];

try {
    console.log('Starting to generate new image-list.json...');

    const allFilesByCategory = new Map();
    const allFileNames = new Set();

    // 1. Read all files from all category directories
    console.log('Reading files from category directories...');
    for (const category of categories) {
        const categoryDir = path.join(cardsDirectory, category);
        if (fs.existsSync(categoryDir)) {
            const files = fs.readdirSync(categoryDir);
            allFilesByCategory.set(category, files);
            files.forEach(file => allFileNames.add(file));
        }
    }
    console.log(`Found a total of ${allFileNames.size} files.`);

    const newData = [];

    // 2. Process each file based on the rules
    console.log('Processing files and applying rules...');
    for (const [category, files] of allFilesByCategory.entries()) {
        for (const fileName of files) {

            const cardData = {
                fileName: fileName,
                points: 0, // Default points
                category: category
            };

            // Rule: Set faction based on name
            if (fileName.includes('RDL')) {
                cardData.faction = 'RDL';
            } else if (fileName.includes('UN')) {
                cardData.faction = 'UN';
            } else if (fileName.includes('PL') || fileName.includes('WD')) {
                cardData.faction = 'Public';
            }

            // Rule: Add 'visible: false' to dropped cards
            if (fileName.includes('_Dropped')) {
                cardData.visible = false;
            }

            // Rule: Find corresponding '_Dropped' file for non-dropped cards
            else {
                const extension = path.extname(fileName);
                const baseName = path.basename(fileName, extension);
                
                let droppedFileName = null;
                if (baseName.endsWith('_Front')) {
                    const droppedBaseName = baseName.replace('_Front', '_Dropped');
                    const extensionsToTry = ['.png', '.jpg', '.jpeg'];
                    for (const ext of extensionsToTry) {
                        const potentialDroppedFile = droppedBaseName + ext;
                        if (allFileNames.has(potentialDroppedFile)) {
                            droppedFileName = potentialDroppedFile;
                            break; // Found a match
                        }
                    }
                }
                
                if (droppedFileName) {
                    cardData.drop = droppedFileName;
                }
            }

            newData.push(cardData);
        }
    }

    // 3. Sort and write the new JSON file
    console.log(`Processed ${newData.length} cards. Sorting and writing to file...`);
    newData.sort((a, b) => a.fileName.localeCompare(b.fileName));
    const content = JSON.stringify(newData, null, 4);
    fs.writeFileSync(outputFilePath, content, 'utf8');

    console.log(`✅ Success! image-list.json has been completely regenerated. Total items: ${newData.length}.`);

} catch (error) {
    console.error(`❌ Error: Could not generate the new image list.`, error);
}