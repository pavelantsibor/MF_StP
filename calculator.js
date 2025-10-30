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

        // Оптимизация правой кромки: для прямоугольной и Г‑образной комнаты
        let optimized = this.optimizeRightEdgesForLShape(panels);
        // Дополнительная оптимизация высоты выступа: замена нижнего горизонтального ряда на вертикальный пояс
        optimized = this.optimizeLegBottomWithVerticalBand(optimized);
        return optimized;
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

    // Оптимизация: заменить правый столбец горизонтальных панелей на вертикальные
    optimizeRightColumnWithVertical(initialPanels) {
        // Работает только для прямоугольной комнаты (без выступа)
        if (this.room.legLength > 0 && this.room.legWidth > 0) {
            return initialPanels;
        }

        const panels = [...initialPanels];

        // Остаток по длине и возможность поставить вертикальную колонну
        const fullColsLen = Math.floor(this.room.mainLength / this.panelLength);
        const xStrip = fullColsLen * this.panelLength;
        const remainder = this.room.mainLength - xStrip;
        if (remainder <= 1e-6 || remainder + 1e-9 < this.panelWidth) {
            return panels;
        }

        // Базовая статистика
        const baseStats = this.getStatistics(panels, 0);

        // 1) Удаляем горизонтальные панели, которые могут пересечься с вертикальной колонной (те, что начинаются правее или на границе xStrip)
        const kept = panels.filter(p => !(p.orientation === Orientation.HORIZONTAL && (p.x + 1e-9) >= xStrip));

        // 2) Добавляем вертикальные панели у правой границы
        const candidate = [...kept];
        let y = 0;
        while (y + this.panelLength <= this.room.mainWidth + 1e-9) {
            const x = xStrip; // ставим вплотную к последнему горизонтальному ряду
            const p = new Panel(x, y, this.panelWidth, this.panelLength, Orientation.VERTICAL, this.findAvailablePanelNumber(candidate));
            if (this.isPanelInsideRoom(p.x, p.y, p.width, p.height) && !this.checkPanelCollision(p, candidate)) {
                candidate.push(p);
            }
            y += this.panelLength;
        }

        // Сравниваем по покрытию — берём лучший вариант
        const newStats = this.getStatistics(candidate, 0);
        return parseFloat(newStats.coverageArea) > parseFloat(baseStats.coverageArea) ? candidate : panels;
    }

    // Оптимизация правых кромок для L‑образной комнаты (и прямоугольной): добавление вертикальной полосы
    optimizeRightEdgesForLShape(initialPanels) {
        // Если прямоугольная — используем существующую оптимизацию
        if (!(this.room.legLength > 0 && this.room.legWidth > 0)) {
            return this.optimizeRightColumnWithVertical(initialPanels);
        }

        const panels = [...initialPanels];

        // 1) Правая кромка основной части: x = xStripMain
        const fullColsLenMain = Math.floor(this.room.mainLength / this.panelLength);
        const xStripMain = fullColsLenMain * this.panelLength;
        const remainderMain = this.room.mainLength - xStripMain;
        if (remainderMain > 1e-6 && remainderMain + 1e-9 >= this.panelWidth) {
            // Удаляем горизонтали, начинающиеся в полосе x >= xStripMain и лежащие в основной части по Y
            const keptMain = panels.filter(p => !(p.orientation === Orientation.HORIZONTAL && (p.x + 1e-9) >= xStripMain && p.y + p.height <= this.room.mainWidth + 1e-9));
            panels.length = 0;
            panels.push(...keptMain);
            // Добавляем вертикали вдоль правой кромки основной части
            let y = 0;
            while (y + this.panelLength <= this.room.mainWidth + 1e-9) {
                const p = new Panel(xStripMain, y, this.panelWidth, this.panelLength, Orientation.VERTICAL, this.findAvailablePanelNumber(panels));
                if (this.isPanelInsideRoom(p.x, p.y, p.width, p.height) && !this.checkPanelCollision(p, panels)) panels.push(p);
                y += this.panelLength;
            }
        }

        // 2) Правая кромка выступа: x = xStripLeg (считая от левого края, так же как комнаты)
        if (this.room.legLength > 0 && this.room.legWidth > 0) {
            const fullColsLenLeg = Math.floor(this.room.legLength / this.panelLength);
            const xStripLeg = fullColsLenLeg * this.panelLength;
            const remainderLeg = this.room.legLength - xStripLeg;
            if (remainderLeg > 1e-6 && remainderLeg + 1e-9 >= this.panelWidth) {
                const yTop = this.room.mainWidth;
                // Удаляем горизонтали верхней части выступа, которые начинаются правее полосы
                const keptLeg = panels.filter(p => !(p.orientation === Orientation.HORIZONTAL && (p.x + 1e-9) >= xStripLeg && p.y >= yTop - 1e-9));
                panels.length = 0;
                panels.push(...keptLeg);
                let y = yTop;
                while (y + this.panelLength <= yTop + this.room.legWidth + 1e-9) {
                    const p = new Panel(xStripLeg, y, this.panelWidth, this.panelLength, Orientation.VERTICAL, this.findAvailablePanelNumber(panels));
                    if (this.isPanelInsideRoom(p.x, p.y, p.width, p.height) && !this.checkPanelCollision(p, panels)) panels.push(p);
                    y += this.panelLength;
                }
            }
        }

        return panels;
    }

    // Оптимизация выступа по высоте: убрать последний горизонтальный ряд и добавить вертикальную полосу внизу
    optimizeLegBottomWithVerticalBand(initialPanels) {
        if (!(this.room.legLength > 0 && this.room.legWidth > 0)) return initialPanels;

        const panels = [...initialPanels];
        const yTop = this.room.mainWidth;
        const legH = this.room.legWidth;
        const legL = this.room.legLength;

        // Кол-во горизонтальных рядов, которые помещаются полностью
        const fullHorizRows = Math.floor(legH / this.panelWidth);
        if (fullHorizRows < 1) return panels;

        // Координата начала нижней вертикальной полосы так, чтобы она касалась нижней границы выступа
        const verticalY = yTop + Math.max(0, legH - this.panelLength);

        // Удаляем последний горизонтальный ряд выступа, чтобы освободить место под вертикальную полосу
        const lastHorizY = yTop + (fullHorizRows - 1) * this.panelWidth;
        const kept = panels.filter(p => !(p.orientation === Orientation.HORIZONTAL && p.y + 1e-9 >= lastHorizY && p.y >= yTop - 1e-9));

        const candidate = [...kept];

        // Добавляем вертикальные панели внизу выступа по всей длине
        for (let x = 0; x + this.panelWidth <= legL + 1e-6; x += this.panelWidth) {
            const p = new Panel(x, verticalY, this.panelWidth, this.panelLength, Orientation.VERTICAL, this.findAvailablePanelNumber(candidate));
            if (this.isPanelInsideRoom(p.x, p.y, p.width, p.height) && !this.checkPanelCollision(p, candidate)) candidate.push(p);
        }

        // Выбираем вариант с лучшим покрытием
        const baseStats = this.getStatistics(panels, 0);
        const newStats = this.getStatistics(candidate, 0);
        return parseFloat(newStats.coverageArea) > parseFloat(baseStats.coverageArea) ? candidate : panels;
    }
}
