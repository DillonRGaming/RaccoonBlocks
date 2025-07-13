Object.assign(window.Raccoon, {
    calculateTempCShapeHeight(cBlockData, draggedBlockData, snapType) {
        const cTopH = 28, cMidH = 24, cBottomH = 24, cInnerMinH = 32;
        
        const draggedStackHeight = draggedBlockData ? this.calculateStackHeight(draggedBlockData, this.getAllBlocksForSprite(draggedBlockData.spriteId)) : 0;
        
        const tempCBlock = { ...cBlockData }; 

        let innerHeight1 = cInnerMinH;
        let innerHeight2 = cInnerMinH;

        if (snapType === 'child') {
            innerHeight1 = Math.max(cInnerMinH, draggedStackHeight);
        } else if (cBlockData.child) {
             const existingChild = this.getAllBlocksForSprite(cBlockData.spriteId)[cBlockData.child];
             if(existingChild) {
                innerHeight1 = Math.max(cInnerMinH, this.calculateStackHeight(existingChild, this.getAllBlocksForSprite(cBlockData.spriteId)));
             }
        }

        if (cBlockData.type === 'control_if_else') {
            if (snapType === 'child2') {
                innerHeight2 = Math.max(cInnerMinH, draggedStackHeight);
            } else if (cBlockData.child2) {
                const existingChild2 = this.getAllBlocksForSprite(cBlockData.spriteId)[cBlockData.child2];
                if(existingChild2) {
                    innerHeight2 = Math.max(cInnerMinH, this.calculateStackHeight(existingChild2, this.getAllBlocksForSprite(cBlockData.spriteId)));
                }
            }
        }

        if (tempCBlock.type === 'control_if_else') {
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
                rootToUpdate = this.getStackRoot(prevBlock.id, sprite.id)?.id;
            }
        } else if (block.parentInput) {
            const parentBlock = sprite.blocks[block.parentInput.blockId];
            if (parentBlock && parentBlock.inputs[block.parentInput.inputKey]?.blockId === blockId) {
                parentBlock.inputs[block.parentInput.inputKey].blockId = null;
                rootToUpdate = this.getStackRoot(parentBlock.id, sprite.id)?.id;
            }
        } else {
            const cParent = Object.values(sprite.blocks).find(p => p.child === blockId || p.child2 === blockId);
            if (cParent) {
                if (cParent.child === blockId) cParent.child = null;
                if (cParent.child2 === blockId) cParent.child2 = null;
                rootToUpdate = this.getStackRoot(cParent.id, sprite.id)?.id;
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
        const draggedIsStackable = ['stack', 'c_shape'].includes(draggedBlock.shape);
        const draggedIsReporterBoolean = ['reporter', 'boolean'].includes(draggedBlock.outputType);
        
        const draggedRect = { left: draggedBlock.position.x, top: draggedBlock.position.y, height: draggedBlock.height, width: draggedBlock.width };
        let closestSnap = { distance: this.snapThreshold + 10, target: null }; 

        for (const blockId in allBlocks) {
            if (blockId === draggedBlockId || this.getStackRoot(blockId, draggedSpriteId)?.id === draggedBlockId) continue;
            
            const targetBlock = allBlocks[blockId];
            const targetRect = { left: targetBlock.position.x, top: targetBlock.position.y, height: targetBlock.height, width: targetBlock.width };
            const targetCanReceiveStack = ['hat', 'stack', 'c_shape'].includes(targetBlock.shape);

            if (draggedIsStackable && targetCanReceiveStack && !targetBlock.parentInput) {
                const distBelow = Math.hypot(draggedRect.left - targetRect.left, draggedRect.top - (targetRect.top + targetRect.height));
                if (distBelow < closestSnap.distance) {
                    closestSnap.distance = distBelow;
                    closestSnap.target = targetBlock.next 
                        ? { type: 'insert', prevBlockId: blockId, nextBlockId: targetBlock.next } 
                        : { type: 'next', blockId };
                }
                
                const lastDragged = this.getLastBlockInStack(draggedBlockId, allBlocks);
                const lastDraggedRect = lastDragged ? { left: lastDragged.position.x, top: lastDragged.position.y, height: lastDragged.height, width: lastDragged.width } : draggedRect;
                const distAbove = Math.hypot(lastDraggedRect.left - targetRect.left, (lastDraggedRect.top + lastDraggedRect.height) - targetRect.top);
                if (distAbove < closestSnap.distance) {
                    closestSnap.distance = distAbove;
                    closestSnap.target = { type: 'prev', blockId };
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
                
                for (const item of targetBlock.layout) {
                    let itemWidth = 0;
                    if (item.type === 'input' || item.type === 'dropdown') {
                        const inputData = targetBlock.inputs[item.key];
                        if (inputData && !inputData.blockId && draggedBlock.shape === inputData.shape) {
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

            if (draggedIsC && !draggedBlock.child && targetBlock.previous === null && targetBlock.parentInput === null && !targetBlock.shape.startsWith('hat')) {
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
             document.getElementById(this.dragState.draggedBlockId)?.classList.remove('can-snap');
        }

        if (this.dragState.lastSnapHighlight) {
            const { blockId, originalHeight, type } = this.dragState.lastSnapHighlight;
            const targetBlockData = this.getActiveBlocks()[blockId];

            if (targetBlockData) {
                if ((type === 'child' || type === 'child2' || type === 'wrap') && targetBlockData.height !== originalHeight) {
                    targetBlockData.height = originalHeight;
                    this.updateBlockPositions(this.getStackRoot(targetBlockData.id, targetBlockData.spriteId)?.id);
                }
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

        document.getElementById(draggedBlock.id)?.classList.add('can-snap');
        
        const targetBlock = allBlocks[snapTarget.blockId || snapTarget.prevBlockId || snapTarget.targetStackId];
        if (!targetBlock) return; 

        switch (snapTarget.type) {
            case 'child':
            case 'child2': {
                const originalTargetHeight = targetBlock.height;
                targetBlock.height = this.calculateTempCShapeHeight(targetBlock, draggedBlock, snapTarget.type);
                this.renderBlock(targetBlock);
                this.dragState.lastSnapHighlight = { blockId: snapTarget.blockId, originalHeight: originalTargetHeight, type: snapTarget.type };
                break;
            }
            case 'wrap': {
                 const originalDraggedHeight = draggedBlock.height;
                 draggedBlock.height = this.calculateTempCShapeHeight(draggedBlock, targetBlock, 'child');
                 this.renderBlock(draggedBlock);
                 this.dragState.lastSnapHighlight = { blockId: draggedBlock.id, originalHeight: originalDraggedHeight, type: snapTarget.type };
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

        let rootToUpdate = draggedBlockId;

        switch (snapTarget.type) {
            case 'next': {
                const targetBlock = allBlocks[snapTarget.blockId];
                targetBlock.next = draggedBlockId;
                draggedBlock.previous = snapTarget.blockId;
                rootToUpdate = this.getStackRoot(targetBlock.id, draggedSpriteId)?.id;
                break;
            }
            case 'prev': {
                const targetBlock = allBlocks[snapTarget.blockId];
                const lastDragged = this.getLastBlockInStack(draggedBlockId, allBlocks);
                if (lastDragged) {
                    lastDragged.next = targetBlock.id;
                    targetBlock.previous = lastDragged.id;
                }
                rootToUpdate = this.getStackRoot(draggedBlockId, draggedSpriteId)?.id;
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
                targetStack.parentInput = null;

                cBlock.position.x = targetStack.position.x - 20;
                cBlock.position.y = targetStack.position.y - 28;
                
                rootToUpdate = cBlock.id;
                break;
            }
        }
        
        if(rootToUpdate) this.updateBlockPositions(rootToUpdate);
        this.uiUpdateCallback();
    },
});