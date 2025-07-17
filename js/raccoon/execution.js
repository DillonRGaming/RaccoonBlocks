Object.assign(window.Raccoon, {
    async evaluateReporter(blockId, spriteId, useSnapshot = true) {
        const source = useSnapshot ? this.execution.snapshot : this;
        const blocks = this.getAllBlocksForSprite(spriteId, useSnapshot);
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
                    args[key] = await this.evaluateReporter(input.blockId, spriteId, useSnapshot);
                } else {
                    args[key] = input.value;
                }
            }
        }
        
        const api = this.stage.createApiForSprite(spriteId, useSnapshot);
        return await blockDef.onExecute(args, api);
    },

    async evaluateAndDisplayReporter(blockId, spriteId) {
        const outputEl = this.stage.reporterOutputEl;
        const block = this.getActiveBlocks()[blockId];
        if (!block) return;
    
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
                const rect = blockEl.getBoundingClientRect();
                outputEl.style.left = `${rect.left + rect.width / 2}px`;
                outputEl.style.top = `${rect.bottom}px`;
                outputEl.dataset.blockId = blockId;
            }
            
            setTimeout(() => this.hideReporterOutput(blockId), this.REPORTER_BUBBLE_LIFETIME);
        } finally {
            this.execution.snapshot = originalSnapshot;
        }
    },
    
    async executeStack(startBlockId, spriteId, useSnapshot = false) {
        const stackId = `${spriteId}-${startBlockId}`;
        if (this.execution.runningStacks.has(stackId) && useSnapshot) return; 

        const controller = { stop: false };
        if (useSnapshot) {
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
                        args[key] = input.blockId ? await this.evaluateReporter(input.blockId, spriteId, useSnapshot) : input.value;
                    }
                }
                if (block.child) args.child = block.child;
                if (block.child2) args.child2 = block.child2;
                
                const api = this.stage.createApiForSprite(spriteId, useSnapshot);
                await blockDef.onExecute(args, api, { execute: executeChildStack, isStopping: checkIfStopping });

            } catch (e) {
                console.error(`Execution error in block ${block.id} (${block.type}):`, e);
                this.logToConsole(`Execution error in block ${block.id} (${block.type}): ${e.message}`, 'error');
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
        this.deleteAllClones();
        
        this.logToConsole('Flag clicked, execution started.', 'event');
        this.execution.snapshot = this.deepCloneForExecution(this);
        
        for (const sId in this.execution.snapshot.sprites) {
            const blocks = this.getAllBlocksForSprite(sId, true);
            for (const blockId in blocks) {
                const block = blocks[blockId];
                if (block.type === 'event_when_flag_clicked' && !block.previous && !block.parentInput) {
                    if (block.next) this.executeStack(block.next, sId, true);
                }
            }
        }
    },

    deepCloneForExecution(engine) {
        const clone = { sprites: {}, clones: {}, variables: {}, lists: {} };

        clone.variables = JSON.parse(JSON.stringify(engine.variables));
        clone.lists = JSON.parse(JSON.stringify(engine.lists));

        for (const spriteId in engine.sprites) {
            const originalSprite = engine.sprites[spriteId];
            const { costume, ...serializableData } = originalSprite;
            const clonedSprite = JSON.parse(JSON.stringify(serializableData));
            clonedSprite.costume = costume;
            clone.sprites[spriteId] = clonedSprite;
        }
        
        clone.clones = {};

        return clone;
    },

    stopAllScripts() {
        this.logToConsole('Stop clicked, all scripts halted.', 'event');
        this.execution.isStopping = true;
        document.querySelectorAll('.is-errored').forEach(el => el.classList.remove('is-errored'));
        this.execution.runningStacks.forEach(controller => controller.stop = true);
        this.execution.runningStacks.clear();
        setTimeout(() => { 
            this.execution.isStopping = false; 
            this.execution.snapshot = {};
            this.deleteAllClones();
            this.uiUpdateCallback();
        }, 100); 
    },
});