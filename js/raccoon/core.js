window.Raccoon = {
    workspace: null,
    blockContainer: null,
    activeSpriteId: null,
    sprites: {},
    clones: {},
    variables: {},
    lists: {},

    snapThreshold: 40,

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
    
    defaultSpriteSize: 90,

    registerCategory(category) {
        this.categoryData[category.id] = { 
            label: category.label, 
            icon: category.icon, 
            color: category.color 
        };
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
                blocks.push(this.blockDefinitions[blockType].spec);
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
        const spriteSource = useSnapshot ? this.execution.snapshot.sprites : this.sprites;
        const cloneSource = useSnapshot ? this.execution.snapshot.clones : this.clones;
        
        let sprite = spriteSource ? spriteSource[spriteId] : null;
        if (!sprite && cloneSource) {
            sprite = cloneSource[spriteId];
        }

        if (!sprite) return {};

        const parentId = sprite.isClone ? sprite.parentId : sprite.id;
        const parentSprite = spriteSource[parentId];
        return parentSprite ? parentSprite.blocks : {};
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
        let height = 0;
        let current = startBlock;
        const visited = new Set();
        while(current && !visited.has(current.id)) {
            visited.add(current.id);
            this.updateLayout(current, false); 
            height += current.height || 40;
            current = current.next ? allBlocks[current.next] : null;
        }
        return height;
    },

    async init(workspaceElement) {
        this.workspace = workspaceElement;
        this.blockContainer = document.getElementById('block-container');
        this.workspace.addEventListener('mousedown', this.initPan.bind(this));
        this.workspace.addEventListener('wheel', this.handleZoom.bind(this));
        window.addEventListener('mousemove', this.dragMove.bind(this));
        window.addEventListener('mouseup', this.dragEnd.bind(this));
        
        document.body.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.dropdown-trigger, .modal-content, .color-picker, .block-slider')) {
                this.hideDropdown(); this.hideColorPicker(); this.hideSliderInput();
            }
            if (!e.target.closest('.block, .palette-block-wrapper, .reporter-output')) {
                this.hideReporterOutput();
            }
        }, true);

        const canvas = document.createElement('canvas');
        this.measureContext = canvas.getContext('2d');
        this.measureContext.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

        const workspaceRect = this.workspace.getBoundingClientRect();
        this.view.x = workspaceRect.width / 4;
        this.view.y = workspaceRect.height / 4;
        this.updateViewTransform();

        window.addEventListener('mousedown', () => { this.mouse.isDown = true; });
        window.addEventListener('mouseup', () => { this.mouse.isDown = false; });
        window.addEventListener('keydown', e => { this.keys.add(e.key === ' ' ? 'space' : e.key); });
        window.addEventListener('keyup', e => { this.keys.delete(e.key === ' ' ? 'space' : e.key); });

        await this.addSprite('Raccoon');
    },

    handleZoom(event) { 
        event.preventDefault(); 
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