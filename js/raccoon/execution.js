Object.assign(window.Raccoon, {
    // evaluateReporter can be used to evaluate block values in the palette and during execution
    async evaluateReporter(blockId, spriteId, useSnapshot = true) {
        const source = useSnapshot ? this.execution.snapshot : this;
        const blocks = this.getAllBlocksForSprite(spriteId, useSnapshot); // Ensure blocks are retrieved from the correct source
        const block = blocks[blockId];
        if (!block || !block.outputType) return null;

        const blockDef = this.blockDefinitions[block.type];
        if (!blockDef || !blockDef.onExecute) {
            console.warn(`No onExecute function for block type: ${block.type}`);
            return null;
        }
        
        const args = {};
        if (block.inputs) {
            for (const key in block.inputs) {
                const input = block.inputs[key];
                if (input.blockId) {
                    // Recursively evaluate connected reporter blocks
                    args[key] = await this.evaluateReporter(input.blockId, spriteId, useSnapshot);
                } else {
                    args[key] = input.value;
                }
            }
        }
        
        const api = this.stage.createApiForSprite(spriteId, useSnapshot);
        return await blockDef.onExecute(args, api);
    },

    // Requirement 3: Evaluate and display reporter bubble on single click
    async evaluateAndDisplayReporter(blockId, spriteId) {
        const outputEl = this.stage.reporterOutputEl;
        const block = this.getActiveBlocks()[blockId];
        if (!block) return;
    
        // Create a temporary snapshot for evaluation without affecting the running program state
        const originalSnapshot = this.execution.snapshot;
        this.execution.snapshot = this.deepCloneForExecution(this);
    
        try {
            const value = await this.evaluateReporter(blockId, spriteId, true);
            const isBoolean = typeof value === 'boolean';
            
            outputEl.innerHTML = '';
            outputEl.className = isBoolean ? 'reporter-output has-boolean' : 'reporter-output';
            
            const bubble = document.createElement('div');
            bubble.textContent = String(value);
            bubble.className = isBoolean ? 'boolean-bubble' : 'reporter-bubble';
            
            const bubbleColor = `var(--${block.category}-color)`;
            outputEl.style.setProperty('--bubble-color', bubbleColor);
    
            outputEl.appendChild(bubble);
            outputEl.style.display = 'block';
            
            const blockEl = document.getElementById(blockId);
            if (blockEl) {
                // Adjust position based on block element
                const rect = blockEl.getBoundingClientRect();
                outputEl.style.left = `${rect.left + rect.width / 2}px`;
                outputEl.style.top = `${rect.bottom}px`;
                outputEl.dataset.blockId = blockId; // Store blockId to hide correctly
            }
            
            // Hide after a delay
            setTimeout(() => this.hideReporterOutput(blockId), this.REPORTER_BUBBLE_LIFETIME);
        } finally {
            // Restore original snapshot
            this.execution.snapshot = originalSnapshot;
        }
    },
    
    // Execute a stack of blocks
    async executeStack(startBlockId, spriteId, useSnapshot = false) {
        const stackId = `${spriteId}-${startBlockId}`;
        // Prevent re-execution of the same stack if it's already running in the snapshot context
        if (this.execution.runningStacks.has(stackId) && useSnapshot) return; 

        const controller = { stop: false };
        if (useSnapshot) { // Track running stacks only for actual execution, not single-click execution
            this.execution.runningStacks.set(stackId, controller);
        }
        
        let currentBlockId = startBlockId;
        const blocks = this.getAllBlocksForSprite(spriteId, useSnapshot);

        const executeChildStack = (id) => this.executeStack(id, spriteId, useSnapshot);
        const checkIfStopping = () => useSnapshot && (this.execution.isStopping || controller.stop);

        while(currentBlockId && !checkIfStopping()) {
            const block = blocks[currentBlockId];
            if (!block) break;

            const blockDef = this.blockDefinitions[block.type];
            if (!blockDef || !blockDef.onExecute) {
                console.warn(`No onExecute function for block type: ${block.type}`);
                break;
            }

            try {
                const args = {};
                if (block.inputs) {
                    for (const key in block.inputs) {
                        const input = block.inputs[key];
                        // Evaluate inputs before executing the block
                        args[key] = input.blockId ? await this.evaluateReporter(input.blockId, spriteId, useSnapshot) : input.value;
                    }
                }
                if (block.child) args.child = block.child;
                if (block.child2) args.child2 = block.child2;
                
                const api = this.stage.createApiForSprite(spriteId, useSnapshot);
                await blockDef.onExecute(args, api, { execute: executeChildStack, isStopping: checkIfStopping });

            } catch (e) {
                console.error(`Execution error in block ${block.id} (${block.type}):`, e);
                const blockEl = document.getElementById(block.id);
                if (blockEl) blockEl.classList.add('is-errored');
                break;
            }
            
            if(checkIfStopping()) break;
            currentBlockId = block.next;
        }
        
        if (useSnapshot) {
            this.execution.runningStacks.delete(stackId);
        }
    },

    start() {
        this.execution.isStopping = false;
        this.execution.timerStart = Date.now();
        this.deleteAllClones(); // Clear clones from previous run
        
        // Requirement 3: Create a snapshot of the current state for execution
        this.execution.snapshot = this.deepCloneForExecution(this);
        
        for (const sId in this.execution.snapshot.sprites) {
            const blocks = this.getAllBlocksForSprite(sId, true); // Use snapshot blocks
            for (const blockId in blocks) {
                const block = blocks[blockId];
                if (block.type === 'event_when_flag_clicked' && !block.previous && !block.parentInput) {
                    if (block.next) this.executeStack(block.next, sId, true);
                }
            }
        }
    },

    // Requirement 3: Deep clone for execution snapshot
    deepCloneForExecution(engine) {
        const clone = { sprites: {}, clones: {}, variables: {}, lists: {} };

        // Deep clone variables and lists
        clone.variables = JSON.parse(JSON.stringify(engine.variables));
        clone.lists = JSON.parse(JSON.stringify(engine.lists));

        // Deep clone sprites, preserving non-serializable parts like costume bitmap
        for (const spriteId in engine.sprites) {
            const originalSprite = engine.sprites[spriteId];
            const { costume, ...serializableData } = originalSprite; // Destructure costume to copy manually
            const clonedSprite = JSON.parse(JSON.stringify(serializableData)); // Deep clone serializable parts
            clonedSprite.costume = costume; // Assign costume reference (no need to deep clone bitmap)
            clone.sprites[spriteId] = clonedSprite;
        }
        
        // Clones start empty for a fresh run
        clone.clones = {};

        return clone;
    },

    stopAllScripts() {
        this.execution.isStopping = true;
        // Remove error highlights
        document.querySelectorAll('.is-errored').forEach(el => el.classList.remove('is-errored'));
        // Stop all running stacks
        this.execution.runningStacks.forEach(controller => controller.stop = true);
        this.execution.runningStacks.clear();
        // Allow a small delay for scripts to acknowledge stop, then clear snapshot
        setTimeout(() => { 
            this.execution.isStopping = false; 
            this.execution.snapshot = {}; // Clear the snapshot
            this.uiUpdateCallback(); // Re-render UI to reflect cleared state
        }, 100); 
    },
});