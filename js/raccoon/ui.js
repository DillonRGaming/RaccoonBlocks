Object.assign(window.Raccoon, {
    showColorPicker(triggerEl, blockOrId, inputKey, isPalette) {
        this.hideAllPopovers();

        let block = isPalette ? blockOrId : this.getActiveBlocks()[blockOrId];
        if (!block || !block.inputs || !block.inputs[inputKey]) return;

        const input = block.inputs[inputKey];

        const picker = document.createElement('div');
        picker.className = 'color-picker';
        picker.dataset.popover = 'true';
        picker.addEventListener('mousedown', e => e.stopPropagation()); // Prevent closing on click inside

        const main = document.createElement('div'); main.className = 'color-picker-main';
        const sat = document.createElement('div'); sat.className = 'saturation';
        const bright = document.createElement('div'); bright.className = 'brightness';
        const handle = document.createElement('div'); handle.className = 'color-picker-handle';
        main.append(sat, bright, handle);

        const hueSlider = document.createElement('input');
        hueSlider.type = 'range'; hueSlider.min = 0; hueSlider.max = 360;
        hueSlider.className = 'color-picker-hue-slider';

        picker.append(main, hueSlider);
        document.body.appendChild(picker);

        let h = 0, s = 1, v = 1;
        
        // Function to update color based on HSV values
        const updateColor = (from = 'hsv') => {
            if(from === 'hex') {
                [h, s, v] = Raccoon.rgbToHsv(...Raccoon.hexToRgb(input.value));
            }
            const rgb = Raccoon.hsvToRgb(h, s, v);
            input.value = Raccoon.rgbToHex(...rgb);
            triggerEl.style.backgroundColor = input.value; // Update swatch color
            main.style.backgroundColor = `hsl(${h}, 100%, 50%)`; // Update main picker background hue
            
            // Position saturation/brightness handle
            handle.style.left = `${s * 100}%`;
            handle.style.top = `${(1-v) * 100}%`;
            hueSlider.value = h; // Update hue slider position

            if (!isPalette) { this.renderBlock(block); } // Re-render block if not in palette
        };

        let isDraggingMain = false;
        const onDragMain = (e) => {
            if (!isDraggingMain) return;
            const rect = main.getBoundingClientRect();
            s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            v = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
            updateColor();
        };

        main.addEventListener('mousedown', (e) => { isDraggingMain = true; onDragMain(e); });
        window.addEventListener('mousemove', onDragMain);
        window.addEventListener('mouseup', () => isDraggingMain = false);
        hueSlider.addEventListener('input', () => { h = hueSlider.value; updateColor(); });
        updateColor('hex'); // Initialize colors from existing value

        // Position the picker relative to the trigger element
        const triggerRect = triggerEl.getBoundingClientRect();
        picker.style.left = `${triggerRect.left}px`;
        picker.style.top = `${triggerRect.bottom + 5}px`;
    },
    
    showDropdown(triggerEl, blockOrId, inputKey, isPalette) {
        this.hideAllPopovers();
    
        const getBlock = () => isPalette ? blockOrId : this.getActiveBlocks()[blockOrId];
        
        let block = getBlock();
        if (!block || !block.inputs || !block.inputs[inputKey]) return;
        
        // Dynamic options for block inputs are handled in updateLayout when block is rendered.
        // For palettes, they are re-generated in createPaletteBlock.
        const input = block.inputs[inputKey];
        const options = input.options || [];
    
        if (options.length === 0) return;
    
        const menu = document.createElement('div');
        menu.className = 'dropdown-menu';
        menu.dataset.popover = 'true';
        menu.addEventListener('mousedown', e => e.stopPropagation());
        menu.dataset.category = block.category; // Add category to menu for styling
        menu.style.backgroundColor = Raccoon.BlockColors[block.category]; // Set background color to block category color

        // Add class for rounded square dropdowns if specified
        if (input.isRoundedSquare) {
            menu.classList.add('rounded-square');
        }
    
        // Requirement 6: Add search input to all dropdowns
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'dropdown-search-input';
        searchInput.placeholder = 'Search...';
        searchInput.addEventListener('input', e => {
            const searchTerm = e.target.value.toLowerCase();
            menu.querySelectorAll('.dropdown-item').forEach(itemEl => {
                itemEl.classList.toggle('hidden', !itemEl.textContent.toLowerCase().includes(searchTerm));
            });
        });
        menu.appendChild(searchInput);
    
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'dropdown-items-container';
        options.forEach(option => {
            if (option.disabled) return; // Skip disabled options
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = option.label;
            item.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                
                const currentBlock = getBlock();
                if(!currentBlock) return;
                
                currentBlock.inputs[inputKey].value = option.value;
    
                if (!isPalette) {
                    this.updateBlockPositions(this.getStackRoot(currentBlock.id, currentBlock.spriteId)?.id || currentBlock.id);
                } else {
                    // For palette blocks, we need to re-render the palette block itself
                    const paletteBlockWrapper = triggerEl.closest('.palette-block-wrapper');
                    if(paletteBlockWrapper) {
                        this.updateLayout(currentBlock, true); // Recalculate layout with new value
                        const newSvg = this.renderBlock(currentBlock, true); // Re-render the SVG
                        paletteBlockWrapper.innerHTML = '';
                        if(newSvg) paletteBlockWrapper.appendChild(newSvg);
                    }
                }
                this.hideDropdown(); // Close dropdown after selection
            });
            itemsContainer.appendChild(item);
        });
        menu.appendChild(itemsContainer);
        document.body.appendChild(menu);
    
        // Position dropdown menu
        const triggerRect = triggerEl.getBoundingClientRect();
        menu.style.left = `${triggerRect.left}px`;
        menu.style.top = `${triggerRect.bottom + 5}px`;
        menu.style.minWidth = `${triggerRect.width}px`;
    
        // Adjust position if it goes off screen
        const menuRect = menu.getBoundingClientRect();
        if (menuRect.bottom > window.innerHeight) {
            menu.style.top = `${triggerRect.top - menuRect.height - 5}px`;
        }
        if (menuRect.right > window.innerWidth) {
            menu.style.left = `${window.innerWidth - menuRect.width - 5}px`;
        }
    
        menu.querySelector('.dropdown-search-input')?.focus();
    },

    showSliderInput(triggerEl, blockOrId, inputKey, isPalette) {
        this.hideAllPopovers();
    
        let block = isPalette ? blockOrId : this.getActiveBlocks()[blockOrId];
        if (!block || !block.inputs || !block.inputs[inputKey]) return;
    
        const input = block.inputs[inputKey];
        const min = input.min !== undefined ? parseFloat(input.min) : 0;
        const max = input.max !== undefined ? parseFloat(input.max) : 100;
        const step = input.step !== undefined ? parseFloat(input.step) : 1;
    
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'block-slider';
        sliderContainer.dataset.popover = 'true';
        sliderContainer.addEventListener('mousedown', e => e.stopPropagation());
    
        const rangeInput = document.createElement('input');
        rangeInput.type = 'range';
        rangeInput.min = min;
        rangeInput.max = max;
        rangeInput.step = step;
        rangeInput.value = parseFloat(input.value) || 0;
    
        const valueDisplay = document.createElement('div');
        valueDisplay.className = 'slider-value-display';
        valueDisplay.textContent = rangeInput.value;
    
        rangeInput.addEventListener('input', (e) => {
            const newValue = parseFloat(e.target.value);
            input.value = newValue; // Update block's input value
            valueDisplay.textContent = newValue; // Update display
            if (!isPalette) {
                 this.updateBlockPositions(block.id); // Re-render block if value might affect layout (e.g., label text changes)
            }
        });
    
        sliderContainer.appendChild(rangeInput);
        sliderContainer.appendChild(valueDisplay);
        document.body.appendChild(sliderContainer);
    
        const triggerRect = triggerEl.getBoundingClientRect();
        sliderContainer.style.left = `${triggerRect.left}px`;
        sliderContainer.style.top = `${triggerRect.bottom + 5}px`;
        sliderContainer.style.minWidth = `${triggerRect.width}px`;
        rangeInput.focus();
    }, 

    // Requirement 2: Removed comment system completely. This function is no longer needed.
    // addComment(position) {
    //     const sprite = this.getActiveSprite();
    //     if (!sprite) return;
    //     const id = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    //     const commentData = {
    //         id,
    //         spriteId: sprite.id,
    //         position,
    //         title: "Comment",
    //         text: "",
    //         width: 150,
    //         height: 100,
    //     };
    //     sprite.comments[id] = commentData;
    //     this.renderComment(commentData);
    // },

    // Requirement 2: Removed comment system completely. This function is no longer needed.
    // deleteComment(commentId) {
    //     const sprite = this.getActiveSprite();
    //     if (sprite && sprite.comments[commentId]) {
    //         document.getElementById(commentId)?.remove();
    //         delete sprite.comments[commentId];
    //     }
    // },

    // Requirement 2: Removed comment system completely. This function is no longer needed.
    // renderComment(commentData) {
    //     let el = document.getElementById(commentData.id);
    //     if (!el) {
    //         el = document.createElement('div');
    //         el.id = commentData.id;
    //         el.className = 'comment-container';
    //         el.dataset.spriteId = commentData.spriteId;
    //         el.style.left = `${commentData.position.x}px`;
    //         el.style.top = `${commentData.position.y}px`;
    //         el.style.width = `${commentData.width}px`;
    //         el.style.height = `${commentData.height}px`;

    //         const header = document.createElement('div');
    //         header.className = 'comment-header';

    //         const titleInput = document.createElement('input');
    //         titleInput.type = 'text';
    //         titleInput.className = 'comment-title';
    //         titleInput.value = commentData.title;
    //         titleInput.addEventListener('input', e => { commentData.title = e.target.value; });
    //         titleInput.addEventListener('mousedown', e => e.stopPropagation());

    //         const deleteBtn = document.createElement('button');
    //         deleteBtn.className = 'comment-delete-btn';
    //         deleteBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    //         deleteBtn.title = "Delete Comment";
    //         deleteBtn.addEventListener('mousedown', e => {
    //             e.stopPropagation();
    //             this.deleteComment(commentData.id);
    //         });

    //         const body = document.createElement('textarea');
    //         body.className = 'comment-body';
    //         body.value = commentData.text;
            
    //         const autoResize = () => {
    //             body.style.height = 'auto';
    //             const newHeight = Math.max(50, body.scrollHeight);
    //             body.style.height = `${newHeight}px`;
    //             el.style.height = `${header.offsetHeight + newHeight + 16}px`;
    //             commentData.height = el.offsetHeight;
    //         };

    //         body.addEventListener('input', () => {
    //             commentData.text = body.value;
    //             autoResize();
    //         });
    //         body.addEventListener('mousedown', e => e.stopPropagation());

    //         header.append(titleInput, deleteBtn);
    //         el.append(header, body);
    //         this.blockContainer.appendChild(el);
    //         autoResize();

    //         let isDragging = false;
    //         let dragOffsetX, dragOffsetY;
    //         header.addEventListener('mousedown', e => {
    //             if (e.target.closest('.comment-title, .comment-delete-btn')) return;
    //             e.stopPropagation();
    //             isDragging = true;
    //             const virtualPos = this.screenToVirtual({x: e.clientX, y: e.clientY});
    //             dragOffsetX = virtualPos.x - commentData.position.x;
    //             dragOffsetY = virtualPos.y - commentData.position.y;
    //             el.style.zIndex = 1001; // Bring to front while dragging
    //         });
    //         window.addEventListener('mousemove', e => {
    //             if (!isDragging) return;
    //             const virtualPos = this.screenToVirtual({x: e.clientX, y: e.clientY});
    //             commentData.position.x = virtualPos.x - dragOffsetX;
    //             commentData.position.y = virtualPos.y - dragOffsetY;
    //             el.style.left = `${commentData.position.x}px`;
    //             el.style.top = `${commentData.position.y}px`;
    //         });
    //         window.addEventListener('mouseup', () => {
    //             isDragging = false;
    //             el.style.zIndex = 500; // Reset z-index
    //         });
    //     }
    // },

    hideAllPopovers() {
        document.querySelectorAll('[data-popover="true"]').forEach(el => el.remove());
    },
    hideDropdown() { document.querySelectorAll('.dropdown-menu').forEach(el => el.remove()); },
    hideColorPicker() { document.querySelectorAll('.color-picker').forEach(el => el.remove()); },
    hideSliderInput() { document.querySelectorAll('.block-slider').forEach(el => el.remove()); },
    // Requirement 3: Conditional hiding of reporter output
    hideReporterOutput(blockId = null) { 
        const r = document.getElementById('reporter-output'); 
        // Only hide if the current output bubble belongs to the specified blockId, or if no blockId is given (general hide)
        if (r && (blockId === null || r.dataset.blockId === blockId)) {
            r.style.display = 'none'; 
            r.removeAttribute('data-block-id'); // Clear the block ID it's associated with
        }
    },
    hideContextMenu() { const menu = document.getElementById('context-menu'); if (menu) menu.style.display = 'none'; },
});
