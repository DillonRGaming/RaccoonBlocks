Object.assign(window.Raccoon, {
    // setActiveSprite is now handled directly in main.js, which calls updateAllUI()
    // However, this core method is still needed for internal state management
    setActiveSprite(spriteId) { 
        // This function is intended for internal Raccoon logic.
        // The DOM manipulation related to hiding/showing blocks on sprite switch
        // is now handled in main.js's setActiveSprite function.
        if (!this.sprites[spriteId] || this.activeSpriteId === spriteId) return; 
        this.activeSpriteId = spriteId; 
    },

    async setSpriteCostume(spriteId, src) {
        const sprite = this.sprites[spriteId];
        if (!sprite) return;

        const newCostume = await this.createCostumeFromSrc(src);
        if (newCostume) {
            sprite.costume = newCostume;
            sprite.size = 100; // Reset size to 100% when changing costume
            // Requirement 4: Re-calculate baseScale for the new costume
            const maxDim = Math.max(newCostume.width, newCostume.height);
            sprite.baseScale = maxDim > 0 ? this.DEFAULT_SPRITE_DIMENSION / maxDim : 1.0;
        }
        this.uiUpdateCallback();
    },

    // Helper to create costume object from image source
    async createCostumeFromSrc(src) {
        try {
            // Fetch the image to get SVG text or convert to bitmap
            const response = await fetch(src);
            const blob = await response.blob();
            let svgText = null;

            if (blob.type === 'image/svg+xml') {
                svgText = await blob.text();
            }
            
            const img = new Image();
            const objectURL = URL.createObjectURL(blob);
            img.src = objectURL;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            URL.revokeObjectURL(objectURL); // Revoke object URL after image loads

            const bitmap = await createImageBitmap(img); // Create ImageBitmap for efficient canvas drawing

            return {
                svgText: svgText, // Only present for SVG costumes
                bitmap: bitmap,
                width: bitmap.width,
                height: bitmap.height,
            };
        } catch (error) {
            console.error("Error creating costume:", error);
            return null;
        }
    },
    
    async addSprite(name = null) { 
        const id = `sprite_${Date.now()}`; 
        const count = Object.keys(this.sprites).length + 1;
        // Determine initial layer for new sprite (on top of existing drawable elements)
        const allDrawable = [...Object.values(this.sprites), ...Object.values(this.clones)];
        const layer = allDrawable.length > 0 ? Math.max(...allDrawable.map(s => s.layer)) + 1 : 1;
        
        const costume = await this.createCostumeFromSrc('../../assets/raccoon.svg');
        let baseScale = 1.0; // Requirement 4: Initial baseScale calculation

        // Calculate initial baseScale for default raccoon sprite to fit DEFAULT_SPRITE_DIMENSION
        if (costume && name === 'Raccoon') { 
            const maxDim = Math.max(costume.width, costume.height);
            if (maxDim > 0) {
                 baseScale = this.DEFAULT_SPRITE_DIMENSION / maxDim;
            }
        }
        
        this.sprites[id] = { 
            id, name: name || `Sprite${count}`, x: 0, y: 0, rotation: 90, 
            size: 100,
            baseScale: baseScale, // Requirement 4: Store baseScale
            visible: true, isClone: false, 
            costume: costume, sayMessage: '', sayTimeout: null, 
            blocks: {}, localVariables: {}, localLists: {}, layer, depth: 0,
            // Requirement 2: Removed 'comments' property
            // comments: {}
        }; 
        this.setActiveSprite(id); 
        this.uiUpdateCallback(); 
        return id; 
    },

    deleteSprite(spriteId) {
        if (Object.keys(this.sprites).length <= 1) { 
            alert("Cannot delete the last sprite."); 
            return; 
        }
        // Remove associated blocks from DOM and data
        this.blockContainer.querySelectorAll(`.block[data-sprite-id="${spriteId}"]`).forEach(el => el.remove());
        // Requirement 2: No comments to delete
        // this.blockContainer.querySelectorAll(`.comment-container[data-sprite-id="${spriteId}"]`).forEach(el => el.remove());
        
        // Remove associated speech bubble
        if (this.stage.speechBubbles[spriteId]) { 
            this.stage.speechBubbles[spriteId].remove(); 
            delete this.stage.speechBubbles[spriteId]; 
        }
        
        delete this.sprites[spriteId];
        
        // Delete any clones belonging to this sprite
        Object.keys(this.clones).forEach(cloneId => {
            if (this.clones[cloneId].parentId === spriteId) {
                this.deleteClone(cloneId);
            }
        });

        // Set a new active sprite if the deleted one was active
        if (this.activeSpriteId === spriteId) {
            const remainingSpriteIds = Object.keys(this.sprites);
            this.setActiveSprite(remainingSpriteIds[0]);
        }
        this.uiUpdateCallback();
    },

    updateSpriteProperty(prop, value) { 
        const sprite = this.getActiveSprite(); 
        if (!sprite) return; 

        if (prop === 'name') { 
            sprite.name = String(value); 
        } else { 
            const numValue = parseFloat(value); 
            if (!isNaN(numValue)) { 
                const propToUpdate = (prop === 'direction') ? 'rotation' : prop; 
                if (propToUpdate === 'rotation') { 
                    sprite.rotation = (numValue % 360 + 360) % 360; // Normalize to 0-359
                } else if (propToUpdate === 'size') { 
                    sprite.size = Math.max(0, numValue); // Size cannot be negative
                } else if (propToUpdate === 'x' || propToUpdate === 'y') { 
                    sprite[propToUpdate] = numValue; 
                } 
            } 
        } 
        this.uiUpdateCallback(); 
    },

    createClone(parentId) { 
        const parentSprite = this.execution.snapshot.sprites[parentId]; 
        if (!parentSprite) return; 

        // Clone properties, but not blocks or comments (clones share parent's blocks)
        const { blocks, comments, ...propertiesToClone } = parentSprite; 
        const cloneId = `clone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; 
        
        const clonedSprite = {
             ...JSON.parse(JSON.stringify(propertiesToClone)), // Deep clone properties
             id: cloneId, 
             isClone: true, 
             parentId: parentId,
             sayTimeout: null // Reset timeout for clone's speech bubble
        };
        
        // Assign new layer for the clone
        const allDrawable = [...Object.values(this.execution.snapshot.sprites), ...Object.values(this.execution.snapshot.clones)];
        clonedSprite.layer = allDrawable.length > 0 ? Math.max(...allDrawable.map(s => s.layer)) + 1 : 1;
        
        this.execution.snapshot.clones[cloneId] = clonedSprite;

        // Execute "When I start as a clone" hats for this new clone
        const parentBlocks = this.getAllBlocksForSprite(cloneId, true); // Get blocks from parent in snapshot
        const cloneStartHats = Object.values(parentBlocks).filter(b => b.type === 'event_when_i_start_as_a_clone' && !b.previous && !b.parentInput);
        cloneStartHats.forEach(hat => { 
            if (hat.next) this.executeStack(hat.next, cloneId, true); 
        }); 
        this.uiUpdateCallback(); 
    },

    deleteClone(cloneId) { 
        // Determine the source of the clone (live or snapshot)
        const source = (this.execution.snapshot.clones) ? this.execution.snapshot : this;
        if (source.clones[cloneId]) { 
            // Remove associated speech bubble
            if (this.stage.speechBubbles[cloneId]) { 
                this.stage.speechBubbles[cloneId].remove(); 
                delete this.stage.speechBubbles[cloneId]; 
            }
            delete source.clones[cloneId]; 
            this.uiUpdateCallback(); 
        } 
    },

    deleteAllClones() { 
        // Clear all speech bubbles for existing clones
        for (const cloneId in this.clones) {
            if (this.stage.speechBubbles[cloneId]) {
                this.stage.speechBubbles[cloneId].remove();
                delete this.stage.speechBubbles[cloneId];
            }
        }
        this.clones = {}; // Clear the clones object
        this.uiUpdateCallback(); 
    },
});