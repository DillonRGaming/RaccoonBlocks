Object.assign(window.Raccoon, {
    // Requirement 5: Calculate the temporary height of a C-block if a stack were to snap into its child slot(s)
    calculateTempCShapeHeight(cBlockData, draggedBlockData, snapType) {
        const cTopH = 28, cMidH = 24, cBottomH = 24, cInnerMinH = 32;
        
        // Calculate the height of the dragged stack (if any)
        const draggedStackHeight = draggedBlockData ? this.calculateStackHeight(draggedBlockData, this.getAllBlocksForSprite(draggedBlockData.spriteId)) : 0;
        
        // Use current cBlockData's inner heights as a base for existing children
        let innerHeight1 = cBlockData.cInnerHeight1 || cInnerMinH;
        let innerHeight2 = cBlockData.cInnerHeight2 || cInnerMinH;

        // Adjust inner height based on the potential snap
        if (snapType === 'child') {
            innerHeight1 = Math.max(cInnerMinH, draggedStackHeight);
        } else if (snapType === 'child2') {
            innerHeight2 = Math.max(cInnerMinH, draggedStackHeight);
        }

        // Calculate total height based on inner heights
        if (cBlockData.type === 'control_if_else') {
            return cTopH + innerHeight1 + cMidH + innerHeight2 + cBottomH;
        } else {
            return cTopH + innerHeight1 + cBottomH;
        }
    },

    // Unsnaps a block from its current parent (previous, parentInput, or C-block child)
    unsnap(blockId) {
        const sprite = this.getActiveSprite();
        if (!sprite) return;
        const block = sprite.blocks[blockId];
        if (!block) return;

        let rootToUpdate = null;

        // If block has a previous block in a stack
        if (block.previous) {
            const prevBlock = sprite.blocks[block.previous];
            if (prevBlock && prevBlock.next === blockId) {
                prevBlock.next = null; // Break the connection
                rootToUpdate = this.getStackRoot(prevBlock.id, sprite.id)?.id || prevBlock.id; // Get new root of the (now disconnected) previous stack
                
                // If the stack is inside a C-block, we need to update the C-block's height
                const rootBlock = sprite.blocks[rootToUpdate];
                if (rootBlock.parentInput) {
                    const parentBlock = sprite.blocks[rootBlock.parentInput.blockId];
                    if (parentBlock && parentBlock.shape.startsWith('c_shape')) {
                        // The root to update is actually the C-block's root
                        rootToUpdate = this.getStackRoot(parentBlock.id, sprite.id)?.id || parentBlock.id;
                        // Nullify height to force recalc in updateBlockPositions/updateLayout
                        if (rootBlock.parentInput.inputKey === 'child') parentBlock.cInnerHeight1 = null;
                        if (rootBlock.parentInput.inputKey === 'child2') parentBlock.cInnerHeight2 = null;
                    }
                }
            }
        } 
        // If block is an input block connected to a parent input socket
        else if (block.parentInput) {
            const parentBlock = sprite.blocks[block.parentInput.blockId];
            if (parentBlock && parentBlock.inputs[block.parentInput.inputKey]) {
                parentBlock.inputs[block.parentInput.inputKey].blockId = null;
                if (parentBlock.shape.startsWith('c_shape')) {
                     parentBlock.cInnerHeight1 = null;
                     parentBlock.cInnerHeight2 = null;
                }
                rootToUpdate = this.getStackRoot(parentBlock.id, sprite.id)?.id || parentBlock.id;
            }
        } 
        // If block is a child of a C-block
        else {
            const parentCBlock = Object.values(sprite.blocks).find(p => p.child === blockId || p.child2 === blockId);
            if (parentCBlock) {
                if (parentCBlock.child === blockId) parentCBlock.child = null;
                if (parentCBlock.child2 === blockId) parentCBlock.child2 = null;
                parentCBlock.cInnerHeight1 = null;
                parentCBlock.cInnerHeight2 = null;
                rootToUpdate = this.getStackRoot(parentCBlock.id, sprite.id)?.id || parentCBlock.id;
            }
        }
    
        block.previous = null;
        block.parentInput = null;

        if (rootToUpdate) {
            this.updateBlockPositions(rootToUpdate);
        }
    },

    // Finds the best snap target for the currently dragged block
    findSnapTarget() {
        this.dragState.snapTarget = null; // Reset snap target
        const { draggedBlockId, draggedSpriteId } = this.dragState;
        if (!draggedBlockId) return;

        const allBlocks = this.getAllBlocksForSprite(draggedSpriteId);
        const draggedBlock = allBlocks[draggedBlockId];
        if (!draggedBlock) return;
        
        const draggedIsC = draggedBlock.shape.startsWith('c_shape');
        const draggedIsHat = draggedBlock.shape === 'hat';
        // Requirement 1: Hat blocks are not stackable below other blocks
        const draggedIsStackable = ['stack', 'c_shape'].includes(draggedBlock.shape) && !draggedIsHat; 
        const draggedIsReporterBoolean = ['reporter', 'boolean'].includes(draggedBlock.outputType) || ['reporter.leaf', 'reporter.square', 'reporter.octagon'].includes(draggedBlock.shape);
        
        const draggedRect = { left: draggedBlock.position.x, top: draggedBlock.position.y, height: draggedBlock.height, width: draggedBlock.width };
        let closestSnap = { distance: this.snapThreshold + 10, target: null }; // Initialize with distance greater than threshold

        for (const blockId in allBlocks) {
            if (blockId === draggedBlockId || this.getStackRoot(blockId, draggedSpriteId)?.id === draggedBlockId) continue;
            
            const targetBlock = allBlocks[blockId];
            const targetRect = { left: targetBlock.position.x, top: targetBlock.position.y, height: targetBlock.height, width: targetBlock.width };
            const targetCanReceiveStack = ['stack', 'c_shape', 'hat'].includes(targetBlock.shape); 

            // Snap below a block (stacking) - dragged block cannot be a hat
            // Requirement 1: Hat blocks can only be snapped to the top of a stack, not below other blocks.
            if (draggedIsStackable && targetCanReceiveStack) { 
                const distBelow = Math.hypot(draggedRect.left - targetRect.left, draggedRect.top - (targetRect.top + targetRect.height));
                if (distBelow < closestSnap.distance) {
                    closestSnap.distance = distBelow;
                    closestSnap.target = targetBlock.next 
                        ? { type: 'insert', prevBlockId: blockId, nextBlockId: targetBlock.next } 
                        : { type: 'next', blockId }; 
                }
            }
            // Requirement 1: Snap a hat block to the top of a stack
            if (draggedIsHat && targetBlock.previous === null && targetBlock.parentInput === null && !targetBlock.shape.startsWith('hat')) {
                const dist = Math.hypot(draggedRect.left - targetRect.left, draggedRect.top - (targetRect.top - draggedRect.height)); // No overlap
                if (dist < closestSnap.distance) {
                    closestSnap = { distance: dist, target: { type: 'hat', blockId } };
                }
            }
            

            // Snap into a C-block's main child area - dragged block cannot be a hat
            if (draggedIsStackable && targetBlock.shape.startsWith('c_shape') && !targetBlock.child) {
                 const dist = Math.hypot(draggedRect.left - (targetRect.left + 20), draggedRect.top - (targetRect.top + 28));
                 if (dist < closestSnap.distance) {
                    closestSnap = { distance: dist, target: { type: 'child', blockId } };
                 }
            }
            
            // Snap into a C-block's 'else' child area (only for if-else blocks) - dragged block cannot be a hat
            if (draggedIsStackable && targetBlock.type === 'control_if_else' && !targetBlock.child2) {
                const cTopH = 28, cMidH = 24, cInnerMinH = 32;
                let innerH1 = targetBlock.child ? Math.max(cInnerMinH, this.calculateStackHeight(allBlocks[targetBlock.child], allBlocks)) : cInnerMinH;
                const snapY = targetRect.top + cTopH + innerH1 + cMidH;
                const dist = Math.hypot(draggedRect.left - (targetRect.left + 20), draggedRect.top - snapY);
                if (dist < closestSnap.distance) {
                    closestSnap = { distance: dist, target: { type: 'child2', blockId } };
                }
            }
            
            // Snap into an input socket (reporter or boolean)
            if (draggedIsReporterBoolean && targetBlock.inputs) {
                let xOffset = 10;
                const PADDING_BETWEEN_ITEMS = 8;
                const contentVCenter = (targetBlock.shape.startsWith('c_shape') ? 14 : targetBlock.height / 2);
                
                for (const item of targetBlock.layout) {
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

            // Snap a C-block around another stack (wrapping)
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
            const { blockId, originalHeight, type } = this.dragState.lastSnapHighlight;
            const targetBlockData = this.getActiveBlocks()[blockId];

            if (targetBlockData) {
                if (targetBlockData.shape.startsWith('c_shape') && targetBlockData.height !== originalHeight) {
                    targetBlockData.cInnerHeight1 = null; 
                    targetBlockData.cInnerHeight2 = null;
                    this.updateLayout(targetBlockData, false);
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

        const draggedStack = this.getStackAndDescendants(draggedBlock.id);
        draggedStack.forEach(b => {
            document.getElementById(b.id)?.classList.add('can-snap');
        });
        
        const targetBlock = allBlocks[snapTarget.blockId || snapTarget.prevBlockId || snapTarget.targetStackId];
        if (!targetBlock) return; 

        switch (snapTarget.type) {
            case 'child':
            case 'child2': {
                const originalTargetHeight = targetBlock.height;
                // Requirement 5: Calculate temporary C-block height for live feedback
                if (snapTarget.type === 'child') {
                    targetBlock.cInnerHeight1 = Math.max(32, this.calculateStackHeight(draggedBlock, allBlocks));
                } else if (snapTarget.type === 'child2') {
                    targetBlock.cInnerHeight2 = Math.max(32, this.calculateStackHeight(draggedBlock, allBlocks));
                }
                targetBlock.height = this.calculateTempCShapeHeight(targetBlock, draggedBlock, snapTarget.type);
                
                this.renderBlock(targetBlock);
                this.updateBlockPositions(this.getStackRoot(targetBlock.id, targetBlock.spriteId)?.id);
                this.dragState.lastSnapHighlight = { blockId: snapTarget.blockId, originalHeight: originalTargetHeight, type: snapTarget.type };
                break;
            }
            case 'wrap': {
                 const originalDraggedHeight = draggedBlock.height;
                 // Requirement 5: Calculate temporary C-block height for live feedback when wrapping
                 draggedBlock.cInnerHeight1 = Math.max(32, this.calculateStackHeight(targetBlock, allBlocks));
                 draggedBlock.height = this.calculateTempCShapeHeight(draggedBlock, targetBlock, 'child'); 
                 this.renderBlock(draggedBlock);
                 this.updateBlockPositions(draggedBlock.id);
                 this.dragState.lastSnapHighlight = { blockId: draggedBlock.id, originalHeight: originalDraggedHeight, type: snapTarget.type };
                 break;
            }
            case 'hat': {
                // No height change for hat snap feedback, just highlight
                this.dragState.lastSnapHighlight = { blockId: targetBlock.id, type: snapTarget.type };
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

                // If the stack is inside a C-block, we need to update the C-block's height
                const rootBlock = allBlocks[rootToUpdate];
                if (rootBlock.parentInput) {
                    const parentBlock = allBlocks[rootBlock.parentInput.blockId];
                    if (parentBlock && parentBlock.shape.startsWith('c_shape')) {
                        // The root to update is actually the C-block's root
                        rootToUpdate = this.getStackRoot(parentBlock.id, draggedSpriteId)?.id || parentBlock.id;
                        // Nullify height to force recalc in updateBlockPositions/updateLayout
                        if (rootBlock.parentInput.inputKey === 'child') parentBlock.cInnerHeight1 = null;
                        if (rootBlock.parentInput.inputKey === 'child2') parentBlock.cInnerHeight2 = null;
                    }
                }
                break;
            }
            case 'child':
            case 'child2': {
                const targetBlock = allBlocks[snapTarget.blockId];
                targetBlock[snapTarget.type] = draggedBlockId;
                draggedBlock.parentInput = { blockId: targetBlock.id, inputKey: snapTarget.type };
                
                // Requirement 5: Update C-block inner heights on snap
                if (snapTarget.type === 'child') targetBlock.cInnerHeight1 = Math.max(32, this.calculateStackHeight(draggedBlock, allBlocks));
                else if (snapTarget.type === 'child2') targetBlock.cInnerHeight2 = Math.max(32, this.calculateStackHeight(draggedBlock, allBlocks));

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

                // Requirement 5: Update C-block inner height on wrap snap
                cBlock.cInnerHeight1 = Math.max(32, this.calculateStackHeight(targetStack, allBlocks));

                // Adjust C-block position to wrap around the target stack
                cBlock.position.x = targetStack.position.x - 20;
                cBlock.position.y = targetStack.position.y - 28;
                
                rootToUpdate = cBlock.id;
                break;
            }
            case 'hat': {
                const targetBlock = allBlocks[snapTarget.blockId];
                draggedBlock.next = targetBlock.id;
                targetBlock.previous = draggedBlock.id;
                // Adjust hat block position to snap above the target stack
                draggedBlock.position.x = targetBlock.position.x;
                draggedBlock.position.y = targetBlock.position.y - draggedBlock.height; // No overlap
                rootToUpdate = draggedBlock.id;
                break;
            }
        }
        
        if(rootToUpdate) this.updateBlockPositions(rootToUpdate);
        this.uiUpdateCallback();
    },

    isCompatibleShape(draggedOutputShape, targetInputShape, acceptedShapes = ['any']) {
        if (!draggedOutputShape || !targetInputShape) return false;

        if (acceptedShapes.includes('any')) {
            return ['reporter', 'boolean', 'reporter.leaf', 'reporter.square', 'reporter.octagon'].includes(draggedOutputShape);
        }

        if (acceptedShapes.includes(draggedOutputShape)) {
            return true;
        }

        if (targetInputShape === 'reporter' && (draggedOutputShape === 'reporter' || draggedOutputShape.startsWith('reporter.'))) {
            return true;
        }

        if (targetInputShape === 'boolean' && draggedOutputShape === 'boolean') {
            return true;
        }

        return false;
    }
});
