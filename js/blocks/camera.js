const CAMERA_CATEGORY = {
    id: 'camera',
    label: 'Camera',
    icon: 'fa-camera',
    color: 'var(--camera-color)',
    blocks: {
        'camera_set_x': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'set camera x to'}, {type: 'input', key: 'x'}],
                inputs: { x: { value: 0, shape: 'reporter', width: 40 } }
            },
            onExecute: (args) => Raccoon.stage.setCameraX(args.x)
        },
        'camera_set_y': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'set camera y to'}, {type: 'input', key: 'y'}],
                inputs: { y: { value: 0, shape: 'reporter', width: 40 } }
            },
            onExecute: (args) => Raccoon.stage.setCameraY(args.y)
        },
        'camera_change_x_by': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'change camera x by'}, {type: 'input', key: 'dx'}],
                inputs: { dx: { value: 10, shape: 'reporter', width: 40 } }
            },
            onExecute: (args) => Raccoon.stage.changeCameraX(args.dx)
        },
        'camera_change_y_by': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'change camera y by'}, {type: 'input', key: 'dy'}],
                inputs: { dy: { value: 10, shape: 'reporter', width: 40 } }
            },
            onExecute: (args) => Raccoon.stage.changeCameraY(args.dy)
        },
        'camera_set_zoom': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'set camera zoom to'}, {type: 'input', key: 'zoom'}, {type: 'label', text: '%'}],
                inputs: { zoom: { value: 100, shape: 'reporter', width: 50 } }
            },
            onExecute: (args) => Raccoon.stage.setCameraZoom(args.zoom)
        },
        'camera_change_zoom_by': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'change camera zoom by'}, {type: 'input', key: 'd_zoom'}, {type: 'label', text: '%'}],
                inputs: { d_zoom: { value: 10, shape: 'reporter', width: 50 } }
            },
            onExecute: (args) => Raccoon.stage.changeCameraZoom(args.d_zoom)
        },
        'camera_reset': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'reset camera'}]
            },
            onExecute: () => Raccoon.stage.resetCamera()
        },
    }
};

if (typeof window.Raccoon !== 'undefined') {
    window.Raccoon.registerCategory(CAMERA_CATEGORY);
}