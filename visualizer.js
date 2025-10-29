// Класс для визуализации схем
class SchemeVisualizer {
    constructor(canvasId, scale = 50) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.scale = scale;
        this.rotation = 0;
        this.zoom = 1.0;
        this.currentPanels = [];
        this.currentRoom = null;
    }

    setScale(scale) {
        this.scale = scale;
    }

    setPanels(panels) {
        this.currentPanels = panels;
    }

    setRoom(room) {
        this.currentRoom = room;
    }

    // Очистка canvas
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Установка размера canvas
    resize() {
        if (!this.currentRoom) return;
        
        const width = Math.max(this.currentRoom.mainLength, this.currentRoom.legLength);
        const height = this.currentRoom.mainWidth + this.currentRoom.legWidth;
        
        this.canvas.width = width * this.scale * this.zoom + 100;
        this.canvas.height = height * this.scale * this.zoom + 100;
    }

    // Поворот canvas
    rotate(angle) {
        this.rotation += angle;
        if (this.rotation >= 360) this.rotation -= 360;
        if (this.rotation < 0) this.rotation += 360;
    }

    // Масштабирование (используется извне через свойство zoom)
    setZoom(zoomValue) {
        this.zoom = zoomValue;
        if (this.zoom < 0.5) this.zoom = 0.5;
        if (this.zoom > 3) this.zoom = 3;
    }

    // Рисование сетки
    drawGrid(showGrid) {
        if (!showGrid || !this.currentRoom) return;

        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 0.5;
        
        const width = Math.max(this.currentRoom.mainLength, this.currentRoom.legLength);
        const height = this.currentRoom.mainWidth + this.currentRoom.legWidth;
        
        const scaledWidth = width * this.scale * this.zoom;
        const scaledHeight = height * this.scale * this.zoom;
        
        // Вертикальные линии
        for (let x = 0; x <= scaledWidth; x += this.scale * this.zoom) {
            this.ctx.beginPath();
            this.ctx.moveTo(x + 50, 50);
            this.ctx.lineTo(x + 50, scaledHeight + 50);
            this.ctx.stroke();
        }
        
        // Горизонтальные линии
        for (let y = 0; y <= scaledHeight; y += this.scale * this.zoom) {
            this.ctx.beginPath();
            this.ctx.moveTo(50, y + 50);
            this.ctx.lineTo(scaledWidth + 50, y + 50);
            this.ctx.stroke();
        }
    }

    // Рисование помещения
    drawRoom() {
        if (!this.currentRoom) return;

        this.ctx.save();
        this.ctx.translate(50, 50);

        // Основная часть
        this.ctx.fillStyle = '#f5f5f5';
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 2;
        
        this.ctx.fillRect(0, 0, 
            this.currentRoom.mainLength * this.scale * this.zoom,
            this.currentRoom.mainWidth * this.scale * this.zoom
        );
        this.ctx.strokeRect(0, 0,
            this.currentRoom.mainLength * this.scale * this.zoom,
            this.currentRoom.mainWidth * this.scale * this.zoom
        );

        // Выступ
        this.ctx.fillRect(0, this.currentRoom.mainWidth * this.scale * this.zoom,
            this.currentRoom.legLength * this.scale * this.zoom,
            this.currentRoom.legWidth * this.scale * this.zoom
        );
        this.ctx.strokeRect(0, this.currentRoom.mainWidth * this.scale * this.zoom,
            this.currentRoom.legLength * this.scale * this.zoom,
            this.currentRoom.legWidth * this.scale * this.zoom
        );

        // Подписи размеров
        this.ctx.fillStyle = '#666666';
        this.ctx.font = `${12 * this.zoom}px Arial`;
        this.ctx.fillText(`${this.currentRoom.mainLength.toFixed(2)} м`, 
            (this.currentRoom.mainLength * this.scale * this.zoom) / 2 - 20, -5);
        this.ctx.fillText(`${this.currentRoom.mainWidth.toFixed(2)} м`, 
            -45, (this.currentRoom.mainWidth * this.scale * this.zoom) / 2);

        this.ctx.restore();
    }

    // Рисование панелей
    drawPanels(showNumbers) {
        this.ctx.save();
        this.ctx.translate(50, 50);

        const colors = {
            [Orientation.HORIZONTAL]: {
                fill: '#404449',
                stroke: '#2b2f33'
            },
            [Orientation.VERTICAL]: {
                fill: '#404449',
                stroke: '#2b2f33'
            }
        };

        this.currentPanels.forEach(panel => {
            const color = colors[panel.orientation] || colors[Orientation.HORIZONTAL];
            
            const x = panel.x * this.scale * this.zoom;
            const y = panel.y * this.scale * this.zoom;
            const width = panel.width * this.scale * this.zoom;
            const height = panel.height * this.scale * this.zoom;

            // Рисование панели
            this.ctx.fillStyle = color.fill;
            this.ctx.strokeStyle = color.stroke;
            this.ctx.lineWidth = 1.5;
            
            this.ctx.fillRect(x, y, width, height);
            this.ctx.strokeRect(x, y, width, height);

            // Номер панели
            if (showNumbers) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = `bold ${Math.max(10, 12 * this.zoom)}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(
                    panel.number.toString(),
                    x + width / 2,
                    y + height / 2
                );
            }
        });

        this.ctx.restore();
    }

    // Главная функция отрисовки
    render(showGrid = true, showNumbers = true) {
        this.clear();
        this.resize();
        
        // Применяем поворот, если есть
        if (this.rotation !== 0) {
            this.ctx.save();
            this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.rotate((this.rotation * Math.PI) / 180);
            this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
        }

        this.drawGrid(showGrid);
        this.drawRoom();
        this.drawPanels(showNumbers);

        if (this.rotation !== 0) {
            this.ctx.restore();
        }
    }

    // Экспорт в изображение
    exportToImage() {
        return this.canvas.toDataURL('image/png');
    }
}

// Глобальные функции для управления canvas
const canvasStates = {
    bestScheme: { rotation: 0, zoom: 1.0 }
};

const visualizers = {
    bestScheme: null
};

function rotateCanvas(schemeId, angle) {
    const state = canvasStates[schemeId] || canvasStates.bestScheme;
    if (!state) return;
    
    state.rotation += angle;
    if (state.rotation >= 360) state.rotation -= 360;
    if (state.rotation < 0) state.rotation += 360;
    
    const visualizer = visualizers[schemeId] || visualizers.bestScheme;
    if (visualizer) {
        visualizer.rotation = state.rotation;
        renderScheme(schemeId || 'bestScheme');
    }
}

function zoomCanvas(schemeId, factor) {
    const state = canvasStates[schemeId] || canvasStates.bestScheme;
    if (!state) return;
    
    state.zoom *= factor;
    if (state.zoom < 0.5) state.zoom = 0.5;
    if (state.zoom > 3) state.zoom = 3;
    
    const visualizer = visualizers[schemeId] || visualizers.bestScheme;
    if (visualizer) {
        visualizer.zoom = state.zoom;
        renderScheme(schemeId || 'bestScheme');
    }
}

function saveCanvas(schemeId) {
    // Старая функция сохранения PNG, теперь используется saveToPDF
    if (window.saveToPDF) {
        saveToPDF();
    }
}

function renderScheme(schemeId) {
    const visualizer = visualizers[schemeId] || visualizers.bestScheme;
    if (!visualizer) return;
    
    // Применяем zoom из состояния
    const state = canvasStates[schemeId] || canvasStates.bestScheme;
    if (state) {
        visualizer.zoom = state.zoom;
        visualizer.rotation = state.rotation;
    }
    
    const showGrid = document.getElementById('showGrid').checked;
    const showNumbers = document.getElementById('showNumbers').checked;
    
    visualizer.render(showGrid, showNumbers);
}

