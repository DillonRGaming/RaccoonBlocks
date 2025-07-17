Object.assign(window.Raccoon, {
    createVariable(name, scope) { 
        const sprite = this.getActiveSprite(); 
        if (scope === 'local' && sprite) {
            if (sprite.localVariables.hasOwnProperty(name)) return false;
            sprite.localVariables[name] = { value: 0, visible: false }; 
        } else {
            if (this.variables.hasOwnProperty(name)) return false;
            this.variables[name] = { value: 0, visible: false }; 
        }
        Raccoon.logToConsole(`Variable '${name}' (${scope}) created.`, 'action');
        return true; 
    },

    createList(name, scope) { 
        const sprite = this.getActiveSprite(); 
        if (scope === 'local' && sprite) {
            if (sprite.localLists.hasOwnProperty(name)) return false;
            sprite.localLists[name] = { value: [], visible: false }; 
        } else {
            if (this.lists.hasOwnProperty(name)) return false;
            this.lists[name] = { value: [], visible: false }; 
        }
        Raccoon.logToConsole(`List '${name}' (${scope}) created.`, 'action');
        return true; 
    },
});