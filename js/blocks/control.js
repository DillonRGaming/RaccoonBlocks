const CONTROL_CATEGORY = {
    id: 'control',
    label: 'Control',
    icon: 'fa-gears',
    color: 'var(--control-color)',
    blocks: {
        'control_wait': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'wait'}, {type: 'input', key: 'duration'}, {type: 'label', text: 'seconds'}],
                inputs: { duration: { value: 1, shape: 'reporter' } }
            },
            onExecute: (args, api) => api.wait(args.duration)
        },
        'control_repeat': {
            spec: {
                shape: 'c_shape', minWidth: 160,
                layout: [{type: 'label', text: 'repeat'}, {type: 'input', key: 'times'}],
                inputs: { times: { value: 10, shape: 'reporter' } }
            },
            onExecute: async (args, api, { execute, isStopping }) => {
                const times = Math.round(Number(args.times) || 0);
                for (let i = 0; i < times; i++) {
                    if (isStopping()) break;
                    if (args.child) await execute(args.child);
                }
            }
        },
        'control_forever': {
            spec: {
                shape: 'c_shape', minWidth: 150,
                layout: [{type: 'label', text: 'forever'}]
            },
            onExecute: async (args, api, { execute, isStopping }) => {
                while (!isStopping()) {
                    if (args.child) await execute(args.child);
                    await Raccoon.sleep(10);
                }
            }
        },
        'control_if': {
            spec: {
                shape: 'c_shape', minWidth: 160,
                layout: [{type: 'label', text: 'if'}, {type: 'input', key: 'condition', shape: 'boolean'}, {type: 'label', text: 'then'}],
                inputs: { condition: { blockId: null, shape: 'boolean' } }
            },
            onExecute: async (args, api, { execute }) => {
                if (args.condition) {
                    if (args.child) await execute(args.child);
                }
            }
        },
        'control_if_else': {
            spec: {
                shape: 'c_shape', minWidth: 160,
                layout: [{type: 'label', text: 'if'}, {type: 'input', key: 'condition', shape: 'boolean'}, {type: 'label', text: 'then'}],
                inputs: { condition: { blockId: null, shape: 'boolean' } }
            },
            onExecute: async (args, api, { execute }) => {
                if (args.condition) {
                    if (args.child) await execute(args.child);
                } else {
                    if (args.child2) await execute(args.child2);
                }
            }
        },
        'control_wait_until': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'wait until'}, {type: 'input', key: 'condition', shape: 'boolean'}],
                inputs: { condition: { blockId: null, shape: 'boolean' } }
            },
            onExecute: async (args, api, { isStopping }) => {
                while (!args.condition) {
                    if (isStopping()) break;
                    await Raccoon.sleep(10);
                    args.condition = args.blockId ? await Raccoon.evaluateReporter(args.blockId, api.getSprite().id) : false;
                }
            }
        },
        'control_repeat_until': {
            spec: {
                shape: 'c_shape', minWidth: 160,
                layout: [{type: 'label', text: 'repeat until'}, {type: 'input', key: 'condition', shape: 'boolean'}],
                inputs: { condition: { blockId: null, shape: 'boolean' } }
            },
            onExecute: async (args, api, { execute, isStopping }) => {
                while (!args.condition) {
                    if (isStopping()) break;
                    if (args.child) await execute(args.child);
                    await Raccoon.sleep(10);
                    args.condition = args.blockId ? await Raccoon.evaluateReporter(args.blockId, api.getSprite().id) : false;
                }
            }
        },
        'control_stop': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'stop'}, {type: 'dropdown', key: 'stop_option'}],
                inputs: { stop_option: { value: 'all', options: [
                    {label: 'all', value: 'all'},
                    {label: 'this script', value: 'this script'},
                    {label: 'other scripts in sprite', value: 'other scripts in sprite'}
                ]}}
            },
            onExecute: (args, api, { isStopping }) => {
                if(args.stop_option === 'all') {
                    Raccoon.stopAllScripts();
                } else {
                    isStopping = () => true;
                }
            }
        },
        'control_create_clone_of': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'create clone of'}, {type: 'dropdown', key: 'target'}],
                inputs: { target: { value: '_myself_', shape: 'reporter', dynamic: true, options: [] } }
            },
            onExecute: (args, api) => {
                if (args.target === '_myself_') {
                    api.createClone();
                } else {
                    const targetSprite = Raccoon.sprites[args.target];
                    if (targetSprite) {
                        Raccoon.createClone(targetSprite.id);
                    }
                }
            }
        },
        'control_delete_this_clone': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'delete this clone'}]
            },
            onExecute: (args, api) => api.deleteThisClone()
        }
    }
};

if (typeof window.Raccoon !== 'undefined') {
    window.Raccoon.registerCategory(CONTROL_CATEGORY);
}