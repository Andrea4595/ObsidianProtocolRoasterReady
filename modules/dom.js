/**
 * This module centralizes all DOM element references used by the application.
 * Using getters ensures that we always try to find the element in the current DOM,
 * which helps avoid null references due to timing or caching issues.
 */

const get = (id) => document.getElementById(id);

// App Layout & Main Containers
export const appTitle = get('app-title');
export const unitsContainer = get('units-container');

// These are dynamically inserted, so we handle them specially
let _dronesContainer = null;
export const getDronesContainer = () => {
    if (!_dronesContainer) {
        _dronesContainer = get('drones-container');
        if (!_dronesContainer && unitsContainer) {
            _dronesContainer = document.createElement('div');
            _dronesContainer.id = 'drones-container';
            unitsContainer.after(_dronesContainer);
        }
    }
    return _dronesContainer;
};
export const dronesContainer = getDronesContainer(); // For backward compatibility

let _tacticalCardsContainer = null;
export const getTacticalCardsContainer = () => {
    if (!_tacticalCardsContainer) {
        _tacticalCardsContainer = get('tactical-cards-container');
        if (!_tacticalCardsContainer && getDronesContainer()) {
            _tacticalCardsContainer = document.createElement('div');
            _tacticalCardsContainer.id = 'tactical-cards-container';
            getDronesContainer().after(_tacticalCardsContainer);
        }
    }
    return _tacticalCardsContainer;
};
export const tacticalCardsContainer = getTacticalCardsContainer(); // For backward compatibility

// Header & Controls
export const totalPointsSpan = get('total-points');
export const rosterSelect = get('roster-select');
export const renameRosterBtn = get('rename-roster-btn');
export const deleteRosterBtn = get('delete-roster-btn');
export const exportImageBtn = get('export-image-btn');
export const settingsBtn = get('settings-btn');
export const gameModeBtn = get('game-mode-btn');
export const exitGameModeBtn = get('exit-game-mode-btn');
export const addUnitButton = get('add-unit-button');
export const addDroneButton = get('add-drone-button');
export const addTacticalCardButton = get('add-tactical-card-button');
export const rosterControls = get('roster-controls');
export const rosterSummary = get('roster-summary');
export const rosterSummaryPlaceholder = get('roster-summary-placeholder');
export const gameModeHeader = get('game-mode-header');
export const addButtonContainer = document.querySelector('.add-button-container');
export const factionSelect = get('faction-select');

// Main Selection Modal
export const modalOverlay = get('modal-overlay');
export const modalClose = get('modal-close');
export const modalTitle = get('modal-title');
export const modalImageContainer = get('modal-image-container');

// Roster Code Modal
export const rosterCodeBtn = get('roster-code-btn');
export const rosterCodeModal = get('roster-code-modal');
export const rosterCodeModalClose = get('roster-code-modal-close');
export const rosterCodeModalTitle = get('roster-code-modal-title');
export const rosterCodeExportContainer = get('roster-code-export-container');
export const rosterCodeDisplay = get('roster-code-display');
export const copyRosterCodeBtn = get('copy-roster-code-btn');
export const downloadWatermelonJsonBtn = get('download-watermelon-json-btn');
export const exportTtsBtn = get('export-tts-btn');
export const rosterCodeImportContainer = get('roster-code-import-container');
export const rosterCodeInput = get('roster-code-input');
export const importRosterBtn = get('import-roster-btn');

// TTS Modal
export const ttsModal = get('tts-modal');
export const ttsModalClose = get('tts-modal-close');
export const ttsModalTitle = get('tts-modal-title');
export const ttsCommandDisplay = get('tts-command-display');
export const copyTtsCommandBtn = get('copy-tts-command-btn');

// Image Export Settings Modal
export const imageExportSettingsModal = get('image-export-settings-modal');
export const imageExportSettingsClose = get('image-export-settings-close');
export const imageExportSettingsForm = get('image-export-settings-form');
export const generateImageBtn = get('generate-image-btn');
export const cancelExportBtn = get('cancel-export-btn');
export const settingShowUnitCompositeExport = get('setting-show-unit-composite');
export const settingRevealHiddenRow = get('setting-reveal-hidden-row');

// General Settings Modal
export const settingsModal = get('settings-modal');
export const settingsClose = get('settings-close');
export const generalSettingsForm = get('general-settings-form');
export const settingShowUnitCompositeImageRoster = get('setting-show-unit-composite-image-roster');
export const settingShowUnitCompositeImageGame = get('setting-show-unit-composite-image-game');
