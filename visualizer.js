// Класс для визуализации схем
class SchemeVisualizer {
    constructor(canvasId, scale = 50) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.scale = scale;
        this.dpr = Math.max(window.devicePixelRatio || 1, 1);
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
        const cssWidth = width * this.scale * this.zoom + 100;
        const cssHeight = height * this.scale * this.zoom + 100;

        // Размер в CSS-пикселях
        this.canvas.style.width = cssWidth + 'px';
        this.canvas.style.height = cssHeight + 'px';

        // Реальный буфер с учётом DPR для резкости
        this.canvas.width = Math.floor(cssWidth * this.dpr);
        this.canvas.height = Math.floor(cssHeight * this.dpr);

        // Сбрасываем трансформации и масштабируем контекст
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
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

        // Рисуем единый L‑образный контур без внутренней границы между основной частью и выступом
        const scale = this.scale * this.zoom;
        const mainL = this.currentRoom.mainLength * scale;
        const mainW = this.currentRoom.mainWidth * scale;
        const legL = this.currentRoom.legLength * scale;
        const legW = this.currentRoom.legWidth * scale;

        this.ctx.fillStyle = '#f5f5f5';
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        // Старт в левом верхнем углу основной части
        this.ctx.moveTo(0, 0);
        // Вправо по верхней кромке основной части
        this.ctx.lineTo(mainL, 0);
        // Вниз по правой кромке основной части
        this.ctx.lineTo(mainL, mainW);
        if (legL > 0 && legW > 0) {
            // Влево до внутреннего угла (границы выступа)
            this.ctx.lineTo(legL, mainW);
            // Вниз по правой кромке выступа
            this.ctx.lineTo(legL, mainW + legW);
            // Влево до левого низа выступа
            this.ctx.lineTo(0, mainW + legW);
        } else {
            // Прямоугольная комната
            this.ctx.lineTo(0, mainW);
        }
        // Вверх по левой кромке до начала
        this.ctx.lineTo(0, 0);
        this.ctx.closePath();

        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.restore();

        // Размерные линии и подписи
        this.drawDimensions();
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
            this.ctx.lineWidth = 1.2;
            
            this.ctx.fillRect(x, y, width, height);
            this.ctx.strokeRect(x, y, width, height);

            // Номер панели
            if (showNumbers) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = `bold ${Math.max(14, 16 * this.zoom)}px Arial`;
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

    // Рисование размерных линий для Г‑образной комнаты
    drawDimensions() {
        const room = this.currentRoom;
        if (!room) return;

        const ctx = this.ctx;
        const scale = this.scale * this.zoom;

        const mainW = room.mainWidth * scale;
        const mainL = room.mainLength * scale;
        const legL = room.legLength * scale;
        const legW = room.legWidth * scale;

        // Смещения
        const baseX = 50;
        const baseY = 50;
        const offset = 18;      // отступ от контура
        const arrowSize = 8 * Math.max(1, this.zoom);

        ctx.save();
        // Цвет стрелок и подписей — фирменный (как у заголовка)
        ctx.strokeStyle = '#01644f';
        ctx.fillStyle = '#01644f';
        ctx.lineWidth = 2;
        ctx.font = `bold ${Math.max(12, 14 * this.zoom)}px Arial`;

        // Линия размера со стрелками внутрь
        const drawDimLine = (x1, y1, x2, y2) => {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            const angle = Math.atan2(y2 - y1, x2 - x1);
            // стрелка в точке 1 (внутрь — в сторону x2,y2)
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + arrowSize * Math.cos(angle + Math.PI / 6), y1 + arrowSize * Math.sin(angle + Math.PI / 6));
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + arrowSize * Math.cos(angle - Math.PI / 6), y1 + arrowSize * Math.sin(angle - Math.PI / 6));
            // стрелка в точке 2 (внутрь — в сторону x1,y1)
            const back = angle + Math.PI;
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 + arrowSize * Math.cos(back + Math.PI / 6), y2 + arrowSize * Math.sin(back + Math.PI / 6));
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 + arrowSize * Math.cos(back - Math.PI / 6), y2 + arrowSize * Math.sin(back - Math.PI / 6));
            ctx.stroke();
        };

        // Общая ширина (по Y) слева
        const totalH = mainW + legW; // в пикселях
        const leftOffset = 10; // ближе к схеме
        const leftX = baseX - leftOffset;
        const topY = baseY;
        const bottomY = baseY + totalH;
        drawDimLine(leftX, topY, leftX, bottomY);

        // Подпись общей высоты с остатком
        const totalHeightMeters = (room.mainWidth + room.legWidth).toFixed(2);
        const leftLabel = `${totalHeightMeters} м`;
        ctx.save();
        ctx.translate(leftX - 8, baseY + totalH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(leftLabel, 0, 0);
        ctx.restore();

        // Общая длина (по X) сверху
        const topX1 = baseX;
        const topX2 = baseX + mainL;
        const topYDim = baseY - 14; // чуть ближе к схеме
        drawDimLine(topX1, topYDim, topX2, topYDim);

        const totalLengthMeters = room.mainLength.toFixed(2);
        const topLabel = `${totalLengthMeters} м`;
        ctx.textAlign = 'center';
        ctx.fillText(topLabel, (topX1 + topX2) / 2, topYDim - 6);

        // Размеры выступа (верхняя горизонтальная сторона)
        if (room.legLength > 0 && room.legWidth > 0) {
            // Горизонтальная сторона выступа: перенесена ниже выступа, чтобы не перекрываться
            const legBottomY = baseY + mainW + legW + offset;
            drawDimLine(baseX, legBottomY, baseX + legL, legBottomY);
            ctx.textAlign = 'center';
            ctx.fillText(`${room.legLength.toFixed(1)} м`, baseX + legL / 2, legBottomY + 14);

            // Вертикальная сторона выступа справа от выступа
            const rightDimX = baseX + legL + offset;
            const rightY1 = baseY + mainW; // верхняя грань выступа
            const rightY2 = baseY + mainW + legW; // нижняя грань выступа
            drawDimLine(rightDimX, rightY1, rightDimX, rightY2);
            ctx.save();
            ctx.translate(rightDimX + 16, (rightY1 + rightY2) / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.fillText(`${room.legWidth.toFixed(1)} м`, 0, 0);
            ctx.restore();
        }

        // Подпись оси Y убрана по требованию

        ctx.restore();
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

