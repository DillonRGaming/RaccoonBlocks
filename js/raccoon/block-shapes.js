window.Raccoon.Shapes.getPath = function(block) {
    const w = block.width;
    let h = block.height;
    const r = 8; 

    switch (block.shape) {
        case 'hat':
            h = block.height || 40;
            const topR = 20;
            return `M 0,${h-r} A ${r},${r} 0 0 0 ${r},${h} H ${w-r} A ${r},${r} 0 0 0 ${w},${h-r} V ${topR} A ${topR},${topR} 0 0 0 ${w-topR},0 H ${topR} A ${topR},${topR} 0 0 0 0,${topR} Z`;
        case 'stack':
             return `M 0,${r} A ${r},${r} 0 0,1 ${r},0 H ${w-r} A ${r},${r} 0 0,1 ${w},${r} V ${h-r} A ${r},${r} 0 0,1 ${w-r},${h} H ${r} A ${r},${r} 0 0,1 0,${h-r} Z`;
        case 'c_shape':
            const cArmIndent = 20, cTopH = 28, cMidH = 24, cBottomH = 24, cInnerMinH = 32;
            const allBlocks = Raccoon.getAllBlocksForSprite(block.spriteId) || {};
            
            let innerH1 = cInnerMinH;
            if (block.child && allBlocks[block.child]) {
                innerH1 = Math.max(cInnerMinH, Raccoon.calculateStackHeight(allBlocks[block.child], allBlocks));
            }

            let pathD = `M ${r},0 H ${w-r} A ${r},${r} 0 0 1 ${w},${r} V ${cTopH-r} A ${r},${r} 0 0 1 ${w-r},${cTopH} H ${cArmIndent+r} A ${r},${r} 0 0 0 ${cArmIndent},${cTopH+r} V ${cTopH+innerH1-r} A ${r},${r} 0 0 0 ${cArmIndent+r},${cTopH+innerH1} H `;
            
            if (block.type === 'control_if_else') {
                let innerH2 = cInnerMinH;
                if(block.child2 && allBlocks[block.child2]) {
                   innerH2 = Math.max(cInnerMinH, Raccoon.calculateStackHeight(allBlocks[block.child2], allBlocks));
                }
                pathD += `${w-r} A ${r},${r} 0 0 1 ${w},${cTopH+innerH1+r} V ${cTopH+innerH1+cMidH-r} A ${r},${r} 0 0 1 ${w-r},${cTopH+innerH1+cMidH} H ${cArmIndent+r} A ${r},${r} 0 0 0 ${cArmIndent},${cTopH+innerH1+cMidH+r} V ${cTopH+innerH1+cMidH+innerH2-r} A ${r},${r} 0 0 0 ${cArmIndent+r},${cTopH+innerH1+cMidH+innerH2} H `;
            }

            pathD += `${w-r} A ${r},${r} 0 0 1 ${w},${h-cBottomH+r} V ${h-r} A ${r},${r} 0 0 1 ${w-r},${h} H ${r} A ${r},${r} 0 0 1 0,${h-r} V ${r} A ${r},${r} 0 0 1 ${r},0 Z`;
            return pathD;
        case 'reporter': 
            h = block.height || 28;
            const pillR = h / 2; return `M ${pillR},0 H ${w-pillR} A ${pillR},${pillR} 0 0,1 ${w},${pillR} V ${h-pillR} A ${pillR},${pillR} 0 0,1 ${w-pillR},${h} H ${pillR} A ${pillR},${pillR} 0 0,1 0,${h-pillR} V ${pillR} A ${pillR},${pillR} 0 0,1 ${pillR},0 Z`;
        case 'boolean':
            h = block.height || 28;
            const hexH = h / 2; return `M ${hexH},0 H ${w-hexH} L ${w},${hexH} L ${w-hexH},${h} H ${hexH} L 0,${hexH} Z`;
        default: return `M 0,0 H ${w} V ${h} H 0 Z`;
    }
};