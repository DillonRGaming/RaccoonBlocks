Object.assign(window.Raccoon, {
    updateViewTransform() { 
        // Apply transformation to the block container for panning and zooming
        if (this.blockContainer) {
            this.blockContainer.style.transform = `translate(${this.view.x}px, ${this.view.y}px) scale(${this.view.zoom})`; 
        }
        // Update background position and size for the workspace grid
        if (this.workspace) { 
            this.workspace.style.backgroundPosition = `${this.view.x}px ${this.view.y}px`; 
            const bgSize = 20 * this.view.zoom; 
            this.workspace.style.backgroundSize = `${bgSize}px ${bgSize}px`; 
        } 
        // Requirement 4: Ensure reporter output stays with its block during pan/zoom
        if (this.stage && this.stage.reporterOutputEl && this.stage.reporterOutputEl.style.display === 'block') {
            const blockId = this.stage.reporterOutputEl.dataset.blockId;
            const blockEl = document.getElementById(blockId);
            if(blockEl) {
                // Get block position relative to viewport
                const rect = blockEl.getBoundingClientRect();
                // Position output bubble to the left of the block
                const monitorCheckbox = blockEl.querySelector('.monitor-checkbox');
                const checkboxWidth = monitorCheckbox ? monitorCheckbox.offsetWidth : 0;
                // Requirement 2: Move monitor checkboxes to the left of the reporter
                this.stage.reporterOutputEl.style.left = `${rect.left - this.stage.reporterOutputEl.offsetWidth - 10 - checkboxWidth}px`; // 10px padding
                this.stage.reporterOutputEl.style.top = `${rect.top + rect.height / 2 - this.stage.reporterOutputEl.offsetHeight / 2}px`;
            } else {
                // If block is no longer in DOM, hide the reporter output
                this.hideReporterOutput();
            }
        }
    },
    
    renderBlock(blockData, isPalette = false) {
        // Provide fallback dimensions if calculations aren't ready yet or are invalid
        const width = typeof blockData.width === 'number' && !isNaN(blockData.width) && blockData.width > 0 ? blockData.width : 100;
        const height = typeof blockData.height === 'number' && !isNaN(blockData.height) && blockData.height > 0 ? blockData.height : 40;

        if (isNaN(width) || isNaN(height)) { // Double check after fallback, if still NaN, skip.
             console.warn("Final block dimensions are invalid, skipping render:", blockData);
             return null;
        }

        let svg = isPalette 
            ? document.createElementNS('http://www.w3.org/2000/svg', 'svg')
            : (document.getElementById(blockData.id) || document.createElementNS('http://www.w3.org/2000/svg', 'svg'));

        if (isPalette) {
            svg.classList.add('palette-block');
        } else if (!svg.id) {
            svg.id = blockData.id;
            svg.classList.add('block');
            svg.dataset.spriteId = blockData.spriteId;
            // Hide blocks of inactive sprites
            if(this.activeSpriteId !== blockData.spriteId) svg.classList.add('hidden');
            this.blockContainer.appendChild(svg);
        }

        svg.innerHTML = '';
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.classList.add(`${blockData.category}-color`);

        if (!isPalette) {
            svg.style.position = 'absolute';
            svg.style.left = `${blockData.position.x}px`;
            svg.style.top = `${blockData.position.y}px`;
            if (!svg.classList.contains('dragging')) {
                svg.style.zIndex = blockData.depth || 0; // Use depth for z-index
            }
            if (!svg.getAttribute('data-event-listeners-attached')) {
            // Only attach event listener if not already attached
            if (!svg.getAttribute('data-event-listeners-attached')) {
                svg.addEventListener('mousedown', (e) => {
                    // Prevent drag if clicking on an input element within the block
                    if (e.target.closest('.block-input, .dropdown-trigger, .color-input-swatch, .slider-input-display')) {
                        return;
                    }
                    this.initBlockDrag(e, blockData.id);
                });
                svg.setAttribute('data-event-listeners-attached', 'true');
            }
            }
        } else {
            // Prevent native drag for palette blocks (handled by custom drag logic)
            svg.addEventListener('dragstart', (e) => e.preventDefault());
        }

        const mainBlockPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        mainBlockPath.setAttribute('d', Raccoon.Shapes.getPath(blockData));
        mainBlockPath.setAttribute('fill', `var(--${blockData.category}-color, #ccc)`);
        mainBlockPath.classList.add('block-path');
        svg.appendChild(mainBlockPath);

        this.renderBlockContent(svg, blockData, mainBlockPath, isPalette);
        return svg;
    },

    // Calculates block dimensions based on its layout and input content
    updateLayout(blockData, isPalette) {
        // Requirement 4: Check for dynamic layout/shape updates before calculating
        const blockDef = this.blockDefinitions[blockData.type];
        if (!isPalette && blockDef) {
            if (typeof blockDef.getLayout === 'function') {
                blockData.layout = blockDef.getLayout(blockData);
            }
            if (typeof blockDef.getShape === 'function') {
                const newShape = blockDef.getShape(blockData);
                if (newShape !== blockData.shape) {
                    blockData.shape = newShape;
                    blockData.outputType = newShape;
                }
            }
        }

        let currentContentWidth = 10; // Initial padding
        // Get all blocks for the current sprite or an empty object if palette
        const allBlocksForSprite = isPalette ? {} : this.getAllBlocksForSprite(blockData.spriteId);
        
        if (blockData.layout) {
            const PADDING_BETWEEN_ITEMS = 8;
            blockData.layout.forEach((item, index) => {
                const text = item.text || '';
                let itemWidth = 0;
                
                if (item.type === 'label' || item.type === 'operator') {
                    itemWidth = this.measureText(text);
                } else if (item.type === 'icon') {
                    itemWidth = 16;
                } else if (item.type === 'input' || item.type === 'dropdown') {
                    const inputData = blockData.inputs ? blockData.inputs[item.key] : null;
                    if (!inputData) {
                        itemWidth = 30; // Default for missing inputData
                    } else {
                        let resolvedWidth = 30; // Default fallback for input width

                        const connectedBlock = (!isPalette && inputData.blockId && allBlocksForSprite) ? allBlocksForSprite[inputData.blockId] : null;

                        if (connectedBlock && typeof connectedBlock.width === 'number' && !isNaN(connectedBlock.width)) {
                            // If an input block is connected, its width determines the input slot width
                            resolvedWidth = connectedBlock.width;
                        } else { // No connected block, determine width from inputData properties
                            const inputShape = inputData.shape;

                            if (inputShape === 'boolean') {
                                resolvedWidth = this.EMPTY_BOOLEAN_INPUT_WIDTH;
                            } else if (item.type === 'dropdown') {
                                let options = inputData.options || [];
                                // Dynamically update dropdown options if specified
                                if (inputData.dynamic) {
                                    const sprite = this.getActiveSprite();
                                    if (item.key === 'variable') {
                                         const varNames = sprite ? [...new Set([...Object.keys(this.variables), ...Object.keys(sprite.localVariables)])] : [...Object.keys(this.variables)];
                                         options = varNames.map(v => ({ label: v, value: v }));
                                    } else if (item.key === 'list') {
                                         const listNames = sprite ? [...new Set([...Object.keys(this.lists), ...Object.keys(sprite.localLists)])] : [...Object.keys(this.lists)];
                                         options = listNames.map(v => ({ label: v, value: v }));
                                    } else if (item.key === 'target') {
                                        options = [{label: 'mouse-pointer', value: '_mouse_'}];
                                        // Add other sprites as targets
                                        Object.values(this.sprites).forEach(s => {
                                            if (s.id !== this.activeSpriteId) options.push({label: s.name, value: s.id});
                                        });
                                    }
                                    inputData.options = options; // Update options in blockData
                                }
                                
                                // Calculate dropdown width based on text content
                                const currentOption = options.find(o => String(o.value) === String(inputData.value));
                                const label = currentOption ? currentOption.label : (inputData.value || '');
                                const measuredWidth = this.measureText(label) + 30; // Text width + icon/padding
                                resolvedWidth = Math.max(45, measuredWidth); // Minimum width for dropdown
                            } else if (inputShape === 'color') {
                                resolvedWidth = 40; // Fixed width for color input
                            } else if (inputShape === 'slider') {
                                resolvedWidth = 80; // Fixed width for slider input
                            } else if (item.type === 'input') { // Generic text input (could be reporter output or simple string)
                                const textWidth = this.measureText(String(inputData.value));
                                resolvedWidth = Math.max(30, textWidth + 16); // Minimum width for text input
                            }
                        }

                        inputData.width = resolvedWidth; // Store calculated width on inputData
                        itemWidth = resolvedWidth;
                    }
                }
                
                if (itemWidth > 0 && index > 0 && blockData.layout[index-1].type !== 'monitor') { 
                    currentContentWidth += PADDING_BETWEEN_ITEMS; // Add spacing between elements
                }
                currentContentWidth += itemWidth;
            });
        }
        
        // Block width is content width plus padding
        blockData.width = Math.max(blockData.minWidth || 0, currentContentWidth + 10);

        // Requirement 5: C-Block dynamic height calculation
        if (blockData.shape && blockData.shape.startsWith('c_shape')) {
            blockData.width = Math.max(150, blockData.width); // C-shapes have a minimum width
            const cTopH = 28, cMidH = 24, cBottomH = 24, cInnerMinH = 32;
            
            let innerHeight1 = cInnerMinH;
            if (!isPalette && blockData.child && allBlocksForSprite && allBlocksForSprite[blockData.child]) {
                innerHeight1 = Math.max(cInnerMinH, this.calculateStackHeight(allBlocksForSprite[blockData.child], allBlocksForSprite));
            }
            blockData.cInnerHeight1 = innerHeight1; // Store inner height for rendering

            if (blockData.type === 'control_if_else') {
                let innerHeight2 = cInnerMinH;
                if (!isPalette && blockData.child2 && allBlocksForSprite && allBlocksForSprite[blockData.child2]) {
                    innerHeight2 = Math.max(cInnerMinH, this.calculateStackHeight(allBlocksForSprite[blockData.child2], allBlocksForSprite));
                }
                blockData.cInnerHeight2 = innerHeight2; // Store second inner height
                blockData.height = cTopH + innerHeight1 + cMidH + innerHeight2 + cBottomH;
            } else {
                blockData.height = cTopH + innerHeight1 + cBottomH;
            }
        } else if (blockData.outputType) { // Reporter and Boolean blocks have fixed height
            blockData.height = 28;
        } else { // Stack blocks have fixed height
            blockData.height = 40;
        }
        // Requirement 1: Hat blocks have a fixed height and shape
        if (blockData.shape === 'hat') {
            blockData.height = 50; // Fixed height for hat blocks
        }
    },
    
    // Renders the internal content (labels, inputs, icons) of a block
    renderBlockContent(svg, blockData, mainBlockPath, isPalette) {
        let xOffset = 10; // Initial X offset for content
        const C_SHAPE_HEADER_H = 28; // Standard height of C-block header
        const isCShape = blockData.shape && blockData.shape.startsWith('c_shape');
        // Vertical center for content based on block shape
        let contentVerticalCenter = isCShape ? (C_SHAPE_HEADER_H / 2) : (blockData.height / 2 || 0); 
        const blocks = isPalette ? {} : this.getAllBlocksForSprite(blockData.spriteId);
        const PADDING_BETWEEN_ITEMS = 8;

        if(!blockData.layout) return;

        blockData.layout.forEach((item, index) => {
            const currentX = xOffset;
            // Skip monitor items as they are rendered separately
            if (item.type === 'monitor') return;

            const textContent = item.text || '';
            if (item.type === 'label' || item.type === 'operator') {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                const textWidth = this.measureText(textContent);
                text.setAttribute('x', currentX );
                text.setAttribute('y', contentVerticalCenter);
                text.setAttribute('dominant-baseline', 'middle');
                text.setAttribute('text-anchor', 'start');
                text.textContent = textContent;
                text.classList.add('block-label');
                svg.appendChild(text);
                xOffset += textWidth + PADDING_BETWEEN_ITEMS;
            } else if (item.type === 'icon') {
                const iconSize = 16;
                const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
                foreignObject.setAttribute('x', currentX);
                foreignObject.setAttribute('y', contentVerticalCenter - iconSize / 2);
                foreignObject.setAttribute('width', iconSize);
                foreignObject.setAttribute('height', iconSize);
                const iconDiv = document.createElement('div');
                iconDiv.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:white;';
                iconDiv.innerHTML = `<i class="fa-solid ${item.icon}" style="font-size:${iconSize-2}px"></i>`;
                foreignObject.appendChild(iconDiv);
                svg.appendChild(foreignObject);
                xOffset += iconSize + PADDING_BETWEEN_ITEMS;
            } else if (item.type === 'input' || item.type === 'dropdown') {
                const inputData = blockData.inputs ? blockData.inputs[item.key] : null;
                if (!inputData) {
                    xOffset += (item.width || 30) + PADDING_BETWEEN_ITEMS; // Use a default width if inputData is missing
                    return;
                }

                let inputSlotWidth = inputData.width || 30;
                let inputSlotHeight = 24; // Default input height
                
                const hasConnectedBlock = !isPalette && inputData.blockId && blocks && blocks[inputData.blockId];
                if (hasConnectedBlock) {
                    const connectedBlock = blocks[inputData.blockId];
                    inputSlotWidth = connectedBlock.width;
                    inputSlotHeight = connectedBlock.height;
                }

                // Create the SVG path for the input socket
                const socket = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                socket.classList.add('input-socket');
                let socketPathD;
                const inputShape = inputData.shape || 'reporter';

                if (['reporter', 'color', 'slider'].includes(inputShape) || item.type === 'dropdown') {
                    const rimR = inputSlotHeight / 2;
                    socketPathD = `M ${rimR} 0 H ${inputSlotWidth-rimR} A ${rimR} ${rimR} 0 0 1 ${inputSlotWidth} ${rimR} V ${inputSlotHeight-rimR} A ${rimR} ${rimR} 0 0 1 ${inputSlotWidth-rimR} ${inputSlotHeight} H ${rimR} A ${rimR} ${rimR} 0 0 1 0 ${inputSlotHeight-rimR} V ${rimR} A ${rimR} ${rimR} 0 0 1 ${rimR} 0 Z`;
                } else if (inputShape === 'boolean') {
                    const socketHexH = inputSlotHeight/2;
                    socketPathD = `M ${socketHexH} 0 H ${inputSlotWidth - socketHexH} L ${inputSlotWidth} ${socketHexH} L ${inputSlotWidth - socketHexH} ${inputSlotHeight} H ${socketHexH} L 0 ${socketHexH} Z`;
                } else { // Fallback for other shapes or unknown
                    socketPathD = `M 0 0 H ${inputSlotWidth} V ${inputSlotHeight} H 0 Z`;
                }
                if (item.type === 'dropdown') { socket.classList.add('custom-dropdown'); } // Add custom class for styling dropdowns
                socket.setAttribute('transform', `translate(${currentX}, ${contentVerticalCenter - inputSlotHeight/2})`);
                socket.setAttribute('d', socketPathD);
                svg.insertBefore(socket, mainBlockPath.nextSibling); // Insert after main path

                // Render HTML elements for non-connected inputs (e.g., text fields, dropdowns)
                if (!hasConnectedBlock && inputData.shape !== 'boolean') {
                    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
                    foreignObject.setAttribute('x', currentX);
                    foreignObject.setAttribute('y', contentVerticalCenter - 10); // Adjusted Y for better visual centering
                    foreignObject.setAttribute('width', inputSlotWidth);
                    foreignObject.setAttribute('height', 24);

                    const wrapper = document.createElement('div');
                    wrapper.className = 'input-wrapper';

                    if (inputData.shape === 'color') {
                        const swatch = document.createElement('div');
                        swatch.className = 'color-input-swatch';
                        swatch.style.backgroundColor = inputData.value;
                        swatch.addEventListener('mousedown', (e) => {
                            e.stopPropagation();
                            this.showColorPicker(e.currentTarget, isPalette ? blockData : blockData.id, item.key, isPalette);
                        });
                        wrapper.appendChild(swatch);
                    } else if (inputData.shape === 'slider') {
                        const sliderDisplay = document.createElement('div');
                        sliderDisplay.className = 'slider-input-display';
                        sliderDisplay.textContent = inputData.value;
                        sliderDisplay.addEventListener('mousedown', (e) => {
                            e.stopPropagation();
                            this.showSliderInput(e.currentTarget, isPalette ? blockData : blockData.id, item.key, isPalette);
                        });
                        wrapper.appendChild(sliderDisplay);
                    } else if (item.type === 'input') {
                        const inputEl = document.createElement('input');
                        inputEl.type = 'text';
                        inputEl.value = inputData.value;
                        inputEl.className = 'block-input';
                        inputEl.addEventListener('mousedown', (e) => e.stopPropagation());
                        inputEl.addEventListener('input', (e) => {
                            const val = e.target.value;
                            if (isPalette) {
                                blockData.inputs[item.key].value = val;
                            } else {
                                const realBlock = this.getAllBlocksForSprite(blockData.spriteId)[blockData.id];
                                if(realBlock) realBlock.inputs[item.key].value = val;
                            }
                            // Re-render the block to update its width if text changes
                            this.updateBlockPositions(blockData.id);
                        });
                        wrapper.appendChild(inputEl);
                    } else if (item.type === 'dropdown') {
                        const dropdownEl = document.createElement('div');
                        dropdownEl.className = 'dropdown-trigger';
                        const currentOption = (inputData.options || []).find(o => String(o.value) === String(inputData.value));
                        dropdownEl.innerHTML = `<span>${currentOption ? currentOption.label : (inputData.value || '...')}</span><i class="fa-solid fa-chevron-down"></i>`;
                        dropdownEl.addEventListener('mousedown', (e) => {
                            e.stopPropagation();
                            this.showDropdown(dropdownEl, isPalette ? blockData : blockData.id, item.key, isPalette);
                        });
                        wrapper.appendChild(dropdownEl);
                    }
                    foreignObject.appendChild(wrapper);
                    svg.appendChild(foreignObject);
                }
                xOffset += inputSlotWidth + PADDING_BETWEEN_ITEMS;
            }
        });

        // Render "else" label for if-else blocks
        if (blockData.type === 'control_if_else') {
            const cTopH = 28, cMidH = 24, cArmIndent = 20;
            const cInnerMinH = 32; 
            const innerH1 = blockData.cInnerHeight1 || cInnerMinH; // Use calculated inner height
            
            const elseLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            elseLabel.textContent = 'else';
            elseLabel.classList.add('block-divider-label');
            elseLabel.setAttribute('x', cArmIndent + 10);
            elseLabel.setAttribute('y', cTopH + innerH1 + cMidH / 2);
            elseLabel.setAttribute('dominant-baseline', 'middle');
            svg.appendChild(elseLabel);
        }
    },

    // Updates the positions of all blocks in a stack recursively, starting from the root
    updateBlockPositions(startBlockId) {
        // Find the absolute root of the stack to ensure correct recalculation from top
        const rootId = this.getStackRoot(startBlockId, this.activeSpriteId)?.id || startBlockId;
        const allBlocks = this.getActiveBlocks();
        const layoutVisited = new Set();
        const positionVisited = new Set();

        // First pass: Calculate layout (dimensions) for all blocks in the stack
        const layoutPass = (blockId) => {
            if (!blockId || layoutVisited.has(blockId)) return;
            layoutVisited.add(blockId);
            
            const block = allBlocks[blockId];
            if (!block) return;
    
            // Recursively calculate layout for children first (bottom-up for C-shapes, inputs)
            if (block.next) layoutPass(block.next);
            if (block.inputs) {
                Object.values(block.inputs).forEach(input => {
                    if (input.blockId) layoutPass(input.blockId);
                });
            }
            if (block.child) layoutPass(block.child);
            if (block.child2) layoutPass(block.child2);
    
            this.updateLayout(block, false); // Calculate layout for current block based on its children's calculated sizes
        };
        layoutPass(rootId);
    
        // Second pass: Position blocks and render them, ensuring correct relative positions
        const positionPass = (blockId, pos, depth) => {
            if (!blockId || positionVisited.has(blockId)) return;
            positionVisited.add(blockId);
    
            const block = allBlocks[blockId];
            if (!block) return;
            
            block.position = pos;
            block.depth = depth; // Store depth for z-indexing
            this.renderBlock(block); // Render here after dimensions and position are stable
    
            let xOffset = 10;
            const PADDING_BETWEEN_ITEMS = 8;
            const contentVerticalCenter = (block.shape && block.shape.startsWith('c_shape')) ? 14 : (block.shape === 'hat' ? 25 : block.height / 2);
    
            if (block.layout) {
                block.layout.forEach(item => {
                    let itemWidth = 0;
                    if (item.type === 'input' || item.type === 'dropdown') {
                        const inputData = block.inputs[item.key];
                        if (inputData) {
                            if (inputData.blockId && allBlocks[inputData.blockId]) {
                                const childBlock = allBlocks[inputData.blockId];
                                // Position child input block relative to parent's input slot
                                positionPass(childBlock.id, { x: block.position.x + xOffset, y: block.position.y + contentVerticalCenter - (childBlock.height / 2)}, depth + 1);
                                itemWidth = childBlock.width;
                            } else {
                                itemWidth = inputData.width || 30; // Use calculated or default width for empty input slot
                            }
                        }
                    } else if (item.type === 'label' || item.type === 'operator') {
                        itemWidth = this.measureText(item.text || '');
                    } else if (item.type === 'icon') {
                        itemWidth = 16;
                    }
                    if (item.type !== 'monitor') { // Don't add padding after monitor
                        xOffset += itemWidth + PADDING_BETWEEN_ITEMS;
                    }
                });
            }
    
            // Position child blocks for C-shapes
            if (block.child) {
                positionPass(block.child, { x: pos.x + 20, y: pos.y + 28 }, depth + 1);
            }
            if (block.child2) { // For 'else' part of if-else
                const cTopH = 28, cMidH = 24, cInnerMinH = 32;
                let innerH1 = block.cInnerHeight1 || cInnerMinH;
                positionPass(block.child2, { x: pos.x + 20, y: pos.y + cTopH + innerH1 + cMidH }, depth + 1);
            }
            // Position next block in the stack
            if (block.next) {
                // Requirement 1: Adjust Y position for hat blocks to ensure proper snapping
                const nextY = (block.shape === 'hat') ? pos.y + block.height - 10 : pos.y + block.height;
                positionPass(block.next, { x: pos.x, y: nextY }, depth);
            }
        };
        
        positionPass(rootId, allBlocks[rootId].position, 0);
    },
});
