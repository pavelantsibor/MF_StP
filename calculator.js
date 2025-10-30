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

    // Схема 3: Комбинированная (верхняя вертикальная полоса + горизонтальные ниже)
    calculateScheme3() {
        const panels = [];
        let panelNumber = 1;

        // 1) Верхняя вертикальная полоса по основной части
        for (let x = 0; x + this.panelWidth <= this.room.mainLength + 1e-6; x += this.panelWidth) {
            const p = new Panel(x, 0, this.panelWidth, this.panelLength, Orientation.VERTICAL, panelNumber++);
            if (this.isPanelInsideRoom(p.x, p.y, p.width, p.height) && !this.checkPanelCollision(p, panels)) panels.push(p);
        }

        // 2) Горизонтальные ряды ниже на всей основной части, начиная с Y = panelLength
        for (let y = this.panelLength; y + this.panelWidth <= this.room.mainWidth + 1e-6; y += this.panelWidth) {
            for (let x = 0; x + this.panelLength <= this.room.mainLength + 1e-6; x += this.panelLength) {
                const p = new Panel(x, y, this.panelLength, this.panelWidth, Orientation.HORIZONTAL, panelNumber++);
                if (this.isPanelInsideRoom(p.x, p.y, p.width, p.height) && !this.checkPanelCollision(p, panels)) panels.push(p);
            }
        }

        // 3) Если есть выступ: верхняя вертикальная полоса выступа на уровне mainWidth
        if (this.room.legLength > 0 && this.room.legWidth > 0) {
            const topY = this.room.mainWidth;
            for (let x = 0; x + this.panelWidth <= this.room.legLength + 1e-6; x += this.panelWidth) {
                const p = new Panel(x, topY, this.panelWidth, this.panelLength, Orientation.VERTICAL, panelNumber++);
                if (this.isPanelInsideRoom(p.x, p.y, p.width, p.height) && !this.checkPanelCollision(p, panels)) panels.push(p);
            }

            // Горизонтальные ряды ниже на выступе, начиная с Y = mainWidth + panelLength
            for (let y = topY + this.panelLength; y + this.panelWidth <= topY + this.room.legWidth + 1e-6; y += this.panelWidth) {
                for (let x = 0; x + this.panelLength <= this.room.legLength + 1e-6; x += this.panelLength) {
                    const p = new Panel(x, y, this.panelLength, this.panelWidth, Orientation.HORIZONTAL, panelNumber++);
                    if (this.isPanelInsideRoom(p.x, p.y, p.width, p.height) && !this.checkPanelCollision(p, panels)) panels.push(p);
                }
            }
        }

        return panels;
    }

    // Замена верхнего горизонтального ряда на вертикальные панели по всей длине
    replaceTopRowWithVertical(panels) {
        let optimized = [...panels];

        // Удаляем горизонтальные панели верхнего ряда основной части (y < panelWidth)
        optimized = optimized.filter(p => !(p.orientation === Orientation.HORIZONTAL && p.y < this.panelWidth));

        // Добавляем вертикальные панели сверху по всей длине основной части
        for (let x = 0; x + this.panelWidth <= this.room.mainLength + 1e-6; x += this.panelWidth) {
            const p = new Panel(x, 0, this.panelWidth, this.panelLength, Orientation.VERTICAL, this.findAvailablePanelNumber(optimized));
            if (this.isPanelInsideRoom(p.x, p.y, p.width, p.height) && !this.checkPanelCollision(p, optimized)) optimized.push(p);
        }

        // Если есть выступ (Г‑образная комната) — делаем то же для его верхнего ряда
        if (this.room.legLength > 0 && this.room.legWidth > 0) {
            const yTop = this.room.mainWidth; // верх выступа

            // Удаляем горизонтальные панели верхнего ряда выступа
            optimized = optimized.filter(p => !(p.orientation === Orientation.HORIZONTAL && p.y >= yTop && p.y < yTop + this.panelWidth));

            // Добавляем вертикальные панели по всей длине выступа
            for (let x = 0; x + this.panelWidth <= this.room.legLength + 1e-6; x += this.panelWidth) {
                const p = new Panel(x, yTop, this.panelWidth, this.panelLength, Orientation.VERTICAL, this.findAvailablePanelNumber(optimized));
                if (this.isPanelInsideRoom(p.x, p.y, p.width, p.height) && !this.checkPanelCollision(p, optimized)) optimized.push(p);
            }
        }

        return optimized;
    }

    // Получение расширенной статистики
    getStatistics(panels, pricePerM2 = 0) {
        const horizontal = panels.filter(p => p.orientation === Orientation.HORIZONTAL).length;
        const vertical = panels.filter(p => p.orientation === Orientation.VERTICAL).length;
        const totalPanels = panels.length;

        // Площадь покрытия по ЭФФЕКТИВНОМУ размеру панели
        const effectivePanelArea = EFFECTIVE_PANEL_LENGTH * EFFECTIVE_PANEL_WIDTH;
        const coverageAreaEff = totalPanels * effectivePanelArea; // м²

        // Стоимость считаем по ПЛОЩАДИ ПОМЕЩЕНИЯ (как в Python)
        const totalCost = this.room.getTotalArea() * pricePerM2;

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
