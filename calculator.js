// Классы для работы с данными
class LShapedRoom {
    constructor(mainLength, mainWidth, legLength, legWidth) {
        this.mainLength = mainLength;
        this.mainWidth = mainWidth;
        this.legLength = legLength;
        this.legWidth = legWidth;
    }

    getTotalArea() {
        const mainArea = this.mainLength * this.mainWidth;
        const legArea = this.legLength * this.legWidth;
        return mainArea + legArea;
    }
}

class Orientation {
    static HORIZONTAL = 'HORIZONTAL';
    static VERTICAL = 'VERTICAL';
}

class Panel {
    constructor(x, y, width, height, orientation, number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.orientation = orientation;
        this.number = number;
    }

    getArea() {
        return this.width * this.height;
    }
}

// Константы размеров панелей
const DISPLAY_PANEL_LENGTH = 0.735;   // м
const DISPLAY_PANEL_WIDTH  = 0.535;   // м
const EFFECTIVE_PANEL_LENGTH = 0.735; // м
const EFFECTIVE_PANEL_WIDTH  = 0.535; // м

// Основной класс калькулятора
class PanelCalculator {
    constructor(room) {
        this.room = room;
        // Для раскладки используем видимые размеры панели
        this.panelLength = DISPLAY_PANEL_LENGTH;
        this.panelWidth = DISPLAY_PANEL_WIDTH;
    }

    // Проверка, находится ли панель внутри Г-образной комнаты
    isPanelInsideRoom(x, y, width, height) {
        // Проверяем все четыре угла панели
        const corners = [
            { x: x, y: y },                    // верхний левый
            { x: x + width, y: y },            // верхний правый
            { x: x, y: y + height },           // нижний левый
            { x: x + width, y: y + height }    // нижний правый
        ];
        
        for (const corner of corners) {
            if (!this.isPointInsideRoom(corner.x, corner.y)) {
                return false;
            }
        }
        return true;
    }
    
    // Проверка, находится ли точка внутри Г-образной комнаты
    isPointInsideRoom(x, y) {
        // Основная часть
        if (x >= 0 && x <= this.room.mainLength && 
            y >= 0 && y <= this.room.mainWidth) {
            return true;
        }
        
        // Выступ (если есть)
        if (this.room.legLength > 0 && this.room.legWidth > 0) {
            if (x >= 0 && x <= this.room.legLength && 
                y >= this.room.mainWidth && y <= this.room.mainWidth + this.room.legWidth) {
                return true;
            }
        }
        
        return false;
    }

    // Проверка коллизий панелей
    checkPanelCollision(panel, panels) {
        for (const existingPanel of panels) {
            if (this.rectanglesOverlap(
                panel.x, panel.y, panel.x + panel.width, panel.y + panel.height,
                existingPanel.x, existingPanel.y, 
                existingPanel.x + existingPanel.width, existingPanel.y + existingPanel.height
            )) {
                return true;
            }
        }
        return false;
    }

    rectanglesOverlap(x1, y1, x2, y2, x3, y3, x4, y4) {
        return !(x2 <= x3 || x4 <= x1 || y2 <= y3 || y4 <= y1);
    }

    // Поиск доступного номера панели
    findAvailablePanelNumber(panels) {
        if (panels.length === 0) return 1;
        const numbers = panels.map(p => p.number).sort((a, b) => a - b);
        for (let i = 1; i <= numbers.length + 1; i++) {
            if (!numbers.includes(i)) return i;
        }
        return panels.length + 1;
    }

    // Схема 1: Горизонтальная укладка
    calculateScheme1() {
        const panels = [];
        let panelNumber = 1;

        // Определяем максимальные размеры для сканирования
        const maxX = Math.max(this.room.mainLength, this.room.legLength);
        const maxY = this.room.mainWidth + this.room.legWidth;

        // Сканируем всё пространство построчно (по Y)
        let y = 0;
        while (y < maxY) {
            let x = 0;
            while (x < maxX) {
                const panel = new Panel(
                    x, y,
                    this.panelLength, this.panelWidth,
                    Orientation.HORIZONTAL,
                    panelNumber
                );
                
                // Проверяем, что панель полностью внутри комнаты и не пересекается с другими
                if (this.isPanelInsideRoom(x, y, this.panelLength, this.panelWidth) &&
                    !this.checkPanelCollision(panel, panels)) {
                    panels.push(panel);
                    panelNumber++;
                }
                
                x += this.panelLength;
            }
            y += this.panelWidth;
        }

        return panels;
    }

    // Схема 2: Вертикальная укладка
    calculateScheme2() {
        const panels = [];
        let panelNumber = 1;

        // Определяем максимальные размеры для сканирования
        const maxX = Math.max(this.room.mainLength, this.room.legLength);
        const maxY = this.room.mainWidth + this.room.legWidth;

        // Сканируем всё пространство по столбцам (по X)
        let x = 0;
        while (x < maxX) {
            let y = 0;
            while (y < maxY) {
                const panel = new Panel(
                    x, y,
                    this.panelWidth, this.panelLength,
                    Orientation.VERTICAL,
                    panelNumber
                );
                
                // Проверяем, что панель полностью внутри комнаты и не пересекается с другими
                if (this.isPanelInsideRoom(x, y, this.panelWidth, this.panelLength) &&
                    !this.checkPanelCollision(panel, panels)) {
                    panels.push(panel);
                    panelNumber++;
                }
                
                y += this.panelLength;
            }
            x += this.panelWidth;
        }

        return panels;
    }

