const OPERATORS_CATEGORY = {
    id: 'operators',
    label: 'Operators',
    icon: 'fa-plus-minus',
    color: 'var(--operators-color)',
    blocks: {
        'operator_add': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'input', key: 'a'}, {type: 'operator', text: '+'}, {type: 'input', key: 'b'}],
                inputs: {
                    a: { value: '', shape: 'reporter' },
                    b: { value: '', shape: 'reporter' }
                },
                switchable: ['operator_subtract', 'operator_multiply', 'operator_divide']
            },
            onExecute: (args) => (Number(args.a) || 0) + (Number(args.b) || 0)
        },
        'operator_subtract': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'input', key: 'a'}, {type: 'operator', text: '-'}, {type: 'input', key: 'b'}],
                inputs: {
                    a: { value: '', shape: 'reporter' },
                    b: { value: '', shape: 'reporter' }
                },
                switchable: ['operator_add', 'operator_multiply', 'operator_divide']
            },
            onExecute: (args) => (Number(args.a) || 0) - (Number(args.b) || 0)
        },
        'operator_multiply': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'input', key: 'a'}, {type: 'operator', text: '×'}, {type: 'input', key: 'b'}],
                inputs: {
                    a: { value: '', shape: 'reporter' },
                    b: { value: '', shape: 'reporter' }
                },
                switchable: ['operator_add', 'operator_subtract', 'operator_divide']
            },
            onExecute: (args) => (Number(args.a) || 0) * (Number(args.b) || 0)
        },
        'operator_divide': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'input', key: 'a'}, {type: 'operator', text: '/'}, {type: 'input', key: 'b'}],
                inputs: {
                    a: { value: '', shape: 'reporter' },
                    b: { value: '', shape: 'reporter' }
                },
                switchable: ['operator_add', 'operator_subtract', 'operator_multiply']
            },
            onExecute: (args) => (Number(args.a) || 0) / (Number(args.b) || 1)
        },
        'operator_random': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'label', text: 'pick random'}, {type: 'input', key: 'from'}, {type: 'label', text: 'to'}, {type: 'input', key: 'to'}],
                inputs: {
                    from: { value: 1, shape: 'reporter' },
                    to: { value: 10, shape: 'reporter' }
                }
            },
            onExecute: (args, api) => api.random(args.from, args.to)
        },
        'operator_lt': {
            spec: {
                shape: 'boolean', outputType: 'boolean',
                layout: [{type: 'input', key: 'a'}, {type: 'operator', text: '<'}, {type: 'input', key: 'b'}],
                inputs: {
                    a: { value: '', shape: 'reporter' },
                    b: { value: 50, shape: 'reporter' }
                },
                switchable: ['operator_gt', 'operator_equals']
            },
            onExecute: (args) => args.a < args.b
        },
        'operator_gt': {
            spec: {
                shape: 'boolean', outputType: 'boolean',
                layout: [{type: 'input', key: 'a'}, {type: 'operator', text: '>'}, {type: 'input', key: 'b'}],
                inputs: {
                    a: { value: '', shape: 'reporter' },
                    b: { value: 50, shape: 'reporter' }
                },
                switchable: ['operator_lt', 'operator_equals']
            },
            onExecute: (args) => args.a > args.b
        },
        'operator_equals': {
            spec: {
                shape: 'boolean', outputType: 'boolean',
                layout: [{type: 'input', key: 'a'}, {type: 'operator', text: '='}, {type: 'input', key: 'b'}],
                inputs: {
                    a: { value: '', shape: 'reporter' },
                    b: { value: 50, shape: 'reporter' }
                },
                switchable: ['operator_lt', 'operator_gt']
            },
            onExecute: (args) => String(args.a) == String(args.b)
        },
        'operator_and': {
            spec: {
                shape: 'boolean', outputType: 'boolean',
                layout: [{type: 'input', key: 'a', shape: 'boolean'}, {type: 'label', text: 'and'}, {type: 'input', key: 'b', shape: 'boolean'}],
                inputs: { a: { blockId: null, shape: 'boolean' }, b: { blockId: null, shape: 'boolean' } },
                switchable: ['operator_or']
            },
            onExecute: (args) => args.a && args.b
        },
        'operator_or': {
            spec: {
                shape: 'boolean', outputType: 'boolean',
                layout: [{type: 'input', key: 'a', shape: 'boolean'}, {type: 'label', text: 'or'}, {type: 'input', key: 'b', shape: 'boolean'}],
                inputs: { a: { blockId: null, shape: 'boolean' }, b: { blockId: null, shape: 'boolean' } },
                switchable: ['operator_and']
            },
            onExecute: (args) => args.a || args.b
        },
        'operator_not': {
            spec: {
                shape: 'boolean', outputType: 'boolean',
                layout: [{type: 'label', text: 'not'}, {type: 'input', key: 'a', shape: 'boolean'}],
                inputs: { a: { blockId: null, shape: 'boolean' } }
            },
            onExecute: (args) => !args.a
        },
        'operator_join': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'label', text: 'join'}, {type: 'input', key: 'a'}, {type: 'input', key: 'b'}],
                inputs: {
                    a: { value: 'apple ', shape: 'reporter' },
                    b: { value: 'banana', shape: 'reporter' }
                }
            },
            onExecute: (args) => String(args.a) + String(args.b)
        },
        'operator_letter_of': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'label', text: 'letter'}, {type: 'input', key: 'letter_num'}, {type: 'label', text: 'of'}, {type: 'input', key: 'string'}],
                inputs: {
                    letter_num: { value: 1, shape: 'reporter' },
                    string: { value: 'apple', shape: 'reporter' }
                }
            },
            onExecute: (args) => (String(args.string) || '').charAt((Number(args.letter_num) || 1) - 1)
        },
        'operator_length': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'label', text: 'length of'}, {type: 'input', key: 'string'}],
                inputs: { string: { value: 'apple', shape: 'reporter' } }
            },
            onExecute: (args) => (String(args.string) || '').length
        },
        'operator_contains': {
            spec: {
                shape: 'boolean', outputType: 'boolean',
                layout: [{type: 'input', key: 'string1'}, {type: 'label', text: 'contains'}, {type: 'input', key: 'string2'}, {type: 'label', text: '?'}],
                inputs: {
                    string1: { value: 'apple', shape: 'reporter' },
                    string2: { value: 'a', shape: 'reporter' }
                }
            },
            onExecute: (args) => (String(args.string1) || '').includes(String(args.string2) || '')
        },
        'operator_mod': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'input', key: 'a'}, {type: 'label', text: 'mod'}, {type: 'input', key: 'b'}],
                inputs: {
                    a: { value: '', shape: 'reporter' },
                    b: { value: '', shape: 'reporter' }
                }
            },
            onExecute: (args) => (Number(args.a) || 0) % (Number(args.b) || 0)
        },
        'operator_round': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'label', text: 'round'}, {type: 'input', key: 'a'}],
                inputs: { a: { value: '', shape: 'reporter' } }
            },
            onExecute: (args) => Math.round(Number(args.a) || 0)
        },
        'operator_mathop': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'dropdown', key: 'op'}, {type: 'label', text: 'of'}, {type: 'input', key: 'num'}],
                inputs: {
                    op: {
                        value: 'abs',
                        shape: 'reporter',
                        options: [
                            {label: 'abs', value: 'abs'}, {label: 'floor', value: 'floor'},
                            {label: 'ceiling', value: 'ceiling'}, {label: 'sqrt', value: 'sqrt'},
                            {label: 'sin', value: 'sin'}, {label: 'cos', value: 'cos'}, {label: 'tan', value: 'tan'},
                            {label: 'asin', value: 'asin'}, {label: 'acos', value: 'acos'}, {label: 'atan', value: 'atan'},
                            {label: 'ln', value: 'ln'}, {label: 'log', value: 'log'},
                            {label: 'e ^', value: 'e^'}, {label: '10 ^', value: '10^'}
                        ]
                    },
                    num: { value: '', shape: 'reporter' }
                }
            },
            onExecute: (args) => {
                const n = Number(args.num) || 0;
                switch(args.op) {
                    case 'abs': return Math.abs(n);
                    case 'floor': return Math.floor(n);
                    case 'ceiling': return Math.ceil(n);
                    case 'sqrt': return Math.sqrt(n);
                    case 'sin': return Math.sin(n * Math.PI / 180);
                    case 'cos': return Math.cos(n * Math.PI / 180);
                    case 'tan': return Math.tan(n * Math.PI / 180);
                    case 'asin': return Math.asin(n) * 180 / Math.PI;
                    case 'acos': return Math.acos(n) * 180 / Math.PI;
                    case 'atan': return Math.atan(n) * 180 / Math.PI;
                    case 'ln': return Math.log(n);
                    case 'log': return Math.log10(n);
                    case 'e^': return Math.exp(n);
                    case '10^': return Math.pow(10, n);
                    default: return 0;
                }
            }
        },
    }
};

if (typeof window.Raccoon !== 'undefined') {
    window.Raccoon.registerCategory(OPERATORS_CATEGORY);
}