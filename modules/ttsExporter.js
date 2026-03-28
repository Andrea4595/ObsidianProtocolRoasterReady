import * as state from './state.js';
import { categoryOrder } from './constants.js';
import { createUnitPartsCompositeImage } from './ui.js';
import { uploadImageToImgBB, uploadTextToGist } from './apiService.js';

/**
 * Returns the TTS-compatible ID for a card.
 */
export function getTTSId(card) {
    if (!card) return null;
    if (card.id_watermelon02) return card.id_watermelon02;
    const id = card.id;
    if (id === undefined) return null;
    return String(id).padStart(3, '0');
}

/**
 * Returns the TTS-compatible Drop ID for a card.
 */
export function getDropId(card) {
    if (!card) return null;
    if (card.id_watermelon02) return card.id_watermelon02 + "-T";
    const id = parseInt(card.id);
    if (isNaN(id)) return null;
    return String(id + 1).padStart(3, '0');
}

/**
 * Generates the full TTS roster text content and uploads it to Gist.
 * @param {object} roster 
 * @param {function} onProgress Callback for status updates
 * @returns {Promise<string>} The Raw Gist URL
 */
export async function exportRosterToGist(roster, onProgress) {
    let ttsContent = `# Team Faction: ${roster.faction || 'RDL'} Lang: en\n\n`;

    // Process Mechs
    for (const unitId in roster.units) {
        const unit = roster.units[unitId];
        if (!unit.Pilot) continue;

        if (onProgress) onProgress(`이미지 합성 중... (유닛 ${unitId})`);
        const canvas = await createUnitPartsCompositeImage(unit, 600);
        let imageUrl = 'https://example.com/placeholder.png';
        if (canvas) {
            if (onProgress) onProgress(`이미지 업로드 중... (유닛 ${unitId})`);
            imageUrl = await uploadImageToImgBB(canvas);
        }

        ttsContent += `# Mech ${imageUrl}\n`;
        ttsContent += `Pilot: ${getTTSId(unit.Pilot)}\n`;
        ttsContent += `Torso: ${getTTSId(unit.Torso)}\n`;
        ttsContent += `Chasis: ${getTTSId(unit.Chassis)}\n`;

        const leftArmId = getTTSId(unit.Left);
        const leftDropId = unit.Left?.drop ? getDropId(unit.Left) : null;
        ttsContent += `LeftArm: ${leftArmId || ''}${leftDropId ? ` [throwIndex:${leftDropId}]` : ''}\n`;

        const rightArmId = getTTSId(unit.Right);
        const rightDropId = unit.Right?.drop ? getDropId(unit.Right) : null;
        ttsContent += `RightArm: ${rightArmId || ''}${rightDropId ? ` [throwIndex:${rightDropId}]` : ''}\n`;

        ttsContent += `Backpack: ${getTTSId(unit.Back)}\n`;

        // Projectiles (Changes and SubCards)
        const projectiles = [];
        categoryOrder.forEach(cat => {
            const card = unit[cat];
            if (card) {
                if (card.changes) {
                    card.changes.forEach(fileName => {
                        const subCard = state.allCards.byFileName.get(fileName);
                        if (subCard) projectiles.push(getTTSId(subCard));
                    });
                }
                if (card.resolvedSubCards) {
                    card.resolvedSubCards.forEach(subCard => {
                        projectiles.push(getTTSId(subCard));
                    });
                }
            }
        });

        if (projectiles.length > 0) {
            ttsContent += `Projectile: ${Array.from(new Set(projectiles)).join(',')}\n`;
        }
        ttsContent += `\n`;
    }

    // Process Drones
    for (const drone of roster.drones) {
        const droneId = getTTSId(drone);
        if (!droneId) continue;

        ttsContent += `# Drone ${droneId}\n`;
        
        const projectiles = [];
        if (drone.resolvedSubCards) {
            drone.resolvedSubCards.forEach(subCard => {
                projectiles.push(getTTSId(subCard));
            });
        }
        if (drone.backCard) {
            projectiles.push(getTTSId(drone.backCard));
        }

        if (projectiles.length > 0) {
            ttsContent += `Projectile: ${Array.from(new Set(projectiles)).join(',')}\n`;
        }
        ttsContent += `\n`;
    }

    // Process Tactical Cards
    for (const card of roster.tacticalCards) {
        const cardId = getTTSId(card);
        if (cardId) {
            ttsContent += `# TacticCard ${cardId}\n\n`;
        }
    }

    if (onProgress) onProgress('Gist 업로드 중...');
    const filename = `tts_${Date.now()}.txt`;
    return await uploadTextToGist(ttsContent, filename);
}
