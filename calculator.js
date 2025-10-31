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
const DISPLAY_PANEL_LENGTH = 0.75;   // м - полный размер панели (для отображения)
const DISPLAY_PANEL_WIDTH  = 0.55;   // м - полный размер панели (для отображения)
const EFFECTIVE_PANEL_LENGTH = 0.735; // м - эффективный размер с учётом шип-паз (для укладки и расчёта)
const EFFECTIVE_PANEL_WIDTH  = 0.535; // м - эффективный размер с учётом шип-паз (для укладки и расчёта)

// Основной класс калькулятора
class PanelCalculator {
    constructor(room) {
        this.room = room;
        // Для укладки используем ЭФФЕКТИВНЫЕ размеры (с учётом шип-паз)
        this.panelLength = EFFECTIVE_PANEL_LENGTH;
        this.panelWidth = EFFECTIVE_PANEL_WIDTH;
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

    // Проверка, находится ли панель полностью внутри комнаты
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

    // Проверка коллизий панелей (пересечение)
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

    // Размещение панелей в прямоугольной области (основная часть или выступ)
    placePanelsInRectangularArea(startX, startY, length, width, startPanelNumber, existingPanels) {
        const panels = [];
        let panelNumber = startPanelNumber;
        
        // Пробуем разные стратегии размещения для максимального покрытия
        
        // Стратегия 1: Горизонтальные панели
        let horizontalPanels = [];
        let y = startY;
        while (y + this.panelWidth <= startY + width + 1e-6) {
            let x = startX;
            while (x + this.panelLength <= startX + length + 1e-6) {
                const panel = new Panel(
                    x, y,
                    this.panelLength, this.panelWidth,
                    Orientation.HORIZONTAL,
                    panelNumber++
                );
                
                if (this.isPanelInsideRoom(panel.x, panel.y, panel.width, panel.height) &&
                    !this.checkPanelCollision(panel, existingPanels)) {
                    horizontalPanels.push(panel);
                }
                x += this.panelLength;
            }
            y += this.panelWidth;
        }
        
        // Стратегия 2: Вертикальные панели
        let verticalPanels = [];
        panelNumber = startPanelNumber;
        let x = startX;
        while (x + this.panelWidth <= startX + length + 1e-6) {
            let y = startY;
            while (y + this.panelLength <= startY + width + 1e-6) {
                const panel = new Panel(
                    x, y,
                    this.panelWidth, this.panelLength,
                    Orientation.VERTICAL,
                    panelNumber++
                );
                
                if (this.isPanelInsideRoom(panel.x, panel.y, panel.width, panel.height) &&
                    !this.checkPanelCollision(panel, existingPanels)) {
                    verticalPanels.push(panel);
                }
                y += this.panelLength;
            }
            x += this.panelWidth;
        }
        
        // Выбираем стратегию с большим количеством панелей
        return horizontalPanels.length >= verticalPanels.length ? horizontalPanels : verticalPanels;
    }

    // Оптимизация: заполнение всех свободных областей для максимального покрытия
    maximizeCoverage(panels) {
        let optimizedPanels = [...panels];
        const maxX = Math.max(this.room.mainLength, this.room.legLength);
        const maxY = this.room.mainWidth + this.room.legWidth;
        
        // Пробуем заполнить все свободные области различными способами
        
        // Стратегия 1: Добавляем вертикальные панели в правых областях
        // Находим самую правую координату существующих панелей
        let maxPanelX = 0;
        optimizedPanels.forEach(p => {
            const rightX = p.x + p.width;
            if (rightX > maxPanelX) {
                maxPanelX = rightX;
            }
        });
        
        // Пробуем добавить вертикальные панели справа
        let xStart = maxPanelX;
        let changed = true;
        let iterations = 0;
        const maxIterations = 50; // Защита от бесконечного цикла
        
        while (changed && iterations < maxIterations) {
            iterations++;
            changed = false;
            
            // Пробуем добавить вертикальные панели в этой колонке
            let y = 0;
            while (y + this.panelLength <= maxY + 1e-6) {
                const panel = new Panel(
                    xStart, y,
                    this.panelWidth, this.panelLength,
                    Orientation.VERTICAL,
                    this.findAvailablePanelNumber(optimizedPanels)
                );
                
                // Проверяем пересечение с другими панелями
                if (!this.checkPanelCollision(panel, optimizedPanels)) {
                    // КРИТИЧЕСКОЕ: Панель должна полностью помещаться внутри комнаты
                    if (this.isPanelInsideRoom(panel.x, panel.y, panel.width, panel.height)) {
                        optimizedPanels.push(panel);
                        changed = true;
                    }
                }
                
                y += this.panelLength;
            }
            
            xStart += this.panelWidth;
            
            // Останавливаемся при достижении границы комнаты
            if (xStart + this.panelWidth > maxX + 1e-6) {
                break;
            }
        }
        
        // Стратегия 2: Добавляем горизонтальные панели в нижних областях
        // Находим самую нижнюю координату существующих панелей
        let maxPanelY = 0;
        optimizedPanels.forEach(p => {
            const bottomY = p.y + p.height;
            if (bottomY > maxPanelY) {
                maxPanelY = bottomY;
            }
        });
        
        // Пробуем добавить горизонтальные панели снизу
        let yStart = maxPanelY;
        changed = true;
        iterations = 0;
        
        while (changed && iterations < maxIterations) {
            iterations++;
            changed = false;
            
            // Определяем максимальную длину для этой строки
            let maxXForRow;
            if (yStart < this.room.mainWidth) {
                maxXForRow = this.room.mainLength;
            } else {
                maxXForRow = this.room.legLength;
            }
            
            // Пробуем добавить горизонтальные панели в этой строке
            let x = 0;
            while (x + this.panelLength <= maxXForRow + 1e-6) {
                const panel = new Panel(
                    x, yStart,
                    this.panelLength, this.panelWidth,
                    Orientation.HORIZONTAL,
                    this.findAvailablePanelNumber(optimizedPanels)
                );
                
                if (!this.checkPanelCollision(panel, optimizedPanels) &&
                    this.isPanelInsideRoom(panel.x, panel.y, panel.width, panel.height)) {
                    optimizedPanels.push(panel);
                    changed = true;
                }
                
                x += this.panelLength;
            }
            
            yStart += this.panelWidth;
            
            // Останавливаемся при достижении границы комнаты
            if (yStart + this.panelWidth > maxY + 1e-6) {
                break;
            }
        }
        
        return optimizedPanels;
    }

    // Схема 1: Горизонтальная укладка
    calculateScheme1() {
        const panels = [];
        let panelNumber = 1;
        
        // Для Г-образной комнаты размещаем панели единым алгоритмом, чтобы стыковались без промежутков
        const maxY = this.room.mainWidth + this.room.legWidth;
        
        // Размещаем панели построчно от начала до конца (включая выступ)
        let y = 0;
        while (y < maxY) {
            let x = 0;
            
            // Определяем максимальную длину для этой строки
            let maxXForRow;
            if (y < this.room.mainWidth) {
                // Это строка основной части
                maxXForRow = this.room.mainLength;
            } else {
                // Это строка выступа
                maxXForRow = this.room.legLength;
            }
            
            // Размещаем горизонтальные панели в этой строке
            while (x < maxXForRow) {
                const panel = new Panel(
                    x, y,
                    this.panelLength, this.panelWidth,
                    Orientation.HORIZONTAL,
                    panelNumber++
                );
                
                if (this.isPanelInsideRoom(panel.x, panel.y, panel.width, panel.height) &&
                    !this.checkPanelCollision(panel, panels)) {
                    panels.push(panel);
                }
                
                x += this.panelLength;
            }
            
            y += this.panelWidth;
        }
        
        // Оптимизация для максимального покрытия
        let optimized = this.maximizeCoverage(panels);
        return optimized;
    }

    // Схема 2: Вертикальная укладка
    calculateScheme2() {
        const panels = [];
        let panelNumber = 1;
        
        // Для Г-образной комнаты размещаем панели единым алгоритмом по столбцам
        const maxX = Math.max(this.room.mainLength, this.room.legLength);
        const maxY = this.room.mainWidth + this.room.legWidth;
        
        // Размещаем вертикальные панели по столбцам от начала до конца
        let x = 0;
        while (x < maxX) {
            // Определяем максимальную высоту для этого столбца и начальную координату Y
            let maxYForColumn;
            let startY = 0;
            
            if (x < this.room.legLength && x < this.room.mainLength) {
                // Столбец проходит через обе части (основную и выступ)
                maxYForColumn = maxY;
                startY = 0;
            } else if (x < this.room.mainLength) {
                // Столбец только в основной части
                maxYForColumn = this.room.mainWidth;
                startY = 0;
            } else if (x < this.room.legLength) {
                // Столбец только в выступе
                maxYForColumn = maxY;
                startY = this.room.mainWidth;
            } else {
                // Столбец вне обеих частей
                maxYForColumn = 0;
                startY = 0;
            }
            
            // Размещаем вертикальные панели в этом столбце
            let y = startY;
            while (y < maxYForColumn) {
                const panel = new Panel(
                    x, y,
                    this.panelWidth, this.panelLength,
                    Orientation.VERTICAL,
                    panelNumber++
                );
                
                if (this.isPanelInsideRoom(panel.x, panel.y, panel.width, panel.height) &&
                    !this.checkPanelCollision(panel, panels)) {
                    panels.push(panel);
                }
                
                y += this.panelLength;
            }
            
            x += this.panelWidth;
        }
        
        // Оптимизация для максимального покрытия
        let optimized = this.maximizeCoverage(panels);
        return optimized;
    }

    // Схема 3: Комбинированная (вертикальная полоса сверху + горизонтальные ниже)
    calculateScheme3() {
        const panels = [];
        let panelNumber = 1;
        
        const maxY = this.room.mainWidth + this.room.legWidth;
        
        // 1) Верхняя вертикальная полоса по всей длине (основная часть и выступ)
        let x = 0;
        const maxXForTop = Math.max(this.room.mainLength, this.room.legLength);
        while (x + this.panelWidth <= maxXForTop + 1e-6) {
            // Определяем максимальную высоту для этого столбца в верхней полосе
            let maxYForColumn;
            if (x < this.room.mainLength && x < this.room.legLength) {
                maxYForColumn = Math.min(this.panelLength, this.room.mainWidth + this.room.legWidth);
            } else if (x < this.room.mainLength) {
                maxYForColumn = Math.min(this.panelLength, this.room.mainWidth);
            } else {
                maxYForColumn = Math.min(this.panelLength, this.room.legWidth);
            }
            
            if (maxYForColumn >= this.panelLength) {
                const panel = new Panel(x, 0, this.panelWidth, this.panelLength, Orientation.VERTICAL, panelNumber++);
                if (this.isPanelInsideRoom(panel.x, panel.y, panel.width, panel.height) && 
                    !this.checkPanelCollision(panel, panels)) {
                    panels.push(panel);
                }
            }
            x += this.panelWidth;
        }
        
        // 2) Горизонтальные ряды ниже, продолжающиеся через основную часть и выступ
        let y = this.panelLength;
        while (y + this.panelWidth <= maxY + 1e-6) {
            let x = 0;
            
            // Определяем максимальную длину для этой строки
            let maxXForRow;
            if (y < this.room.mainWidth) {
                // Это строка основной части
                maxXForRow = this.room.mainLength;
            } else {
                // Это строка выступа
                maxXForRow = this.room.legLength;
            }
            
            // Размещаем горизонтальные панели в этой строке
            while (x + this.panelLength <= maxXForRow + 1e-6) {
                const panel = new Panel(x, y, this.panelLength, this.panelWidth, Orientation.HORIZONTAL, panelNumber++);
                if (this.isPanelInsideRoom(panel.x, panel.y, panel.width, panel.height) && 
                    !this.checkPanelCollision(panel, panels)) {
                    panels.push(panel);
                }
                x += this.panelLength;
            }
            y += this.panelWidth;
        }
        
        // Оптимизация для максимального покрытия
        let optimized = this.maximizeCoverage(panels);
        return optimized;
    }

    // Получение расширенной статистики
    getStatistics(panels, pricePerM2 = 0) {
        const horizontal = panels.filter(p => p.orientation === Orientation.HORIZONTAL).length;
        const vertical = panels.filter(p => p.orientation === Orientation.VERTICAL).length;
        const totalPanels = panels.length;

        // Площадь покрытия по ЭФФЕКТИВНОМУ размеру панели
        const effectivePanelArea = EFFECTIVE_PANEL_LENGTH * EFFECTIVE_PANEL_WIDTH;
        const roomArea = this.room.getTotalArea();
        let coverageAreaEff = totalPanels * effectivePanelArea; // м²
        
        // КРИТИЧЕСКОЕ: Покрытие не может превышать площадь комнаты (100%)
        coverageAreaEff = Math.min(coverageAreaEff, roomArea);

        // Стоимость считаем по ПЛОЩАДИ ПОМЕЩЕНИЯ (как в Python)
        const totalCost = roomArea * pricePerM2;

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
