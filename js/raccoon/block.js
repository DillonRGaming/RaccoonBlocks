Object.assign(window.Raccoon, {
    createBlock(spec, virtualPos, isClone = false) { 
        const activeSprite = this.getActiveSprite(); 
        if (!activeSprite) return null; 
        const id = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; 
        const blockData = { ...(typeof structuredClone === 'function' ? structuredClone(spec) : JSON.parse(JSON.stringify(spec))), id, position: virtualPos, spriteId: this.activeSpriteId, next: null, previous: null, child: null, child2: null, parentInput: null }; 
        
        if (blockData.inputs) { 
            for (const key in blockData.inputs) { 
                const inputSpec = blockData.inputs[key]; 
                // Handle cloning of connected input blocks
                if (inputSpec.blockId && isClone) { 
                    const newChildId = this.duplicateStack(inputSpec.blockId, {x:0, y:0}, true);
                    inputSpec.blockId = newChildId; 
                } else { 
                    inputSpec.blockId = null; // Ensure new blocks start with empty inputs
                } 
            } 
        } 
        activeSprite.blocks[id] = blockData; 
        if (!isClone) { 
            this.renderBlock(blockData); // Initial render
            this.updateBlockPositions(id); // Recalculate and apply layout/positions
        } 
        return id; 
    },

    cloneBlock(spec, screenPos) { 
        this.updateLayout(spec, true); // Update layout for palette block before cloning to get dimensions
        const virtualPos = this.screenToVirtual(screenPos); 
        // Create new block, adjust position to center under mouse
        const newBlockId = this.createBlock(spec, { x: virtualPos.x - (spec.width)/2, y: virtualPos.y - (spec.height)/2 }); 
        if (newBlockId) { 
            // Immediately start dragging the cloned block
            this.initBlockDrag({ clientX: screenPos.x, clientY: screenPos.y, button: 0, preventDefault: ()=>{}, stopPropagation: ()=>{} }, newBlockId); 
        } 
    },

    duplicateStack(startBlockId, mousePos, returnRootId = false, startDragging = false) { 
        const sprite = this.getActiveSprite(); 
        if (!sprite) return null; 
        const originalBlock = sprite.blocks[startBlockId]; 
        if (!originalBlock) return null; 

        // Collect all blocks in the stack and its children/inputs for cloning
        const blocksToClone = {};
        const idMap = {}; // Map original IDs to new IDs
        const queue = [startBlockId];
        const visited = new Set([startBlockId]);

        while (queue.length > 0) { 
            const currentId = queue.shift(); 
            const block = sprite.blocks[currentId]; 
            if (!block) continue; 
            blocksToClone[currentId] = block; 
            // Add connected blocks to queue
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
            // Deep clone block data
            newBlocks[newId] = JSON.parse(JSON.stringify(blocksToClone[id]));
            newBlocks[newId].id = newId; 
            newBlocks[newId].spriteId = sprite.id; // Cloned blocks belong to the same sprite
        } 

        // Update connections to point to new cloned block IDs
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
        Object.assign(sprite.blocks, newBlocks); // Add new blocks to sprite's block collection
        this.updateBlockPositions(newRootId); // Pre-calculate layout for new stack

        if (returnRootId) return newRootId; // Used for cloning input blocks

        // Position and optionally start dragging the duplicated stack
        if (startDragging) {
            const virtualPos = this.screenToVirtual({ x: mousePos.x, y: mousePos.y });
            const newRootBlock = sprite.blocks[newRootId];
            newRootBlock.position.x = virtualPos.x - newRootBlock.width / 2;
            newRootBlock.position.y = virtualPos.y - newRootBlock.height / 2;
            this.updateBlockPositions(newRootId); // Update positions after initial placement
            this.initBlockDrag({ clientX: mousePos.x, clientY: mousePos.y, button: 0, preventDefault: ()=>{}, stopPropagation: ()=>{} }, newRootId);
        } else {
            // Offset duplicated stack slightly if not dragging
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
    
        let rootToUpdate = null;
    
        // Disconnect from previous block in sequence
        if (startBlock.previous) {
            const prevBlock = sprite.blocks[startBlock.previous];
            if (prevBlock) {
                prevBlock.next = null;
                rootToUpdate = this.getStackRoot(prevBlock.id, spriteId)?.id || prevBlock.id;
            }
        } 
        // Disconnect from parent input socket
        else if (startBlock.parentInput) {
            const parentBlock = sprite.blocks[startBlock.parentInput.blockId];
            if (parentBlock && parentBlock.inputs[startBlock.parentInput.inputKey]) {
                parentBlock.inputs[startBlock.parentInput.inputKey].blockId = null;
                rootToUpdate = this.getStackRoot(parentBlock.id, spriteId)?.id || parentBlock.id;
            }
        }
        // Disconnect from parent C-block child slot
        else {
            const parentCBlock = Object.values(sprite.blocks).find(p => p.child === startBlockId || p.child2 === startBlockId);
            if (parentCBlock) {
                if (parentCBlock.child === startBlockId) parentCBlock.child = null;
                if (parentCBlock.child2 === startBlockId) parentCBlock.child2 = null;
                rootToUpdate = this.getStackRoot(parentCBlock.id, spriteId)?.id || parentCBlock.id;
            }
        }
    
        // Collect all blocks in the stack and its descendants for deletion
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
    
        // Remove blocks from DOM and sprite data
        blocksToDelete.forEach(id => {
            document.getElementById(id)?.remove();
            delete sprite.blocks[id];
        });
    
        // Re-render the affected stack(s) to clean up layout
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
            monitored: oldBlock.monitored, // Preserve monitored state
            // Preserve cInnerHeight for C-shapes if switching between similar C-shapes
            cInnerHeight1: oldBlock.cInnerHeight1,
            cInnerHeight2: oldBlock.cInnerHeight2,
        };
    
        if (newBlockData.inputs && oldBlock.inputs) {
            for (const key in newBlockData.inputs) {
                if (oldBlock.inputs[key] !== undefined) {
                    const oldInput = oldBlock.inputs[key];
                    const newInput = newBlockData.inputs[key];

                    // Check compatibility for input type and shape
                    const isCompatible = this.isCompatibleShape(oldBlock.outputType, newInput.shape, newInput.acceptedShapes);

                    if (isCompatible) {
                        newInput.value = oldInput.value;
                    }
                    
                    if (oldInput.blockId && isCompatible) {
                        newInput.blockId = oldInput.blockId;
                        const childBlock = sprite.blocks[newInput.blockId];
                        if (childBlock && childBlock.parentInput) {
                             childBlock.parentInput.inputKey = key; // Update parentInput key if changed
                        }
                    }
                }
            }
        }
        
        sprite.blocks[blockId] = newBlockData; // Replace the old block with the new data
    
        const rootId = this.getStackRoot(blockId, sprite.id)?.id || blockId;
        this.updateBlockPositions(rootId); // Recalculate and re-render the stack
        this.uiUpdateCallback();
    },

    renderBlock(blockData) {
        const blockDef = this.blockDefinitions[blockData.type];
        if (!blockDef) {
            console.warn(`No block definition found for type: ${blockData.type}`);
            return;
        }

        let svg = document.getElementById(blockData.id);
        if (!svg) {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = blockData.id;
            svg.classList.add('block-svg');
            svg.setAttribute('data-block-id', blockData.id);
            svg.setAttribute('data-sprite-id', blockData.spriteId);
            this.blocksContainer.appendChild(svg);
        } else {
            // Clear existing content to re-render
            while (svg.firstChild) {
                svg.removeChild(svg.firstChild);
            }
        }

        // Apply block-specific styles
        svg.style.setProperty('--block-color', `var(--${blockData.category}-color)`);
        svg.style.setProperty('--block-color-light', `var(--${blockData.category}-color-light)`);
        svg.style.setProperty('--block-color-dark', `var(--${blockData.category}-color-dark)`);

        // Render the block shape
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('block-path');
        svg.appendChild(path);

        // Render block content (text, inputs, icons)
        let currentX = blockDef.paddingLeft || 8;
        let currentY = blockDef.paddingTop || 8;
        let lineHeight = 16; // Base line height for text

        // Add icon if present
        if (blockDef.icon) {
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            icon.setAttribute('href', blockDef.icon);
            icon.setAttribute('x', currentX);
            icon.setAttribute('y', currentY);
            icon.setAttribute('width', '20');
            icon.setAttribute('height', '20');
            svg.appendChild(icon);
            currentX += 24; // Move past the icon
        }

        blockDef.parts.forEach(part => {
            if (typeof part === 'string') {
                // Text label
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.textContent = part;
                text.setAttribute('x', currentX);
                text.setAttribute('y', currentY + lineHeight / 2 + 4); // Center text vertically
                text.classList.add('block-text');
                svg.appendChild(text);
                currentX += text.getBBox().width + 6; // Move past text
            } else if (part.type === 'input') {
                const inputSpec = blockData.inputs[part.key];
                if (!inputSpec) {
                    console.warn(`Missing input spec for key: ${part.key} in block: ${blockData.id}`);
                    return;
                }

                if (inputSpec.blockId) {
                    // Render connected block
                    const connectedBlockData = this.getActiveSprite().blocks[inputSpec.blockId];
                    if (connectedBlockData) {
                        this.renderBlock(connectedBlockData); // Ensure child block is rendered
                        // Position the connected block relative to the current block's input
                        connectedBlockData.position.x = blockData.position.x + currentX;
                        connectedBlockData.position.y = blockData.position.y + currentY - (connectedBlockData.height / 2) + (lineHeight / 2);
                        connectedBlockData.parentInput = { blockId: blockData.id, inputKey: part.key };
                        this.updateBlockPositions(connectedBlockData.id); // Update its position
                        currentX += connectedBlockData.width + 6; // Advance X by connected block width
                    }
                } else {
                    // Render input field or dropdown
                    let inputElement;
                    let inputWidth = 40; // Default width for number/text inputs
                    let inputHeight = 20; // Default height for inputs

                    if (part.menu) {
                        // Dropdown input
                        inputElement = document.createElement('div');
                        inputElement.classList.add('dropdown-trigger');
                        inputElement.textContent = inputSpec.value;
                        inputElement.style.backgroundColor = `var(--${blockData.category}-color-light)`;
                        inputElement.style.borderColor = `var(--${blockData.category}-color-dark)`;
                        inputElement.dataset.blockId = blockData.id;
                        inputElement.dataset.inputKey = part.key;
                        inputElement.dataset.menu = part.menu; // Store menu name for lookup
                        inputElement.addEventListener('click', (e) => this.showDropdown(e.target, blockData.category));
                        inputWidth = 80; // Default dropdown width
                    } else if (part.color) {
                        // Color input
                        inputElement = document.createElement('input');
                        inputElement.type = 'color';
                        inputElement.classList.add('color-input-swatch');
                        inputElement.value = inputSpec.value;
                        inputElement.dataset.blockId = blockData.id;
                        inputElement.dataset.inputKey = part.key;
                        inputElement.addEventListener('change', (e) => this.updateBlockInput(blockData.id, part.key, e.target.value));
                        inputWidth = 30;
                        inputHeight = 20;
                    } else if (part.slider) {
                        // Slider input (display only, actual slider handled by UI)
                        inputElement = document.createElement('div');
                        inputElement.classList.add('slider-input-display');
                        inputElement.textContent = inputSpec.value;
                        inputElement.dataset.blockId = blockData.id;
                        inputElement.dataset.inputKey = part.key;
                        inputElement.dataset.min = part.min;
                        inputElement.dataset.max = part.max;
                        inputElement.dataset.step = part.step;
                        inputElement.addEventListener('click', (e) => this.showSlider(e.target));
                        inputWidth = 50;
                    } else {
                        // Text/Number input
                        inputElement = document.createElement('input');
                        inputElement.type = part.number ? 'number' : 'text';
                        inputElement.classList.add('block-input');
                        inputElement.value = inputSpec.value;
                        inputElement.dataset.blockId = blockData.id;
                        inputElement.dataset.inputKey = part.key;
                        inputElement.addEventListener('change', (e) => this.updateBlockInput(blockData.id, part.key, e.target.value));
                        inputElement.addEventListener('focus', () => this.isInputActive = true);
                        inputElement.addEventListener('blur', () => this.isInputActive = false);
                    }

                    // Position the foreignObject for the HTML input element
                    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
                    foreignObject.setAttribute('x', currentX);
                    foreignObject.setAttribute('y', currentY);
                    foreignObject.setAttribute('width', inputWidth);
                    foreignObject.setAttribute('height', inputHeight);
                    foreignObject.appendChild(inputElement);
                    svg.appendChild(foreignObject);
                    currentX += inputWidth + 6; // Advance X by input width
                }
            } else if (part.type === 'stack') {
                // Placeholder for stack input (e.g., C-block body)
                // This will be filled by updateBlockPositions
                currentY += 20; // Move Y down for the stack
            }
        });

        // Event listeners for dragging and clicking
        if (blockData.isPaletteBlock) {
            // Palette blocks are draggable to create new blocks
            svg.addEventListener('mousedown', (e) => this.cloneBlock(blockDef.spec, { x: e.clientX, y: e.clientY }));
        } else {
            // Blocks in the workspace are draggable and clickable
            if (!svg.getAttribute('data-event-listeners-attached')) {
                svg.addEventListener('mousedown', (e) => {
                    // Prevent drag if clicking on an input element within the block
                    if (e.target.closest('.block-input, .dropdown-trigger, .color-input-swatch, .slider-input-display')) {
                        return;
                    }
                    // Block stack clicking should trigger the blocks
                    if (blockData.shape === 'hat' || (!blockData.previous && blockData.shape !== 'reporter' && blockData.shape !== 'boolean')) {
                        // If it's a hat block or a top-level stack block, execute it
                        this.executeStack(blockData.id, blockData.spriteId, false); // Pass false for useSnapshot to execute on actual state
                        return; // Prevent drag if executing
                    }
                    this.initBlockDrag(e, blockData.id);
                });
                svg.setAttribute('data-event-listeners-attached', 'true');
            }
        }
    },

    updateBlockInput(blockId, inputKey, value) {
        const sprite = this.getActiveSprite();
        if (!sprite) return;
        const block = sprite.blocks[blockId];
        if (block && block.inputs && block.inputs[inputKey]) {
            block.inputs[inputKey].value = value;

            // Requirement 4: Check for dynamic layout/shape updates
            const blockDef = this.blockDefinitions[block.type];
            if (blockDef) {
                let needsUpdate = false;
                if (typeof blockDef.getLayout === 'function') {
                    const newLayout = blockDef.getLayout(block);
                    if (JSON.stringify(newLayout) !== JSON.stringify(block.layout)) {
                        block.layout = newLayout;
                        needsUpdate = true;
                    }
                }
                if (typeof blockDef.getShape === 'function') {
                    const newShape = blockDef.getShape(block);
                    if (newShape !== block.shape) {
                        block.shape = newShape;
                        block.outputType = newShape; // Assuming outputType matches shape for these blocks
                        needsUpdate = true;
                    }
                }
                if (needsUpdate) {
                    const rootId = this.getStackRoot(blockId, sprite.id)?.id || blockId;
                    this.updateBlockPositions(rootId);
                } else {
                    this.renderBlock(block); // Simple re-render if no layout change
                }
            } else {
                 this.renderBlock(block);
            }
            
            this.uiUpdateCallback();
        }
    },

    // Helper to get the root block of a stack
    getStackRoot(blockId, spriteId) {
        const sprite = this.sprites[spriteId];
        if (!sprite) return null;
        let currentBlock = sprite.blocks[blockId];
        if (!currentBlock) return null;
        while (currentBlock.previous || currentBlock.parentInput) {
            if (currentBlock.previous) {
                currentBlock = sprite.blocks[currentBlock.previous];
            } else if (currentBlock.parentInput) {
                currentBlock = sprite.blocks[currentBlock.parentInput.blockId];
            }
            if (!currentBlock) return null; // Should not happen if connections are valid
        }
        return currentBlock;
    },

    // Helper to get all blocks in a stack (including children and inputs)
    getAllBlocksInStack(startBlockId, spriteId) {
        const sprite = this.sprites[spriteId];
        if (!sprite) return new Set();
        const stackBlocks = new Set();
        const queue = [startBlockId];
        const visited = new Set();

        while (queue.length > 0) {
            const currentId = queue.shift();
            if (visited.has(currentId)) continue;
            visited.add(currentId);
            stackBlocks.add(currentId);

            const block = sprite.blocks[currentId];
            if (!block) continue;

            // Add next block in sequence
            if (block.next) queue.push(block.next);
            // Add child blocks (for C-blocks)
            if (block.child) queue.push(block.child);
            if (block.child2) queue.push(block.child2);
            // Add blocks connected to inputs
            if (block.inputs) {
                for (const key in block.inputs) {
                    if (block.inputs[key].blockId) {
                        queue.push(block.inputs[key].blockId);
                    }
                }
            }
        }
        return stackBlocks;
    },

    // Helper to get the bounding box of a block, including its children
    getBlockBoundingBox(blockId, spriteId) {
        const sprite = this.sprites[spriteId];
        if (!sprite) return null;
        const block = sprite.blocks[blockId];
        if (!block) return null;

        let minX = block.position.x;
        let minY = block.position.y;
        let maxX = block.position.x + block.width;
        let maxY = block.position.y + block.height;

        // Recursively include children and input blocks
        const processChild = (childBlockId) => {
            if (childBlockId) {
                const childBox = this.getBlockBoundingBox(childBlockId, spriteId);
                if (childBox) {
                    minX = Math.min(minX, childBox.x);
                    minY = Math.min(minY, childBox.y);
                    maxX = Math.max(maxX, childBox.x + childBox.width);
                    maxY = Math.max(maxY, childBox.y + childBox.height);
                }
            }
        };

        processChild(block.next);
        processChild(block.child);
        processChild(block.child2);
        if (block.inputs) {
            for (const key in block.inputs) {
                processChild(block.inputs[key].blockId);
            }
        }

        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    },

    // Check if two blocks are compatible for connection
    isCompatibleShape(outputShape, inputShape, acceptedShapes) {
        if (!outputShape || !inputShape) return false;
        if (inputShape === 'any') return true; // Any shape can connect to 'any' input
        if (acceptedShapes && acceptedShapes.includes(outputShape)) return true;
        return outputShape === inputShape;
    },

    // Update block positions and SVG paths based on connections and layout
    updateBlockPositions(startBlockId) {
        const sprite = this.getActiveSprite();
        if (!sprite) return;

        const blocksToUpdate = this.getAllBlocksInStack(startBlockId, sprite.id);
        const blocks = sprite.blocks;

        // First pass: Calculate dimensions for all blocks in the stack
        blocksToUpdate.forEach(id => {
            const block = blocks[id];
            if (!block) return;
            const svg = document.getElementById(id);
            if (!svg) return;

            // Temporarily render to get accurate text/input dimensions
            this.renderBlock(block);

            // Calculate content width and height
            let contentWidth = 0;
            let contentHeight = 0;
            let currentX = block.blockDef.paddingLeft || 8;
            let currentY = block.blockDef.paddingTop || 8;
            const lineHeight = 16;

            if (block.blockDef.icon) {
                currentX += 24;
            }

            block.blockDef.parts.forEach(part => {
                if (typeof part === 'string') {
                    const textEl = svg.querySelector(`text:contains("${part}")`); // Find the text element
                    if (textEl) {
                        contentWidth += textEl.getBBox().width + 6;
                    }
                } else if (part.type === 'input') {
                    const inputSpec = block.inputs[part.key];
                    if (inputSpec && inputSpec.blockId) {
                        const connectedBlock = blocks[inputSpec.blockId];
                        if (connectedBlock) {
                            contentWidth += connectedBlock.width + 6;
                        }
                    } else {
                        const foreignObject = svg.querySelector(`foreignObject[x="${currentX}"]`);
                        if (foreignObject) {
                            contentWidth += parseFloat(foreignObject.getAttribute('width')) + 6;
                        }
                    }
                }
            });

            block.contentWidth = contentWidth;
            block.contentHeight = lineHeight + (block.blockDef.paddingTop || 8) + (block.blockDef.paddingBottom || 8);

            // Initial block dimensions based on content
            block.width = Math.max(block.blockDef.minWidth || 80, block.contentWidth + (block.blockDef.paddingLeft || 8) + (block.blockDef.paddingRight || 8));
            block.height = Math.max(block.blockDef.minHeight || 30, block.contentHeight);

            // Adjust for specific shapes
            if (block.shape === 'hat') {
                block.height = 40; // Hat blocks have a fixed height
            } else if (block.shape === 'reporter' || block.shape === 'boolean') {
                block.width = Math.max(block.width, 60); // Minimum width for reporters
                block.height = 24; // Fixed height for reporters
            } else if (block.shape === 'c') {
                // C-blocks need to account for inner stack height
                block.cInnerHeight1 = 20; // Default minimum inner height
                if (block.child) {
                    const childStackHeight = this.getStackHeight(block.child, sprite.id);
                    block.cInnerHeight1 = Math.max(block.cInnerHeight1, childStackHeight + 10); // Add padding
                }
                block.height = 30 + block.cInnerHeight1; // Top part + inner height
                if (block.child2) {
                    block.cInnerHeight2 = 20; // Default minimum inner height for second C-slot
                    const childStackHeight2 = this.getStackHeight(block.child2, sprite.id);
                    block.cInnerHeight2 = Math.max(block.cInnerHeight2, childStackHeight2 + 10);
                    block.height += block.cInnerHeight2 + 10; // Add second inner height and gap
                }
            }
        });

        // Second pass: Position blocks and draw paths
        // Use a queue for a breadth-first-like traversal to ensure parents are positioned before children
        const queue = [startBlockId];
        const positioned = new Set();

        while (queue.length > 0) {
            const currentId = queue.shift();
            if (positioned.has(currentId)) continue;

            const block = blocks[currentId];
            if (!block) continue;

            // Ensure parent is positioned if it exists and is not the startBlockId
            if (block.previous && !positioned.has(block.previous)) {
                queue.push(currentId); // Re-add to queue to process after parent
                continue;
            }
            if (block.parentInput && !positioned.has(block.parentInput.blockId)) {
                queue.push(currentId); // Re-add to queue to process after parent
                continue;
            }
            const parentCBlock = Object.values(blocks).find(p => (p.child === currentId || p.child2 === currentId) && !positioned.has(p.id));
            if (parentCBlock) {
                queue.push(currentId); // Re-add to queue to process after parent
                continue;
            }

            // Calculate actual position based on connections
            if (block.previous) {
                const prevBlock = blocks[block.previous];
                block.position.x = prevBlock.position.x;
                block.position.y = prevBlock.position.y + prevBlock.height + 2; // Snap below previous block
            } else if (block.parentInput) {
                const parentBlock = blocks[block.parentInput.blockId];
                if (parentBlock) {
                    // Find the position of the input socket
                    let inputX = parentBlock.position.x + (parentBlock.blockDef.paddingLeft || 8);
                    let inputY = parentBlock.position.y + (parentBlock.blockDef.paddingTop || 8);
                    if (parentBlock.blockDef.icon) inputX += 24;

                    for (const part of parentBlock.blockDef.parts) {
                        if (typeof part === 'string') {
                            const textEl = document.getElementById(parentBlock.id)?.querySelector(`text:contains("${part}")`);
                            if (textEl) {
                                inputX += textEl.getBBox().width + 6;
                            }
                        } else if (part.type === 'input') {
                            if (part.key === block.parentInput.inputKey) {
                                // Found the input socket
                                block.position.x = inputX;
                                block.position.y = inputY + (16 / 2) + 4 - (block.height / 2); // Center vertically
                                break;
                            }
                            const inputSpec = parentBlock.inputs[part.key];
                            if (inputSpec && inputSpec.blockId) {
                                const connectedBlock = blocks[inputSpec.blockId];
                                if (connectedBlock) inputX += connectedBlock.width + 6;
                            } else {
                                inputX += (part.menu ? 80 : (part.color ? 30 : (part.slider ? 50 : 40))) + 6;
                            }
                        }
                    }
                }
            } else if (block.shape === 'hat' && !block.isPaletteBlock) {
                // Hat blocks are always at the top of a stack, so their position is their own
                // No change needed to block.position.x, block.position.y
            } else if (block.parentInput === null && block.previous === null && block.shape === 'c') {
                // C-blocks as root of a stack
                // No change needed to block.position.x, block.position.y
            } else if (block.parentInput === null && block.previous === null && block.shape !== 'hat' && block.shape !== 'reporter' && block.shape !== 'boolean') {
                // Top-level stack blocks (not hat, reporter, or boolean)
                // No change needed to block.position.x, block.position.y
            } else if (block.parentInput === null && block.previous === null && (block.shape === 'reporter' || block.shape === 'boolean')) {
                // Top-level reporter/boolean blocks
                // No change needed to block.position.x, block.position.y
            } else {
                // This block is a child of a C-block
                const parentCBlock = Object.values(blocks).find(p => p.child === currentId || p.child2 === currentId);
                if (parentCBlock) {
                    block.position.x = parentCBlock.position.x + 20; // Indent children
                    if (parentCBlock.child === currentId) {
                        block.position.y = parentCBlock.position.y + 25; // Position after top part of C
                    } else if (parentCBlock.child2 === currentId) {
                        block.position.y = parentCBlock.position.y + 25 + parentCBlock.cInnerHeight1 + 10; // Position after first child and gap
                    }
                }
            }

            const svg = document.getElementById(currentId);
            if (svg) {
                svg.style.transform = `translate(${block.position.x}px, ${block.position.y}px)`;
                svg.setAttribute('width', block.width);
                svg.setAttribute('height', block.height);

                const path = svg.querySelector('.block-path');
                if (path) {
                    path.setAttribute('d', this.getBlockPath(block));
                }

                // Update positions of foreignObjects for inputs
                let currentInputX = block.blockDef.paddingLeft || 8;
                let currentInputY = block.blockDef.paddingTop || 8;
                if (block.blockDef.icon) currentInputX += 24;

                block.blockDef.parts.forEach(part => {
                    if (typeof part === 'string') {
                        const textEl = svg.querySelector(`text:contains("${part}")`);
                        if (textEl) {
                            textEl.setAttribute('x', currentInputX);
                            currentInputX += textEl.getBBox().width + 6;
                        }
                    } else if (part.type === 'input') {
                        const inputSpec = block.inputs[part.key];
                        if (inputSpec && inputSpec.blockId) {
                            const connectedBlock = blocks[inputSpec.blockId];
                            if (connectedBlock) {
                                // Connected block's position is relative to its parent's position
                                connectedBlock.position.x = block.position.x + currentInputX;
                                connectedBlock.position.y = block.position.y + currentInputY + (16 / 2) + 4 - (connectedBlock.height / 2);
                                this.updateBlockPositions(connectedBlock.id); // Recursively update connected block
                                currentInputX += connectedBlock.width + 6;
                            }
                        } else {
                            const foreignObject = svg.querySelector(`foreignObject[data-input-key="${part.key}"]`);
                            if (foreignObject) {
                                foreignObject.setAttribute('x', currentInputX);
                                foreignObject.setAttribute('y', currentInputY);
                            }
                            currentInputX += (part.menu ? 80 : (part.color ? 30 : (part.slider ? 50 : 40))) + 6;
                        }
                    }
                });
            }

            positioned.add(currentId);

            // Add connected blocks to the queue for positioning
            if (block.next && !positioned.has(block.next)) queue.push(block.next);
            if (block.child && !positioned.has(block.child)) queue.push(block.child);
            if (block.child2 && !positioned.has(block.child2)) queue.push(block.child2);
            if (block.inputs) {
                for (const key in block.inputs) {
                    if (block.inputs[key].blockId && !positioned.has(block.inputs[key].blockId)) {
                        queue.push(block.inputs[key].blockId);
                    }
                }
            }
        }
        this.uiUpdateCallback();
    },

    // Calculate the total height of a stack of blocks
    getStackHeight(startBlockId, spriteId) {
        const sprite = this.sprites[spriteId];
        if (!sprite) return 0;
        let totalHeight = 0;
        let currentBlockId = startBlockId;
        while (currentBlockId) {
            const block = sprite.blocks[currentBlockId];
            if (!block) break;
            totalHeight += block.height + 2; // Add block height + gap
            currentBlockId = block.next;
        }
        return totalHeight;
    },

    // Generate SVG path data for a block based on its shape and dimensions
    getBlockPath(block) {
        const w = block.width;
        const h = block.height;
        const r = 4; // Corner radius
        const notchWidth = 10;
        const notchHeight = 2;
        const tabWidth = 8;
        const tabHeight = 2;

        let path = `M ${r},0 H ${w - r} A ${r},${r} 0 0 1 ${w},${r} V ${h - r} A ${r},${r} 0 0 1 ${w - r},${h} H ${r} A ${r},${r} 0 0 1 0,${h - r} V ${r} A ${r},${r} 0 0 1 ${r},0 Z`; // Default path (rounded rectangle)

        if (block.shape === 'hat') {
            // Hat block shape
            path = `M 0,${h - r} A ${r},${r} 0 0 1 ${r},${h} H ${w - r} A ${r},${r} 0 0 1 ${w},${h - r} V ${r} A ${r},${r} 0 0 1 ${w - r},0 H 20 C 10,0 0,10 0,20 V ${h - r} Z`;
        } else if (block.shape === 'stack') {
            // Stack block shape (with notch at top and tab at bottom)
            path = `M ${r},0 H ${w - r} A ${r},${r} 0 0 1 ${w},${r} V ${h - r} A ${r},${r} 0 0 1 ${w - r},${h} H ${r + 8} V ${h - 2} H ${r} A ${r},${r} 0 0 1 0,${h - r} V ${r + 2} H 8 V 0 H ${r} A ${r},${r} 0 0 1 ${r},0 Z`;
        } else if (block.shape === 'reporter') {
            // Reporter block shape (rounded rectangle)
            path = `M ${r},0 H ${w - r} A ${r},${r} 0 0 1 ${w},${r} V ${h - r} A ${r},${r} 0 0 1 ${w - r},${h} H ${r} A ${r},${r} 0 0 1 0,${h - r} V ${r} A ${r},${r} 0 0 1 ${r},0 Z`;
        } else if (block.shape === 'boolean') {
            // Boolean block shape (hexagonal)
            path = `M ${r},0 L ${w - r},0 L ${w},${h / 2} L ${w - r},${h} L ${r},${h} L 0,${h / 2} Z`;
        } else if (block.shape === 'c') {
            // C-block shape
            const c1Height = block.cInnerHeight1 || 20;
            const c2Height = block.cInnerHeight2 || 0; // Will be 0 if no second child
            const totalCHeight = h;

            path = `M ${r},0 H ${w - r} A ${r},${r} 0 0 1 ${w},${r} V ${25 - r} A ${r},${r} 0 0 1 ${w - r},25 H 20 V ${25 + c1Height} H ${w - r} A ${r},${r} 0 0 1 ${w},${25 + c1Height + r} V ${h - r} A ${r},${r} 0 0 1 ${w - r},${h} H ${r + 8} V ${h - 2} H ${r} A ${r},${r} 0 0 1 0,${h - r} V ${r + 2} H 8 V 0 H ${r} A ${r},${r} 0 0 1 ${r},0 Z`;
            if (block.child2) {
                path = `M ${r},0 H ${w - r} A ${r},${r} 0 0 1 ${w},${r} V ${25 - r} A ${r},${r} 0 0 1 ${w - r},25 H 20 V ${25 + c1Height} H ${w - r} A ${r},${r} 0 0 1 ${w},${25 + c1Height + r} V ${25 + c1Height + 10 - r} A ${r},${r} 0 0 1 ${w - r},${25 + c1Height + 10} H 20 V ${25 + c1Height + 10 + c2Height} H ${w - r} A ${r},${r} 0 0 1 ${w},${25 + c1Height + 10 + c2Height + r} V ${h - r} A ${r},${r} 0 0 1 ${w - r},${h} H ${r + 8} V ${h - 2} H ${r} A ${r},${r} 0 0 1 0,${h - r} V ${r + 2} H 8 V 0 H ${r} A ${r},${r} 0 0 1 ${r},0 Z`;
            }
        }

        return path;
    },
});
