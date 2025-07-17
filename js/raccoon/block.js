Object.assign(window.Raccoon, {
    createBlock(spec, virtualPos, isClone = false) { 
        const activeSprite = this.getActiveSprite(); 
        if (!activeSprite) return null; 
        const id = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; 
        const blockData = { ...(typeof structuredClone === 'function' ? structuredClone(spec) : JSON.parse(JSON.stringify(spec))), id, position: virtualPos, spriteId: this.activeSpriteId, next: null, previous: null, child: null, child2: null, parentInput: null }; 
        
        if (blockData.inputs) { 
            for (const key in blockData.inputs) { 
                const inputSpec = blockData.inputs[key]; 
                if (inputSpec.blockId && isClone) { 
                    const newChildId = this.duplicateStack(inputSpec.blockId, {x:0, y:0}, true);
                    inputSpec.blockId = newChildId; 
                } else { 
                    inputSpec.blockId = null;
                } 
            } 
        } 
        activeSprite.blocks[id] = blockData; 
        if (!isClone) { 
            this.logToConsole(`Block '${blockData.type}' created.`, 'action');
            this.updateLayout(blockData, false);
            this.renderBlock(blockData, false);
            this.updateBlockPositions(id);
        } 
        return id; 
    },

    cloneBlock(spec, screenPos) { 
        this.updateLayout(spec, true);
        const virtualPos = this.screenToVirtual(screenPos); 
        const newBlockId = this.createBlock(spec, { x: virtualPos.x - (spec.width)/2, y: virtualPos.y - (spec.height)/2 }); 
        if (newBlockId) { 
            this.initBlockDrag({ clientX: screenPos.x, clientY: screenPos.y, button: 0, preventDefault: ()=>{}, stopPropagation: ()=>{} }, newBlockId); 
        } 
    },

    duplicateStack(startBlockId, mousePos, returnRootId = false, startDragging = false) { 
        const sprite = this.getActiveSprite(); 
        if (!sprite) return null; 
        const originalBlock = sprite.blocks[startBlockId]; 
        if (!originalBlock) return null; 

        const blocksToClone = {};
        const idMap = {};
        const queue = [startBlockId];
        const visited = new Set([startBlockId]);

        while (queue.length > 0) { 
            const currentId = queue.shift(); 
            const block = sprite.blocks[currentId]; 
            if (!block) continue; 
            blocksToClone[currentId] = block; 
            if (block.next && !visited.has(block.next)) { queue.push(block.next); visited.add(block.next); } 
            if (block.child && !visited.has(block.child)) { queue.push(block.child); visited.add(block.child); } 
            if (block.child2 && !visited.has(block.child2)) { queue.push(block.child2); visited.add(block.child2); } 
            if (block.inputs) { 
                for (const key in block.inputs) { 
                    const childId = block.inputs[key].blockId; 
                    if (childId && !visited.has(childId)) { queue.push(childId); visited.add(childId); } 
                } 
            } 
        } 

        const newBlocks = {};
        for (const id in blocksToClone) { 
            const newId = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; 
            idMap[id] = newId; 
            newBlocks[newId] = JSON.parse(JSON.stringify(blocksToClone[id]));
            newBlocks[newId].id = newId; 
            newBlocks[newId].spriteId = sprite.id;
        } 

        for (const newId in newBlocks) { 
            const block = newBlocks[newId]; 
            block.previous = block.previous ? idMap[block.previous] : null; 
            block.next = block.next ? idMap[block.next] : null; 
            block.child = block.child ? idMap[block.child] : null; 
            block.child2 = block.child2 ? idMap[block.child2] : null; 
            if (block.parentInput) { 
                block.parentInput.blockId = idMap[block.parentInput.blockId]; 
            } 
            if (block.inputs) { 
                for (const key in block.inputs) { 
                    if (block.inputs[key].blockId) { 
                        block.inputs[key].blockId = idMap[block.inputs[key].blockId]; 
                    } 
                } 
            } 
        } 
        
        const newRootId = idMap[startBlockId];
        Object.assign(sprite.blocks, newBlocks);
        
        if (!returnRootId) {
            this.logToConsole(`Stack from '${originalBlock.type}' duplicated.`, 'action');
        }

        if (returnRootId) return newRootId;

        if (startDragging) {
            const virtualPos = this.screenToVirtual({ x: mousePos.x, y: mousePos.y });
            const newRootBlock = sprite.blocks[newRootId];
            newRootBlock.position.x = virtualPos.x - 20;
            newRootBlock.position.y = virtualPos.y - 20;
            this.updateBlockPositions(newRootId);
            this.initBlockDrag({ clientX: mousePos.x, clientY: mousePos.y, button: 0, preventDefault: ()=>{}, stopPropagation: ()=>{} }, newRootId);
        } else {
            const newRootBlock = sprite.blocks[newRootId];
            newRootBlock.position.x += 20; 
            newRootBlock.position.y += 20;
            this.updateBlockPositions(newRootId);
        }
    },

    deleteStack(startBlockId, spriteId) {
        const sprite = this.sprites[spriteId];
        if (!sprite) return;
    
        const startBlock = sprite.blocks[startBlockId];
        if (!startBlock) return;
    
        this.logToConsole(`Stack from '${startBlock.type}' deleted.`, 'action');
        let rootToUpdate = null;
    
        if (startBlock.previous) {
            const prevBlock = sprite.blocks[startBlock.previous];
            if (prevBlock) {
                prevBlock.next = null;
                rootToUpdate = this.getStackRoot(prevBlock.id, spriteId)?.id || prevBlock.id;
            }
        } 
        else if (startBlock.parentInput) {
            const parentBlock = sprite.blocks[startBlock.parentInput.blockId];
            if (parentBlock && parentBlock.inputs[startBlock.parentInput.inputKey]) {
                parentBlock.inputs[startBlock.parentInput.inputKey].blockId = null;
                rootToUpdate = this.getStackRoot(parentBlock.id, spriteId)?.id || parentBlock.id;
            }
        }
        else {
            const parentCBlock = Object.values(sprite.blocks).find(p => p.child === startBlockId || p.child2 === startBlockId);
            if (parentCBlock) {
                if (parentCBlock.child === startBlockId) parentCBlock.child = null;
                if (parentCBlock.child2 === startBlockId) parentCBlock.child2 = null;
                rootToUpdate = this.getStackRoot(parentCBlock.id, spriteId)?.id || parentCBlock.id;
            }
        }
    
        const blocksToDelete = [];
        let queue = [startBlockId];
        const visited = new Set([startBlockId]);
    
        while (queue.length > 0) {
            const currentId = queue.shift();
            blocksToDelete.push(currentId);
            const block = sprite.blocks[currentId];
            if (!block) continue;
    
            if (block.inputs) {
                for (const key in block.inputs) {
                    const childId = block.inputs[key].blockId;
                    if (childId && !visited.has(childId)) {
                        queue.push(childId); visited.add(childId);
                    }
                }
            }
            const connections = [block.next, block.child, block.child2];
            connections.forEach(connId => {
                if (connId && !visited.has(connId)) {
                    queue.push(connId); visited.add(connId);
                }
            });
        }
    
        blocksToDelete.forEach(id => {
            document.getElementById(id)?.remove();
            delete sprite.blocks[id];
        });
    
        if (rootToUpdate) {
            this.updateBlockPositions(rootToUpdate);
        }
    
        this.uiUpdateCallback();
    },

    switchBlock(blockId, newBlockType) {
        const sprite = this.getActiveSprite();
        if (!sprite) return;
    
        const oldBlock = sprite.blocks[blockId];
        if (!oldBlock) return;
    
        const newBlockDef = this.blockDefinitions[newBlockType];
        if (!newBlockDef) return;
    
        this.logToConsole(`Block switched from '${oldBlock.type}' to '${newBlockType}'.`, 'action');

        const newBlockData = {
            ...(typeof structuredClone === 'function' ? structuredClone(newBlockDef.spec) : JSON.parse(JSON.stringify(newBlockDef.spec))),
            id: oldBlock.id,
            spriteId: oldBlock.spriteId,
            position: oldBlock.position,
            previous: oldBlock.previous,
            next: oldBlock.next,
            child: oldBlock.child,
            child2: oldBlock.child2,
            parentInput: oldBlock.parentInput,
            monitored: oldBlock.monitored,
            cInnerHeight1: oldBlock.cInnerHeight1,
            cInnerHeight2: oldBlock.cInnerHeight2,
        };
    
        if (newBlockData.inputs && oldBlock.inputs) {
            for (const key in newBlockData.inputs) {
                if (oldBlock.inputs[key] !== undefined) {
                    const oldInput = oldBlock.inputs[key];
                    const newInput = newBlockData.inputs[key];

                    const isCompatible = this.isCompatibleShape(oldBlock.outputType, newInput.shape, newInput.acceptedShapes);

                    if (isCompatible) {
                        newInput.value = oldInput.value;
                    }
                    
                    if (oldInput.blockId && isCompatible) {
                        newInput.blockId = oldInput.blockId;
                        const childBlock = sprite.blocks[newInput.blockId];
                        if (childBlock && childBlock.parentInput) {
                             childBlock.parentInput.inputKey = key;
                        }
                    }
                }
            }
        }
        
        sprite.blocks[blockId] = newBlockData;
    
        const rootId = this.getStackRoot(blockId, sprite.id)?.id || blockId;
        this.updateBlockPositions(rootId);
        this.uiUpdateCallback();
    },
});