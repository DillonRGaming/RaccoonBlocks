const LOOKS_CATEGORY = {
    id: 'looks',
    label: 'Looks',
    icon: 'fa-eye',
    color: 'var(--looks-color)',
    blocks: {
        'looks_sayforsecs': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'say'}, {type: 'input', key: 'message'}, {type: 'label', text: 'for'}, {type: 'input', key: 'secs'}, {type: 'label', text: 'seconds'}],
                inputs: {
                    // Requirement 1: Input Shape Constraints
                    message: { value: 'Hello!', shape: 'reporter', acceptedShapes: ['any'] },
                    secs: { value: 2, shape: 'reporter', acceptedShapes: ['any'] }
                }
            },
            onExecute: (args, api) => api.say(args.message, args.secs)
        },
        'looks_say': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'say'}, {type: 'input', key: 'message'}],
                // Requirement 1: Input Shape Constraints
                inputs: { message: { value: 'Hello!', shape: 'reporter', acceptedShapes: ['any'] } }
            },
            onExecute: (args, api) => api.say(args.message, null)
        },
        'looks_show': {
            spec: { shape: 'stack', layout: [{type: 'label', text: 'show'}] },
            onExecute: (args, api) => api.show()
        },
        'looks_hide': {
            spec: { shape: 'stack', layout: [{type: 'label', text: 'hide'}] },
            onExecute: (args, api) => api.hide()
        },
        'looks_set_size_to': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'set size to'}, {type: 'input', key: 'size'}, {type: 'label', text: '%'}],
                // Requirement 1: Input Shape Constraints
                inputs: { size: { value: 100, shape: 'reporter', acceptedShapes: ['any'] } }
            },
            onExecute: (args, api) => api.setSize(args.size)
        },
        'looks_change_size_by': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'change size by'}, {type: 'input', key: 'change'}],
                // Requirement 1: Input Shape Constraints
                inputs: { change: { value: 10, shape: 'reporter', acceptedShapes: ['any'] } }
            },
            onExecute: (args, api) => api.changeSizeBy(args.change)
        },
        'looks_size': {
            spec: {
                shape: 'reporter', outputType: 'reporter', monitorLabel: 'size',
                layout: [{type: 'monitor'}, {type: 'label', text: 'size'}]
            },
            onExecute: (args, api) => Math.round(api.getSize())
        },
        'looks_gotofrontback': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'go to'}, {type: 'dropdown', key: 'layer'}, {type: 'label', text: 'layer'}],
                // Requirement 1: Input Shape Constraints
                inputs: { layer: { value: 'front', shape: 'reporter', acceptedShapes: ['reporter'], options: [{label: 'front', value: 'front'}, {label: 'back', value: 'back'}] } }
            },
            onExecute: (args, api) => api.goToLayer(args.layer)
        },
        'looks_goforwardbackwardlayers': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'go'}, {type: 'dropdown', key: 'direction'}, {type: 'input', key: 'num'}, {type: 'label', text: 'layers'}],
                inputs: {
                    // Requirement 1: Input Shape Constraints
                    direction: { value: 'forward', shape: 'reporter', acceptedShapes: ['reporter'], options: [{label: 'forward', value: 'forward'}, {label: 'backward', value: 'backward'}] },
                    num: { value: 1, shape: 'reporter', acceptedShapes: ['any'] }
                }
            },
            onExecute: (args, api) => api.goLayers(args.direction, args.num)
        },
    }
};

if (typeof window.Raccoon !== 'undefined') {
    window.Raccoon.registerCategory(LOOKS_CATEGORY);
}