    // Схема 3: Комбинированная укладка
    calculateScheme3() {
        // Начинаем с горизонтальной схемы
        let panels = this.calculateScheme1();
        
        // Пытаемся добавить вертикальные панели в зазоры
        panels = this.addVerticalPanelsToGaps(panels);
        panels = this.addHorizontalPanelsToVerticalGaps(panels);

        return panels;
    }

    // Добавление вертикальных панелей в зазоры (Метод 1)
    addVerticalPanelsToGaps(panels) {
        const optimizedPanels = [...panels];
        
        // Определяем максимальные размеры
        const maxY = this.room.mainWidth + this.room.legWidth;
        
        // Находим горизонтальные панели
        const horizontalPanels = optimizedPanels.filter(p => 
            p.orientation === Orientation.HORIZONTAL
        );
        
        if (horizontalPanels.length === 0) return optimizedPanels;
        
        // Пытаемся добавить вертикальные панели по всей высоте комнаты
        let y = 0;
        while (y < maxY) {
            // Находим максимальную X координату горизонтальных панелей на этой высоте
            const panelsAtY = horizontalPanels.filter(p => 
                p.y <= y && p.y + p.height > y
            );
            
            if (panelsAtY.length > 0) {
                const maxX = Math.max(...panelsAtY.map(p => p.x + p.width));
                
                // Пробуем добавить вертикальную панель
                if (y + this.panelLength <= maxY) {
                    const panelNumber = this.findAvailablePanelNumber(optimizedPanels);
                    
                    const newPanel = new Panel(
                        maxX, y,
                        this.panelWidth, this.panelLength,
                        Orientation.VERTICAL,
                        panelNumber
                    );
                    
                    if (this.isPanelInsideRoom(maxX, y, this.panelWidth, this.panelLength) &&
                        !this.checkPanelCollision(newPanel, optimizedPanels)) {
                        optimizedPanels.push(newPanel);
                    }
                }
            }
            
            y += this.panelLength;
        }

        return optimizedPanels;
    }

    // Добавление горизонтальных панелей в вертикальные зазоры
    addHorizontalPanelsToVerticalGaps(panels) {
        const optimizedPanels = [...panels];
        
        // Определяем максимальные размеры
        const maxX = Math.max(this.room.mainLength, this.room.legLength);
        
        // Находим вертикальные панели
        const verticalPanels = optimizedPanels.filter(p => 
            p.orientation === Orientation.VERTICAL
        );
        
        if (verticalPanels.length === 0) return optimizedPanels;
        
        // Пытаемся добавить горизонтальные панели по всей ширине комнаты
        let x = 0;
        while (x < maxX) {
            // Находим максимальную Y координату вертикальных панелей на этой ширине
            const panelsAtX = verticalPanels.filter(p => 
                p.x <= x && p.x + p.width > x
            );
            
            if (panelsAtX.length > 0) {
                const maxY = Math.max(...panelsAtX.map(p => p.y + p.height));
                
                // Пробуем добавить горизонтальную панель
                if (x + this.panelLength <= maxX) {
                    const panelNumber = this.findAvailablePanelNumber(optimizedPanels);
                    
                    const newPanel = new Panel(
                        x, maxY,
                        this.panelLength, this.panelWidth,
                        Orientation.HORIZONTAL,
                        panelNumber
                    );
                    
                    if (this.isPanelInsideRoom(x, maxY, this.panelLength, this.panelWidth) &&
                        !this.checkPanelCollision(newPanel, optimizedPanels)) {
                        optimizedPanels.push(newPanel);
                    }
                }
            }
            
            x += this.panelLength;
        }

        return optimizedPanels;
    }

    // Получение расширенной статистики
    getStatistics(panels, pricePerM2 = 0) {
        const horizontal = panels.filter(p => p.orientation === Orientation.HORIZONTAL).length;
        const vertical = panels.filter(p => p.orientation === Orientation.VERTICAL).length;
        const totalPanels = panels.length;

        // Площадь покрытия по ЭФФЕКТИВНОМУ размеру панели
        const effectivePanelArea = EFFECTIVE_PANEL_LENGTH * EFFECTIVE_PANEL_WIDTH;
        const coverageAreaEff = totalPanels * effectivePanelArea; // м²

        const totalCost = coverageAreaEff * pricePerM2;

        // Первичные зазоры по основной части (для активной схемы раскладки)
        const mainRemainderLen = this.room.mainLength % this.panelLength;
        const mainRemainderWid = this.room.mainWidth % this.panelWidth;

        // Округление до миллиметров
        const gapLenMm = Math.round(mainRemainderLen * 1000);
        const gapWidMm = Math.round(mainRemainderWid * 1000);

        // 5% запас
        const reserve5 = Math.ceil(totalPanels * 1.05);

        return {
            total: totalPanels,
            horizontal,
            vertical,
            coverageArea: coverageAreaEff.toFixed(2),
            totalCost: Math.round(totalCost),
            gaps: {
                lengthMm: gapLenMm,
                widthMm: gapWidMm
            },
            withReserve: reserve5
        };
    }
}
