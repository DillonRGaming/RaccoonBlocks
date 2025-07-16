Object.assign(window.Raccoon, {
    createVariable(name, scope) { 
        const sprite = this.getActiveSprite(); 
        // Check global scope first
        if (this.variables.hasOwnProperty(name)) return false;
        // Then check local scope if applicable
        if (scope === 'local' && sprite && sprite.localVariables.hasOwnProperty(name)) return false;

        if (scope === 'local' && sprite) { 
            sprite.localVariables[name] = { value: 0, visible: false }; 
        } else { 
            this.variables[name] = { value: 0, visible: false }; 
        } 
        return true; 
    },

    createList(name, scope) { 
        const sprite = this.getActiveSprite(); 
        // Check global scope first
        if (this.lists.hasOwnProperty(name)) return false;
        // Then check local scope if applicable
        if (scope === 'local' && sprite && sprite.localLists.hasOwnProperty(name)) return false;

        if (scope === 'local' && sprite) { 
            sprite.localLists[name] = { value: [], visible: false }; 
        } else { 
            this.lists[name] = { value: [], visible: false }; 
        } 
        return true; 
    },
});