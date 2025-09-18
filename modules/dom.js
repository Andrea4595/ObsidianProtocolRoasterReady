export const appTitle = document.getElementById('app-title');
export const unitsContainer = document.getElementById('units-container');

const dronesContainerElement = document.createElement('div');
dronesContainerElement.id = 'drones-container';
dronesContainerElement.className = 'section-container';

const dronesTitle = document.createElement('h3');
dronesTitle.textContent = '드론';
dronesTitle.className = 'section-title';
dronesContainerElement.appendChild(dronesTitle);

const dronesCardsContainer = document.createElement('div');
dronesCardsContainer.className = 'cards-container';
dronesContainerElement.appendChild(dronesCardsContainer);

unitsContainer.after(dronesContainerElement);
export const dronesContainer = dronesCardsContainer;

const tacticalCardsContainerElement = document.createElement('div');
tacticalCardsContainerElement.id = 'tactical-cards-container';
tacticalCardsContainerElement.className = 'section-container';

const tacticalTitle = document.createElement('h3');
tacticalTitle.textContent = '전술카드';
tacticalTitle.className = 'section-title';
tacticalCardsContainerElement.appendChild(tacticalTitle);

const tacticalCardsCardsContainer = document.createElement('div');
tacticalCardsCardsContainer.className = 'cards-container';
tacticalCardsContainerElement.appendChild(tacticalCardsCardsContainer);

dronesContainerElement.after(tacticalCardsContainerElement);
export const tacticalCardsContainer = tacticalCardsCardsContainer;



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
export const gameModeHeader = document.getElementById('game-mode-header');
export const addButtonContainer = document.querySelector('.add-button-container');
export const factionSelect = document.getElementById('faction-select');
