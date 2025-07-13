Object.assign(window.Raccoon, {
    setActiveSprite(spriteId) { 
        if (!this.sprites[spriteId] || this.activeSpriteId === spriteId) return; 
        
        const oldSprite = this.getActiveSprite();
        if (oldSprite) {
            this.blockContainer.querySelectorAll(`.block[data-sprite-id="${oldSprite.id}"]`).forEach(el => el.classList.add('hidden'));
            this.blockContainer.querySelectorAll(`.comment-container[data-sprite-id="${oldSprite.id}"]`).forEach(el => el.classList.add('hidden'));
        }

        this.activeSpriteId = spriteId; 

        const newSprite = this.getActiveSprite();
        if (newSprite) {
            this.blockContainer.querySelectorAll(`.block[data-sprite-id="${newSprite.id}"]`).forEach(el => el.classList.remove('hidden'));
            this.blockContainer.querySelectorAll(`.comment-container[data-sprite-id="${newSprite.id}"]`).forEach(el => el.classList.remove('hidden'));
        }
        
        this.uiUpdateCallback(); 
    },

    async setSpriteCostume(spriteId, src) {
        const sprite = this.sprites[spriteId];
        if (!sprite) return;

        const newCostume = await this.createCostumeFromSrc(src);
        if (newCostume) {
            sprite.costume = newCostume;
            sprite.size = 100;
            sprite.baseScale = 1.0;
        }
        this.uiUpdateCallback();
    },

    async createCostumeFromSrc(src) {
        try {
            const response = await fetch(src);
            const blob = await response.blob();
            const svgText = await blob.text();
            
            const img = new Image();
            const objectURL = URL.createObjectURL(blob);
            img.src = objectURL;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            URL.revokeObjectURL(objectURL);

            const bitmap = await createImageBitmap(img);

            return {
                svgText: svgText,
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
        const allDrawable = [...Object.values(this.sprites), ...Object.values(this.clones)];
        const layer = allDrawable.length > 0 ? Math.max(...allDrawable.map(s => s.layer)) + 1 : 1;
        
        const costume = await this.createCostumeFromSrc('../../assets/raccoon.svg');
        let baseScale = 1.0;

        if (costume && name === 'Raccoon') { 
            const maxDim = Math.max(costume.width, costume.height);
            if (maxDim > 0) {
                 baseScale = this.DEFAULT_SPRITE_DIMENSION / maxDim;
            }
        }
        
        this.sprites[id] = { 
            id, name: name || `Sprite${count}`, x: 0, y: 0, rotation: 90, 
            size: 100,
            baseScale: baseScale,
            visible: true, isClone: false, 
            costume: costume, sayMessage: '', sayTimeout: null, 
            blocks: {}, localVariables: {}, localLists: {}, layer, depth: 0,
            comments: {}
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
        this.blockContainer.querySelectorAll(`.block[data-sprite-id="${spriteId}"]`).forEach(el => el.remove());
        this.blockContainer.querySelectorAll(`.comment-container[data-sprite-id="${spriteId}"]`).forEach(el => el.remove());
        
        if (this.stage.speechBubbles[spriteId]) { 
            this.stage.speechBubbles[spriteId].remove(); 
            delete this.stage.speechBubbles[spriteId]; 
        }
        
        delete this.sprites[spriteId];
        
        Object.keys(this.clones).forEach(cloneId => {
            if (this.clones[cloneId].parentId === spriteId) {
                this.deleteClone(cloneId);
            }
        });

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
                    sprite.rotation = (numValue % 360 + 360) % 360;
                } else if (propToUpdate === 'size') { 
                    sprite.size = Math.max(0, numValue);
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

        const { blocks, comments, ...propertiesToClone } = parentSprite; 
        const cloneId = `clone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; 
        
        const clonedSprite = {
             ...JSON.parse(JSON.stringify(propertiesToClone)),
             id: cloneId, 
             isClone: true, 
             parentId: parentId,
             sayTimeout: null
        };
        
        const allDrawable = [...Object.values(this.execution.snapshot.sprites), ...Object.values(this.execution.snapshot.clones)];
        clonedSprite.layer = allDrawable.length > 0 ? Math.max(...allDrawable.map(s => s.layer)) + 1 : 1;
        
        this.execution.snapshot.clones[cloneId] = clonedSprite;

        const parentBlocks = this.getAllBlocksForSprite(cloneId, true);
        const cloneStartHats = Object.values(parentBlocks).filter(b => b.type === 'event_when_i_start_as_a_clone' && !b.previous && !b.parentInput);
        cloneStartHats.forEach(hat => { 
            if (hat.next) this.executeStack(hat.next, cloneId, true); 
        }); 
        this.uiUpdateCallback(); 
    },

    deleteClone(cloneId) { 
        const source = (this.execution.snapshot.clones) ? this.execution.snapshot : this;
        if (source.clones[cloneId]) { 
            if (this.stage.speechBubbles[cloneId]) { 
                this.stage.speechBubbles[cloneId].remove(); 
                delete this.stage.speechBubbles[cloneId]; 
            }
            delete source.clones[cloneId]; 
            this.uiUpdateCallback(); 
        } 
    },

    deleteAllClones() { 
        for (const cloneId in this.clones) {
            if (this.stage.speechBubbles[cloneId]) {
                this.stage.speechBubbles[cloneId].remove();
                delete this.stage.speechBubbles[cloneId];
            }
        }
        this.clones = {}; 
        this.uiUpdateCallback(); 
    },
});