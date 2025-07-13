document.addEventListener('DOMContentLoaded', () => {
    const mainContentEl = document.getElementById('main-content');
    const paletteEl = document.getElementById('block-palette');
    const categorySwitcherEl = document.getElementById('category-switcher');
    const spriteListEl = document.getElementById('sprite-list');
    const addSpriteBtn = document.getElementById('add-sprite-btn');
    const leftSidebar = document.getElementById('left-sidebar');
    const rightSidebar = document.getElementById('right-area');
    const runButtonEl = document.getElementById('run-button');
    const stopButtonEl = document.getElementById('stop-button');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const toggleRightSidebarBtn = document.getElementById('toggle-right-sidebar-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalOkBtn = document.getElementById('modal-ok-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const varNameInput = document.getElementById('variable-name-input');
    const costumeFileInput = document.getElementById('costume-file-input');
    const importCostumeBtn = document.getElementById('import-costume-btn');
    const contextMenuEl = document.getElementById('context-menu');
    const toggleSpriteInfoBtn = document.getElementById('toggle-sprite-info-btn');
    const collapsibleSpriteInfoEl = document.getElementById('collapsible-sprite-info');
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    const spriteInfoPanel = { 
        name: document.getElementById('sprite-name-input'), 
        x: document.getElementById('sprite-x-input'), 
        y: document.getElementById('sprite-y-input'), 
        size: document.getElementById('sprite-size-input'), 
        direction: document.getElementById('sprite-direction-input'), 
        showBtn: document.getElementById('sprite-show-btn'), 
        hideBtn: document.getElementById('sprite-hide-btn'), 
    };
    
    function updateAllUI() { 
        updateSpriteList(); 
        updateSpriteInfoPanel(); 
        Raccoon.stage.render(); 
    }

    function updateSpriteList() { 
        spriteListEl.innerHTML = ''; 
        const activeSpriteId = Raccoon.activeSpriteId; 
        Object.values(Raccoon.sprites).forEach(sprite => { 
            const item = document.createElement('div'); 
            item.className = 'sprite-item'; 
            item.dataset.spriteId = sprite.id; 
            if (sprite.id === activeSpriteId) item.classList.add('selected'); 
            
            const thumbContainer = document.createElement('div');
            thumbContainer.style.width = '50px';
            thumbContainer.style.height = '50px';
            thumbContainer.style.display = 'flex';
            thumbContainer.style.alignItems = 'center';
            thumbContainer.style.justifyContent = 'center';
            thumbContainer.style.marginBottom = '5px';

            if (sprite.costume.bitmap) {
                const thumb = document.createElement('canvas');
                thumb.width = 50;
                thumb.height = 50;
                const ctx = thumb.getContext('2d');
                ctx.drawImage(sprite.costume.bitmap, 0, 0, 50, 50);
                thumb.className = 'sprite-thumbnail';
                thumbContainer.appendChild(thumb);
            }
            
            const name = document.createElement('span'); 
            name.className = 'item-name'; 
            name.textContent = sprite.name; 
            name.style.wordBreak = 'break-all';

            const deleteIcon = document.createElement('span'); 
            deleteIcon.className = 'delete-icon'; 
            deleteIcon.innerHTML = '×'; 
            deleteIcon.dataset.spriteId = sprite.id; 
            
            item.appendChild(deleteIcon); 
            item.appendChild(thumbContainer); 
            item.appendChild(name); 

            spriteListEl.appendChild(item); 
        }); 
    }
    
    function updateSpriteInfoPanel() { 
        const sprite = Raccoon.getActiveSprite(); 
        if (!sprite) return; 
        spriteInfoPanel.name.value = sprite.name; 
        spriteInfoPanel.x.value = Math.round(sprite.x); 
        spriteInfoPanel.y.value = Math.round(sprite.y); 
        spriteInfoPanel.size.value = Math.round(sprite.size);
        spriteInfoPanel.direction.value = sprite.rotation; 
        spriteInfoPanel.showBtn.classList.toggle('active', sprite.visible); 
        spriteInfoPanel.hideBtn.classList.toggle('active', !sprite.visible); 
    }
    
    function showVariableModal(type = 'variable') { 
        const title = type === 'variable' ? 'New Variable' : 'New List';
        modalOverlay.querySelector('h3').textContent = title;
        varNameInput.value = ''; 
        modalOverlay.dataset.type = type;
        modalOverlay.classList.add('visible'); 
        varNameInput.focus(); 
    }

    function hideVariableModal() { 
        modalOverlay.classList.remove('visible'); 
    }

    function handleCreateData() {
        const name = varNameInput.value.trim();
        if (!name) {
            alert("Name cannot be empty.");
            return;
        }
        const type = modalOverlay.dataset.type || 'variable';
        const scope = modalOverlay.querySelector('input[name="variable-scope"]:checked').value;

        const success = (type === 'variable') 
            ? Raccoon.createVariable(name, scope)
            : Raccoon.createList(name, scope);

        if (success) {
            const activeCategory = categorySwitcherEl.querySelector('.active')?.dataset.category;
            if (activeCategory === 'data' || activeCategory === 'lists') {
                populatePalette(activeCategory);
            }
            updateAllUI();
        } else {
            alert(`A ${type} named "${name}" already exists in this scope.`);
        }
        hideVariableModal();
    }

    function getBlockDisplayName(blockSpec) {
        if (!blockSpec || !blockSpec.layout) return 'block';
        return blockSpec.layout
            .filter(item => item.type === 'label' || item.type === 'operator')
            .map(item => item.text)
            .join(' ')
            .replace(/%|:/g, '')
            .trim();
    }
    
    function showContextMenu(e, blockId) {
        e.preventDefault();
        Raccoon.hideContextMenu();
        const block = Raccoon.getActiveBlocks()[blockId];
        if (!block) return;
        
        const deleteLabel = block.next ? "Delete Stack" : "Delete Block";
        const menuItems = [
            { label: 'Duplicate', action: () => Raccoon.duplicateStack(block.id, {x:20, y:20}) },
            { label: deleteLabel, action: () => Raccoon.deleteStack(block.id, block.spriteId) }
        ];
    
        const blockDef = Raccoon.blockDefinitions[block.type];
        if (blockDef?.spec.switchable?.length > 0) {
            if (menuItems.length > 0) menuItems.push({ separator: true });
    
            blockDef.spec.switchable.forEach(switchableType => {
                const switchableDef = Raccoon.blockDefinitions[switchableType];
                if (switchableDef) {
                    const displayName = getBlockDisplayName(switchableDef.spec);
                    menuItems.push({
                        label: `Switch to "${displayName}"`,
                        action: () => Raccoon.switchBlock(block.id, switchableType)
                    });
                }
            });
        }
    
        contextMenuEl.innerHTML = '';
        menuItems.forEach(item => {
            if (item.separator) {
                const separator = document.createElement('div');
                separator.style.height = '1px';
                separator.style.backgroundColor = 'var(--border-color)';
                separator.style.margin = '4px 6px';
                contextMenuEl.appendChild(separator);
                return;
            }
    
            const menuItemEl = document.createElement('div');
            menuItemEl.className = 'context-menu-item';
            menuItemEl.textContent = item.label;
            menuItemEl.style.setProperty('--hover-color', `var(--${block.category}-color)`);
            menuItemEl.addEventListener('mousedown', (evt) => {
                evt.stopPropagation();
                item.action();
                Raccoon.hideContextMenu();
            });
            contextMenuEl.appendChild(menuItemEl);
        });
    
        contextMenuEl.style.display = 'block';
        contextMenuEl.style.left = `${e.clientX}px`;
        contextMenuEl.style.top = `${e.clientY}px`;
    }
    
    function createPaletteBlock(spec) {
        const specCopy = (typeof structuredClone === 'function')
            ? structuredClone(spec)
            : JSON.parse(JSON.stringify(spec));
        
        const activeSprite = Raccoon.getActiveSprite();
        if (specCopy.inputs) {
            if (specCopy.inputs.variable) {
                 const varNames = activeSprite ? [...new Set([...Object.keys(Raccoon.variables), ...Object.keys(activeSprite.localVariables)])] : [...Object.keys(Raccoon.variables)];
                 if (varNames.length === 0) return null;
                 specCopy.inputs.variable.value = varNames[0] || '';
                 specCopy.inputs.variable.dynamic = true;
            }
            if (specCopy.inputs.list) {
                 const listNames = activeSprite ? [...new Set([...Object.keys(Raccoon.lists), ...Object.keys(activeSprite.localLists)])] : [...Object.keys(Raccoon.lists)];
                 if (listNames.length === 0) return null;
                 specCopy.inputs.list.value = listNames[0] || '';
                 specCopy.inputs.list.dynamic = true;
            }
            if (specCopy.inputs.target) {
                specCopy.inputs.target.dynamic = true;
            }
        }
        
        const isMonitorable = specCopy.layout?.some(item => item.type === 'monitor');
        const container = document.createElement('div');
        
        if (isMonitorable) {
            container.className = 'palette-block-container';

            const checkboxLabel = document.createElement('label');
            checkboxLabel.className = 'monitor-checkbox-palette';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            
            const blockDef = Raccoon.blockDefinitions[specCopy.type];
            checkbox.checked = !!blockDef?.spec.monitored;
            
            checkbox.addEventListener('click', e => {
                e.stopPropagation();
                const isChecked = e.target.checked;
                specCopy.monitored = isChecked;

                if (blockDef) {
                     blockDef.spec.monitored = isChecked;
                }
                
                const blocks = Raccoon.getActiveBlocks();
                for(const blockId in blocks) {
                    if (blocks[blockId].type === specCopy.type) {
                        blocks[blockId].monitored = isChecked;
                    }
                }
                Raccoon.stage.render();
            });

            checkboxLabel.appendChild(checkbox);
            container.appendChild(checkboxLabel);
        }
        
        const wrapper = document.createElement('div');
        wrapper.className = 'palette-block-wrapper';
        
        const paletteSvg = Raccoon.renderBlock(specCopy, true);
        wrapper.appendChild(paletteSvg);

        wrapper.addEventListener('mousedown', (e) => {
             if(e.target.closest('.monitor-checkbox-wrapper, .block-input, .dropdown-trigger, .color-input-swatch, .slider-input-trigger')) return;
             if(e.button === 0) {
                e.preventDefault();
                Raccoon.cloneBlock(specCopy, { x: e.clientX, y: e.clientY });
             }
        });
        
        container.appendChild(wrapper);
        return container;
    }

    function createDataHeader(text) {
        const header = document.createElement('div');
        header.className = 'palette-data-header';
        header.textContent = text;
        return header;
    }

    function populatePalette(categoryId) {
        paletteEl.innerHTML = '';
        const activeSprite = Raccoon.getActiveSprite();
    
        if (categoryId === 'data' || categoryId === 'lists') {
            const isData = categoryId === 'data';
            const button = document.createElement('button');
            button.className = 'make-variable-button';
            button.textContent = `Make a ${isData ? 'Variable' : 'List'}`;
            button.addEventListener('click', () => showVariableModal(isData ? 'variable' : 'list'));
            paletteEl.appendChild(button);
    
            const globalItems = isData ? Raccoon.variables : Raccoon.lists;
            if (Object.keys(globalItems).length > 0) {
                paletteEl.appendChild(createDataHeader('For All Sprites'));
                Object.keys(globalItems).forEach(name => {
                    const item = globalItems[name];
                    const spec = { type: isData ? 'data_variable' : 'data_listcontents', monitorLabel: name, monitored: item.visible, category: categoryId, shape: 'reporter', outputType: 'reporter', layout: [ {type:'monitor'}, {type: 'label', text: name} ], inputs: { [isData ? 'variable' : 'list']: { value: name } } };
                    const blockEl = createPaletteBlock(spec);
                    if (blockEl) paletteEl.appendChild(blockEl);
                });
            }
    
            if (activeSprite) {
                const localItems = isData ? activeSprite.localVariables : activeSprite.localLists;
                if (Object.keys(localItems).length > 0) {
                    paletteEl.appendChild(createDataHeader('For This Sprite Only'));
                    Object.keys(localItems).forEach(name => {
                        const item = localItems[name];
                        const spec = { type: isData ? 'data_variable' : 'data_listcontents', monitorLabel: `${activeSprite.name}: ${name}`, monitored: item.visible, category: categoryId, shape: 'reporter', outputType: 'reporter', layout: [ {type:'monitor'}, {type: 'label', text: name} ], inputs: { [isData ? 'variable' : 'list']: { value: name } } };
                        const blockEl = createPaletteBlock(spec);
                        if (blockEl) paletteEl.appendChild(blockEl);
                    });
                }
            }
        }
        
        const blocks = Raccoon.getBlocksForCategory(categoryId);
        blocks.forEach(spec => {
             if (spec.type === 'data_variable' || spec.type === 'data_listcontents') return;
             const blockEl = createPaletteBlock(spec);
             if (blockEl) paletteEl.appendChild(blockEl);
        });
    }
    
    function setupCategories() { 
        const categoryContainer = document.createDocumentFragment(); 
        const categoryData = Raccoon.getCategoryData(); 
        Object.keys(categoryData).forEach(categoryId => { 
            const category = categoryData[categoryId]; 
            const button = document.createElement('button'); 
            button.className = 'category-button'; 
            button.dataset.category = categoryId; 
            button.title = category.label; 
            button.innerHTML = `<i class="fa-solid ${category.icon}"></i><span>${category.label}</span>`; 
            button.addEventListener('click', () => { 
                document.querySelectorAll('.category-button').forEach(btn => btn.classList.remove('active')); 
                button.classList.add('active'); 
                populatePalette(categoryId); 
            }); 
            categoryContainer.appendChild(button); 
        }); 
        categorySwitcherEl.appendChild(categoryContainer); 
        categorySwitcherEl.querySelector('.category-button')?.click(); 
    }
    
    function setActiveSprite(spriteId) {
        Raccoon.setActiveSprite(spriteId);
        const activeCategory = categorySwitcherEl.querySelector('.active')?.dataset.category;
        if (activeCategory && ['data', 'lists', 'sensing', 'looks', 'motion'].includes(activeCategory)) {
            populatePalette(activeCategory);
        }
        updateAllUI();
    }

    runButtonEl.addEventListener('click', () => Raccoon.start());
    stopButtonEl.addEventListener('click', () => Raccoon.stopAllScripts());
    toggleSidebarBtn.addEventListener('click', () => leftSidebar.classList.toggle('hidden'));
    toggleRightSidebarBtn.addEventListener('click', () => rightSidebar.classList.toggle('hidden'));
    toggleSpriteInfoBtn.addEventListener('click', () => collapsibleSpriteInfoEl.classList.toggle('collapsed'));
    
    fullscreenBtn.addEventListener('click', () => {
        fullscreenBtn.classList.toggle('active');
        mainContentEl.classList.toggle('fullscreen-stage');
        const icon = fullscreenBtn.querySelector('i');
        icon.classList.toggle('fa-expand');
        icon.classList.toggle('fa-compress');
    });

    addSpriteBtn.addEventListener('click', async () => { await Raccoon.addSprite(); });

    document.getElementById('workspace').addEventListener('contextmenu', (e) => {
        const blockEl = e.target.closest('.block');
        if (blockEl) {
            showContextMenu(e, blockEl.id);
        }
    });
    
    document.addEventListener('mousedown', (e) => {
        if (!e.target.closest('.context-menu')) {
            Raccoon.hideContextMenu();
        }
    });

    costumeFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                Raccoon.setSpriteCostume(Raccoon.activeSpriteId, event.target.result);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    });

    spriteListEl.addEventListener('click', (e) => { 
        const item = e.target.closest('.sprite-item'); 
        if (!item) return; 
        const spriteId = item.dataset.spriteId; 
        if(e.target.classList.contains('delete-icon')) { 
            if (confirm(`Are you sure you want to delete sprite '${Raccoon.sprites[spriteId].name}'?`)) { 
                Raccoon.deleteSprite(spriteId); 
            } 
        } else { 
            setActiveSprite(spriteId); 
        } 
    });

    window.addEventListener('keydown', (e) => { 
        const key = e.key === ' ' ? 'space' : e.key; 
        Object.values(Raccoon.execution.snapshot.sprites || Raccoon.sprites).forEach(sprite => {
            const blocks = sprite.blocks;
            Object.values(blocks).forEach(block => { 
                if(block.type === 'event_when_key_pressed' && !block.previous && !block.parentInput) { 
                    const keyToPress = block.inputs.key.value; 
                    if (keyToPress === 'any' || keyToPress === key) { 
                        if (block.next) Raccoon.executeStack(block.next, sprite.id); 
                    } 
                } 
            }); 
        }); 
    });

    modalOkBtn.addEventListener('click', handleCreateData);
    modalCancelBtn.addEventListener('click', hideVariableModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) hideVariableModal(); });
    varNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleCreateData(); });
    
    document.getElementById('sprite-info-panel').addEventListener('change', (e) => {
        if(e.target.tagName === 'INPUT') {
            const prop = e.target.id.replace('sprite-', '').replace('-input', '');
            Raccoon.updateSpriteProperty(prop, e.target.value);
        }
    });

    spriteInfoPanel.showBtn.addEventListener('click', () => { const sprite = Raccoon.getActiveSprite(); if(sprite) { sprite.visible = true; updateAllUI(); } });
    spriteInfoPanel.hideBtn.addEventListener('click', () => { const sprite = Raccoon.getActiveSprite(); if(sprite) { sprite.visible = false; updateAllUI(); } });
    
    async function initialize() {
        collapsibleSpriteInfoEl.classList.remove('collapsed');
        await Raccoon.init(document.getElementById('workspace'));
        Raccoon.stage.init(document.getElementById('stage'), updateAllUI);
        importCostumeBtn.addEventListener('click', () => costumeFileInput.click());
        Raccoon.uiUpdateCallback = updateAllUI;
        
        setupCategories();
        updateAllUI();
    }
    
    initialize();
});