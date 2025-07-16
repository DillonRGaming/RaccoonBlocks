const OPERATORS_CATEGORY = {
    id: 'operators',
    label: 'Operators',
    icon: 'fa-plus-minus',
    color: 'var(--operators-color)',
    blocks: {
        'operator_multipurpose': {
            spec: {
                shape: 'reporter', // Default shape
                outputType: 'reporter', // Default output
                layout: [{type: 'input', key: 'a'}, {type: 'dropdown', key: 'op'}, {type: 'input', key: 'b'}],
                inputs: {
                    a: { value: '', shape: 'reporter', acceptedShapes: ['any'] },
                    op: {
                        value: '+',
                        shape: 'reporter',
                        isRoundedSquare: true,
                        options: [
                            {label: '+', value: '+'}, {label: '-', value: '-'},
                            {label: '×', value: '*'}, {label: '/', value: '/'},
                            {label: '<', value: '<'}, {label: '=', value: '='},
                            {label: '>', value: '>'}
                        ]
                    },
                    b: { value: '', shape: 'reporter', acceptedShapes: ['any'] }
                }
            },
            // Dynamic shape based on operator
            getShape: (blockData) => (['<', '=', '>'].includes(blockData.inputs.op.value)) ? 'boolean' : 'reporter',
            onExecute: (args) => {
                const op = args.op;
                if (['+', '-', '*', '/'].includes(op)) {
                    const numA = Number(args.a) || 0;
                    const numB = Number(args.b) || 0;
                    switch(op) {
                        case '+': return numA + numB;
                        case '-': return numA - numB;
                        case '*': return numA * numB;
                        case '/': return numB === 0 ? 0 : numA / numB;
                    }
                } else if (['<', '=', '>'].includes(op)) {
                    const valA = String(args.a).toLowerCase();
                    const valB = String(args.b).toLowerCase();
                    switch(op) {
                        case '<': return valA < valB;
                        case '=': return valA == valB;
                        case '>': return valA > valB;
                    }
                }
                return 0;
            }
        },
        'operator_boolean': {
            spec: {
                shape: 'boolean', outputType: 'boolean',
                layout: [{type: 'input', key: 'a', shape: 'boolean'}, {type: 'dropdown', key: 'op'}, {type: 'input', key: 'b', shape: 'boolean'}],
                inputs: { 
                    a: { blockId: null, shape: 'boolean', acceptedShapes: ['boolean'] }, 
                    op: {
                        value: 'and',
                        shape: 'reporter',
                        isRoundedSquare: true,
                        options: [
                            {label: 'and', value: 'and'},
                            {label: 'or', value: 'or'},
                            {label: 'not', value: 'not'}
                        ]
                    },
                    b: { blockId: null, shape: 'boolean', acceptedShapes: ['boolean'] } 
                }
            },
            // Dynamic layout based on operator
            getLayout: (blockData) => {
                if (blockData.inputs.op.value === 'not') {
                    return [{type: 'dropdown', key: 'op'}, {type: 'input', key: 'a', shape: 'boolean'}];
                }
                return [{type: 'input', key: 'a', shape: 'boolean'}, {type: 'dropdown', key: 'op'}, {type: 'input', key: 'b', shape: 'boolean'}];
            },
            onExecute: (args) => {
                switch(args.op) {
                    case 'and': return args.a && args.b;
                    case 'or': return args.a || args.b;
                    case 'not': return !args.a;
                    default: return false;
                }
            }
        },
        'operator_random': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'label', text: 'pick random'}, {type: 'input', key: 'from'}, {type: 'label', text: 'to'}, {type: 'input', key: 'to'}],
                inputs: {
                    from: { value: 1, shape: 'reporter', acceptedShapes: ['any'] },
                    to: { value: 10, shape: 'reporter', acceptedShapes: ['any'] }
                }
            },
            onExecute: (args, api) => api.random(args.from, args.to)
        },
        'operator_join': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'label', text: 'join'}, {type: 'input', key: 'a'}, {type: 'input', key: 'b'}],
                inputs: {
                    a: { value: 'apple ', shape: 'reporter', acceptedShapes: ['any'] },
                    b: { value: 'banana', shape: 'reporter', acceptedShapes: ['any'] }
                }
            },
            onExecute: (args) => String(args.a) + String(args.b)
        },
        'operator_letter_of': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'label', text: 'letter'}, {type: 'input', key: 'letter_num'}, {type: 'label', text: 'of'}, {type: 'input', key: 'string'}],
                inputs: {
                    letter_num: { value: 1, shape: 'reporter', acceptedShapes: ['any'] },
                    string: { value: 'apple', shape: 'reporter', acceptedShapes: ['any'] }
                }
            },
            onExecute: (args) => (String(args.string) || '').charAt((Number(args.letter_num) || 1) - 1)
        },
        'operator_length': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'label', text: 'length of'}, {type: 'input', key: 'string'}],
                inputs: { string: { value: 'apple', shape: 'reporter', acceptedShapes: ['any'] } }
            },
            onExecute: (args) => (String(args.string) || '').length
        },
        'operator_contains': {
            spec: {
                shape: 'boolean', outputType: 'boolean',
                layout: [{type: 'input', key: 'string1'}, {type: 'label', text: 'contains'}, {type: 'input', key: 'string2'}, {type: 'label', text: '?'}],
                inputs: {
                    string1: { value: 'apple', shape: 'reporter', acceptedShapes: ['any'] },
                    string2: { value: 'a', shape: 'reporter', acceptedShapes: ['any'] }
                }
            },
            onExecute: (args) => (String(args.string1) || '').toLowerCase().includes((String(args.string2) || '').toLowerCase())
        },
        'operator_mod': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'input', key: 'a'}, {type: 'label', text: 'mod'}, {type: 'input', key: 'b'}],
                inputs: {
                    a: { value: '', shape: 'reporter', acceptedShapes: ['any'] },
                    b: { value: '', shape: 'reporter', acceptedShapes: ['any'] }
                }
            },
            onExecute: (args) => (Number(args.a) || 0) % (Number(args.b) || 0)
        },
        'operator_round': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'label', text: 'round'}, {type: 'input', key: 'a'}],
                inputs: { a: { value: '', shape: 'reporter', acceptedShapes: ['any'] } }
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
                    num: { value: '', shape: 'reporter', acceptedShapes: ['any'] }
                }
            },
            onExecute: (args) => {
                const n = Number(args.num) || 0;
                switch(args.op) {
                    case 'abs': return Math.abs(n);
                    case 'floor': return Math.floor(n);
                    case 'ceiling': return Math.ceil(n);
                    case 'sqrt': return n < 0 ? 0 : Math.sqrt(n);
                    case 'sin': return parseFloat(Math.sin(n * Math.PI / 180).toFixed(10));
                    case 'cos': return parseFloat(Math.cos(n * Math.PI / 180).toFixed(10));
                    case 'tan': return parseFloat(Math.tan(n * Math.PI / 180).toFixed(10));
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
