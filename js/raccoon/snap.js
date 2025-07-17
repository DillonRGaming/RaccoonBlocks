Object.assign(window.Raccoon, {
    calculateTempCShapeHeight(cBlockData, draggedBlockData, snapType) {
        const cTopH = 28, cMidH = 24, cBottomH = 24, cInnerMinH = 32;
        
        const draggedStackHeight = draggedBlockData ? this.calculateStackHeight(draggedBlockData, this.getAllBlocksForSprite(draggedBlockData.spriteId)) : 0;
        
        let innerHeight1 = cBlockData.cInnerHeight1 || cInnerMinH;
        let innerHeight2 = (cBlockData.type === 'control_if_else' ? (cBlockData.cInnerHeight2 || cInnerMinH) : 0);

        if (snapType === 'child') {
            innerHeight1 = Math.max(cInnerMinH, draggedStackHeight);
        } else if (snapType === 'child2') {
            innerHeight2 = Math.max(cInnerMinH, draggedStackHeight);
        }

        if (cBlockData.type === 'control_if_else') {
            return cTopH + innerHeight1 + cMidH + innerHeight2 + cBottomH;
        } else {
            return cTopH + innerHeight1 + cBottomH;
        }
    },

    unsnap(blockId) {
        const sprite = this.getActiveSprite();
        if (!sprite) return;
        const block = sprite.blocks[blockId];
        if (!block) return;

        let rootToUpdate = null;

        if (block.previous) {
            const prevBlock = sprite.blocks[block.previous];
            if (prevBlock && prevBlock.next === blockId) {
                prevBlock.next = null;
                rootToUpdate = this.getStackRoot(prevBlock.id, sprite.id)?.id || prevBlock.id;
                
                const rootBlock = allBlocks[rootToUpdate];
                const parentCBlock = rootBlock && rootBlock.parentInput ? allBlocks[rootBlock.parentInput.blockId] : null;
                if (parentCBlock && parentCBlock.shape.startsWith('c_shape')) {
                    rootToUpdate = this.getStackRoot(parentCBlock.id, sprite.id)?.id || parentCBlock.id;
                }
            }
        } 
        else if (block.parentInput) {
            const parentBlock = sprite.blocks[block.parentInput.blockId];
            if (parentBlock && parentBlock.inputs[block.parentInput.inputKey]) {
                parentBlock.inputs[block.parentInput.inputKey].blockId = null;
                rootToUpdate = this.getStackRoot(parentBlock.id, sprite.id)?.id || parentBlock.id;
            }
        } 
        else {
            const parentCBlock = Object.values(sprite.blocks).find(p => p.child === blockId || p.child2 === blockId);
            if (parentCBlock) {
                if (parentCBlock.child === blockId) parentCBlock.child = null;
                if (parentCBlock.child2 === blockId) parentCBlock.child2 = null;
                rootToUpdate = this.getStackRoot(parentCBlock.id, sprite.id)?.id || parentCBlock.id;
            }
        }
    
        block.previous = null;
        block.parentInput = null;

        if (rootToUpdate) {
            this.updateBlockPositions(rootToUpdate);
        }
    },

    findSnapTarget() {
        this.dragState.snapTarget = null;
        const { draggedBlockId, draggedSpriteId } = this.dragState;
        if (!draggedBlockId) return;

        const allBlocks = this.getAllBlocksForSprite(draggedSpriteId);
        const draggedBlock = allBlocks[draggedBlockId];
        if (!draggedBlock) return;
        
        const draggedIsC = draggedBlock.shape.startsWith('c_shape');
        const draggedIsHat = draggedBlock.shape === 'hat';
        const draggedIsStackable = ['stack', 'c_shape'].includes(draggedBlock.shape) && !draggedIsHat; 
        const draggedIsReporterBoolean = ['reporter', 'boolean', 'reporter.leaf', 'reporter.square', 'reporter.octagonal', 'boolean.octagonal'].includes(draggedBlock.outputType) || draggedBlock.shape.startsWith('reporter') || draggedBlock.shape.startsWith('boolean');
        
        const draggedRect = { left: draggedBlock.position.x, top: draggedBlock.position.y, height: draggedBlock.height, width: draggedBlock.width };
        let closestSnap = { distance: this.snapThreshold, target: null };

        for (const blockId in allBlocks) {
            if (blockId === draggedBlockId || this.getStackRoot(blockId, draggedSpriteId)?.id === draggedBlockId) continue;
            
            const targetBlock = allBlocks[blockId];
            const targetRect = { left: targetBlock.position.x, top: targetBlock.position.y, height: targetBlock.height, width: targetBlock.width };
            const targetCanReceiveStack = ['stack', 'c_shape', 'hat'].includes(targetBlock.shape); 

            if (draggedIsStackable && targetCanReceiveStack && !targetBlock.next) { 
                const distBelow = Math.hypot(draggedRect.left - targetRect.left, draggedRect.top - (targetRect.top + targetRect.height));
                if (distBelow < closestSnap.distance) {
                    closestSnap.distance = distBelow;
                    closestSnap.target = { type: 'next', blockId }; 
                }
            }
            
            if (draggedIsStackable && targetBlock.previous) {
                const prevBlock = allBlocks[targetBlock.previous];
                const distBetween = Math.hypot(draggedRect.left - prevBlock.position.x, draggedRect.top - (prevBlock.position.y + prevBlock.height));
                if (distBetween < closestSnap.distance) {
                    closestSnap.distance = distBetween;
                    closestSnap.target = { type: 'insert', prevBlockId: prevBlock.id, nextBlockId: targetBlock.id };
                }
            }
            
            if (draggedIsHat && targetBlock.previous === null && targetBlock.parentInput === null && !['hat'].includes(targetBlock.shape)) {
                const dist = Math.hypot(draggedRect.left - targetRect.left, (draggedRect.top + draggedRect.height) - targetRect.top);
                if (dist < closestSnap.distance) {
                    closestSnap = { distance: dist, target: { type: 'hat', blockId } };
                }
            }

            if (draggedIsStackable && targetBlock.shape.startsWith('c_shape') && !targetBlock.child) {
                 const dist = Math.hypot(draggedRect.left - (targetRect.left + 20), draggedRect.top - (targetRect.top + 28));
                 if (dist < closestSnap.distance) {
                    closestSnap = { distance: dist, target: { type: 'child', blockId } };
                 }
            }
            
            if (draggedIsStackable && targetBlock.type === 'control_if_else' && !targetBlock.child2) {
                const cTopH = 28, cMidH = 24, cInnerMinH = 32;
                let innerH1 = targetBlock.child ? Math.max(cInnerMinH, this.calculateStackHeight(allBlocks[targetBlock.child], allBlocks)) : cInnerMinH;
                const snapY = targetRect.top + cTopH + innerH1 + cMidH;
                const dist = Math.hypot(draggedRect.left - (targetRect.left + 20), draggedRect.top - snapY);
                if (dist < closestSnap.distance) {
                    closestSnap = { distance: dist, target: { type: 'child2', blockId } };
                }
            }
            
            if (draggedIsReporterBoolean && targetBlock.inputs) {
                let xOffset = 10;
                const PADDING_BETWEEN_ITEMS = 8;
                const contentVCenter = (targetBlock.shape.startsWith('c_shape') ? 14 : targetBlock.height / 2);
                
                for (const item of (targetBlock.layout || [])) {
                    let itemWidth = 0;
                    if (item.type === 'input' || item.type === 'dropdown') {
                        const inputData = targetBlock.inputs[item.key];
                        const isCompatible = this.isCompatibleShape(draggedBlock.outputType, inputData.shape, inputData.acceptedShapes);
                        
                        if (inputData && !inputData.blockId && isCompatible) {
                            const dist = Math.hypot(draggedRect.left - (targetRect.left + xOffset), draggedRect.top - (targetRect.top + contentVCenter - (draggedBlock.height / 2)));
                            if (dist < closestSnap.distance) {
                                closestSnap = { distance: dist, target: { type: 'input', blockId, inputKey: item.key } };
                            }
                        }
                        const childBlock = inputData.blockId ? allBlocks[inputData.blockId] : null;
                        itemWidth = childBlock ? childBlock.width : (inputData.width || 30);
                    } else if (item.type === 'label' || item.type === 'operator') {
                        itemWidth = this.measureText(item.text || '');
                    } else if (item.type === 'icon') {
                        itemWidth = 16;
                    }
                    if (itemWidth > 0) xOffset += itemWidth + PADDING_BETWEEN_ITEMS;
                }
            }

            if (draggedIsC && !draggedBlock.child && targetBlock.previous === null && targetBlock.parentInput === null) { 
                const cMouthX = draggedRect.left + 20;
                const cMouthY = draggedRect.top + 28;
                const targetStackTopX = targetRect.left;
                const targetStackTopY = targetRect.top;
                const dist = Math.hypot(cMouthX - targetStackTopX, cMouthY - targetStackTopY);
                if (dist < closestSnap.distance) {
                    closestSnap = { distance: dist, target: { type: 'wrap', cBlockId: draggedBlockId, targetStackId: blockId } };
                }
            }
        }
        this.dragState.snapTarget = closestSnap.target;
    },

    clearLiveSnapFeedback() {
        if (this.dragState.draggedBlockId) {
            const draggedStack = this.getStackAndDescendants(this.dragState.draggedBlockId);
            draggedStack.forEach(b => {
                 document.getElementById(b.id)?.classList.remove('can-snap');
            });
        }

        if (this.dragState.lastSnapHighlight) {
            const { blockId } = this.dragState.lastSnapHighlight;
            const targetBlockData = this.getActiveBlocks()[blockId];

            if (targetBlockData && targetBlockData.shape.startsWith('c_shape')) {
                const rootId = this.getStackRoot(targetBlockData.id, targetBlockData.spriteId)?.id;
                if (rootId) this.updateBlockPositions(rootId);
            }
        }
        
        this.dragState.liveFeedbackData = null;
        this.dragState.lastSnapHighlight = null;
    },

    applyLiveSnapFeedback(snapTarget) {
        if (!snapTarget) {
            this.clearLiveSnapFeedback();
            return;
        }
        if (JSON.stringify(snapTarget) === JSON.stringify(this.dragState.liveFeedbackData)) {
            return;
        }

        this.clearLiveSnapFeedback();
        this.dragState.liveFeedbackData = snapTarget;

        const allBlocks = this.getActiveBlocks();
        const draggedBlock = allBlocks[this.dragState.draggedBlockId];
        if (!draggedBlock) return;

        const draggedStack = this.getStackAndDescendants(draggedBlock.id);
        draggedStack.forEach(b => {
            document.getElementById(b.id)?.classList.add('can-snap');
        });
        
        const targetBlock = allBlocks[snapTarget.blockId || snapTarget.prevBlockId || snapTarget.targetStackId];
        if (!targetBlock) return; 

        switch (snapTarget.type) {
            case 'child':
            case 'child2':
            case 'wrap': {
                const cBlock = snapTarget.type === 'wrap' ? draggedBlock : targetBlock;
                const childStack = snapTarget.type === 'wrap' ? targetBlock : draggedBlock;
                
                const originalHeight = cBlock.height;
                const tempHeight = this.calculateTempCShapeHeight(cBlock, childStack, snapTarget.type === 'child2' ? 'child2' : 'child');

                if (cBlock.height !== tempHeight) {
                    cBlock.height = tempHeight;
                    const rootId = this.getStackRoot(cBlock.id, cBlock.spriteId)?.id;
                    if(rootId) this.updateBlockPositions(rootId);
                    this.dragState.lastSnapHighlight = { blockId: cBlock.id, originalHeight, type: snapTarget.type };
                }
                break;
            }
            default:
                this.dragState.lastSnapHighlight = { blockId: targetBlock.id, type: snapTarget.type };
                break;
        }
    },

    applySnap() {
        const { snapTarget, draggedBlockId, draggedSpriteId } = this.dragState;
        if (!snapTarget || !draggedBlockId) return;

        const allBlocks = this.getAllBlocksForSprite(draggedSpriteId);
        const draggedBlock = allBlocks[draggedBlockId];
        if (!draggedBlock) return;
        
        this.unsnap(draggedBlockId);
        this.logToConsole(`Block '${draggedBlock.type}' snapped.`, 'action');

        let rootToUpdate = draggedBlockId;

        switch (snapTarget.type) {
            case 'next': {
                const targetBlock = allBlocks[snapTarget.blockId];
                targetBlock.next = draggedBlockId;
                draggedBlock.previous = snapTarget.blockId;
                rootToUpdate = this.getStackRoot(targetBlock.id, draggedSpriteId)?.id;
                break;
            }
            case 'insert': {
                const prevBlock = allBlocks[snapTarget.prevBlockId];
                const nextBlock = allBlocks[snapTarget.nextBlockId];
                const lastDragged = this.getLastBlockInStack(draggedBlockId, allBlocks);

                prevBlock.next = draggedBlockId;
                draggedBlock.previous = prevBlock.id;

                if (lastDragged) {
                    lastDragged.next = nextBlock.id;
                    nextBlock.previous = lastDragged.id;
                }
                rootToUpdate = this.getStackRoot(prevBlock.id, draggedSpriteId)?.id;
                break;
            }
            case 'child':
            case 'child2': {
                const targetBlock = allBlocks[snapTarget.blockId];
                targetBlock[snapTarget.type] = draggedBlockId;
                draggedBlock.parentInput = { blockId: targetBlock.id, inputKey: snapTarget.type };
                rootToUpdate = this.getStackRoot(targetBlock.id, draggedSpriteId)?.id;
                break;
            }
            case 'input': {
                const targetBlock = allBlocks[snapTarget.blockId];
                targetBlock.inputs[snapTarget.inputKey].blockId = draggedBlockId;
                draggedBlock.parentInput = { blockId: snapTarget.blockId, inputKey: snapTarget.inputKey };
                rootToUpdate = this.getStackRoot(targetBlock.id, draggedSpriteId)?.id;
                break;
            }
            case 'wrap': {
                const cBlock = allBlocks[snapTarget.cBlockId];
                const targetStack = allBlocks[snapTarget.targetStackId];

                cBlock.child = snapTarget.targetStackId;
                targetStack.previous = null;
                targetStack.parentInput = { blockId: cBlock.id, inputKey: 'child' };
                cBlock.position.x = targetStack.position.x - 20;
                cBlock.position.y = targetStack.position.y - 28;
                
                rootToUpdate = cBlock.id;
                break;
            }
            case 'hat': {
                const targetBlock = allBlocks[snapTarget.blockId];
                draggedBlock.next = targetBlock.id;
                targetBlock.previous = draggedBlock.id;
                draggedBlock.position.x = targetBlock.position.x;
                draggedBlock.position.y = targetBlock.position.y - draggedBlock.height;
                rootToUpdate = draggedBlock.id;
                break;
            }
        }
        
        if(rootToUpdate) this.updateBlockPositions(rootToUpdate);
        this.uiUpdateCallback();
    },

    isCompatibleShape(draggedOutputShape, targetInputShape, acceptedShapes = []) {
        if (!draggedOutputShape || !targetInputShape) return false;
        if (targetInputShape === 'any') return true;
        if (acceptedShapes.includes(draggedOutputShape)) return true;
        if (acceptedShapes.includes('any')) return true;

        if (targetInputShape === 'reporter' && (draggedOutputShape === 'reporter' || draggedOutputShape.startsWith('reporter.'))) {
            return true;
        }
        if (targetInputShape === 'boolean' && (draggedOutputShape === 'boolean' || draggedOutputShape.startsWith('boolean.'))) {
            return true;
        }
        return false;
    }
});