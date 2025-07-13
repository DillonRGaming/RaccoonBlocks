const MOTION_CATEGORY = {
    id: 'motion',
    label: 'Motion',
    icon: 'fa-person-running',
    color: 'var(--motion-color)',
    blocks: {
        'motion_movesteps': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'move'}, {type: 'input', key: 'steps'}, {type: 'label', text: 'steps'}],
                inputs: { steps: { value: 10, shape: 'reporter' } }
            },
            onExecute: (args, api) => api.move(args.steps)
        },
        'motion_turn_right': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'turn'}, {type: 'icon', icon: 'fa-rotate-right'}, {type: 'input', key: 'degrees'}, {type: 'label', text: 'degrees'}],
                inputs: { degrees: { value: 15, shape: 'reporter' } }
            },
            onExecute: (args, api) => api.turn(args.degrees, 'right')
        },
        'motion_turn_left': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'turn'}, {type: 'icon', icon: 'fa-rotate-left'}, {type: 'input', key: 'degrees'}, {type: 'label', text: 'degrees'}],
                inputs: { degrees: { value: 15, shape: 'reporter' } }
            },
            onExecute: (args, api) => api.turn(args.degrees, 'left')
        },
        'motion_gotoxy': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'go to x:'}, {type: 'input', key: 'x'}, {type: 'label', text: 'y:'}, {type: 'input', key: 'y'}],
                inputs: {
                    x: { value: 0, shape: 'reporter' },
                    y: { value: 0, shape: 'reporter' }
                }
            },
            onExecute: (args, api) => api.goToXY(args.x, args.y)
        },
        'motion_pointindirection': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'point in direction'}, {type: 'input', key: 'direction'}],
                inputs: { direction: { value: 90, shape: 'reporter', min: -179, max: 180, step: 1, slider: true } }
            },
            onExecute: (args, api) => api.pointInDirection(args.direction)
        },
        'motion_pointtowards': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'point towards'}, {type: 'dropdown', key: 'target'}],
                inputs: { target: { value: '_mouse_', shape: 'reporter', dynamic: true, options: [] } }
            },
            onExecute: (args, api) => api.pointTowards(args.target)
        },
        'motion_changexby': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'change x by'}, {type: 'input', key: 'dx'}],
                inputs: { dx: { value: 10, shape: 'reporter' } }
            },
            onExecute: (args, api) => api.changeX(args.dx)
        },
        'motion_setx': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'set x to'}, {type: 'input', key: 'x'}],
                inputs: { x: { value: 0, shape: 'reporter' } }
            },
            onExecute: (args, api) => api.goToXY(args.x, api.getY())
        },
        'motion_changeyby': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'change y by'}, {type: 'input', key: 'dy'}],
                inputs: { dy: { value: 10, shape: 'reporter' } }
            },
            onExecute: (args, api) => api.changeY(args.dy)
        },
        'motion_sety': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'set y to'}, {type: 'input', key: 'y'}],
                inputs: { y: { value: 0, shape: 'reporter' } }
            },
            onExecute: (args, api) => api.goToXY(api.getX(), args.y)
        },
        'motion_xposition': {
            spec: {
                shape: 'reporter.leaf', outputType: 'reporter', monitorLabel: 'x position',
                layout: [{type: 'monitor'}, {type: 'label', text: 'x position'}]
            },
            onExecute: (args, api) => api.getX()
        },
        'motion_yposition': {
            spec: {
                shape: 'reporter.octagon', outputType: 'reporter', monitorLabel: 'y position',
                layout: [{type: 'monitor'}, {type: 'label', text: 'y position'}]
            },
            onExecute: (args, api) => api.getY()
        },
        'motion_direction': {
            spec: {
                shape: 'reporter.square', outputType: 'reporter', monitorLabel: 'direction',
                layout: [{type: 'monitor'}, {type: 'label', text: 'direction'}]
            },
            onExecute: (args, api) => api.getDirection()
        }
    }
};

if (typeof window.Raccoon !== 'undefined') {
    window.Raccoon.registerCategory(MOTION_CATEGORY);
}