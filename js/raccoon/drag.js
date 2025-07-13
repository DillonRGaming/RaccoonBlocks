Object.assign(window.Raccoon, {
    initPan(event) { 
        if (event.target === this.workspace || event.target === this.blockContainer) { 
            if (event.target.closest('.block')) return;
            event.preventDefault(); 
            this.view.isPanning = true; 
            this.workspace.classList.add('panning'); 
            this.view.panStartX = event.clientX - this.view.x; 
            this.view.panStartY = event.clientY - this.view.y;
            this.hideReporterOutput(); 
        } 
    },
    
    dragMove(event) {
        if (this.view.isPanning) {
            this.view.x = event.clientX - this.view.panStartX;
            this.view.y = event.clientY - this.view.panStartY;
            this.updateViewTransform();
        } else if (this.dragState.isDragging) {
            if (!this.dragState.didMove && Math.hypot(event.clientX - this.dragState.dragStartX, event.clientY - this.dragState.dragStartY) > 5) {
                this.dragState.didMove = true;
            }

            const { draggedBlockId, draggedSpriteId } = this.dragState;
            if (!draggedBlockId || !draggedSpriteId) return;

            const blockData = this.sprites[draggedSpriteId]?.blocks[draggedBlockId];
            if (!blockData) return;

            const virtualMousePos = this.screenToVirtual({ x: event.clientX, y: event.clientY });
            
            blockData.position.x = virtualMousePos.x - this.dragState.offsetX;
            blockData.position.y = virtualMousePos.y - this.dragState.offsetY;
            
            this.updateBlockPositions(draggedBlockId); 
            
            this.findSnapTarget();
            this.applyLiveSnapFeedback(this.dragState.snapTarget);

            if (!this.dragState.snapTarget && this.dragState.liveFeedbackData) {
                this.clearLiveSnapFeedback();
            }
        }
    },
    
    async dragEnd(event) {
        this.clearLiveSnapFeedback();
        if (this.view.isPanning) {
            this.view.isPanning = false;
            this.workspace.classList.remove('panning');
        } else if (this.dragState.isDragging) {
            const { draggedBlockId, draggedSpriteId } = this.dragState;
            
            const draggedStack = this.getStackAndDescendants(draggedBlockId);
            draggedStack.forEach(b => {
                const el = document.getElementById(b.id);
                if (el) {
                    el.classList.remove('dragging');
                    el.style.zIndex = b.depth || 0;
                }
            });

            const paletteEl = document.getElementById('left-sidebar');
            const paletteRect = paletteEl.getBoundingClientRect();
            
            if (event.clientX < paletteRect.right && event.clientY > paletteRect.top && !paletteEl.classList.contains('hidden')) {
                this.deleteStack(draggedBlockId, draggedSpriteId);
            } else if (draggedBlockId && draggedSpriteId && this.sprites[draggedSpriteId]) {
                const block = this.sprites[draggedSpriteId].blocks[draggedBlockId];

                if (this.dragState.snapTarget) {
                    this.applySnap();
                } else {
                    this.updateBlockPositions(this.getStackRoot(draggedBlockId, draggedSpriteId)?.id || draggedBlockId);
                }
                
                if (block && !this.dragState.didMove) {
                    if (block.outputType) {
                        await this.evaluateAndDisplayReporter(draggedBlockId, draggedSpriteId);
                    } else if (block.shape !== 'hat') {
                        await this.executeStack(block.id, draggedSpriteId, false);
                    }
                }
            }
            this.dragState = { isDragging: false, draggedBlockId: null, draggedSpriteId: null, snapTarget: null, didMove: false, liveFeedbackData: null, lastSnapHighlight: null };
        }
    },

    initBlockDrag(event, blockId) {
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

        this.unsnap(blockId);
        this.clearLiveSnapFeedback();

        const stackToLift = this.getStackAndDescendants(blockId);
        const stackRoot = this.getStackRoot(blockId, block.spriteId) || block;
        
        stackToLift.forEach(b => {
            const el = document.getElementById(b.id);
            if (el) {
                el.classList.add('dragging');
                el.style.zIndex = 1000 + (b.depth - stackRoot.depth);
            }
        });
        
        this.dragState.isDragging = true;
        this.dragState.draggedBlockId = blockId;
        this.dragState.draggedSpriteId = block.spriteId;

        const virtualMousePos = this.screenToVirtual({ x: event.clientX, y: event.clientY });
        this.dragState.offsetX = virtualMousePos.x - block.position.x;
        this.dragState.offsetY = virtualMousePos.y - block.position.y;
        
        this.hideDropdown(); this.hideReporterOutput(); this.hideContextMenu();
        this.hideColorPicker(); this.hideSliderInput(); 
    },
});