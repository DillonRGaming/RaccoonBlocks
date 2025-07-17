Object.assign(window.Raccoon, {
    updateViewTransform() { 
        if (this.blockContainer) {
            this.blockContainer.style.transform = `translate(${this.view.x}px, ${this.view.y}px) scale(${this.view.zoom})`; 
        }
        if (this.workspace) { 
            this.workspace.style.backgroundPosition = `${this.view.x}px ${this.view.y}px`; 
            const bgSize = 20 * this.view.zoom; 
            this.workspace.style.backgroundSize = `${bgSize}px ${bgSize}px`; 
        } 
        if (this.stage && this.stage.reporterOutputEl && this.stage.reporterOutputEl.style.display === 'block') {
            const blockId = this.stage.reporterOutputEl.dataset.blockId;
            const blockEl = document.getElementById(blockId);
            if(blockEl) {
                const rect = blockEl.getBoundingClientRect();
                this.stage.reporterOutputEl.style.left = `${rect.left + rect.width / 2}px`;
                this.stage.reporterOutputEl.style.top = `${rect.bottom}px`;
            } else {
                this.hideReporterOutput();
            }
        }
    },
    
    renderBlock(blockData, isPalette = false) {
        const width = typeof blockData.width === 'number' && !isNaN(blockData.width) && blockData.width > 0 ? blockData.width : 100;
        const height = typeof blockData.height === 'number' && !isNaN(blockData.height) && blockData.height > 0 ? blockData.height : 40;

        if (isNaN(width) || isNaN(height)) {
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
                svg.style.zIndex = blockData.depth || 0;
            }
            if (!svg.getAttribute('data-event-listeners-attached')) {
                svg.addEventListener('mousedown', (e) => {
                    if (e.target.closest('.block-input, .dropdown-trigger, .color-input-swatch, .slider-input-display')) {
                        return;
                    }
                    this.initBlockDrag(e, blockData.id);
                });
                svg.setAttribute('data-event-listeners-attached', 'true');
            }
        } else {
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

    updateLayout(blockData, isPalette) {
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

        let currentContentWidth = 10;
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
                        itemWidth = 30;
                    } else {
                        let resolvedWidth = 30;
                        const connectedBlock = (!isPalette && inputData.blockId && allBlocksForSprite) ? allBlocksForSprite[inputData.blockId] : null;

                        if (connectedBlock && typeof connectedBlock.width === 'number' && !isNaN(connectedBlock.width)) {
                            resolvedWidth = connectedBlock.width;
                        } else {
                            const inputShape = inputData.shape;
                            if (inputShape === 'boolean') {
                                resolvedWidth = this.EMPTY_BOOLEAN_INPUT_WIDTH;
                            } else if (item.type === 'dropdown') {
                                let options = inputData.options || [];
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
                                        Object.values(this.sprites).forEach(s => {
                                            if (s.id !== this.activeSpriteId) options.push({label: s.name, value: s.id});
                                        });
                                    }
                                    inputData.options = options;
                                }
                                
                                const currentOption = options.find(o => String(o.value) === String(inputData.value));
                                const label = currentOption ? currentOption.label : (inputData.value || '');
                                const measuredWidth = this.measureText(label) + 30;
                                resolvedWidth = Math.max(45, measuredWidth);
                            } else if (inputShape === 'color') {
                                resolvedWidth = 40;
                            } else if (inputShape === 'slider') {
                                resolvedWidth = 80;
                            } else if (item.type === 'input') {
                                const textWidth = this.measureText(String(inputData.value));
                                resolvedWidth = Math.max(30, textWidth + 16);
                            }
                        }

                        inputData.width = resolvedWidth;
                        itemWidth = resolvedWidth;
                    }
                }
                
                if (itemWidth > 0 && index > 0 && blockData.layout[index-1].type !== 'monitor') { 
                    currentContentWidth += PADDING_BETWEEN_ITEMS;
                }
                currentContentWidth += itemWidth;
            });
        }
        
        blockData.width = Math.max(blockData.minWidth || 0, currentContentWidth + 10);

        if (blockData.shape && blockData.shape.startsWith('c_shape')) {
            blockData.width = Math.max(150, blockData.width);
            const cTopH = 28, cMidH = 24, cBottomH = 24, cInnerMinH = 32;
            
            let innerHeight1 = cInnerMinH;
            if (!isPalette && blockData.child && allBlocksForSprite && allBlocksForSprite[blockData.child]) {
                innerHeight1 = Math.max(cInnerMinH, this.calculateStackHeight(allBlocksForSprite[blockData.child], allBlocksForSprite));
            }
            blockData.cInnerHeight1 = innerHeight1;

            if (blockData.type === 'control_if_else') {
                let innerHeight2 = cInnerMinH;
                if (!isPalette && blockData.child2 && allBlocksForSprite && allBlocksForSprite[blockData.child2]) {
                    innerHeight2 = Math.max(cInnerMinH, this.calculateStackHeight(allBlocksForSprite[blockData.child2], allBlocksForSprite));
                }
                blockData.cInnerHeight2 = innerHeight2;
                blockData.height = cTopH + innerHeight1 + cMidH + innerHeight2 + cBottomH;
            } else {
                blockData.height = cTopH + innerHeight1 + cBottomH;
            }
        } else if (blockData.outputType) {
            blockData.height = 28;
        } else if (blockData.shape === 'hat') {
            blockData.height = 40;
        } else {
            blockData.height = 40;
        }
    },
    
    renderBlockContent(svg, blockData, mainBlockPath, isPalette) {
        let xOffset = 10;
        const C_SHAPE_HEADER_H = 28;
        const isCShape = blockData.shape && blockData.shape.startsWith('c_shape');
        let contentVerticalCenter = isCShape ? (C_SHAPE_HEADER_H / 2) : (blockData.height / 2 || 0); 
        const blocks = isPalette ? {} : this.getAllBlocksForSprite(blockData.spriteId);
        const PADDING_BETWEEN_ITEMS = 8;

        if(!blockData.layout) return;

        blockData.layout.forEach((item, index) => {
            const currentX = xOffset;
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
                    xOffset += (item.width || 30) + PADDING_BETWEEN_ITEMS;
                    return;
                }

                let inputSlotWidth = inputData.width || 30;
                let inputSlotHeight = 24;
                
                const hasConnectedBlock = !isPalette && inputData.blockId && blocks && blocks[inputData.blockId];
                if (hasConnectedBlock) {
                    const connectedBlock = blocks[inputData.blockId];
                    inputSlotWidth = connectedBlock.width;
                    inputSlotHeight = connectedBlock.height;
                }

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
                } else {
                    socketPathD = `M 0 0 H ${inputSlotWidth} V ${inputSlotHeight} H 0 Z`;
                }
                if (item.type === 'dropdown') { socket.classList.add('custom-dropdown'); }
                if(inputData.menuClass) socket.classList.add(inputData.menuClass);

                socket.setAttribute('transform', `translate(${currentX}, ${contentVerticalCenter - inputSlotHeight/2})`);
                socket.setAttribute('d', socketPathD);
                svg.insertBefore(socket, mainBlockPath.nextSibling);

                if (!hasConnectedBlock && inputData.shape !== 'boolean') {
                    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
                    foreignObject.setAttribute('x', currentX);
                    foreignObject.setAttribute('y', contentVerticalCenter - 12);
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

        if (blockData.type === 'control_if_else') {
            const cTopH = 28, cMidH = 24, cArmIndent = 20;
            const cInnerMinH = 32; 
            const innerH1 = blockData.cInnerHeight1 || cInnerMinH;
            
            const elseLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            elseLabel.textContent = 'else';
            elseLabel.classList.add('block-divider-label');
            elseLabel.setAttribute('x', cArmIndent + 10);
            elseLabel.setAttribute('y', cTopH + innerH1 + cMidH / 2);
            elseLabel.setAttribute('dominant-baseline', 'middle');
            svg.appendChild(elseLabel);
        }
    },

    updateBlockPositions(startBlockId) {
        if (!startBlockId) return;
        const rootId = this.getStackRoot(startBlockId, this.activeSpriteId)?.id || startBlockId;
        const allBlocks = this.getActiveBlocks();
        const layoutVisited = new Set();
        const positionVisited = new Set();

        const layoutPass = (blockId) => {
            if (!blockId || layoutVisited.has(blockId)) return;
            layoutVisited.add(blockId);
            
            const block = allBlocks[blockId];
            if (!block) return;
    
            if (block.next) layoutPass(block.next);
            if (block.inputs) {
                Object.values(block.inputs).forEach(input => {
                    if (input.blockId) layoutPass(input.blockId);
                });
            }
            if (block.child) layoutPass(block.child);
            if (block.child2) layoutPass(block.child2);
    
            this.updateLayout(block, false);
        };
        layoutPass(rootId);
    
        const positionPass = (blockId, pos, depth) => {
            if (!blockId || positionVisited.has(blockId)) return;
            positionVisited.add(blockId);
    
            const block = allBlocks[blockId];
            if (!block) return;
            
            block.position = pos;
            block.depth = depth;
            this.renderBlock(block);
    
            let xOffset = 10;
            const PADDING_BETWEEN_ITEMS = 8;
            const contentVerticalCenter = (block.shape && block.shape.startsWith('c_shape')) ? 14 : (block.height / 2);
    
            if (block.layout) {
                block.layout.forEach(item => {
                    let itemWidth = 0;
                    if (item.type === 'input' || item.type === 'dropdown') {
                        const inputData = block.inputs[item.key];
                        if (inputData) {
                            if (inputData.blockId && allBlocks[inputData.blockId]) {
                                const childBlock = allBlocks[inputData.blockId];
                                positionPass(childBlock.id, { x: block.position.x + xOffset, y: block.position.y + contentVerticalCenter - (childBlock.height / 2)}, depth + 1);
                                itemWidth = childBlock.width;
                            } else {
                                itemWidth = inputData.width || 30;
                            }
                        }
                    } else if (item.type === 'label' || item.type === 'operator') {
                        itemWidth = this.measureText(item.text || '');
                    } else if (item.type === 'icon') {
                        itemWidth = 16;
                    }
                    if (item.type !== 'monitor') {
                        xOffset += itemWidth + PADDING_BETWEEN_ITEMS;
                    }
                });
            }
    
            if (block.child) {
                positionPass(block.child, { x: pos.x + 20, y: pos.y + 28 }, depth + 1);
            }
            if (block.child2) {
                const cTopH = 28, cMidH = 24, cInnerMinH = 32;
                let innerH1 = block.cInnerHeight1 || cInnerMinH;
                positionPass(block.child2, { x: pos.x + 20, y: pos.y + cTopH + innerH1 + cMidH }, depth + 1);
            }
            if (block.next) {
                positionPass(block.next, { x: pos.x, y: pos.y + block.height }, depth);
            }
        };
        
        positionPass(rootId, allBlocks[rootId].position, 0);
    },
});