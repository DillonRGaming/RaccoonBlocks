window.Raccoon.Shapes.getPath = function(block) {
    const w = block.width;
    let h = block.height;
    const r = 4; 

    switch (block.shape) {
        case 'hat':
            h = block.height || 40;
            const topR = 20;
            return `M 0,${h-r} A ${r},${r} 0 0 0 ${r},${h} H ${w-r} A ${r},${r} 0 0 0 ${w},${h-r} V ${topR} A ${topR},${topR} 0 0 0 ${w-topR},0 H ${topR} A ${topR},${topR} 0 0 0 0,${topR} Z`;
        case 'reporter.square':
        case 'stack': {
            const borderRadius = r;
            return `M 0,${borderRadius} A ${borderRadius},${borderRadius} 0 0,1 ${borderRadius},0 H ${w-borderRadius} A ${borderRadius},${borderRadius} 0 0,1 ${w},${borderRadius} V ${h-borderRadius} A ${borderRadius},${borderRadius} 0 0,1 ${w-borderRadius},${h} H ${borderRadius} A ${borderRadius},${borderRadius} 0 0,1 0,${h-borderRadius} Z`;
        }
        case 'c_shape': {
            const cArmIndent = 20, cTopH = 28, cMidH = 24, cBottomH = 24, cInnerMinH = 32;
            const innerH1 = block.cInnerHeight1 || cInnerMinH;

            let pathD = `M ${r},0 H ${w-r} A ${r},${r} 0 0 1 ${w},${r} V ${cTopH-r} A ${r},${r} 0 0 1 ${w-r},${cTopH} H ${cArmIndent+r} A ${r},${r} 0 0 0 ${cArmIndent},${cTopH+r} V ${cTopH+innerH1-r} A ${r},${r} 0 0 0 ${cArmIndent+r},${cTopH+innerH1} H `;
            
            if (block.type === 'control_if_else') {
                const innerH2 = block.cInnerHeight2 || cInnerMinH;
                pathD += `${w-r} A ${r},${r} 0 0 1 ${w},${cTopH+innerH1+r} V ${cTopH+innerH1+cMidH-r} A ${r},${r} 0 0 1 ${w-r},${cTopH+innerH1+cMidH} H ${cArmIndent+r} A ${r},${r} 0 0 0 ${cArmIndent},${cTopH+innerH1+cMidH+r} V ${cTopH+innerH1+cMidH+innerH2-r} A ${r},${r} 0 0 0 ${cArmIndent+r},${cTopH+innerH1+cMidH+innerH2} H `;
            }

            pathD += `${w-r} A ${r},${r} 0 0 1 ${w},${h-cBottomH+r} V ${h-r} A ${r},${r} 0 0 1 ${w-r},${h} H ${r} A ${r},${r} 0 0 1 0,${h-r} V ${r} A ${r},${r} 0 0 1 ${r},0 Z`;
            return pathD;
        }
        case 'reporter.leaf': {
            h = block.height || 28;
            const pillR = h / 2;
            const leafR = 4;
            return `M 0,${leafR} A ${leafR},${leafR} 0 0 1 ${leafR},0 H ${w-pillR} A ${pillR},${pillR} 0 0 1 ${w},${pillR} V ${h-leafR} A ${leafR},${leafR} 0 0 1 ${w-leafR},${h} H ${pillR} A ${pillR},${pillR} 0 0 1 0,${h-pillR} Z`;
        }
        case 'reporter.octagon': {
            h = block.height || 28;
            const c = 8; // corner cut size
            return `M ${c},0 H ${w-c} L ${w},${c} V ${h-c} L ${w-c},${h} H ${c} L 0,${h-c} V ${c} Z`;
        }
        case 'reporter': 
            h = block.height || 28;
            const pillR = h / 2; return `M ${pillR},0 H ${w-pillR} A ${pillR},${pillR} 0 0,1 ${w},${pillR} V ${h-pillR} A ${pillR},${pillR} 0 0,1 ${w-pillR},${h} H ${pillR} A ${pillR},${pillR} 0 0,1 0,${h-pillR} V ${pillR} A ${pillR},${pillR} 0 0,1 ${pillR},0 Z`;
        case 'boolean':
            h = block.height || 28;
            const hexH = h / 2; return `M ${hexH},0 H ${w-hexH} L ${w},${hexH} L ${w-hexH},${h} H ${hexH} L 0,${hexH} Z`;
        default: return `M 0,0 H ${w} V ${h} H 0 Z`;
    }
};