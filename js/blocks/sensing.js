const SENSING_CATEGORY = {
    id: 'sensing',
    label: 'Sensing',
    icon: 'fa-magnifying-glass',
    color: 'var(--sensing-color)',
    blocks: {
        'sensing_touchingobject': {
            spec: {
                shape: 'boolean', outputType: 'boolean',
                layout: [{type: 'label', text: 'touching'}, {type: 'dropdown', key: 'target'}, {type: 'label', text: '?'}],
                inputs: { target: { value: '_mouse_', shape: 'reporter', dynamic: true, options: [] } }
            },
            onExecute: (args, api) => {
                const sprite = api.getSprite(); 
                if (!sprite) return false;
                
                let targetX, targetY, targetWidth, targetHeight;
                if (args.target === '_mouse_') {
                    targetX = api.getMouseX();
                    targetY = api.getMouseY();
                    targetWidth = 1;
                    targetHeight = 1;
                } else {
                    const targetSprite = Raccoon.sprites[args.target] || Raccoon.clones[args.target];
                    if (!targetSprite || !targetSprite.visible || !targetSprite.costume) return false;
                    targetX = targetSprite.x;
                    targetY = targetSprite.y;
                    targetWidth = targetSprite.costume.width * (targetSprite.size / 100);
                    targetHeight = targetSprite.costume.height * (targetSprite.size / 100);
                }
                
                const spriteWidth = sprite.costume.width * (sprite.size / 100);
                const spriteHeight = sprite.costume.height * (sprite.size / 100);

                return sprite.x - spriteWidth / 2 < targetX + targetWidth / 2 &&
                       sprite.x + spriteWidth / 2 > targetX - targetWidth / 2 &&
                       sprite.y - spriteHeight / 2 < targetY + targetHeight / 2 &&
                       sprite.y + spriteHeight / 2 > targetY - targetHeight / 2;
            }
        },
        'sensing_distanceto': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'label', text: 'distance to'}, {type: 'dropdown', key: 'target'}],
                inputs: { target: { value: '_mouse_', shape: 'reporter', dynamic: true, options: [] } }
            },
            onExecute: (args, api) => api.distanceTo(args.target)
        },
        'sensing_keypressed': {
            spec: {
                shape: 'boolean', outputType: 'boolean',
                layout: [{type: 'label', text: 'key'}, {type: 'dropdown', key: 'key'}, {type: 'label', text: 'pressed?'}],
                inputs: { key: { value: 'space', options: [
                    {label: 'space', value: 'space'}, {label: 'up arrow', value: 'ArrowUp'}, {label: 'down arrow', value: 'ArrowDown'},
                    {label: 'right arrow', value: 'ArrowRight'}, {label: 'left arrow', value: 'ArrowLeft'}, {label: 'any', value: 'any'},
                    ...Array.from('abcdefghijklmnopqrstuvwxyz0123456789').map(k => ({label: k, value: k}))
                ] } }
            },
            onExecute: (args, api) => api.isKeyDown(args.key)
        },
        'sensing_mousedown': {
            spec: { shape: 'boolean', outputType: 'boolean', layout: [{type: 'label', text: 'mouse down?'}] },
            onExecute: (args, api) => api.isMouseDown()
        },
        'sensing_mousex': {
            spec: { shape: 'reporter', outputType: 'reporter', layout: [{type: 'label', text: 'mouse x'}] },
            onExecute: (args, api) => Math.round(api.getMouseX())
        },
        'sensing_mousey': {
            spec: { shape: 'reporter', outputType: 'reporter', layout: [{type: 'label', text: 'mouse y'}] },
            onExecute: (args, api) => Math.round(api.getMouseY())
        },
        'sensing_timer': {
            spec: {
                shape: 'reporter', outputType: 'reporter', monitorLabel: 'timer',
                layout: [{type: 'monitor'}, {type: 'label', text: 'timer'}]
            },
            onExecute: (args, api) => api.getTimer().toFixed(2)
        },
        'sensing_resettimer': {
            spec: { shape: 'stack', layout: [{type: 'label', text: 'reset timer'}] },
            onExecute: (args, api) => api.resetTimer()
        },
    }
};

if (typeof window.Raccoon !== 'undefined') {
    window.Raccoon.registerCategory(SENSING_CATEGORY);
}