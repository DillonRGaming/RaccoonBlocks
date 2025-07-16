window.Raccoon.Shapes.getPath = function(block) {
    const w = block.width;
    let h = block.height;
    const r = 4; // Standard border radius

    switch (block.shape) {
        case 'hat':
            h = block.height || 40; // Default height for hat block
            const topR = 20; // Radius for the rounded top part
            // Defines the path for a hat shape
            return `M 0,${h-r} A ${r},${r} 0 0 0 ${r},${h} H ${w-r} A ${r},${r} 0 0 0 ${w},${h-r} V ${topR} A ${topR},${topR} 0 0 0 ${w-topR},0 H ${topR} A ${topR},${topR} 0 0 0 0,${topR} Z`;
        case 'reporter.square':
        case 'stack': {
            const borderRadius = r; // Standard border radius for square/stack
            // Defines the path for a rectangular block with rounded corners (stack or square reporter)
            return `M 0,${borderRadius} A ${borderRadius},${borderRadius} 0 0,1 ${borderRadius},0 H ${w-borderRadius} A ${borderRadius},${borderRadius} 0 0,1 ${w},${borderRadius} V ${h-borderRadius} A ${borderRadius},${borderRadius} 0 0,1 ${w-borderRadius},${h} H ${borderRadius} A ${borderRadius},${borderRadius} 0 0,1 0,${h-borderRadius} Z`;
        }
        case 'c_shape': {
            // Requirement 5: C-Block snapping - Use calculated inner heights for accurate rendering
            const cArmIndent = 20, cTopH = 28, cMidH = 24, cBottomH = 24, cInnerMinH = 32;
            const innerH1 = block.cInnerHeight1 || cInnerMinH; // Calculated height for the first child area

            let pathD = `M ${r},0 H ${w-r} A ${r},${r} 0 0 1 ${w},${r} V ${cTopH-r} A ${r},${r} 0 0 1 ${w-r},${cTopH} H ${cArmIndent+r} A ${r},${r} 0 0 0 ${cArmIndent},${cTopH+r} V ${cTopH+innerH1-r} A ${r},${r} 0 0 0 ${cArmIndent+r},${cTopH+innerH1} H `;
            
            // If it's an if-else block, it has a second inner section
            if (block.type === 'control_if_else') {
                const innerH2 = block.cInnerHeight2 || cInnerMinH; // Calculated height for the second child area
                pathD += `${w-r} A ${r},${r} 0 0 1 ${w},${cTopH+innerH1+r} V ${cTopH+innerH1+cMidH-r} A ${r},${r} 0 0 1 ${w-r},${cTopH+innerH1+cMidH} H ${cArmIndent+r} A ${r},${r} 0 0 0 ${cArmIndent},${cTopH+innerH1+cMidH+r} V ${cTopH+innerH1+cMidH+innerH2-r} A ${r},${r} 0 0 0 ${cArmIndent+r},${cTopH+innerH1+cMidH+innerH2} H `;
            }

            // Defines the bottom part of the C-shape
            pathD += `${w-r} A ${r},${r} 0 0 1 ${w},${h-cBottomH+r} V ${h-r} A ${r},${r} 0 0 1 ${w-r},${h} H ${r} A ${r},${r} 0 0 1 0,${h-r} V ${r} A ${r},${r} 0 0 1 ${r},0 Z`;
            return pathD;
        }
        case 'reporter.leaf': {
            h = block.height || 28; // Default height for leaf reporter
            const pillR = h / 2; // Radius for the pill-shaped ends
            const leafR = 4; // Radius for the flat edges
            // Defines the path for a leaf-shaped reporter block
            return `M 0,${leafR} A ${leafR},${leafR} 0 0 1 ${leafR},0 H ${w-pillR} A ${pillR},${pillR} 0 0 1 ${w},${pillR} V ${h-leafR} A ${leafR},${leafR} 0 0 1 ${w-leafR},${h} H ${pillR} A ${pillR},${pillR} 0 0 1 0,${h-pillR} Z`;
        }
        case 'reporter': 
            h = block.height || 28; // Default height for generic reporter
            const pillR = h / 2; // Radius for pill-shaped ends
            // Defines the path for a pill-shaped reporter block
            return `M ${pillR},0 H ${w-pillR} A ${pillR},${pillR} 0 0,1 ${w},${pillR} V ${h-pillR} A ${pillR},${pillR} 0 0,1 ${w-pillR},${h} H ${pillR} A ${pillR},${pillR} 0 0,1 0,${h-pillR} V ${pillR} A ${pillR},${pillR} 0 0,1 ${pillR},0 Z`;
        case 'boolean':
            h = block.height || 28; // Default height for boolean block
            const hexH = h / 2; // Half height for the hexagonal points
            // Defines the path for a hexagonal boolean block
            return `M ${hexH},0 H ${w-hexH} L ${w},${hexH} L ${w-hexH},${h} H ${hexH} L 0,${hexH} Z`;
        case 'reporter.octagonal':
        case 'boolean.octagonal': {
            h = block.height || 28;
            const octH = h / 3;
            return `M ${octH},0 H ${w - octH} L ${w},${octH} V ${h - octH} L ${w - octH},${h} H ${octH} L 0,${h - octH} V ${octH} Z`;
        }
        default: return `M 0,0 H ${w} V ${h} H 0 Z`; // Default rectangle
    }
};