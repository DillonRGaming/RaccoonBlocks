Object.assign(window.Raccoon, {
    showColorPicker(triggerEl, blockOrId, inputKey, isPalette) {
        this.hideAllPopovers();

        let block = isPalette ? blockOrId : this.getActiveBlocks()[blockOrId];
        if (!block || !block.inputs || !block.inputs[inputKey]) return;

        const input = block.inputs[inputKey];

        const picker = document.createElement('div');
        picker.className = 'color-picker';
        picker.dataset.popover = 'true';
        picker.addEventListener('mousedown', e => e.stopPropagation());

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
        
        const updateColor = (from = 'hsv') => {
            if(from === 'hex') {
                [h, s, v] = Raccoon.rgbToHsv(...Raccoon.hexToRgb(input.value));
            }
            const rgb = Raccoon.hsvToRgb(h, s, v);
            input.value = Raccoon.rgbToHex(...rgb);
            triggerEl.style.backgroundColor = input.value;
            main.style.backgroundColor = `hsl(${h}, 100%, 50%)`;
            
            handle.style.left = `${s * 100}%`;
            handle.style.top = `${(1-v) * 100}%`;
            hueSlider.value = h;

            if (!isPalette) { this.renderBlock(block); }
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
        updateColor('hex');

        const triggerRect = triggerEl.getBoundingClientRect();
        picker.style.left = `${triggerRect.left}px`;
        picker.style.top = `${triggerRect.bottom + 5}px`;
    },
    
    showDropdown(triggerEl, blockOrId, inputKey, isPalette) {
        this.hideAllPopovers();
    
        const getBlock = () => isPalette ? blockOrId : this.getActiveBlocks()[blockOrId];
        
        let block = getBlock();
        if (!block || !block.inputs || !block.inputs[inputKey]) return;
        
        const input = block.inputs[inputKey];
        const options = input.options || [];
    
        if (options.length === 0) return;
    
        const menu = document.createElement('div');
        menu.className = 'dropdown-menu';
        menu.dataset.popover = 'true';
        menu.addEventListener('mousedown', e => e.stopPropagation());
        menu.style.backgroundColor = `var(--${block.category}-color)`;

        if(input.menuClass) menu.classList.add(input.menuClass);
    
        if (input.searchable !== false) {
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = 'dropdown-search-input';
            searchInput.placeholder = 'Search...';
            searchInput.addEventListener('mousedown', e => e.stopPropagation());
            searchInput.addEventListener('input', e => {
                const searchTerm = e.target.value.toLowerCase();
                menu.querySelectorAll('.dropdown-item').forEach(itemEl => {
                    itemEl.classList.toggle('hidden', !itemEl.textContent.toLowerCase().includes(searchTerm));
                });
            });
            menu.appendChild(searchInput);
        }
    
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'dropdown-items-container';
        options.forEach(option => {
            if (option.disabled) return;
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
                    const paletteBlockWrapper = triggerEl.closest('.palette-block-wrapper');
                    if(paletteBlockWrapper) {
                        this.updateLayout(currentBlock, true);
                        const newSvg = this.renderBlock(currentBlock, true);
                        paletteBlockWrapper.innerHTML = '';
                        if(newSvg) paletteBlockWrapper.appendChild(newSvg);
                    }
                }
                this.hideDropdown();
            });
            itemsContainer.appendChild(item);
        });
        menu.appendChild(itemsContainer);
        document.body.appendChild(menu);
    
        const triggerRect = triggerEl.getBoundingClientRect();
        menu.style.left = `${triggerRect.left}px`;
        menu.style.top = `${triggerRect.bottom + 5}px`;
        menu.style.minWidth = `${triggerRect.width}px`;
    
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
            input.value = newValue;
            valueDisplay.textContent = newValue;
            if (!isPalette) {
                 this.updateBlockPositions(block.id);
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

    hideAllPopovers() {
        document.querySelectorAll('[data-popover="true"]').forEach(el => el.remove());
    },
    hideDropdown() { document.querySelectorAll('.dropdown-menu').forEach(el => el.remove()); },
    hideColorPicker() { document.querySelectorAll('.color-picker').forEach(el => el.remove()); },
    hideSliderInput() { document.querySelectorAll('.block-slider').forEach(el => el.remove()); },
    hideReporterOutput(blockId = null) { 
        const r = document.getElementById('reporter-output'); 
        if (r && (blockId === null || r.dataset.blockId === blockId)) {
            r.style.display = 'none'; 
            r.removeAttribute('data-block-id');
        }
    },
    hideContextMenu() { const menu = document.getElementById('context-menu'); if (menu) menu.style.display = 'none'; },
});