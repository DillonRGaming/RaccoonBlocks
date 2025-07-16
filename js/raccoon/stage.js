window.Raccoon.stage = {
    canvas: null,
    ctx: null,
    speechBubbles: {}, // Stores references to speech bubble DOM elements
    paletteMonitorContainerEl: null, // For monitors in the palette area
    stageMonitorContainerEl: null, // For monitors displayed on the stage
    reporterOutputEl: null, // Element for single-click reporter output
    displayWidth: 0, // Actual width of the display area (CSS pixels)
    displayHeight: 0, // Actual height of the display area (CSS pixels)

    // Requirement 4: Base stage resolution for proportional scaling
    STAGE_BASE_WIDTH: 480,
    STAGE_BASE_HEIGHT: 360,

    view: { x: 0, y: 0, zoom: 1 }, // Stage camera view (position and zoom)

    init(canvasElement, uiUpdateCallback) { 
        window.Raccoon.uiUpdateCallback = uiUpdateCallback; // Callback to update other UI parts
        this.canvas = canvasElement; 
        this.ctx = this.canvas.getContext('2d'); 
        
        // Requirement 4: Resize observer for consistent canvas rendering
        const resizeObserver = new ResizeObserver(entries => { 
            for (let entry of entries) { 
                const { width, height } = entry.contentRect; 
                const scale = window.devicePixelRatio; // Get device pixel ratio for high-DPI screens
                this.canvas.width = Math.floor(width * scale); 
                this.canvas.height = Math.floor(height * scale); 
                this.ctx.setTransform(scale, 0, 0, scale, 0, 0); // Scale context for high-DPI rendering
                this.displayWidth = width; // Store CSS pixels width
                this.displayHeight = height; // Store CSS pixels height
                this.render(); // Re-render stage on resize
            } 
        }); 
        const stageDisplay = document.getElementById('stage-area-display'); 
        if (stageDisplay) { 
            resizeObserver.observe(stageDisplay); 
            // Update Raccoon.mouse position based on stage coordinates
            stageDisplay.addEventListener('mousemove', e => { 
                const rect = stageDisplay.getBoundingClientRect(); 
                
                // Requirement 4: Convert screen coordinates to STAGE_BASE_WIDTH/HEIGHT coordinates
                const baseScaleFactor = Math.min(this.displayWidth / this.STAGE_BASE_WIDTH, this.displayHeight / this.STAGE_BASE_HEIGHT);
                const scaledStageWidth = this.STAGE_BASE_WIDTH * baseScaleFactor;
                const scaledStageHeight = this.STAGE_BASE_HEIGHT * baseScaleFactor;
                const offsetX = (this.displayWidth - scaledStageWidth) / 2;
                const offsetY = (this.displayHeight - scaledStageHeight) / 2;

                // Mouse position relative to the scaled and centered stage content area
                const mouseX_scaledCanvas = (e.clientX - rect.left - offsetX) / baseScaleFactor;
                const mouseY_scaledCanvas = (e.clientY - rect.top - offsetY) / baseScaleFactor;

                // Convert to stage coordinates (0,0 is center of STAGE_BASE_WIDTH/HEIGHT)
                // Then apply camera view zoom/pan
                Raccoon.mouse.x = (mouseX_scaledCanvas - this.STAGE_BASE_WIDTH / 2) / this.view.zoom + this.view.x; 
                Raccoon.mouse.y = -((mouseY_scaledCanvas - this.STAGE_BASE_HEIGHT / 2) / this.view.zoom + this.view.y); // Y-axis inverted
            }); 
        } 
        this.paletteMonitorContainerEl = document.getElementById('palette-monitor-container'); 
        this.stageMonitorContainerEl = document.getElementById('stage-monitor-container');
        this.reporterOutputEl = document.getElementById('reporter-output'); 
        this.render(); 
    },

    async render() {
        if (!this.ctx || !this.paletteMonitorContainerEl || !this.stageMonitorContainerEl) return;
        // Requirement 3: Render from snapshot during execution, otherwise from live Raccoon state
        const source = (Raccoon.execution.isStopping || !Object.keys(Raccoon.execution.snapshot).length) ? Raccoon : Raccoon.execution.snapshot;
        
        const allMonitors = [];
        const allSpritesAndClones = { ...source.sprites, ...source.clones };

        // Collect variable monitors
        for (const sId in allSpritesAndClones) {
            const sprite = allSpritesAndClones[sId];
            if (!sprite) continue;
            const isClone = sprite.isClone;

            const allVars = { ...source.variables, ...(sprite.localVariables || {}) };
            for (const varName in allVars) {
                const v = (sprite.localVariables && sprite.localVariables.hasOwnProperty(varName)) ? sprite.localVariables[varName] : source.variables[varName];
                if (v && v.visible) {
                    const isLocal = (sprite.localVariables && sprite.localVariables.hasOwnProperty(varName));
                    // Clones don't display local variables/lists of their parent
                    if (isClone && isLocal) continue; 
                    allMonitors.push({
                        label: isLocal ? `${sprite.name}: ${varName}` : varName,
                        value: v.value,
                        color: 'var(--data-color)'
                    });
                }
            }

            // Collect list monitors
            const allLists = { ...source.lists, ...(sprite.localLists || {})};
            for (const listName in allLists) {
                const l = (sprite.localLists && sprite.localLists.hasOwnProperty(listName)) ? sprite.localLists[listName] : source.lists[listName];
                if (l && l.visible) {
                    const isLocal = (sprite.localLists && sprite.localLists.hasOwnProperty(listName));
                    if (isClone && isLocal) continue;
                     allMonitors.push({
                        label: isLocal ? `${sprite.name}: ${listName}` : listName,
                        value: l.value.join(' '), // Display list as space-separated string
                        color: 'var(--lists-color)'
                    });
                }
            }

            // Collect block reporter monitors
            // Requirement 3: Ensure monitor values update in real-time during execution
            const useSnapshotForMonitors = !Raccoon.execution.isStopping && Object.keys(Raccoon.execution.snapshot).length > 0;
            const blocks = Raccoon.getAllBlocksForSprite(sId, useSnapshotForMonitors); // Get blocks from appropriate source
            for (const block of Object.values(blocks)) {
                if (block.monitored && block.outputType) {
                    // Evaluate reporter block to get its current value
                    const value = await Raccoon.evaluateReporter(block.id, sId, useSnapshotForMonitors);
                    const blockDef = Raccoon.blockDefinitions[block.type]?.spec || {};
                    const label = block.monitorLabel || blockDef.monitorLabel || block.type; // Use custom label or default
                    allMonitors.push({
                        label: label,
                        value: value,
                        color: `var(--${block.category}-color)`
                    });
                }
            }
        }
        
        // Update palette monitor display in the DOM
        this.paletteMonitorContainerEl.innerHTML = allMonitors.map(m => 
            `<div class="reporter-monitor" style="border-color: ${m.color};"><span class="monitor-label">${m.label}:</span><span class="monitor-value" style="background-color: ${m.color};">${m.value}</span></div>`
        ).join('');

        // Render stage monitors
        this.renderStageMonitors(allMonitors);

        // Request animation frame for smooth rendering
        requestAnimationFrame(() => {
            if (!this.ctx) return;
            const currentScale = this.ctx.getTransform().a; // Get current canvas context scale (device pixel ratio)
            this.ctx.clearRect(0, 0, this.canvas.width / currentScale, this.canvas.height / currentScale); // Clear canvas (in CSS pixels)

            this.ctx.save();
            // Requirement 4: Consistent Canvas Rendering - Scale and center the STAGE_BASE_WIDTH/HEIGHT
            const baseScaleFactor = Math.min(this.displayWidth / this.STAGE_BASE_WIDTH, this.displayHeight / this.STAGE_BASE_HEIGHT);
            const scaledStageWidth = this.STAGE_BASE_WIDTH * baseScaleFactor;
            const scaledStageHeight = this.STAGE_BASE_HEIGHT * baseScaleFactor;
            const offsetX = (this.displayWidth - scaledStageWidth) / 2;
            const offsetY = (this.displayHeight - scaledStageHeight) / 2;

            this.ctx.translate(offsetX, offsetY); // Translate to center the scaled stage within the display area
            this.ctx.scale(baseScaleFactor, baseScaleFactor); // Apply base scaling to fit stage proportionally

            // Now, apply the camera view transform relative to the scaled base stage dimensions
            // Translate to the center of the STAGE_BASE_WIDTH/HEIGHT, then apply pan/zoom
            this.ctx.translate(this.STAGE_BASE_WIDTH / 2 - this.view.x * this.view.zoom, this.STAGE_BASE_HEIGHT / 2 + this.view.y * this.view.zoom);
            this.ctx.scale(this.view.zoom, this.view.zoom);

            const allDrawable = [...Object.values(allSpritesAndClones)].sort((a,b) => a.layer - b.layer);
            allDrawable.forEach(sprite => {
                if (!sprite.visible || !sprite.costume || !sprite.costume.bitmap) return;
                
                this.ctx.save();
                // Translate to sprite's (x, y) position on stage (Y-axis inverted for canvas)
                const drawX = sprite.x;
                const drawY = -sprite.y;
                this.ctx.translate(drawX, drawY);
                // Rotate sprite (Scratch rotation is clockwise from top, canvas is clockwise from right)
                const angleRad = (sprite.rotation - 90) * Math.PI / 180;
                this.ctx.rotate(angleRad);
                
                // Requirement 4: Apply proportional scaling for sprites relative to their base size
                const baseScale = sprite.baseScale || 1.0; // Base scale from costume import
                const currentWidth = sprite.costume.width * baseScale * (sprite.size / 100);
                const currentHeight = sprite.costume.height * baseScale * (sprite.size / 100);

                // Draw image centered on sprite's (x,y)
                this.ctx.drawImage(sprite.costume.bitmap, -currentWidth / 2, -currentHeight / 2, currentWidth, currentHeight);
                this.ctx.restore();
            });
            this.ctx.restore();

            // Position speech bubbles after sprite rendering for correct offsets
            allDrawable.forEach(sprite => {
                const bubble = this.speechBubbles[sprite.id];
                if (bubble && bubble.style.display !== 'none') {
                    // Convert sprite's stage coordinates to screen coordinates for bubble positioning
                    // Note: This calculation needs to use the same transformations as the main canvas rendering.
                    const spriteScreenX = offsetX + baseScaleFactor * (this.STAGE_BASE_WIDTH / 2 + (sprite.x - this.view.x) * this.view.zoom);
                    const spriteScreenY = offsetY + baseScaleFactor * (this.STAGE_BASE_HEIGHT / 2 - (sprite.y - this.view.y) * this.view.zoom);
                    
                    const costumeHeight = sprite.costume ? sprite.costume.height : 50; // Fallback height
                    const spriteDisplayHeight = costumeHeight * (sprite.baseScale || 1.0) * (sprite.size / 100) * baseScaleFactor * this.view.zoom;
                    
                    bubble.style.left = `${spriteScreenX}px`;
                    bubble.style.top = `${spriteScreenY - spriteDisplayHeight / 2 - bubble.offsetHeight - 5}px`;
                }
            });
        });
    },

    // New function to render monitors directly on the stage
    renderStageMonitors(monitors) {
        // Clear existing stage monitors
        this.stageMonitorContainerEl.innerHTML = '';

        monitors.forEach(m => {
            const monitorEl = document.createElement('div');
            monitorEl.className = 'stage-monitor';
            monitorEl.style.borderColor = m.color;
            monitorEl.innerHTML = `
                <div class="monitor-checkbox" style="background-color: ${m.color};"></div>
                <span class="monitor-label">${m.label}:</span>
                <span class="monitor-value" style="background-color: ${m.color};">${m.value}</span>
            `;
            this.stageMonitorContainerEl.appendChild(monitorEl);
            // TODO: Position these monitors correctly on the stage.
            // For now, they will just stack. Positioning will require more complex logic
            // to convert stage coordinates to screen coordinates, similar to speech bubbles.
            // This will be addressed in a later step.
        });
    },

    // Creates an API object for blocks to interact with sprite properties and stage
    createApiForSprite(spriteId, useSnapshot = false) {
        const source = useSnapshot ? Raccoon.execution.snapshot : Raccoon;
        const getSprite = () => source.sprites[spriteId] || source.clones[spriteId];
        
        const getList = (name) => {
            const s = getSprite();
            if (!s) return null;
            if (s.localLists && s.localLists.hasOwnProperty(name)) return s.localLists[name];
            if (source.lists.hasOwnProperty(name)) return source.lists[name];
            return null;
        };

        const getVariable = (name) => {
            const s = getSprite();
            if (!s) return null;
            if (s.localVariables && s.localVariables.hasOwnProperty(name)) return s.localVariables[name];
            if (source.variables.hasOwnProperty(name)) return source.variables[name];
            return null;
        };
        
        return {
            // Motion
            getX: () => { const s = getSprite(); return s ? s.x : 0; },
            getY: () => { const s = getSprite(); return s ? s.y : 0; },
            getDirection: () => { const s = getSprite(); return s ? s.rotation : 90; },
            changeX: (dx) => { const s = getSprite(); if(s) { s.x += Number(dx) || 0; Raccoon.uiUpdateCallback(); }},
            changeY: (dy) => { const s = getSprite(); if(s) { s.y += Number(dy) || 0; Raccoon.uiUpdateCallback(); }},
            move: async (steps) => { const s = getSprite(); if (!s) return; await Raccoon.sleep(10); const numSteps = parseFloat(steps); if (isNaN(numSteps)) return; const angleRad = (s.rotation - 90) * Math.PI / 180; s.x += numSteps * Math.cos(angleRad); s.y += numSteps * Math.sin(angleRad); Raccoon.uiUpdateCallback(); },
            turn: async (degrees, direction = 'right') => { const s = getSprite(); if (!s) return; await Raccoon.sleep(10); const numDegrees = parseFloat(degrees); if (isNaN(numDegrees)) return; s.rotation += (direction === 'right' ? numDegrees : -numDegrees); s.rotation = (s.rotation % 360 + 360) % 360; Raccoon.uiUpdateCallback(); },
            goToXY: async (x, y) => { const s = getSprite(); if (!s) return; await Raccoon.sleep(10); const numX = parseFloat(x), numY = parseFloat(y); if (!isNaN(numX)) s.x = numX; if (!isNaN(numY)) s.y = numY; Raccoon.uiUpdateCallback(); },
            pointInDirection: async (dir) => { const s = getSprite(); if (!s) return; await Raccoon.sleep(10); const numDir = parseFloat(dir); if (isNaN(numDir)) return; s.rotation = (numDir % 360 + 360) % 360; Raccoon.uiUpdateCallback(); },
            pointTowards: async (target) => { const s = getSprite(); if (!s) return; let targetX, targetY; if (target === '_mouse_') { targetX = Raccoon.mouse.x; targetY = Raccoon.mouse.y; } else if (target === '_random_') { s.rotation = Math.round(Math.random() * 360); Raccoon.uiUpdateCallback(); return; } else { const targetSprite = Object.values(source.sprites).find(sp => sp.id === target) || Object.values(source.clones).find(c => c.id === target); if (!targetSprite) return; targetX = targetSprite.x; targetY = targetSprite.y; } const dx = targetX - s.x; const dy = targetY - s.y; const angle = Math.atan2(dy, dx) * 180 / Math.PI; s.rotation = (angle + 90 + 360) % 360; Raccoon.uiUpdateCallback(); },
            distanceTo: (target) => { const s = getSprite(); if (!s) return 0; let targetX, targetY; if (target === '_mouse_') { targetX = Raccoon.mouse.x; targetY = Raccoon.mouse.y; } else { const targetSprite = Object.values(source.sprites).find(sp => sp.id === target) || Object.values(source.clones).find(c => c.id === target); if (!targetSprite) return 0; targetX = targetSprite.x; targetY = targetSprite.y; } return Math.hypot(s.x - targetX, s.y - targetY); },

            // Looks
            getSize: () => { const s = getSprite(); return s ? s.size : 100; },
            setSize: (size) => { const s = getSprite(); if (s) s.size = Math.max(0, parseFloat(size) || 100); Raccoon.uiUpdateCallback(); },
            changeSizeBy: (change) => { const s = getSprite(); if (s) s.size = Math.max(0, s.size + (parseFloat(change) || 0)); Raccoon.uiUpdateCallback(); },
            show: () => { const s = getSprite(); if(s) s.visible = true; Raccoon.uiUpdateCallback(); },
            hide: () => { const s = getSprite(); if(s) s.visible = false; Raccoon.uiUpdateCallback(); },
            say: async (message, seconds = null) => { 
                const s = getSprite(); 
                if(!s) return; 
                let bubble = Raccoon.stage.speechBubbles[s.id]; 
                if (!bubble) { 
                    bubble = document.createElement('div'); 
                    bubble.className = 'speech-bubble'; 
                    document.getElementById('stage-area-display').appendChild(bubble); 
                    Raccoon.stage.speechBubbles[s.id] = bubble; 
                } 
                if (s.sayTimeout) clearTimeout(s.sayTimeout); 
                s.sayMessage = message; 
                bubble.textContent = message; 
                bubble.style.display = 'block'; 
                if (seconds !== null) { 
                    const numSeconds = parseFloat(seconds); 
                    if (isNaN(numSeconds)) return; 
                    s.sayTimeout = setTimeout(() => { 
                        bubble.style.display = 'none'; 
                        s.sayMessage = ''; 
                        s.sayTimeout = null; 
                    }, numSeconds * 1000); 
                } 
            },
            goToLayer: (layer) => { 
                const s = getSprite(); 
                if (!s) return; 
                const all = [...Object.values(source.sprites), ...Object.values(source.clones)]; 
                if (layer === 'front') { s.layer = Math.max(...all.map(sp => sp.layer)) + 1; } 
                else { s.layer = Math.min(...all.map(sp => sp.layer)) - 1; } 
                Raccoon.stage.render(); 
            }, 
            goLayers: (direction, num) => { 
                const s = getSprite(); 
                if (!s) return; 
                const n = Number(num) || 0; 
                s.layer += (direction === 'forward' ? n : -n); 
                Raccoon.stage.render(); 
            },

            // Control
            wait: async (seconds) => { await Raccoon.sleep((parseFloat(seconds) || 0) * 1000); },
            createClone: () => { const s = getSprite(); if (s) Raccoon.createClone(s.isClone ? s.parentId : s.id); },
            deleteThisClone: () => { const s = getSprite(); if (s && s.isClone) Raccoon.deleteClone(s.id); },

            // Sensing
            isKeyDown: (key) => Raccoon.keys.has(key),
            isMouseDown: () => Raccoon.mouse.isDown,
            getMouseX: () => Raccoon.mouse.x,
            getMouseY: () => Raccoon.mouse.y,
            random: (from, to) => { const numFrom = parseFloat(from), numTo = parseFloat(to); if (isNaN(numFrom) || isNaN(numTo)) return 0; const min = Math.ceil(Math.min(numFrom, numTo)), max = Math.floor(Math.max(numFrom, numTo)); return Math.floor(Math.random() * (max - min + 1)) + min; },
            getTimer: () => (Date.now() - Raccoon.execution.timerStart) / 1000,
            resetTimer: () => { Raccoon.execution.timerStart = Date.now(); },

            // Data (Variables)
            setVariable: (name, value) => { const v = getVariable(name); if(v) { v.value = value; Raccoon.uiUpdateCallback(); } },
            changeVariableBy: (name, value) => { const v = getVariable(name); if(v) { const numValue = parseFloat(value); if (isNaN(numValue)) return; const currentVal = parseFloat(v.value); v.value = (isNaN(currentVal) ? 0 : currentVal) + numValue; Raccoon.uiUpdateCallback(); } },
            getVariable: (name) => { const v = getVariable(name); return v ? v.value : 0; },
            showVariable: (name) => { const v = getVariable(name); if (v) { v.visible = true; Raccoon.uiUpdateCallback(); } },
            hideVariable: (name) => { const v = getVariable(name); if (v) { v.visible = false; Raccoon.uiUpdateCallback(); } },
            
            // Data (Lists)
            getListContents: (name) => { const l = getList(name); return l ? l.value : []; },
            addToList: (name, item) => { const l = getList(name); if (l) { l.value.push(item); Raccoon.uiUpdateCallback(); } },
            deleteFromList: (name, index) => { const l = getList(name); if (!l) return; if (index === 'all') { l.value = []; } else if (index === 'last') { l.value.pop(); } else { const idx = Math.round(Number(index)) - 1; if (idx >= 0 && idx < l.value.length) l.value.splice(idx, 1); } Raccoon.uiUpdateCallback(); },
            clearList: (name) => { const l = getList(name); if(l) { l.value = []; Raccoon.uiUpdateCallback(); }},
            insertInList: (name, index, item) => { const l = getList(name); if (!l) return; const idx = Math.round(Number(index)) - 1; if (idx >= 0 && idx <= l.value.length) { l.value.splice(idx, 0, item); Raccoon.uiUpdateCallback(); } },
            replaceItemInList: (name, index, item) => { const l = getList(name); if (!l) return; const idx = Math.round(Number(index)) - 1; if (idx >= 0 && idx < l.value.length) { l.value[idx] = item; Raccoon.uiUpdateCallback(); } },
            getItemOfList: (name, index) => { const l = getList(name); if (!l) return ""; const idx = Math.round(Number(index)) - 1; return (l.value && l.value[idx] !== undefined) ? l.value[idx] : ""; },
            getItemNumberOfList: (name, item) => { const l = getList(name); return l ? (l.value.indexOf(item) + 1) : 0; },
            getListLength: (name) => { const l = getList(name); return l ? l.value.length : 0; },
            listContains: (name, item) => { const l = getList(name); return l ? l.value.includes(item) : false; },
            showList: (name) => { const l = getList(name); if (l) { l.visible = true; Raccoon.uiUpdateCallback(); } },
            hideList: (name) => { const l = getList(name); if (l) { l.visible = false; Raccoon.uiUpdateCallback(); } },
        };
    },

    // Camera control functions directly affect Raccoon.stage.view
    setCameraX(x) { Raccoon.stage.view.x = Number(x) || 0; Raccoon.stage.render(); },
    setCameraY(y) { Raccoon.stage.view.y = Number(y) || 0; Raccoon.stage.render(); },
    changeCameraX(dx) { Raccoon.stage.view.x += Number(dx) || 0; Raccoon.stage.render(); },
    changeCameraY(dy) { Raccoon.stage.view.y += Number(dy) || 0; Raccoon.stage.render(); },
    setCameraZoom(zoom) { Raccoon.stage.view.zoom = Math.max(0.1, (Number(zoom) || 100) / 100); Raccoon.stage.render(); },
    changeCameraZoom(d_zoom) { Raccoon.stage.view.zoom = Math.max(0.1, Raccoon.stage.view.zoom + (Number(d_zoom) || 0) / 100); Raccoon.stage.render(); },
    resetCamera() { Raccoon.stage.view = { x: 0, y: 0, zoom: 1 }; Raccoon.stage.render(); },
};
