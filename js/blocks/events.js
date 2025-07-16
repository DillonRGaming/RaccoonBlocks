const EVENTS_CATEGORY = {
    id: 'events',
    label: 'Events',
    icon: 'fa-flag',
    color: 'var(--events-color)',
    blocks: {
        'event_when_flag_clicked': {
            spec: {
                shape: 'hat',
                layout: [{type: 'label', text: 'when'}, {type: 'icon', icon: 'fa-play'}, {type: 'label', text: 'clicked'}]
            },
        },
        'event_when_key_pressed': {
            spec: {
                shape: 'hat',
                layout: [{type: 'label', text: 'when'}, {type: 'dropdown', key: 'key'}, {type: 'label', text: 'key pressed'}],
                // Requirement 1: Input Shape Constraints - dropdown output is reporter
                inputs: { key: { value: 'space', shape: 'reporter', acceptedShapes: ['reporter'], options: [
                    {label: 'space', value: 'space'}, {label: 'up arrow', value: 'ArrowUp'}, {label: 'down arrow', value: 'ArrowDown'},
                    {label: 'right arrow', value: 'ArrowRight'}, {label: 'left arrow', value: 'ArrowLeft'}, {label: 'any', value: 'any'},
                    ...Array.from('abcdefghijklmnopqrstuvwxyz0123456789').map(k => ({label: k, value: k}))
                ] } }
            }
        },
        'event_when_i_start_as_a_clone': {
            spec: {
                shape: 'hat',
                layout: [{type: 'label', text: 'when I start as a clone'}]
            }
        }
    }
};

if (typeof window.Raccoon !== 'undefined') {
    window.Raccoon.registerCategory(EVENTS_CATEGORY);
}