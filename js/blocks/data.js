const DATA_CATEGORY = {
    id: 'data',
    label: 'Variables',
    icon: 'fa-database',
    color: 'var(--data-color)',
    blocks: {
        'data_variable': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'dropdown', key: 'variable'}],
                inputs: { variable: { value: '', shape: 'reporter', dynamic: true, options: [] } }
            },
            onExecute: (args, api) => api.getVariable(args.variable)
        },
        'data_setvariableto': {
            spec: {
                requiresData: true, // This block requires at least one variable to exist
                shape: 'stack',
                layout: [{type: 'label', text: 'set'}, {type: 'dropdown', key: 'variable'}, {type: 'label', text: 'to'}, {type: 'input', key: 'value'}],
                inputs: {
                    variable: { value: '', shape: 'reporter', dynamic: true, options: [] },
                    value: { value: 0, shape: 'reporter', acceptedShapes: ['any'] }
                }
            },
            onExecute: (args, api) => api.setVariable(args.variable, args.value)
        },
        'data_changevariableby': {
            spec: {
                requiresData: true,
                shape: 'stack',
                layout: [{type: 'label', text: 'change'}, {type: 'dropdown', key: 'variable'}, {type: 'label', text: 'by'}, {type: 'input', key: 'value'}],
                inputs: {
                    variable: { value: '', shape: 'reporter', dynamic: true, options: [] },
                    value: { value: 1, shape: 'reporter', acceptedShapes: ['any'] }
                }
            },
            onExecute: (args, api) => api.changeVariableBy(args.variable, args.value)
        },
        'data_showvariable': {
            spec: {
                requiresData: true,
                shape: 'stack',
                layout: [{type: 'label', text: 'show variable'}, {type: 'dropdown', key: 'variable'}],
                inputs: { variable: { value: '', shape: 'reporter', dynamic: true, options: [] } }
            },
            onExecute: (args, api) => api.showVariable(args.variable)
        },
        'data_hidevariable': {
            spec: {
                requiresData: true,
                shape: 'stack',
                layout: [{type: 'label', text: 'hide variable'}, {type: 'dropdown', key: 'variable'}],
                inputs: { variable: { value: '', shape: 'reporter', dynamic: true, options: [] } }
            },
            onExecute: (args, api) => api.hideVariable(args.variable)
        },
    }
};

if (typeof window.Raccoon !== 'undefined') {
    window.Raccoon.registerCategory(DATA_CATEGORY);
}