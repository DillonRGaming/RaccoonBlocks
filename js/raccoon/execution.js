Object.assign(window.Raccoon, {
    async evaluateReporter(blockId, spriteId) {
        const blocks = this.getAllBlocksForSprite(spriteId, true);
        const block = blocks[blockId];
        if (!block || !block.outputType) return null;

        const blockDef = this.blockDefinitions[block.type];
        if (!blockDef || !blockDef.onExecute) {
            return null;
        }
        
        const args = {};
        if (block.inputs) {
            for (const key in block.inputs) {
                const input = block.inputs[key];
                args[key] = input.blockId ? await this.evaluateReporter(input.blockId, spriteId) : input.value;
            }
        }
        const sprite = this.execution.snapshot.sprites[spriteId] || this.execution.snapshot.clones[spriteId];
        return await blockDef.onExecute(args, sprite.api);
    },

    async evaluateAndDisplayReporter(blockId, spriteId) {
        const outputEl = this.stage.reporterOutputEl;
        this.execution.snapshot = { sprites: this.sprites, clones: this.clones }; // Use live data for single clicks
        const value = await this.evaluateReporter(blockId, spriteId);
        this.execution.snapshot = {}; // Clear snapshot
        
        outputEl.textContent = String(value);
        outputEl.style.display = 'block';
        
        const blockEl = document.getElementById(blockId);
        if (blockEl) {
            const rect = blockEl.getBoundingClientRect();
            outputEl.style.left = `${rect.left + rect.width / 2}px`;
            outputEl.style.top = `${rect.bottom + 8}px`;
        }
        
        setTimeout(() => this.hideReporterOutput(), 1500);
    },

    async executeStack(startBlockId, spriteId) {
        const stackId = `${spriteId}-${startBlockId}`;
        if (this.execution.runningStacks.has(stackId)) return; 

        const controller = { stop: false };
        this.execution.runningStacks.set(stackId, controller);
        
        let currentBlockId = startBlockId;
        const blocks = this.getAllBlocksForSprite(spriteId, true);
        const sprite = this.execution.snapshot.sprites[spriteId] || this.execution.snapshot.clones[spriteId];

        const executeChildStack = async (id) => this.executeStack(id, spriteId);
        const checkIfStopping = () => this.execution.isStopping || controller.stop;

        while(currentBlockId && !checkIfStopping()) {
            const block = blocks[currentBlockId];
            if (!block) break;

            const blockDef = this.blockDefinitions[block.type];
            if (!blockDef || !blockDef.onExecute) {
                break;
            }

            try {
                const args = {};
                if (block.inputs) {
                    for (const key in block.inputs) {
                        const input = block.inputs[key];
                        args[key] = input.blockId ? await this.evaluateReporter(input.blockId, spriteId) : input.value;
                    }
                }
                if (block.child) args.child = block.child;
                if (block.child2) args.child2 = block.child2;

                await blockDef.onExecute(args, sprite.api, { execute: executeChildStack, isStopping: checkIfStopping });

            } catch (e) {
                const blockEl = document.getElementById(block.id);
                if (blockEl) blockEl.classList.add('is-errored');
                break;
            }
            
            if(checkIfStopping()) break;
            currentBlockId = block.next;
        }
        
        this.execution.runningStacks.delete(stackId);
    },

    start() {
        this.execution.isStopping = false;
        this.execution.timerStart = Date.now();
        this.deleteAllClones();
        
        this.execution.snapshot = this.deepCloneForExecution(this);
        
        for (const sId in this.execution.snapshot.sprites) {
            const sprite = this.execution.snapshot.sprites[sId];
            const blocks = sprite.blocks;
            for (const blockId in blocks) {
                const block = blocks[blockId];
                if (block.type === 'event_when_flag_clicked' && !block.previous && !block.parentInput) {
                    if (block.next) this.executeStack(block.next, sId);
                }
            }
        }
    },

    deepCloneForExecution(engine) {
        const clone = { sprites: {}, clones: {}, variables: {}, lists: {} };

        // Clone global variables and lists
        for (const key in engine.variables) {
            clone.variables[key] = { ...engine.variables[key] };
        }
        for (const key in engine.lists) {
            clone.lists[key] = { ...engine.lists[key], value: [...engine.lists[key].value] };
        }

        // Clone sprites
        for (const spriteId in engine.sprites) {
            const originalSprite = engine.sprites[spriteId];
            const { costume, localVariables, localLists, ...restOfSprite } = originalSprite;
            
            const clonedSprite = {
                ...restOfSprite,
                costume: { // only clone necessary data, not the full DOM element
                    svgText: costume.svgText,
                    bitmap: costume.bitmap,
                    width: costume.width,
                    height: costume.height,
                },
                localVariables: {},
                localLists: {},
                api: {} // API will be re-assigned later
            };

            for (const key in localVariables) {
                clonedSprite.localVariables[key] = { ...localVariables[key] };
            }
            for (const key in localLists) {
                clonedSprite.localLists[key] = { ...localLists[key], value: [...localLists[key].value] };
            }
            
            clone.sprites[spriteId] = clonedSprite;
        }

        // Re-assign API to cloned sprites
        for (const spriteId in clone.sprites) {
            clone.sprites[spriteId].api = engine.stage.createApiForSprite(spriteId, true);
        }

        return clone;
    },

    stopAllScripts() {
        this.execution.isStopping = true;
        document.querySelectorAll('.is-executing').forEach(el => el.classList.remove('is-executing'));
        this.execution.runningStacks.forEach(controller => controller.stop = true);
        this.execution.runningStacks.clear();
        setTimeout(() => { 
            this.execution.isStopping = false; 
            this.execution.snapshot = {};
        }, 100); 
    },
});