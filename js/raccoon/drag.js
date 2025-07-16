Object.assign(window.Raccoon, {
    initPan(event) { 
        if (event.target === this.workspace || event.target === this.blockContainer) { 
            if (event.target.closest('.block')) return;
            event.preventDefault(); 
            this.view.isPanning = true; 
            this.workspace.classList.add('panning'); 
            this.view.panStartX = event.clientX - this.view.x; 
            this.view.panStartY = event.clientY - this.view.y;
            this.hideReporterOutput(); // Hide reporter bubble when panning
        } 
    },
    
    dragMove(event) {
        if (this.view.isPanning) {
            this.view.x = event.clientX - this.view.panStartX;
            this.view.y = event.clientY - this.view.panStartY;
            this.updateViewTransform();
        } else if (this.dragState.isDragging) {
            // Check if actual movement occurred to differentiate click from drag
            if (!this.dragState.didMove && Math.hypot(event.clientX - this.dragState.dragStartX, event.clientY - this.dragState.dragStartY) > 5) {
                this.dragState.didMove = true;
                // Unsnap the block from any parent only when a drag is detected
                this.unsnap(this.dragState.draggedBlockId);
            }

            const { draggedBlockId, draggedSpriteId } = this.dragState;
            if (!draggedBlockId || !draggedSpriteId) return;

            const blockData = this.sprites[draggedSpriteId]?.blocks[draggedBlockId];
            if (!blockData) return;

            const virtualMousePos = this.screenToVirtual({ x: event.clientX, y: event.clientY });
            
            blockData.position.x = virtualMousePos.x - this.dragState.offsetX;
            blockData.position.y = virtualMousePos.y - this.dragState.offsetY;
            
            this.updateBlockPositions(draggedBlockId); // Re-render dragged stack at new position
            
            this.findSnapTarget();
            this.applyLiveSnapFeedback(this.dragState.snapTarget);

            // Clear live feedback if no snap target is found after one was active
            if (!this.dragState.snapTarget && this.dragState.liveFeedbackData) {
                this.clearLiveSnapFeedback();
            }
        }
    },
    
    async dragEnd(event) {
        this.clearLiveSnapFeedback(); // Always clear snap feedback on drag end
        if (this.view.isPanning) {
            this.view.isPanning = false;
            this.workspace.classList.remove('panning');
        } else if (this.dragState.isDragging) {
            const { draggedBlockId, draggedSpriteId } = this.dragState;
            
            // Remove 'dragging' class and reset z-index for all blocks in the stack
            const draggedStack = this.getStackAndDescendants(draggedBlockId);
            draggedStack.forEach(b => {
                const el = document.getElementById(b.id);
                if (el) {
                    el.classList.remove('dragging');
                    el.style.zIndex = b.depth || 0; // Reset to calculated depth
                }
            });

            // Check if block was dragged into the palette for deletion
            const paletteEl = document.getElementById('left-sidebar');
            const paletteRect = paletteEl.getBoundingClientRect();
            
            if (event.clientX < paletteRect.right && event.clientY > paletteRect.top && !paletteEl.classList.contains('hidden')) {
                this.deleteStack(draggedBlockId, draggedSpriteId);
            } else if (draggedBlockId && draggedSpriteId && this.sprites[draggedSpriteId]) {
                const block = this.sprites[draggedSpriteId].blocks[draggedBlockId];

                if (this.dragState.snapTarget) {
                    this.applySnap(); // Apply snap if a target exists
                } else {
                    // Re-render block if no snap occurred to ensure final position is reflected
                    this.updateBlockPositions(this.getStackRoot(draggedBlockId, draggedSpriteId)?.id || draggedBlockId);
                }
                
                // Requirement 3: Evaluate/Execute block on single click (no drag movement)
                if (block && !this.dragState.didMove) {
                    if (block.outputType) { // If it's a reporter/boolean block
                        await this.evaluateAndDisplayReporter(draggedBlockId, draggedSpriteId);
                    } else if (['stack', 'c_shape'].includes(block.shape)) { // If it's a stackable block
                        // Execute the entire stack from the clicked block downwards
                        await this.executeStack(draggedBlockId, draggedSpriteId, false); // Execute with useSnapshot=false for single block execution
                    }
                }
            }
            // Reset drag state
            this.dragState = { isDragging: false, draggedBlockId: null, draggedSpriteId: null, snapTarget: null, didMove: false, liveFeedbackData: null, lastSnapHighlight: null };
        }
    },

    initBlockDrag(event, blockId) {
        // Prevent drag for inputs, dropdowns, and monitors
        if (event.button !== 0 ||
            (event.target && event.target.closest('.block-input, .dropdown-trigger, .monitor-checkbox-palette, .color-input-wrapper, .slider-input-trigger'))
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const block = this.getActiveBlocks()[blockId];
        if (!block) return;

        this.dragState.dragStartX = event.clientX;
        this.dragState.dragStartY = event.clientY;
        this.dragState.didMove = false;

        // Clear any existing feedback
        this.clearLiveSnapFeedback();

        // Add 'dragging' class and adjust z-index for the entire stack
        const stackToLift = this.getStackAndDescendants(blockId);
        const stackRoot = this.getStackRoot(blockId, block.spriteId) || block;
        
        stackToLift.forEach(b => {
            const el = document.getElementById(b.id);
            if (el) {
                el.classList.add('dragging');
                // Ensure z-index is higher for dragged blocks
                el.style.zIndex = 1000 + (b.depth - stackRoot.depth); 
            }
        });
        
        this.dragState.isDragging = true;
        this.dragState.draggedBlockId = blockId;
        this.dragState.draggedSpriteId = block.spriteId;

        const virtualMousePos = this.screenToVirtual({ x: event.clientX, y: event.clientY });
        this.dragState.offsetX = virtualMousePos.x - block.position.x;
        this.dragState.offsetY = virtualMousePos.y - block.position.y;
        
        // Hide any open UI popovers or context menus
        this.hideDropdown(); this.hideReporterOutput(); this.hideContextMenu();
        this.hideColorPicker(); this.hideSliderInput(); 
    },
});
