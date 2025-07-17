window.Raccoon = {
    workspace: null,
    blockContainer: null,
    activeSpriteId: null,
    sprites: {},
    clones: {},
    variables: {},
    lists: {},

    snapThreshold: 40,
    REPORTER_BUBBLE_LIFETIME: 1500,
    EMPTY_BOOLEAN_INPUT_WIDTH: 40,
    DEFAULT_SPRITE_DIMENSION: 90, 
    PALETTE_BLOCK_SPACING: 10,

    view: { 
        x: 0, 
        y: 0, 
        zoom: 1, 
        isPanning: false, 
        panStartX: 0, 
        panStartY: 0 
    },

    dragState: { 
        isDragging: false, 
        draggedBlockId: null, 
        draggedSpriteId: null, 
        offsetX: 0, 
        offsetY: 0, 
        snapTarget: null, 
        lastSnapHighlight: null, 
        dragStartX: 0, 
        dragStartY: 0, 
        didMove: false,
        liveFeedbackData: null,
    },

    measureContext: null,
    uiUpdateCallback: () => {},

    blockDefinitions: {},
    categoryData: {},
    BlockColors: {},
    
    execution: { 
        isStopping: false, 
        timerStart: 0, 
        activeTimeouts: new Set(), 
        runningStacks: new Map(),
        snapshot: {},
    },
    
    Shapes: {},

    mouse: { 
        x: 0, 
        y: 0, 
        isDown: false 
    },
    keys: new Set(),

    logToConsole(message, type = 'info') {
        const consoleLogEl = document.getElementById('console-log');
        if (!consoleLogEl) return;
        const logEntry = document.createElement('div');
        logEntry.className = `console-entry type-${type}`;
        const timestamp = new Date().toLocaleTimeString();
        const messageEl = document.createElement('span');
        messageEl.className = 'message';
        messageEl.textContent = message;
        logEntry.innerHTML = `<span class="timestamp">${timestamp}</span>`;
        logEntry.appendChild(messageEl);
        consoleLogEl.appendChild(logEntry);
        consoleLogEl.scrollTop = consoleLogEl.scrollHeight;
    },

    registerCategory(category) {
        this.categoryData[category.id] = { 
            label: category.label, 
            icon: category.icon, 
            color: category.color 
        };
        this.BlockColors[category.id] = category.color;
        for (const blockType in category.blocks) {
            this.blockDefinitions[blockType] = category.blocks[blockType];
            this.blockDefinitions[blockType].spec.type = blockType;
            this.blockDefinitions[blockType].spec.category = category.id;
        }
    },

    getCategoryData() {
        return this.categoryData;
    },

    getBlocksForCategory(categoryId) {
        const blocks = [];
        for (const blockType in this.blockDefinitions) {
            if (this.blockDefinitions[blockType].spec.category === categoryId) {
                blocks.push(this.blockDefinitions[blockType]);
            }
        }
        return blocks;
    },
    
    getActiveSprite() {
        return this.sprites[this.activeSpriteId] || Object.values(this.sprites)[0];
    },

    getActiveBlocks() {
        const sprite = this.getActiveSprite();
        return sprite ? sprite.blocks : {};
    },

    getAllBlocksForSprite(spriteId, useSnapshot = false) {
        const source = useSnapshot ? this.execution.snapshot : this;
        const sprite = source.sprites[spriteId] || source.clones[spriteId];
        if (!sprite) return {};

        const parentId = sprite.isClone ? sprite.parentId : sprite.id;
        if (!source.sprites[parentId]) return {};
        const parentSprite = source.sprites[parentId];
        
        return parentSprite.blocks;
    },

    getStackRoot(blockId, spriteId) {
        const blocks = this.getAllBlocksForSprite(spriteId);
        if (!blocks || !blocks[blockId]) return null;
        let current = blocks[blockId];
        while (current && (current.previous || current.parentInput)) {
            if (current.previous) current = blocks[current.previous];
            else if (current.parentInput) current = blocks[current.parentInput.blockId];
            else break;
        }
        return current;
    },

    getLastBlockInStack(startBlockId, allBlocks) {
        if (!startBlockId || !allBlocks[startBlockId]) return null;
        let current = allBlocks[startBlockId];
        while (current && current.next && allBlocks[current.next]) {
            current = allBlocks[current.next];
        }
        return current;
    },

    calculateStackHeight(startBlock, allBlocks) {
        if (!startBlock || !allBlocks) return 0;

        let height = 0;
        let current = startBlock;
        const visited = new Set();
        while (current && !visited.has(current.id)) {
            visited.add(current.id);
            height += current.height || 40; 
            current = current.next ? allBlocks[current.next] : null;
        }
        return height;
    },
    
    getStackAndDescendants(startBlockId) {
        const sprite = this.getActiveSprite();
        if (!sprite) return [];

        const stack = [];
        const queue = [startBlockId];
        const visited = new Set();
        
        while(queue.length > 0) {
            const currentId = queue.shift();
            if(visited.has(currentId)) continue;
            visited.add(currentId);
            
            const currentBlock = sprite.blocks[currentId];
            if(!currentBlock) continue;
            
            stack.push(currentBlock); 
            
            if (currentBlock.next) queue.push(currentBlock.next);
            if (currentBlock.child) queue.push(currentBlock.child);
            if (currentBlock.child2) queue.push(currentBlock.child2);
            if (currentBlock.inputs) {
                Object.values(currentBlock.inputs).forEach(input => {
                    if (input.blockId) queue.push(input.blockId);
                });
            }
        }
        return stack;
    },

    async init(workspaceElement) {
        this.workspace = workspaceElement;
        this.blockContainer = document.getElementById('block-container');
        this.workspace.addEventListener('mousedown', this.initPan.bind(this));
        this.workspace.addEventListener('wheel', this.handleZoom.bind(this));
        window.addEventListener('mousemove', this.dragMove.bind(this));
        window.addEventListener('mouseup', this.dragEnd.bind(this));
        
        document.body.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.dropdown-trigger, .dropdown-menu, .modal-content, .color-picker, .block-slider')) {
                this.hideDropdown(); this.hideColorPicker(); this.hideSliderInput();
            }
            if (!e.target.closest('.block, .palette-block-wrapper, #reporter-output')) {
                this.hideReporterOutput();
            }
        }, true);

        const canvas = document.createElement('canvas');
        this.measureContext = canvas.getContext('2d');
        this.measureContext.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

        const workspaceRect = this.workspace.getBoundingClientRect();
        this.view.x = workspaceRect.width / 4;
        this.view.y = workspaceRect.height / 4;

        window.addEventListener('mousedown', () => { this.mouse.isDown = true; });
        window.addEventListener('mouseup', () => { this.mouse.isDown = false; });
        window.addEventListener('keydown', e => { this.keys.add(e.key === ' ' ? 'space' : e.key); });
        window.addEventListener('keyup', e => { this.keys.delete(e.key === ' ' ? 'space' : e.key); });

        await this.addSprite('Raccoon');
        
        this.updateViewTransform();
    },

    handleZoom(event) { 
        event.preventDefault(); 
        this.hideReporterOutput();
        const zoomSpeed = 0.05, minZoom = 0.4, maxZoom = 2.5; 
        const virtualMousePos = this.screenToVirtual({ x: event.clientX, y: event.clientY }); 
        
        this.view.zoom *= (event.deltaY < 0 ? (1 + zoomSpeed) : (1 / (1 + zoomSpeed))); 
        this.view.zoom = Math.max(minZoom, Math.min(maxZoom, this.view.zoom)); 
        
        const r = this.workspace.getBoundingClientRect(); 
        this.view.x = event.clientX - r.left - (virtualMousePos.x * this.view.zoom); 
        this.view.y = event.clientY - r.top - (virtualMousePos.y * this.view.zoom); 
        
        this.updateViewTransform(); 
    },
};