const LISTS_CATEGORY = {
    id: 'lists',
    label: 'Lists',
    icon: 'fa-list-ul',
    color: 'var(--lists-color)',
    blocks: {
        'data_listcontents': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'dropdown', key: 'list'}],
                inputs: { list: { value: '', shape: 'reporter', dynamic: true, options: [] } }
            },
            onExecute: (args, api) => api.getListContents(args.list)
        },
        'data_addtolist': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'add'}, {type: 'input', key: 'item'}, {type: 'label', text: 'to'}, {type: 'dropdown', key: 'list'}],
                inputs: {
                    item: { value: 'thing', shape: 'reporter' },
                    list: { value: '', shape: 'reporter', dynamic: true, options: [] }
                }
            },
            onExecute: (args, api) => api.addToList(args.list, args.item)
        },
        'data_deleteoflist': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'delete'}, {type: 'input', key: 'index'}, {type: 'label', text: 'of'}, {type: 'dropdown', key: 'list'}],
                inputs: {
                    index: { value: 1, shape: 'reporter' },
                    list: { value: '', shape: 'reporter', dynamic: true, options: [] }
                }
            },
            onExecute: (args, api) => api.deleteFromList(args.list, args.index)
        },
        'data_deletealloflist': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'delete all of'}, {type: 'dropdown', key: 'list'}],
                inputs: { list: { value: '', shape: 'reporter', dynamic: true, options: [] } }
            },
            onExecute: (args, api) => api.clearList(args.list)
        },
        'data_insertatlist': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'insert'}, {type: 'input', key: 'item'}, {type: 'label', text: 'at'}, {type: 'input', key: 'index'}, {type: 'label', text: 'of'}, {type: 'dropdown', key: 'list'}],
                inputs: {
                    item: { value: 'thing', shape: 'reporter' },
                    index: { value: 1, shape: 'reporter' },
                    list: { value: '', shape: 'reporter', dynamic: true, options: [] }
                }
            },
            onExecute: (args, api) => api.insertInList(args.list, args.index, args.item)
        },
        'data_replaceitemoflist': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'replace item'}, {type: 'input', key: 'index'}, {type: 'label', text: 'of'}, {type: 'dropdown', key: 'list'}, {type: 'label', text: 'with'}, {type: 'input', key: 'item'}],
                inputs: {
                    index: { value: 1, shape: 'reporter' },
                    list: { value: '', shape: 'reporter', dynamic: true, options: [] },
                    item: { value: 'thing', shape: 'reporter' }
                }
            },
            onExecute: (args, api) => api.replaceItemInList(args.list, args.index, args.item)
        },
        'data_itemoflist': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'label', text: 'item'}, {type: 'input', key: 'index'}, {type: 'label', text: 'of'}, {type: 'dropdown', key: 'list'}],
                inputs: {
                    index: { value: 1, shape: 'reporter' },
                    list: { value: '', shape: 'reporter', dynamic: true, options: [] }
                }
            },
            onExecute: (args, api) => api.getItemOfList(args.list, args.index)
        },
        'data_itemnumoflist': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'label', text: 'item # of'}, {type: 'input', key: 'item'}, {type: 'label', text: 'in'}, {type: 'dropdown', key: 'list'}],
                inputs: {
                    item: { value: 'thing', shape: 'reporter' },
                    list: { value: '', shape: 'reporter', dynamic: true, options: [] }
                }
            },
            onExecute: (args, api) => api.getItemNumberOfList(args.list, args.item)
        },
        'data_lengthoflist': {
            spec: {
                shape: 'reporter', outputType: 'reporter',
                layout: [{type: 'label', text: 'length of'}, {type: 'dropdown', key: 'list'}],
                inputs: { list: { value: '', shape: 'reporter', dynamic: true, options: [] } }
            },
            onExecute: (args, api) => api.getListLength(args.list)
        },
        'data_listcontainsthing': {
            spec: {
                shape: 'boolean', outputType: 'boolean',
                layout: [{type: 'dropdown', key: 'list'}, {type: 'label', text: 'contains'}, {type: 'input', key: 'item'}, {type: 'label', text: '?'}],
                inputs: {
                    list: { value: '', shape: 'reporter', dynamic: true, options: [] },
                    item: { value: 'thing', shape: 'reporter' }
                }
            },
            onExecute: (args, api) => api.listContains(args.list, args.item)
        },
        'data_showlist': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'show list'}, {type: 'dropdown', key: 'list'}],
                inputs: { list: { value: '', shape: 'reporter', dynamic: true, options: [] } }
            },
            onExecute: (args, api) => api.showList(args.list)
        },
        'data_hidelist': {
            spec: {
                shape: 'stack',
                layout: [{type: 'label', text: 'hide list'}, {type: 'dropdown', key: 'list'}],
                inputs: { list: { value: '', shape: 'reporter', dynamic: true, options: [] } }
            },
            onExecute: (args, api) => api.hideList(args.list)
        }
    }
};

if (typeof window.Raccoon !== 'undefined') {
    window.Raccoon.registerCategory(LISTS_CATEGORY);
}