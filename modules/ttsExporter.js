import * as state from './state.js';
import { categoryOrder } from './constants.js';
import { createUnitPartsCompositeImage } from './ui.js';
import { uploadImageToImgBB, uploadTextToGist } from './apiService.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Returns the TTS-compatible ID for a card.
 */
export function getTTSId(card) {
    if (!card) return null;
    if (card.id_watermelon02) return card.id_watermelon02;
    const id = card.id;
    return id !== undefined ? String(id).padStart(3, '0') : null;
}

/**
 * Returns the TTS-compatible Drop ID for a card.
 */
export function getDropId(card) {
    if (!card) return null;
    if (card.id_watermelon02) return card.id_watermelon02 + "-T";
    const id = parseInt(card.id);
    return !isNaN(id) ? String(id + 1).padStart(3, '0') : null;
}

/**
 * 유닛에서 프로젝타일 ID 목록을 추출합니다.
 */
function getProjectiles(card) {
    const projectiles = new Set();
    if (!card) return [];

    if (card.changes) {
        card.changes.forEach(fileName => {
            const subCard = state.allCards.byFileName.get(fileName);
            if (subCard) projectiles.add(getTTSId(subCard));
        });
    }
    if (card.resolvedSubCards) {
        card.resolvedSubCards.forEach(subCard => {
            projectiles.add(getTTSId(subCard));
        });
    }
    return Array.from(projectiles);
}

/**
 * 개별 메카(Mech) 데이터를 TTS 텍스트 라인으로 변환합니다.
 */
async function processMech(unit, index, total, onProgress) {
    const lines = [];
    if (!unit.Pilot) return lines;

    if (onProgress) onProgress(`이미지 합성 중... (유닛 ${index + 1}/${total})`);
    const canvas = await createUnitPartsCompositeImage(unit, 600);
    
    let imageUrl = 'https://example.com/placeholder.png';
    if (canvas) {
        if (index > 0) {
            if (onProgress) onProgress(`안전한 업로드를 위해 대기 중...`);
            await sleep(1500);
        }
        if (onProgress) onProgress(`이미지 업로드 중... (유닛 ${index + 1}/${total})`);
        imageUrl = await uploadImageToImgBB(canvas);
    }

    lines.push(`# Mech ${imageUrl}`);
    lines.push(`Pilot: ${getTTSId(unit.Pilot)}`);
    lines.push(`Torso: ${getTTSId(unit.Torso)}`);
    lines.push(`Chasis: ${getTTSId(unit.Chassis)}`);

    ['Left', 'Right'].forEach(side => {
        const card = unit[side];
        const id = getTTSId(card) || '';
        const dropId = card?.drop ? getDropId(card) : null;
        const suffix = dropId ? ` [throwIndex:${dropId}]` : '';
        lines.push(`${side}Arm: ${id}${suffix}`);
    });

    lines.push(`Backpack: ${getTTSId(unit.Back)}`);

    // 모든 파츠에서 프로젝타일 수집
    const allProjectiles = new Set();
    categoryOrder.forEach(cat => {
        getProjectiles(unit[cat]).forEach(p => allProjectiles.add(p));
    });

    if (allProjectiles.size > 0) {
        lines.push(`Projectile: ${Array.from(allProjectiles).join(',')}`);
    }

    lines.push(''); // 문단 구분
    return lines;
}

/**
 * 드론(Drone) 데이터를 TTS 텍스트 라인으로 변환합니다.
 */
function processDrone(drone) {
    const droneId = getTTSId(drone);
    if (!droneId) return [];

    const lines = [`# Drone ${droneId}`];
    const projectiles = new Set(getProjectiles(drone));
    
    if (drone.backCard) {
        projectiles.add(getTTSId(drone.backCard));
    }

    if (projectiles.size > 0) {
        lines.push(`Projectile: ${Array.from(projectiles).join(',')}`);
    }
    lines.push('');
    return lines;
}

/**
 * 전술 카드(Tactical Card) 데이터를 TTS 텍스트 라인으로 변환합니다.
 */
function processTacticalCard(card) {
    const cardId = getTTSId(card);
    return cardId ? [`# TacticCard ${cardId}`, ''] : [];
}

/**
 * 로스터를 TTS 형식으로 변환하고 Gist에 업로드합니다.
 */
export async function exportRosterToGist(roster, onProgress) {
    const output = [`# Team Faction: ${roster.faction || 'RDL'} Lang: en`, ''];

    // 1. 메카 처리
    const unitIds = Object.keys(roster.units);
    for (let i = 0; i < unitIds.length; i++) {
        const mechLines = await processMech(roster.units[unitIds[i]], i, unitIds.length, onProgress);
        output.push(...mechLines);
    }

    // 2. 드론 처리
    roster.drones.forEach(drone => {
        output.push(...processDrone(drone));
    });

    // 3. 전술 카드 처리
    roster.tacticalCards.forEach(card => {
        output.push(...processTacticalCard(card));
    });

    if (onProgress) onProgress('최종 Gist 업로드 중...');
    const filename = `tts_${Date.now()}.txt`;
    return await uploadTextToGist(output.join('\n'), filename);
}
