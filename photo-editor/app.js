// Photo Editor Application
class PhotoEditor {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.drawingCanvas = document.getElementById('drawingCanvas');
        this.drawingCtx = this.drawingCanvas.getContext('2d');
        
        this.currentTool = 'move';
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.zoom = 1;
        this.layers = [];
        this.activeLayerIndex = 0;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        
        // Brush settings
        this.brushSize = 10;
        this.brushOpacity = 100;
        this.brushColor = '#000000';
        
        // Adjustments
        this.adjustments = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hueRotate: 0,
            blur: 0,
            grayscale: 0,
            sepia: 0,
            invert: 0
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.createNewCanvas(800, 600, 'white');
        this.updateZoomLevel();
        this.addHistoryState('Initial state');
    }
    
    setupEventListeners() {
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
                this.updateToolInfo();
                this.setCursor();
            });
        });
        
        // Canvas events
        this.drawingCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.drawingCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.drawingCanvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.drawingCanvas.addEventListener('mouseout', () => this.handleMouseUp());
        
        // Brush settings
        document.getElementById('brushSize').addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            document.getElementById('brushSizeValue').textContent = this.brushSize;
        });
        
        document.getElementById('brushOpacity').addEventListener('input', (e) => {
            this.brushOpacity = parseInt(e.target.value);
            document.getElementById('brushOpacityValue').textContent = this.brushOpacity + '%';
        });
        
        document.getElementById('brushColor').addEventListener('input', (e) => {
            this.brushColor = e.target.value;
        });
        
        // Zoom controls
        document.getElementById('zoomIn').addEventListener('click', () => this.setZoom(this.zoom + 0.1));
        document.getElementById('zoomOut').addEventListener('click', () => this.setZoom(this.zoom - 0.1));
        document.getElementById('zoomFit').addEventListener('click', () => this.fitToScreen());
        
        // Header buttons
        document.getElementById('btnNew').addEventListener('click', () => this.showNewDialog());
        document.getElementById('btnOpen').addEventListener('click', () => this.openFile());
        document.getElementById('btnSave').addEventListener('click', () => this.saveFile());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileSelect(e));
        
        // New image dialog
        document.getElementById('createNew').addEventListener('click', () => this.createImageFromDialog());
        document.getElementById('cancelNew').addEventListener('click', () => this.hideNewDialog());
        
        // Adjustments
        const adjustmentInputs = ['brightness', 'contrast', 'saturation', 'hueRotate', 'blur', 'grayscale', 'sepia', 'invert'];
        adjustmentInputs.forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                this.adjustments[id] = parseInt(e.target.value);
                this.applyAdjustments();
            });
        });
        
        document.getElementById('resetAdjustments').addEventListener('click', () => this.resetAdjustments());
        
        // Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applyFilter(btn.dataset.filter);
            });
        });
        
        // Layers
        document.getElementById('addLayer').addEventListener('click', () => this.addLayer());
        
        // History
        document.getElementById('clearHistory').addEventListener('click', () => this.clearHistory());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Cursor position
        this.drawingCanvas.addEventListener('mousemove', (e) => this.updateCursorPosition(e));
    }
    
    createNewCanvas(width, height, background) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.drawingCanvas.width = width;
        this.drawingCanvas.height = height;
        
        if (background === 'white') {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(0, 0, width, height);
        } else if (background === 'black') {
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, width, height);
        }
        // transparent - do nothing
        
        this.updateCanvasInfo();
        this.addLayer('Background');
        this.addHistoryState('New canvas created');
    }
    
    handleMouseDown(e) {
        this.isDrawing = true;
        const rect = this.drawingCanvas.getBoundingClientRect();
        this.lastX = (e.clientX - rect.left) / this.zoom;
        this.lastY = (e.clientY - rect.top) / this.zoom;
        
        if (this.currentTool === 'fill') {
            this.floodFill(Math.floor(this.lastX), Math.floor(this.lastY), this.brushColor);
        } else if (this.currentTool === 'picker') {
            this.pickColor(Math.floor(this.lastX), Math.floor(this.lastY));
        }
    }
    
    handleMouseMove(e) {
        if (!this.isDrawing) return;
        
        const rect = this.drawingCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoom;
        const y = (e.clientY - rect.top) / this.zoom;
        
        switch (this.currentTool) {
            case 'brush':
                this.draw(x, y);
                break;
            case 'eraser':
                this.erase(x, y);
                break;
            case 'line':
                this.drawLine(this.lastX, this.lastY, x, y);
                break;
            case 'shape':
                this.drawShape(this.lastX, this.lastY, x, y);
                break;
        }
        
        this.lastX = x;
        this.lastY = y;
    }
    
    handleMouseUp() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.addHistoryState(`${this.currentTool} action`);
        }
    }
    
    draw(x, y) {
        this.drawingCtx.globalAlpha = this.brushOpacity / 100;
        this.drawingCtx.strokeStyle = this.brushColor;
        this.drawingCtx.lineWidth = this.brushSize;
        this.drawingCtx.lineCap = 'round';
        this.drawingCtx.lineJoin = 'round';
        this.drawingCtx.beginPath();
        this.drawingCtx.moveTo(this.lastX, this.lastY);
        this.drawingCtx.lineTo(x, y);
        this.drawingCtx.stroke();
        this.mergeLayers();
    }
    
    erase(x, y) {
        this.drawingCtx.globalCompositeOperation = 'destination-out';
        this.drawingCtx.lineWidth = this.brushSize;
        this.drawingCtx.lineCap = 'round';
        this.drawingCtx.lineJoin = 'round';
        this.drawingCtx.beginPath();
        this.drawingCtx.moveTo(this.lastX, this.lastY);
        this.drawingCtx.lineTo(x, y);
        this.drawingCtx.stroke();
        this.drawingCtx.globalCompositeOperation = 'source-over';
        this.mergeLayers();
    }
    
    drawLine(x1, y1, x2, y2) {
        this.drawingCtx.strokeStyle = this.brushColor;
        this.drawingCtx.lineWidth = this.brushSize;
        this.drawingCtx.lineCap = 'round';
        this.drawingCtx.beginPath();
        this.drawingCtx.moveTo(x1, y1);
        this.drawingCtx.lineTo(x2, y2);
        this.drawingCtx.stroke();
        this.mergeLayers();
    }
    
    drawShape(x1, y1, x2, y2) {
        this.drawingCtx.strokeStyle = this.brushColor;
        this.drawingCtx.lineWidth = this.brushSize;
        this.drawingCtx.fillStyle = this.brushColor;
        const width = x2 - x1;
        const height = y2 - y1;
        this.drawingCtx.fillRect(x1, y1, width, height);
        this.mergeLayers();
    }
    
    floodFill(startX, startY, fillColor) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        
        const startPos = (startY * this.canvas.width + startX) * 4;
        const startR = data[startPos];
        const startG = data[startPos + 1];
        const startB = data[startPos + 2];
        const startA = data[startPos + 3];
        
        const fillR = parseInt(fillColor.slice(1, 3), 16);
        const fillG = parseInt(fillColor.slice(3, 5), 16);
        const fillB = parseInt(fillColor.slice(5, 7), 16);
        
        if (startR === fillR && startG === fillG && startB === fillB) return;
        
        const stack = [[startX, startY]];
        const visited = new Set();
        
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const pos = (y * this.canvas.width + x) * 4;
            const key = `${x},${y}`;
            
            if (visited.has(key)) continue;
            if (x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) continue;
            
            const dR = Math.abs(data[pos] - startR);
            const dG = Math.abs(data[pos + 1] - startG);
            const dB = Math.abs(data[pos + 2] - startB);
            const dA = Math.abs(data[pos + 3] - startA);
            
            if (dR > 10 || dG > 10 || dB > 10 || dA > 10) continue;
            
            visited.add(key);
            
            data[pos] = fillR;
            data[pos + 1] = fillG;
            data[pos + 2] = fillB;
            data[pos + 3] = 255;
            
            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
        }
        
        this.ctx.putImageData(imageData, 0, 0);
        this.addHistoryState('Fill');
    }
    
    pickColor(x, y) {
        const imageData = this.ctx.getImageData(x, y, 1, 1);
        const r = imageData.data[0];
        const g = imageData.data[1];
        const b = imageData.data[2];
        const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        this.brushColor = hex;
        document.getElementById('brushColor').value = hex;
    }
    
    mergeLayers() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.drawingCanvas, 0, 0);
    }
    
    applyAdjustments() {
        const { brightness, contrast, saturation, hueRotate, blur, grayscale, sepia, invert } = this.adjustments;
        const filter = `
            brightness(${100 + brightness}%)
            contrast(${100 + contrast}%)
            saturate(${100 + saturation}%)
            hue-rotate(${hueRotate}deg)
            blur(${blur}px)
            grayscale(${grayscale}%)
            sepia(${sepia}%)
            invert(${invert}%)
        `;
        this.canvas.style.filter = filter;
    }
    
    resetAdjustments() {
        this.adjustments = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hueRotate: 0,
            blur: 0,
            grayscale: 0,
            sepia: 0,
            invert: 0
        };
        
        ['brightness', 'contrast', 'saturation', 'hueRotate', 'blur', 'grayscale', 'sepia', 'invert'].forEach(id => {
            document.getElementById(id).value = 0;
        });
        
        this.applyAdjustments();
    }
    
    applyFilter(filterName) {
        this.resetAdjustments();
        
        const filters = {
            none: {},
            vintage: { sepia: 40, contrast: 10, brightness: 10 },
            cool: { hueRotate: 180, saturation: 20 },
            warm: { sepia: 20, hueRotate: -30, saturation: 20 },
            bw: { grayscale: 100 },
            dramatic: { contrast: 40, saturation: -20, brightness: -10 },
            fade: { brightness: 20, contrast: -20, sepia: 20 },
            vivid: { saturation: 50, contrast: 20 }
        };
        
        const selectedFilter = filters[filterName];
        for (const [key, value] of Object.entries(selectedFilter)) {
            this.adjustments[key] = value;
            const input = document.getElementById(key);
            if (input) input.value = value;
        }
        
        this.applyAdjustments();
        this.addHistoryState(`Applied ${filterName} filter`);
    }
    
    setZoom(newZoom) {
        this.zoom = Math.max(0.1, Math.min(5, newZoom));
        this.updateZoomLevel();
        this.scaleCanvas();
    }
    
    updateZoomLevel() {
        document.getElementById('zoomLevel').textContent = Math.round(this.zoom * 100) + '%';
    }
    
    scaleCanvas() {
        this.canvas.style.transform = `translate(-50%, -50%) scale(${this.zoom})`;
        this.drawingCanvas.style.transform = `translate(-50%, -50%) scale(${this.zoom})`;
    }
    
    fitToScreen() {
        const container = document.getElementById('canvasContainer');
        const scaleX = (container.clientWidth - 40) / this.canvas.width;
        const scaleY = (container.clientHeight - 40) / this.canvas.height;
        this.setZoom(Math.min(scaleX, scaleY, 1));
    }
    
    addLayer(name = 'Layer ' + (this.layers.length + 1)) {
        this.layers.push({ name, visible: true });
        this.updateLayersList();
    }
    
    updateLayersList() {
        const layersList = document.getElementById('layersList');
        layersList.innerHTML = '';
        
        this.layers.forEach((layer, index) => {
            const item = document.createElement('div');
            item.className = 'layer-item' + (index === this.activeLayerIndex ? ' active' : '');
            item.innerHTML = `
                <span class="layer-preview"></span>
                <span class="layer-name">${layer.name}</span>
                <span class="layer-visible">${layer.visible ? '👁️' : '🚫'}</span>
            `;
            item.addEventListener('click', () => {
                this.activeLayerIndex = index;
                this.updateLayersList();
            });
            layersList.appendChild(item);
        });
    }
    
    showNewDialog() {
        document.getElementById('newImageDialog').classList.add('show');
    }
    
    hideNewDialog() {
        document.getElementById('newImageDialog').classList.remove('show');
    }
    
    createImageFromDialog() {
        const width = parseInt(document.getElementById('newWidth').value);
        const height = parseInt(document.getElementById('newHeight').value);
        const background = document.getElementById('newBackground').value;
        this.createNewCanvas(width, height, background);
        this.hideNewDialog();
    }
    
    openFile() {
        document.getElementById('fileInput').click();
    }
    
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                this.drawingCanvas.width = img.width;
                this.drawingCanvas.height = img.height;
                this.ctx.drawImage(img, 0, 0);
                this.updateCanvasInfo();
                this.addHistoryState('Image opened');
                this.fitToScreen();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }
    
    saveFile() {
        // Create a temporary canvas to combine the filtered result
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw the main canvas content
        tempCtx.drawImage(this.canvas, 0, 0);
        
        // Apply filters manually
        if (Object.values(this.adjustments).some(v => v !== 0)) {
            const { brightness, contrast, saturation, hueRotate, blur, grayscale, sepia, invert } = this.adjustments;
            tempCtx.filter = `
                brightness(${100 + brightness}%)
                contrast(${100 + contrast}%)
                saturate(${100 + saturation}%)
                hue-rotate(${hueRotate}deg)
                blur(${blur}px)
                grayscale(${grayscale}%)
                sepia(${sepia}%)
                invert(${invert}%)
            `;
            tempCtx.drawImage(this.canvas, 0, 0);
        }
        
        // Draw drawing canvas on top
        tempCtx.drawImage(this.drawingCanvas, 0, 0);
        
        const link = document.createElement('a');
        link.download = 'edited-image.png';
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
        this.addHistoryState('Image saved');
    }
    
    addHistoryState(action) {
        // Remove any future states if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        this.history.push({
            action,
            imageData: this.canvas.toDataURL(),
            adjustments: { ...this.adjustments },
            timestamp: Date.now()
        });
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
        
        this.updateHistoryList();
    }
    
    updateHistoryList() {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        
        this.history.forEach((state, index) => {
            const item = document.createElement('div');
            item.className = 'history-item' + (index === this.historyIndex ? ' active' : '');
            const time = new Date(state.timestamp).toLocaleTimeString();
            item.textContent = `${time} - ${state.action}`;
            item.addEventListener('click', () => this.restoreHistory(index));
            historyList.appendChild(item);
        });
    }
    
    restoreHistory(index) {
        const state = this.history[index];
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
            this.adjustments = { ...state.adjustments };
            
            // Update adjustment sliders
            for (const [key, value] of Object.entries(this.adjustments)) {
                const input = document.getElementById(key);
                if (input) input.value = value;
            }
            
            this.applyAdjustments();
            this.historyIndex = index;
            this.updateHistoryList();
        };
        img.src = state.imageData;
    }
    
    clearHistory() {
        this.history = [];
        this.historyIndex = -1;
        this.updateHistoryList();
    }
    
    handleKeyboard(e) {
        const shortcuts = {
            'v': 'move',
            'm': 'select',
            'c': 'crop',
            'b': 'brush',
            'e': 'eraser',
            'g': 'fill',
            'i': 'picker',
            't': 'text',
            'u': 'shape',
            'l': 'line',
            'z': 'zoom',
            'h': 'hand'
        };
        
        if (shortcuts[e.key.toLowerCase()]) {
            const tool = shortcuts[e.key.toLowerCase()];
            document.querySelectorAll('.tool-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tool === tool);
            });
            this.currentTool = tool;
            this.updateToolInfo();
            this.setCursor();
        }
        
        // Undo/Redo
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                this.redo();
            } else {
                this.undo();
            }
        }
        
        // Save
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            this.saveFile();
        }
        
        // Open
        if (e.ctrlKey && e.key === 'o') {
            e.preventDefault();
            this.openFile();
        }
        
        // New
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            this.showNewDialog();
        }
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.restoreHistory(this.historyIndex - 1);
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.restoreHistory(this.historyIndex + 1);
        }
    }
    
    updateToolInfo() {
        document.getElementById('toolInfo').textContent = 'Tool: ' + this.currentTool.charAt(0).toUpperCase() + this.currentTool.slice(1);
    }
    
    updateCanvasInfo() {
        document.getElementById('canvasInfo').textContent = `Canvas: ${this.canvas.width} × ${this.canvas.height}`;
    }
    
    updateCursorPosition(e) {
        const rect = this.drawingCanvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.zoom);
        const y = Math.floor((e.clientY - rect.top) / this.zoom);
        document.getElementById('cursorPos').textContent = `X: ${x}, Y: ${y}`;
    }
    
    setCursor() {
        const cursors = {
            move: 'move',
            select: 'crosshair',
            crop: 'cell',
            brush: 'crosshair',
            eraser: 'cell',
            fill: 'copy',
            picker: 'copy',
            text: 'text',
            shape: 'crosshair',
            line: 'crosshair',
            zoom: 'zoom-in',
            hand: 'grab'
        };
        this.drawingCanvas.style.cursor = cursors[this.currentTool] || 'default';
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.photoEditor = new PhotoEditor();
});
