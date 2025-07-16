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
                inputs: { target: { value: '_mouse_', shape: 'reporter', dynamic: true, options: [
                    {label: 'mouse-pointer', value: '_mouse_'}
                ] } }
            },
            onExecute: (args, api) => {
                const s = Raccoon.execution.snapshot.sprites[api.spriteId] || Raccoon.execution.snapshot.clones[api.spriteId];
                if (!s || !s.visible || !s.costume) return false;

                const sWidth = s.costume.width * (s.baseScale || 1.0) * (s.size / 100);
                const sHeight = s.costume.height * (s.baseScale || 1.0) * (s.size / 100);
                const sLeft = s.x - sWidth / 2;
                const sRight = s.x + sWidth / 2;
                const sTop = s.y + sHeight / 2;
                const sBottom = s.y - sHeight / 2;

                let targetLeft, targetRight, targetTop, targetBottom;

                if (args.target === '_mouse_') {
                    const { x, y } = Raccoon.mouse;
                    targetLeft = x; targetRight = x;
                    targetTop = y; targetBottom = y;
                } else {
                    const targetSprite = Raccoon.execution.snapshot.sprites[args.target] || Raccoon.execution.snapshot.clones[args.target];
                    if (!targetSprite || !targetSprite.visible || !targetSprite.costume) return false;
                    
                    const tWidth = targetSprite.costume.width * (targetSprite.baseScale || 1.0) * (targetSprite.size / 100);
                    const tHeight = targetSprite.costume.height * (targetSprite.baseScale || 1.0) * (targetSprite.size / 100);
                    targetLeft = targetSprite.x - tWidth / 2;
                    targetRight = targetSprite.x + tWidth / 2;
                    targetTop = targetSprite.y + tHeight / 2;
                    targetBottom = targetSprite.y - tHeight / 2;
                }

                // AABB collision detection
                return sLeft < targetRight && sRight > targetLeft && sBottom < targetTop && sTop > targetBottom;
            }
        },
        'sensing_distanceto': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'label', text: 'distance to'}, {type: 'dropdown', key: 'target'}],
                inputs: { target: { value: '_mouse_', shape: 'reporter', dynamic: true, options: [
                     {label: 'mouse-pointer', value: '_mouse_'}
                ] } }
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