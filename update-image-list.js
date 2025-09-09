const fs = require('fs');
const path = require('path');

const cardsDirectory = path.join(__dirname, 'Cards');
const outputFilePath = path.join(__dirname, 'image-list.json');
const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

try {
    console.log(`Scanning for images in "${cardsDirectory}"...`);

    // 1. Read existing data to preserve points
    let existingData = new Map();
    if (fs.existsSync(outputFilePath)) {
        try {
            const oldContent = fs.readFileSync(outputFilePath, 'utf8');
            const oldJson = JSON.parse(oldContent);
            if (Array.isArray(oldJson)) {
                // Handle both old (string array) and new (object array) formats
                oldJson.forEach(item => {
                    if (typeof item === 'string') {
                        existingData.set(item, { fileName: item, points: 0 });
                    } else if (item && typeof item.fileName === 'string') {
                        existingData.set(item.fileName, item);
                    }
                });
            }
        } catch (e) {
            console.warn('Could not parse existing image-list.json. Starting fresh.', e);
        }
    }

    // 2. Read current files on disk
    const filesOnDisk = fs.readdirSync(cardsDirectory).filter(file => {
        const extension = path.extname(file).toLowerCase();
        return imageExtensions.includes(extension);
    });

    // 3. Merge old and new data
    const newData = [];
    const categories = ["Torso", "Chassis", "Left", "Right", "Back", "Drone", "Projectile", "Pilot"];
    const getCategoryFromFile = (fileName) => {
        for (const category of categories) {
            if (fileName.includes(category)) {
                return category;
            }
        }
        return "Unknown"; // Default category if none found
    };

    for (const fileName of filesOnDisk) {
        let entry = existingData.get(fileName);
        if (entry) {
            // If entry exists but lacks category, add it.
            if (!entry.category) {
                entry.category = getCategoryFromFile(fileName);
            }
            newData.push(entry); // Preserve existing data
        } else {
            // Add new file with default points and detected category
            newData.push({
                fileName: fileName,
                points: 0,
                category: getCategoryFromFile(fileName)
            });
        }
    }

    // Sort alphabetically for consistent order
    newData.sort((a, b) => a.fileName.localeCompare(b.fileName));

    // 4. Write back to the file
    const content = JSON.stringify(newData, null, 4); // Pretty print JSON
    fs.writeFileSync(outputFilePath, content, 'utf8');

    console.log(`✅ Success! image-list.json has been updated. Total items: ${newData.length}.`);

} catch (error) {
    console.error(`❌ Error: Could not update image list.`, error);
}