export const appTitle = document.getElementById('app-title');
export const unitsContainer = document.getElementById('units-container');

const dronesContainerElement = document.createElement('div');
dronesContainerElement.id = 'drones-container';
unitsContainer.after(dronesContainerElement);
export const dronesContainer = dronesContainerElement;

const tacticalCardsContainerElement = document.createElement('div');
tacticalCardsContainerElement.id = 'tactical-cards-container';
dronesContainerElement.after(tacticalCardsContainerElement);
export const tacticalCardsContainer = tacticalCardsContainerElement;



export const totalPointsSpan = document.getElementById('total-points');
export const rosterSelect = document.getElementById('roster-select');
export const renameRosterBtn = document.getElementById('rename-roster-btn');
export const deleteRosterBtn = document.getElementById('delete-roster-btn');
export const exportImageBtn = document.getElementById('export-image-btn');
export const gameModeBtn = document.getElementById('game-mode-btn');
export const exitGameModeBtn = document.getElementById('exit-game-mode-btn');
export const addUnitButton = document.getElementById('add-unit-button');
export const addDroneButton = document.getElementById('add-drone-button');
export const addTacticalCardButton = document.getElementById('add-tactical-card-button');
export const modalOverlay = document.getElementById('modal-overlay');
export const modalClose = document.getElementById('modal-close');
export const modalTitle = document.getElementById('modal-title');
export const modalImageContainer = document.getElementById('modal-image-container');
export const rosterControls = document.getElementById('roster-controls');
export const rosterSummary = document.getElementById('roster-summary');
export const rosterSummaryPlaceholder = document.getElementById('roster-summary-placeholder');
export const gameModeHeader = document.getElementById('game-mode-header');
export const addButtonContainer = document.querySelector('.add-button-container');
export const factionSelect = document.getElementById('faction-select');

// Roster Code Modal Elements
export const rosterCodeBtn = document.getElementById('roster-code-btn');
export const rosterCodeModal = document.getElementById('roster-code-modal');
export const rosterCodeModalClose = document.getElementById('roster-code-modal-close');
export const rosterCodeModalTitle = document.getElementById('roster-code-modal-title');
export const rosterCodeExportContainer = document.getElementById('roster-code-export-container');
export const rosterCodeDisplay = document.getElementById('roster-code-display');
export const copyRosterCodeBtn = document.getElementById('copy-roster-code-btn');
export const rosterCodeImportContainer = document.getElementById('roster-code-import-container');
export const rosterCodeInput = document.getElementById('roster-code-input');
export const importRosterBtn = document.getElementById('import-roster-btn');

// Image Export Settings Modal Elements
export const imageExportSettingsModal = document.getElementById('image-export-settings-modal');
export const imageExportSettingsClose = document.getElementById('image-export-settings-close');
export const imageExportSettingsForm = document.getElementById('image-export-settings-form');
export const generateImageBtn = document.getElementById('generate-image-btn');
export const cancelExportBtn = document.getElementById('cancel-export-btn');
export const settingRevealHiddenRow = document.getElementById('setting-reveal-hidden-row');