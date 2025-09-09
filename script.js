document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const appTitle = document.getElementById('app-title');
    const unitsContainer = document.getElementById('units-container');
    const dronesContainer = document.createElement('div');
    dronesContainer.style.display = 'flex';
    dronesContainer.style.flexWrap = 'wrap';
    dronesContainer.style.justifyContent = 'center';
    dronesContainer.style.gap = '20px';
    dronesContainer.style.alignItems = 'flex-start';
    dronesContainer.style.marginTop = '20px';
    dronesContainer.style.width = '90%';
    dronesContainer.style.marginLeft = 'auto';
    dronesContainer.style.marginRight = 'auto';
    const totalPointsSpan = document.getElementById('total-points');
    const rosterSelect = document.getElementById('roster-select');
    const renameRosterBtn = document.getElementById('rename-roster-btn');
    const deleteRosterBtn = document.getElementById('delete-roster-btn');
    const exportImageBtn = document.getElementById('export-image-btn');
    const gameModeBtn = document.getElementById('game-mode-btn');
    const exitGameModeBtn = document.getElementById('exit-game-mode-btn');
    const addUnitButton = document.getElementById('add-unit-button');
    const addDroneButton = document.getElementById('add-drone-button');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalClose = document.getElementById('modal-close');
    const modalTitle = document.getElementById('modal-title');
    const modalImageContainer = document.getElementById('modal-image-container');
    const rosterControls = document.getElementById('roster-controls');
    const rosterSummary = document.getElementById('roster-summary');
    const gameModeHeader = document.getElementById('game-mode-header');
    const addButtonContainer = document.querySelector('.add-button-container');
    const factionSelect = document.getElementById('faction-select');

    // App State
    const categoryOrder = ["Pilot", "Torso", "Chassis", "Left", "Right", "Back"];
    const allCards = { byCategory: {}, drones: [], byFileName: new Map() };
    let allRosters = {};
    let activeRosterName = '';
    let nextUnitId = 0;
    let nextDroneId = 0;
    let html2canvasLoaded = false;
    let isGameMode = false;
    let gameRosterState = {}; // In-memory state for game mode

    // Setup
    dronesContainer.id = 'drones-container';
    unitsContainer.after(dronesContainer);

    // --- Data & State Management ---
    const saveAllRosters = () => {
        if (isGameMode) return;
        localStorage.setItem('rosters', JSON.stringify(allRosters));
        localStorage.setItem('activeRosterName', activeRosterName);
    };

    const getNewRosterState = () => ({ units: {}, drones: [], faction: 'RDL' });

    const updateTotalPoints = () => {
        const rosterState = allRosters[activeRosterName];
        if (!rosterState) return 0;
        let total = 0;
        Object.values(rosterState.units).forEach(unit => {
            Object.values(unit).forEach(card => {
                if (card) total += card.points || 0;
            });
        });
        rosterState.drones.forEach(drone => {
            if (drone) {
                total += drone.points || 0;
                if (drone.backCard) total += drone.backCard.points || 0;
            }
        });
        totalPointsSpan.textContent = total;
        return total;
    };

    // --- Game Mode Logic ---
    const advanceCardStatus = (card, unit) => {
        if (!card) return;
        let currentStatus = card.cardStatus || 0;
        
        let hasFrame = card.frame === true;
        // Special rule for '앙세르' pilot
        if (unit && card.category === 'Chassis') {
            const pilot = unit.Pilot;
            if (pilot && pilot.special && pilot.special.includes('chassis_have_frame')) {
                hasFrame = true;
            }
        }

        const isDrone = card.category === 'Drone';

        if (isDrone) {
            if (currentStatus === 0) { card.cardStatus = hasFrame ? 1 : 2; }
            else if (currentStatus === 1) { card.cardStatus = 2; }
            else if (currentStatus === 2) { card.cardStatus = 0; }
        } else {
            if (currentStatus === 0) { card.cardStatus = hasFrame ? 1 : 2; }
            else if (currentStatus === 1) { card.cardStatus = 2; }
            else if (currentStatus === 2) { card.cardStatus = 3; }
            else if (currentStatus === 3) { card.cardStatus = 0; }
        }
        renderRoster();
    };

    // --- View & Mode Management ---
    const setGameMode = (enabled) => {
        isGameMode = enabled;
        rosterControls.style.display = enabled ? 'none' : 'flex';
        rosterSummary.style.display = enabled ? 'none' : 'block';
        gameModeHeader.style.display = enabled ? 'block' : 'none';
        addButtonContainer.style.display = enabled ? 'none' : 'flex';
        appTitle.textContent = enabled ? activeRosterName : '로스터';
        appTitle.style.display = enabled ? 'block' : 'none';

        if (enabled) {
            gameRosterState = JSON.parse(JSON.stringify(allRosters[activeRosterName]));
            Object.values(gameRosterState.units).forEach(unit => {
                Object.values(unit).forEach(card => {
                    if (!card) return;
                    card.cardStatus = 0;
                    if (card.ammunition > 0) card.currentAmmunition = card.ammunition;
                    if (card.intercept > 0) card.currentIntercept = card.intercept;
                    if (card.charge) card.isCharged = false;
                });
            });
            gameRosterState.drones.forEach(drone => {
                drone.cardStatus = 0;
                if (drone.ammunition > 0) drone.currentAmmunition = drone.ammunition;
                if (drone.intercept > 0) drone.currentIntercept = drone.intercept;
                if (drone.charge) drone.isCharged = false;

                if (drone.backCard) {
                    const backCard = drone.backCard;
                    backCard.cardStatus = 0;
                    if (backCard.ammunition > 0) backCard.currentAmmunition = backCard.ammunition;
                    if (backCard.intercept > 0) backCard.currentIntercept = backCard.intercept;
                    if (backCard.charge) backCard.isCharged = false;
                }
            });
        } else {
            gameRosterState = {};
        }
        renderRoster();
    };

    const performActionAndPreserveScroll = (action, eventTarget) => {
        // 1. Save all scroll positions
        const allUnitRows = document.querySelectorAll('.unit-row');
        const unitScrolls = Array.from(allUnitRows).map(row => ({
            id: row.parentElement.dataset.unitId,
            scrollLeft: row.scrollLeft
        }));
        const windowScroll = {
            y: window.scrollY,
            x: window.scrollX
        };

        // 2. Perform the state-changing action
        action();

        // 3. Re-render the entire view
        renderRoster();

        // 4. Restore all scroll positions after render
        requestAnimationFrame(() => {
            // Restore unit scrolls
            unitScrolls.forEach(scrollInfo => {
                if (scrollInfo.id) {
                    const newUnitRow = document.querySelector(`.unit-entry[data-unit-id='${scrollInfo.id}'] .unit-row`);
                    if (newUnitRow) {
                        newUnitRow.scrollLeft = scrollInfo.scrollLeft;
                    }
                }
            });

            // Restore window scroll
            window.scrollTo(windowScroll.x, windowScroll.y);
        });
    };

    // --- Roster Rendering ---
    const renderRoster = () => {
        unitsContainer.innerHTML = '';
        dronesContainer.innerHTML = '';
        document.querySelectorAll('.sub-cards-container').forEach(el => el.remove());
        nextUnitId = 0;
        nextDroneId = 0;

        const rosterState = isGameMode ? gameRosterState : allRosters[activeRosterName];
        if (!rosterState) return;

        // Render Units
        Object.keys(rosterState.units).forEach(unitId => {
            createUnitElement(parseInt(unitId), rosterState.units[unitId]);
        });

        // Render Drones
        rosterState.drones.forEach((droneData, index) => {
            if (droneData.rosterId == null) droneData.rosterId = `d-${index}`;
            addDroneElement(droneData);
        });

        // Render All Sub-Cards at the bottom
        if (isGameMode) {
            const unitSubCards = Object.values(rosterState.units).flatMap(unit => Object.values(unit).filter(Boolean).flatMap(p => p.subCards || []));
            const droneSubCards = rosterState.drones.flatMap(d => d.subCards || []);
            const allSubCardNames = [...unitSubCards, ...droneSubCards];
            const uniqueSubCardNames = [...new Set(allSubCardNames)];

            if (uniqueSubCardNames.length > 0) {
                const container = document.createElement('div');
                container.className = 'sub-cards-container';
                
                

                uniqueSubCardNames.forEach(fileName => {
                    const cardData = allCards.byFileName.get(fileName);
                    if (cardData) {
                        container.appendChild(createCardElement(cardData, false));
                    }
                });
                // Append after the drones container
                dronesContainer.after(container);
            }
        }

        if (!isGameMode) {
            updateTotalPoints();
        }
    };

    const updateRosterSelect = () => {
        rosterSelect.innerHTML = '';
        Object.keys(allRosters).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            if (name === activeRosterName) option.selected = true;
            rosterSelect.appendChild(option);
        });

        const newRosterOption = document.createElement('option');
        newRosterOption.value = '__NEW__';
        newRosterOption.textContent = '< 새 로스터 추가 >';
        rosterSelect.appendChild(newRosterOption);
    };

    const switchActiveRoster = (rosterName) => {
        if (!allRosters[rosterName] || isGameMode) return;
        activeRosterName = rosterName;
        factionSelect.value = allRosters[activeRosterName].faction || 'RDL';
        renderRoster();
        updateRosterSelect();
        saveAllRosters();
    };

    // --- Main App Initialization ---
    const initializeApp = async () => {
        await loadImageData();
        const savedRosters = JSON.parse(localStorage.getItem('rosters'));
        const savedActiveName = localStorage.getItem('activeRosterName');

        if (savedRosters && Object.keys(savedRosters).length > 0) {
            allRosters = savedRosters;
            activeRosterName = savedActiveName && allRosters[savedActiveName] ? savedActiveName : Object.keys(allRosters)[0];
        } else {
            activeRosterName = '기본 로스터';
            allRosters[activeRosterName] = getNewRosterState();
        }

        let rostersUpdated = false;
        Object.values(allRosters).forEach(roster => {
            if (!roster.faction) {
                roster.faction = 'RDL';
                rostersUpdated = true;
            }
            Object.values(roster.units).forEach(unit => {
                Object.keys(unit).forEach(category => {
                    const savedCard = unit[category];
                    if (savedCard && allCards.byFileName.has(savedCard.fileName)) {
                        const masterCard = allCards.byFileName.get(savedCard.fileName);
                        const newCardData = { ...savedCard, ...masterCard };
                        if (JSON.stringify(newCardData) !== JSON.stringify(savedCard)) {
                            unit[category] = newCardData;
                            rostersUpdated = true;
                        }
                    }
                });
            });
            roster.drones.forEach((savedDrone, index) => {
                if (savedDrone && allCards.byFileName.has(savedDrone.fileName)) {
                    const masterCard = allCards.byFileName.get(savedDrone.fileName);
                    const newDroneData = { ...masterCard, ...savedDrone };
                    if (JSON.stringify(newDroneData) !== JSON.stringify(savedDrone)) {
                        roster.drones[index] = newDroneData;
                        rostersUpdated = true;
                    }
                }
            });
        });

        if (rostersUpdated) {
            console.log('Rosters updated with new data from image-list.json!');
            saveAllRosters();
        }

        updateRosterSelect();
        renderRoster();
    };

    async function loadImageData() {
        try {
            const response = await fetch('image-list.json?v=' + new Date().getTime());
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const cardData = await response.json();
            categoryOrder.forEach(cat => allCards.byCategory[cat] = []);
            cardData.forEach(card => {
                allCards.byFileName.set(card.fileName, card);
                if (card.category === "Drone") allCards.drones.push(card);
                else if (allCards.byCategory[card.category]) allCards.byCategory[card.category].push(card);
            });
        } catch (error) {
            console.error("Could not load image data:", error);
        }
    }

    // --- UI Element Creation ---
    const createResourceTracker = (cardData, resourceType) => {
        const maxCount = cardData[resourceType];
        const container = document.createElement('div');
        container.className = 'resource-container';
        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.gap = '4px';
        container.style.justifyContent = 'center';
        container.style.maxWidth = '180px';
        container.style.marginTop = '5px';

        const currentProp = `current${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`;
        const iconFileName = resourceType;

        for (let i = 1; i <= maxCount; i++) {
            const icon = document.createElement('img');
            icon.className = 'resource-icon';
            icon.style.width = '24px';
            icon.style.height = '24px';
            icon.style.cursor = 'pointer';
            icon.src = i <= cardData[currentProp] ? `icons/${iconFileName}_on.png` : `icons/${iconFileName}_off.png`;
            icon.dataset.index = i;

            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const clickedIndex = i;
                cardData[currentProp] = (cardData[currentProp] === clickedIndex) ? clickedIndex - 1 : clickedIndex;
                const allIcons = container.querySelectorAll('.resource-icon');
                allIcons.forEach(ic => {
                    const iconIndex = parseInt(ic.dataset.index);
                    ic.src = iconIndex <= cardData[currentProp] ? `icons/${iconFileName}_on.png` : `icons/${iconFileName}_off.png`;
                });
            });
            container.appendChild(icon);
        }
        return container;
    };

    const createCardElement = (cardData, isInteractive = true) => {
        const mainContainer = document.createElement('div');
        mainContainer.style.display = 'flex';
        mainContainer.style.gap = '0px';
        mainContainer.style.alignItems = 'flex-start';

        const wrapper = document.createElement('div');
        wrapper.className = 'card-wrapper';

        const card = document.createElement('div');
        card.className = 'drone-card'; // Re-use drone-card style for simplicity
        card.style.position = 'relative';

        if (isGameMode) {
            const isDestroyed = isInteractive && cardData.cardStatus === 2;
            const img = document.createElement('img');
            img.src = `Cards/${cardData.isDropped ? cardData.drop : cardData.fileName}`;
            if (isDestroyed) {
                img.style.filter = 'brightness(50%)';
            }
            card.appendChild(img);

            if (isInteractive) {
                let tokenSrc = null;
                const isDrone = cardData.category === 'Drone';
                if (cardData.cardStatus === 1) tokenSrc = isDrone ? 'icons/warning_drone.png' : 'icons/warning.png';
                if (cardData.cardStatus === 2) tokenSrc = isDrone ? 'icons/destroyed_drone.png' : 'icons/destroyed.png';
                if (cardData.cardStatus === 3 && !isDrone) tokenSrc = 'icons/repaired.png';

                if (tokenSrc) {
                    const tokenImg = document.createElement('img');
                    tokenImg.className = 'status-token';
                    tokenImg.src = tokenSrc;
                    card.appendChild(tokenImg);
                }
            }
        } else {
            const img = document.createElement('img');
            img.src = `Cards/${cardData.fileName}`;
            card.appendChild(img);
            const points = document.createElement('div');
            points.className = 'card-points';
            points.textContent = cardData.points || 0;
            card.appendChild(points);

            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-drone-button';
            deleteButton.textContent = '-';
            deleteButton.addEventListener('click', () => {
                allRosters[activeRosterName].drones = allRosters[activeRosterName].drones.filter(d => d.rosterId !== cardData.rosterId);
                renderRoster();
                saveAllRosters();
            });
            card.appendChild(deleteButton);
        }
        wrapper.appendChild(card);

        if (isGameMode && isInteractive) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => advanceCardStatus(cardData));

            const tokenArea = document.createElement('div');
            tokenArea.className = 'token-area';
            if (cardData.ammunition > 0) tokenArea.appendChild(createResourceTracker(cardData, 'ammunition'));
            if (cardData.intercept > 0) tokenArea.appendChild(createResourceTracker(cardData, 'intercept'));
            if (cardData.charge) {
                const chargeTokenImg = document.createElement('img');
                chargeTokenImg.className = 'charge-token-img';
                chargeTokenImg.src = cardData.isCharged ? 'icons/charge_on.png' : 'icons/charge_off.png';
                chargeTokenImg.addEventListener('click', (e) => {
                    e.stopPropagation();
                    performActionAndPreserveScroll(() => {
                        cardData.isCharged = !cardData.isCharged;
                    }, e.target);
                });
                tokenArea.appendChild(chargeTokenImg);
            }
            wrapper.appendChild(tokenArea);

            const hasButton = (cardData.drop || (cardData.changes && cardData.changes.length > 0));
            if (hasButton) {
                const actionButtonWrapper = document.createElement('div');
                actionButtonWrapper.className = 'action-button-wrapper';

                if (cardData.drop) {
                    const dropButton = document.createElement('button');
                    dropButton.className = 'action-button drop-button';
                    dropButton.classList.toggle('dropped', cardData.isDropped === true);
                    dropButton.textContent = cardData.isDropped ? '버리기 취소' : '버리기';
                    dropButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        performActionAndPreserveScroll(() => {
                            cardData.isDropped = !cardData.isDropped;
                        }, e.target);
                    });
                    actionButtonWrapper.appendChild(dropButton);
                } else if (cardData.changes && cardData.changes.length > 0) {
                    const changeButton = document.createElement('button');
                    changeButton.className = 'action-button change-button';
                    changeButton.textContent = '변경';
                    changeButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        performActionAndPreserveScroll(() => {
                            const cycle = [cardData.fileName, ...(cardData.changes || [])];
                            const currentIndex = cycle.indexOf(cardData.fileName);
                            const nextIndex = (currentIndex + 1) % cycle.length;
                            const nextCardFileName = cycle[nextIndex];
                            const newCardData = allCards.byFileName.get(nextCardFileName);

                            if (!newCardData) return;

                            const propsToPreserve = {
                                cardStatus: cardData.cardStatus,
                                currentAmmunition: cardData.currentAmmunition,
                                currentIntercept: cardData.currentIntercept,
                                isDropped: cardData.isDropped,
                                rosterId: cardData.rosterId,
                            };

                            for (const key in cardData) {
                                delete cardData[key];
                            }
                            Object.assign(cardData, newCardData, propsToPreserve);
                        }, e.target);
                    });
                    actionButtonWrapper.appendChild(changeButton);
                }
                wrapper.insertBefore(actionButtonWrapper, card);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'action-button-placeholder';
                wrapper.insertBefore(placeholder, card);
            }
        }
        mainContainer.appendChild(wrapper);

        // --- FREIGHT_BACK LOGIC START ---
        const hasFreight = cardData.special && cardData.special.includes('freight_back');
        if (hasFreight) {
            const backCardData = cardData.backCard;
            const backCardWrapper = document.createElement('div');
            backCardWrapper.className = 'card-wrapper';

            const backSlot = document.createElement('div');
            backSlot.className = (isGameMode && backCardData) ? 'drone-card' : 'card-slot';
            backSlot.style.position = 'relative';

            if (backCardData) {
                const isDestroyed = isGameMode && backCardData.cardStatus === 2;
                const img = document.createElement('img');
                img.src = `Cards/${backCardData.isDropped ? backCardData.drop : backCardData.fileName}`;
                if (isDestroyed) img.style.filter = 'brightness(50%)';
                backSlot.appendChild(img);

                if (isGameMode) {
                    let tokenSrc = null;
                    if (backCardData.cardStatus === 1) tokenSrc = 'icons/warning.png';
                    if (backCardData.cardStatus === 2) tokenSrc = 'icons/destroyed.png';
                    if (backCardData.cardStatus === 3) tokenSrc = 'icons/repaired.png';

                    if (tokenSrc) {
                        const tokenImg = document.createElement('img');
                        tokenImg.className = 'status-token';
                        tokenImg.src = tokenSrc;
                        backSlot.appendChild(tokenImg);
                    }
                } else {
                    const points = document.createElement('div');
                    points.className = 'card-points';
                    points.textContent = backCardData.points || 0;
                    backSlot.appendChild(points);
                }
            } else {
                const label = document.createElement('span');
                label.className = 'slot-label';
                label.textContent = 'Back';
                backSlot.appendChild(label);
            }
            backCardWrapper.appendChild(backSlot);

            if (isGameMode && backCardData) {
                backSlot.style.cursor = 'pointer';
                backSlot.addEventListener('click', () => advanceCardStatus(backCardData));

                const tokenArea = document.createElement('div');
                tokenArea.className = 'token-area';
                if (backCardData.ammunition > 0) tokenArea.appendChild(createResourceTracker(backCardData, 'ammunition'));
                if (backCardData.intercept > 0) tokenArea.appendChild(createResourceTracker(backCardData, 'intercept'));
                if (backCardData.charge) { /* Add charge logic if needed */ }
                backCardWrapper.appendChild(tokenArea);

                // Action buttons for the back card
                const hasButton = (backCardData.drop || (backCardData.changes && backCardData.changes.length > 0));
                if (hasButton) {
                    const actionButtonWrapper = document.createElement('div');
                    actionButtonWrapper.className = 'action-button-wrapper';
                    if (backCardData.drop) {
                         const dropButton = document.createElement('button');
                        dropButton.className = 'action-button drop-button';
                        dropButton.classList.toggle('dropped', backCardData.isDropped === true);
                        dropButton.textContent = backCardData.isDropped ? '버리기 취소' : '버리기';
                        dropButton.addEventListener('click', (e) => {
                            e.stopPropagation();
                            performActionAndPreserveScroll(() => {
                                backCardData.isDropped = !backCardData.isDropped;
                            }, e.target);
                        });
                        actionButtonWrapper.appendChild(dropButton);
                    }
                    backCardWrapper.insertBefore(actionButtonWrapper, backSlot);
                } else {
                     const placeholder = document.createElement('div');
                    placeholder.className = 'action-button-placeholder';
                    backCardWrapper.insertBefore(placeholder, backSlot);
                }

            } else if (!isGameMode) {
                backSlot.style.cursor = 'pointer';
                backSlot.addEventListener('click', () => openModal(cardData.rosterId, 'Back', true));
            }
            mainContainer.appendChild(backCardWrapper);
        }
        // --- FREIGHT_BACK LOGIC END ---

        return mainContainer;
    };

    const createUnitElement = (unitId, unitData) => {
        const unitEntry = document.createElement('div');
        unitEntry.className = 'unit-entry';
        unitEntry.dataset.unitId = unitId;

        const unitRow = document.createElement('div');
        unitRow.className = 'unit-row';
        if (unitId >= nextUnitId) nextUnitId = unitId + 1;

        categoryOrder.forEach(category => {
            const cardData = unitData ? unitData[category] : null;
            const wrapper = document.createElement('div');
            wrapper.className = 'card-wrapper';

            const slot = document.createElement('div');
            slot.className = 'card-slot';
            
            if (cardData) {
                const isDestroyed = isGameMode && cardData.cardStatus === 2;
                const img = document.createElement('img');
                img.src = `Cards/${cardData.isDropped ? cardData.drop : cardData.fileName}`;
                if (isDestroyed) img.style.filter = 'brightness(50%)';
                slot.appendChild(img);

                if (!isGameMode) {
                    const points = document.createElement('div');
                    points.className = 'card-points';
                    points.textContent = cardData.points || 0;
                    slot.appendChild(points);
                } else {
                    let tokenSrc = null;
                    if (cardData.cardStatus === 1) tokenSrc = 'icons/warning.png';
                    if (cardData.cardStatus === 2) tokenSrc = 'icons/destroyed.png';
                    if (cardData.cardStatus === 3) tokenSrc = 'icons/repaired.png';

                    if (tokenSrc && category !== 'Pilot') {
                        const tokenImg = document.createElement('img');
                        tokenImg.className = 'status-token';
                        tokenImg.src = tokenSrc;
                        slot.appendChild(tokenImg);
                    }
                }
            } else {
                const label = document.createElement('span');
                label.className = 'slot-label';
                label.textContent = category;
                slot.appendChild(label);
            }
            wrapper.appendChild(slot);

            if (isGameMode && cardData) {
                if (category !== 'Pilot') {
                    slot.style.cursor = 'pointer';
                    slot.addEventListener('click', () => advanceCardStatus(cardData, unitData));
                }

                const tokenArea = document.createElement('div');
                tokenArea.className = 'token-area';
                if (cardData.ammunition > 0) tokenArea.appendChild(createResourceTracker(cardData, 'ammunition'));
                if (cardData.intercept > 0) tokenArea.appendChild(createResourceTracker(cardData, 'intercept'));
                if (cardData.charge) {
                    const chargeTokenImg = document.createElement('img');
                    chargeTokenImg.className = 'charge-token-img';
                    chargeTokenImg.src = cardData.isCharged ? 'icons/charge_on.png' : 'icons/charge_off.png';
                    chargeTokenImg.addEventListener('click', (e) => {
                        e.stopPropagation();
                        performActionAndPreserveScroll(() => {
                            cardData.isCharged = !cardData.isCharged;
                        }, e.target);
                    });
                    tokenArea.appendChild(chargeTokenImg);
                }
                wrapper.appendChild(tokenArea);

                const hasButton = (cardData.drop || (cardData.changes && cardData.changes.length > 0));
                if (hasButton) {
                    const actionButtonWrapper = document.createElement('div');
                    actionButtonWrapper.className = 'action-button-wrapper';

                    if (cardData.drop) {
                        const dropButton = document.createElement('button');
                        dropButton.className = 'action-button drop-button';
                        dropButton.classList.toggle('dropped', cardData.isDropped === true);
                        dropButton.textContent = cardData.isDropped ? '버리기 취소' : '버리기';
                        dropButton.addEventListener('click', (e) => {
                            e.stopPropagation();
                            performActionAndPreserveScroll(() => {
                                cardData.isDropped = !cardData.isDropped;
                            }, e.target);
                        });
                        actionButtonWrapper.appendChild(dropButton);
                    } else if (cardData.changes && cardData.changes.length > 0) {
                        const changeButton = document.createElement('button');
                        changeButton.className = 'action-button change-button';
                        changeButton.textContent = '변경';
                        changeButton.addEventListener('click', (e) => {
                            e.stopPropagation();
                            performActionAndPreserveScroll(() => {
                                const cycle = [cardData.fileName, ...(cardData.changes || [])];
                                const currentIndex = cycle.indexOf(cardData.fileName);
                                const nextIndex = (currentIndex + 1) % cycle.length;
                                const nextCardFileName = cycle[nextIndex];
                                const newCardData = allCards.byFileName.get(nextCardFileName);

                                if (!newCardData) return;

                                const propsToPreserve = {
                                    cardStatus: cardData.cardStatus,
                                    currentAmmunition: cardData.currentAmmunition,
                                    currentIntercept: cardData.currentIntercept,
                                    isDropped: cardData.isDropped,
                                    rosterId: cardData.rosterId,
                                };

                                for (const key in cardData) {
                                    delete cardData[key];
                                }
                                Object.assign(cardData, newCardData, propsToPreserve);
                            }, e.target);
                        });
                        actionButtonWrapper.appendChild(changeButton);
                    }
                    wrapper.insertBefore(actionButtonWrapper, slot);
                } else {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'action-button-placeholder';
                    wrapper.insertBefore(placeholder, slot);
                }
            } else if (!isGameMode) {
                slot.style.cursor = 'pointer';
                slot.addEventListener('click', () => openModal(unitId, category));
            }
            unitRow.appendChild(wrapper);
        });

        if (!isGameMode) {
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-unit-button';
            deleteButton.textContent = '-';
            deleteButton.addEventListener('click', () => {
                delete allRosters[activeRosterName].units[unitId];
                renderRoster();
                saveAllRosters();
            });
            unitRow.appendChild(deleteButton);
        }
        
        unitEntry.appendChild(unitRow);

        const tokenAreas = Array.from(unitRow.querySelectorAll('.token-area'));
        if (tokenAreas.some(area => area.hasChildNodes())) {
            const resourceAreaHeight = '58px';
            tokenAreas.forEach(area => area.style.minHeight = resourceAreaHeight);
        }

        unitsContainer.appendChild(unitEntry);
    };

    const addDroneElement = (droneData) => {
        dronesContainer.appendChild(createCardElement(droneData));
    };

    // --- Modal Logic (Builder Mode only) ---
    const openModal = (ownerId, category, isDronePart = false) => {
        if (isGameMode) return;

        modalOverlay.dataset.currentUnitId = '';
        modalOverlay.dataset.currentDroneId = '';
        
        if (isDronePart) {
            modalTitle.textContent = `드론 - ${category} 선택`;
            modalOverlay.dataset.currentDroneId = ownerId;
        } else {
            modalTitle.textContent = `유닛 ${ownerId} - ${category} 선택`;
            modalOverlay.dataset.currentUnitId = ownerId;
        }
        modalOverlay.dataset.currentCategory = category;
        modalOverlay.dataset.isDronePart = isDronePart;

        modalImageContainer.innerHTML = '';

        const deselectOption = document.createElement('div');
        deselectOption.className = 'deselect-option';
        deselectOption.textContent = '선택 해제';
        deselectOption.addEventListener('click', () => selectCard(null));
        modalImageContainer.appendChild(deselectOption);

        const activeFaction = allRosters[activeRosterName].faction;
        const cards = allCards.byCategory[category]
            .filter(card => !card.faction || card.faction === activeFaction || card.faction === 'Public')
            .sort((a, b) => a.fileName.localeCompare(b.fileName));
        cards.forEach(card => {
            const img = document.createElement('img');
            img.src = `Cards/${card.fileName}`;
            img.alt = card.fileName;
            img.addEventListener('click', () => selectCard(card));
            modalImageContainer.appendChild(img);
        });
        modalOverlay.style.display = 'flex';
    };

    const openDroneModal = () => {
        if (isGameMode) return;
        modalTitle.textContent = '드론 선택';
        modalImageContainer.innerHTML = '';
        const activeFaction = allRosters[activeRosterName].faction;
        allCards.drones
            .filter(drone => !drone.faction || drone.faction === activeFaction || drone.faction === 'Public')
            .sort((a, b) => a.fileName.localeCompare(b.fileName))
            .forEach(droneData => {
            const img = document.createElement('img');
            img.src = `Cards/${droneData.fileName}`;
            img.alt = droneData.fileName;
            img.addEventListener('click', () => {
                const droneWithId = { ...droneData, rosterId: `d_${nextDroneId++}` };
                allRosters[activeRosterName].drones.push(droneWithId);
                addDroneElement(droneWithId);
                updateTotalPoints();
                saveAllRosters();
                closeModal();
            });
            modalImageContainer.appendChild(img);
        });
        modalOverlay.style.display = 'flex';
    };

    const closeModal = () => { modalOverlay.style.display = 'none'; };

    const selectCard = (cardData) => {
        const category = modalOverlay.dataset.currentCategory;
        const isDronePart = modalOverlay.dataset.isDronePart === 'true';

        if (isDronePart) {
            const droneId = modalOverlay.dataset.currentDroneId;
            const drone = allRosters[activeRosterName].drones.find(d => d.rosterId === droneId);
            if (drone) {
                drone.backCard = cardData;
            }
        } else {
            const unitId = parseInt(modalOverlay.dataset.currentUnitId);
            if (!isNaN(unitId)) {
                allRosters[activeRosterName].units[unitId][category] = cardData;
            }
        }
        renderRoster();
        saveAllRosters();
        closeModal();
    };

    // --- Image Export Logic ---
    const loadHtml2Canvas = () => {
        return new Promise((resolve, reject) => {
            if (html2canvasLoaded) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = () => { html2canvasLoaded = true; resolve(); };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    };

    const handleExportImage = async () => {
        const exportIcon = exportImageBtn.querySelector('img');
        if (!exportIcon) return;

        exportIcon.style.display = 'none';
        exportImageBtn.disabled = true;
        const loadingText = document.createElement('span');
        loadingText.textContent = '생성 중...';
        exportImageBtn.appendChild(loadingText);

        try {
            await loadHtml2Canvas();
            const rosterState = allRosters[activeRosterName];
            if (!rosterState) return;

            const exportContainer = document.createElement('div');
            document.body.appendChild(exportContainer);

            exportContainer.style.position = 'absolute';
            exportContainer.style.left = '-9999px';
            exportContainer.style.width = '1200px';
            exportContainer.style.backgroundColor = '#f0f2f5';
            exportContainer.style.padding = '20px';
            exportContainer.style.fontFamily = 'sans-serif';

            let html = `<h1 style="text-align: center; color: #1c1e21;">${activeRosterName}</h1>`;
            html += `<h2 style="text-align: center; color: #1877f2; font-weight: bold;">총합 포인트: ${updateTotalPoints()}</h2>`;

            // 1. Render Units
            if (Object.keys(rosterState.units).length > 0) {
                html += '<h3 style="margin-top: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">유닛</h3>';
                html += '<div style="display: flex; flex-direction: column; gap: 20px;">';
                for (const unitId in rosterState.units) {
                    const unit = rosterState.units[unitId];
                    html += '<div style="display: flex; gap: 10px; background-color: #fff; border-radius: 12px; padding: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); align-items: flex-start;">';
                    for (const category of categoryOrder) {
                        const card = unit[category];
                        html += '<div style="width: 180px; border: 1px solid #ddd; border-radius: 10px; position: relative; background-color: #fafafa; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 270px;">';
                        if (card) {
                            html += `<img src="Cards/${card.fileName}" style="width: 100%; height: auto; display: block; border-radius: 10px;" />`;
                            html += `<div style="position: absolute; top: 5px; left: 5px; padding: 3px 6px; background-color: rgba(24, 119, 242, 0.9); color: #fff; font-size: 14px; font-weight: bold; border-radius: 8px; border: 1px solid #fff;">${card.points || 0}</div>`;
                        } else {
                            html += `<span style="font-weight: bold; color: #65676b;">${category}</span>`;
                        }
                        html += '</div>';
                    }
                    html += '</div>';
                }
                html += '</div>';
            }

            // 2. Render Drones
            if (rosterState.drones.length > 0) {
                html += '<h3 style="margin-top: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">드론</h3>';
                html += '<div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; align-items: flex-start; margin-top: 15px;">';
                rosterState.drones.forEach(drone => {
                    if (drone.rosterId && typeof drone.rosterId === 'string' && drone.rosterId.startsWith('sub-drone-')) return;
                    html += '<div style="position: relative; width: 200px;">';
                    html += `<img src="Cards/${drone.fileName}" style="width: 100%; height: auto; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: block;" />`;
                    html += `<div style="position: absolute; top: 5px; left: 5px; padding: 3px 6px; background-color: rgba(24, 119, 242, 0.9); color: #fff; font-size: 14px; font-weight: bold; border-radius: 8px; border: 1px solid #fff;">${drone.points || 0}</div>`;
                    html += '</div>';
                });
                html += '</div>';
            }

            // 3. Collect and Render All Sub-Cards
            const unitSubCards = Object.values(rosterState.units).flatMap(unit => Object.values(unit).filter(Boolean).flatMap(p => p.subCards || []));
            const droneSubCards = rosterState.drones.flatMap(d => d.subCards || []);
            const allSubCardNames = [...new Set([...unitSubCards, ...droneSubCards])];

            if (allSubCardNames.length > 0) {
                html += '<h3 style="margin-top: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">서브 카드</h3>';
                html += '<div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; align-items: flex-start; margin-top: 15px;">';
                allSubCardNames.forEach(fileName => {
                    const card = allCards.byFileName.get(fileName);
                    if (card) {
                        html += '<div style="position: relative; width: 200px;">';
                        html += `<img src="Cards/${card.fileName}" style="width: 100%; height: auto; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: block;" />`;
                        html += '</div>';
                    }
                });
                html += '</div>';
            }

            exportContainer.innerHTML = html;

            await new Promise(resolve => setTimeout(resolve, 1000));

            const canvas = await html2canvas(exportContainer, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#f0f2f5' });

            const link = document.createElement('a');
            link.download = `${activeRosterName.replace(new RegExp("[/\]", 'g'), '-')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            document.body.removeChild(exportContainer);

        } catch (error) {
            console.error('Error exporting image:', error);
            alert('이미지 생성에 실패했습니다. 콘솔을 확인해주세요.');
        } finally {
            exportIcon.style.display = 'block';
            exportImageBtn.removeChild(loadingText);
            exportImageBtn.disabled = false;
        }
    };

    // --- Event Listeners ---
    addUnitButton.addEventListener('click', () => {
        if (isGameMode) return;
        allRosters[activeRosterName].units[nextUnitId] = {};
        createUnitElement(nextUnitId, {});
        saveAllRosters();
    });
    addDroneButton.addEventListener('click', openDroneModal);
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) closeModal();
    });

    const handleNewRoster = () => {
        const name = prompt('새 로스터의 이름을 입력하세요:', '새 로스터');
        if (name && !allRosters[name]) {
            allRosters[name] = getNewRosterState();
            switchActiveRoster(name);
        } else if (name && allRosters[name]) {
            alert('이미 존재하는 이름입니다.');
            rosterSelect.value = activeRosterName;
        } else {
            rosterSelect.value = activeRosterName;
        }
    };

    rosterSelect.addEventListener('change', (e) => {
        if (e.target.value === '__NEW__') {
            handleNewRoster();
        } else {
            switchActiveRoster(e.target.value);
        }
    });

    renameRosterBtn.addEventListener('click', () => {
        const oldName = activeRosterName;
        const newName = prompt('새로운 이름을 입력하세요:', oldName);
        if (newName && newName !== oldName && !allRosters[newName]) {
            allRosters[newName] = allRosters[oldName];
            delete allRosters[oldName];
            activeRosterName = newName;
            updateRosterSelect();
            saveAllRosters();
        } else if (allRosters[newName]) {
            alert('이미 존재하는 이름입니다.');
        }
    });

    deleteRosterBtn.addEventListener('click', () => {
        if (Object.keys(allRosters).length <= 1) {
            alert('마지막 로스터는 삭제할 수 없습니다.');
            return;
        }
        if (confirm(`'${activeRosterName}' 로스터를 정말로 삭제하시겠습니까?`)) {
            const oldName = activeRosterName;
            delete allRosters[oldName];
            const newActiveName = Object.keys(allRosters)[0];
            switchActiveRoster(newActiveName);
        }
    });

    exportImageBtn.addEventListener('click', handleExportImage);
    gameModeBtn.addEventListener('click', () => setGameMode(true));
    exitGameModeBtn.addEventListener('click', () => setGameMode(false));

    factionSelect.addEventListener('change', (e) => {
        if (isGameMode) return;
        const newFaction = e.target.value;
        allRosters[activeRosterName].faction = newFaction;
        saveAllRosters();
    });

    // --- App Start & PWA Registration ---
    initializeApp();

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('Service Worker: Registered successfully', registration))
                .catch(error => console.log('Service Worker: Registration failed', error));
        });
    }
});