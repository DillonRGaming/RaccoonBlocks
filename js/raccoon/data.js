Object.assign(window.Raccoon, {
    createVariable(name, scope) { 
        const sprite = this.getActiveSprite();
        if (scope === 'local' && sprite) {
            if (sprite.localVariables.hasOwnProperty(name)) {
                this.log(`Local variable "${name}" already exists for sprite "${sprite.name}".`, 'warn');
                return false;
            }
            sprite.localVariables[name] = { value: 0, visible: false };
            this.log(`Created local variable "${name}" for sprite "${sprite.name}".`, 'action');
        } else {
            if (this.variables.hasOwnProperty(name)) {
                this.log(`Global variable "${name}" already exists.`, 'warn');
                return false;
            }
            this.variables[name] = { value: 0, visible: false };
            this.log(`Created global variable "${name}".`, 'action');
        } 
        return true; 
    },

    createList(name, scope) { 
        const sprite = this.getActiveSprite();
        if (scope === 'local' && sprite) {
            if (sprite.localLists.hasOwnProperty(name)) {
                this.log(`Local list "${name}" already exists for sprite "${sprite.name}".`, 'warn');
                return false;
            }
            sprite.localLists[name] = { value: [], visible: false };
            this.log(`Created local list "${name}" for sprite "${sprite.name}".`, 'action');
        } else {
            if (this.lists.hasOwnProperty(name)) {
                this.log(`Global list "${name}" already exists.`, 'warn');
                return false;
            }
            this.lists[name] = { value: [], visible: false };
            this.log(`Created global list "${name}".`, 'action');
        } 
        return true; 
    },
});