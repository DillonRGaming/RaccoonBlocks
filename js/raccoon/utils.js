Object.assign(window.Raccoon, {
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    measureText(text) { 
        return this.measureContext ? this.measureContext.measureText(text).width : 0; 
    },

    screenToVirtual({ x, y }) { 
        const r = this.workspace.getBoundingClientRect(); 
        return { 
            x: (x - r.left - this.view.x) / this.view.zoom, 
            y: (y - r.top - this.view.y) / this.view.zoom 
        }; 
    },

    virtualToScreen({ x, y }) { 
        const r = this.workspace.getBoundingClientRect(); 
        return { 
            x: x * this.view.zoom + this.view.x + r.left, 
            y: y * this.view.zoom + this.view.y + r.top 
        }; 
    },

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    },

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0,0,0];
    },

    rgbToHsv(r, g, b) {
        r /= 255, g /= 255, b /= 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h=0, s, v = max;
        let d = max - min;
        s = max == 0 ? 0 : d / max;
        if (max != min) {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [h * 360, s, v];
    },

    hsvToRgb(h, s, v) {
        let r, g, b, i, f, p, q, t;
        h /= 360;
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    },
});