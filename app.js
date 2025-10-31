// Константы валидации
const VALIDATION = {
    MIN_ROOM_SIZE: 0.1,
    MAX_ROOM_SIZE: 100,
    MIN_PRICE: 0,
    MAX_PRICE: 1000000,
    MIN_TOTAL_AREA: 0.1,
    MAX_TOTAL_AREA: 5000 // м²
};

// Утилита: корректный парсинг чисел с запятой или точкой
function parseLocaleNumber(value) {
    if (typeof value === 'number') return value;
    if (value === null || value === undefined) return NaN;
    const s = String(value).trim().replace(',', '.');
    return Number(s);
}

// Функция валидации числа
function validateNumber(value, min, max, fieldName) {
    if (value === '' || value === null || value === undefined) {
        return { valid: false, message: `Поле "${fieldName}" обязательно для заполнения` };
    }
    
    const num = parseLocaleNumber(value);
    
    if (isNaN(num)) {
        return { valid: false, message: `Поле "${fieldName}" должно содержать число` };
    }
    
    if (num < min) {
        return { valid: false, message: `Минимальное значение: ${min}` };
    }
    
    if (num > max) {
        return { valid: false, message: `Максимальное значение: ${max}` };
    }
    
    return { valid: true, value: num };
}

// Показ ошибки валидации
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorEl = document.getElementById(fieldId + 'Error');
    
    if (field) {
        field.classList.add('error');
    }
    
    if (errorEl) {
        errorEl.textContent = message || '';
    }
}

// Очистка ошибки валидации
function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorEl = document.getElementById(fieldId + 'Error');
    
    if (field) {
        field.classList.remove('error');
    }
    
    if (errorEl) {
        errorEl.textContent = '';
    }
}

// Валидация всех полей формы
function validateForm() {
    let isValid = true;
    
    // Основные размеры
    const mainLengthVal = validateNumber(
        document.getElementById('mainLength').value,
        VALIDATION.MIN_ROOM_SIZE,
        VALIDATION.MAX_ROOM_SIZE,
        'Длина помещения'
    );
    if (!mainLengthVal.valid) {
        showFieldError('mainLength', mainLengthVal.message);
        isValid = false;
    } else {
        clearFieldError('mainLength');
    }
    
    const mainWidthVal = validateNumber(
        document.getElementById('mainWidth').value,
        VALIDATION.MIN_ROOM_SIZE,
        VALIDATION.MAX_ROOM_SIZE,
        'Ширина помещения'
    );
    if (!mainWidthVal.valid) {
        showFieldError('mainWidth', mainWidthVal.message);
        isValid = false;
    } else {
        clearFieldError('mainWidth');
    }
    
    // Размеры выступа (если выбран)
    const hasLeg = document.getElementById('hasLeg').checked;
    // Объявляем заранее, чтобы использовать ниже без ReferenceError
    let legLengthVal = { valid: true, value: 0 };
    let legWidthVal = { valid: true, value: 0 };
    if (hasLeg) {
        legLengthVal = validateNumber(
            document.getElementById('legLength').value,
            VALIDATION.MIN_ROOM_SIZE,
            VALIDATION.MAX_ROOM_SIZE,
            'Длина выступа'
        );
        if (!legLengthVal.valid) {
            showFieldError('legLength', legLengthVal.message);
            isValid = false;
        } else {
            clearFieldError('legLength');
        }
        
        legWidthVal = validateNumber(
            document.getElementById('legWidth').value,
            VALIDATION.MIN_ROOM_SIZE,
            VALIDATION.MAX_ROOM_SIZE,
            'Ширина выступа'
        );
        if (!legWidthVal.valid) {
            showFieldError('legWidth', legWidthVal.message);
            isValid = false;
        } else {
            clearFieldError('legWidth');
        }
        
        // Проверка логики: выступ не должен быть больше основной части
        if (mainLengthVal.valid && legLengthVal.valid && legLengthVal.value > mainLengthVal.value) {
            showFieldError('legLength', 'Длина выступа не может быть больше длины помещения');
            isValid = false;
        }
    }
    
    // Стоимость
    const priceVal = validateNumber(
        document.getElementById('pricePerM2').value || '0',
        VALIDATION.MIN_PRICE,
        VALIDATION.MAX_PRICE,
        'Стоимость за м²'
    );
    if (!priceVal.valid) {
        showFieldError('pricePerM2', priceVal.message);
        isValid = false;
    } else {
        clearFieldError('pricePerM2');
    }
    
    // Проверка общей площади
    if (mainLengthVal.valid && mainWidthVal.valid) {
        let totalArea = mainLengthVal.value * mainWidthVal.value;
        if (hasLeg && legLengthVal.valid && legWidthVal.valid) {
            totalArea += legLengthVal.value * legWidthVal.value;
        }
        
        if (totalArea < VALIDATION.MIN_TOTAL_AREA) {
            showFieldError('mainLength', `Общая площадь слишком мала (минимум ${VALIDATION.MIN_TOTAL_AREA} м²)`);
            isValid = false;
        }
        
        if (totalArea > VALIDATION.MAX_TOTAL_AREA) {
            showFieldError('mainLength', `Общая площадь слишком большая (максимум ${VALIDATION.MAX_TOTAL_AREA} м²)`);
            isValid = false;
        }
    }
    
    return isValid;
}

// Инициализация приложения
let calculator = null;
let currentRoom = null;

// Инициализация визуализаторов
function initializeVisualizers() {
    const scale = calculateAdaptiveScale();
    visualizers.bestScheme = new SchemeVisualizer('canvas1', scale);
}

// Расчет адаптивного масштаба
function calculateAdaptiveScale() {
    const canvasContainer = document.querySelector('.canvas-container');
    if (!canvasContainer) return 50;

    const containerWidth = canvasContainer.clientWidth - 24; // Учитываем padding

    // Оцениваем максимальный размер комнаты, если доступен currentRoom
    let maxRoomDimension = 10;
    if (window.currentParams && window.currentParams.room) {
        const r = window.currentParams.room;
        maxRoomDimension = Math.max(r.mainLength, r.legLength, r.mainWidth + r.legWidth);
        maxRoomDimension = Math.max(3, Math.min(maxRoomDimension, 20));
    }

    // Базовый масштаб в зависимости от ширины контейнера
    let scale = Math.floor(containerWidth / maxRoomDimension);

    // Ограничения с учётом мобильных
    const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    const minScale = isMobile ? 36 : 30;
    const maxScale = isMobile ? 110 : 100;
    scale = Math.max(minScale, Math.min(scale, maxScale));

    return scale;
}

// Получение параметров из формы с валидацией
function getInputParameters() {
    const mainLength = parseLocaleNumber(document.getElementById('mainLength').value);
    const mainWidth = parseLocaleNumber(document.getElementById('mainWidth').value);
    const hasLeg = document.getElementById('hasLeg').checked;
    const legLength = hasLeg ? parseLocaleNumber(document.getElementById('legLength').value) : 0;
    const legWidth = hasLeg ? parseLocaleNumber(document.getElementById('legWidth').value) : 0;
    const pricePerM2 = parseLocaleNumber(document.getElementById('pricePerM2').value || '0');
    
    // Проверка на валидность значений
    if (isNaN(mainLength) || isNaN(mainWidth) || 
        (hasLeg && (isNaN(legLength) || isNaN(legWidth))) || 
        isNaN(pricePerM2)) {
        throw new Error('Некорректные значения в форме. Проверьте все поля.');
    }
    
    return {
        room: new LShapedRoom(mainLength, mainWidth, legLength, legWidth),
        pricePerM2,
        hasLeg
    };
}

// Расчет всех схем и выбор лучшей
function calculateAllSchemes() {
    // Очистка предыдущих ошибок
    ['mainLength', 'mainWidth', 'legLength', 'legWidth', 'pricePerM2'].forEach(id => {
        clearFieldError(id);
    });
    
    // Валидация формы
    if (!validateForm()) {
        showUserMessage('Пожалуйста, исправьте ошибки в форме перед расчётом.', 'error');
        return;
    }
    
    try {
        const params = getInputParameters();
        
        if (!params || !params.room) {
            throw new Error('Не удалось получить параметры помещения');
        }
        
        // Проверка на экстремальные значения
        const totalArea = params.room.getTotalArea();
        if (totalArea > VALIDATION.MAX_TOTAL_AREA) {
            throw new Error(`Площадь помещения слишком большая (${totalArea.toFixed(2)} м²). Максимальное значение: ${VALIDATION.MAX_TOTAL_AREA} м²`);
        }
        
        if (totalArea < VALIDATION.MIN_TOTAL_AREA) {
            throw new Error(`Площадь помещения слишком мала (${totalArea.toFixed(2)} м²). Минимальное значение: ${VALIDATION.MIN_TOTAL_AREA} м²`);
        }
        
        currentRoom = params.room;
        
        // Создаем калькулятор
        calculator = new PanelCalculator(params.room);
        
        // Рассчитываем все схемы
        const scheme1Panels = calculator.calculateScheme1();
        const scheme2Panels = calculator.calculateScheme2();
        const scheme3Panels = calculator.calculateScheme3();
        
        // Выбираем лучшую схему по площади покрытия (эффективной)
        const stats1 = calculator.getStatistics(scheme1Panels, params.pricePerM2);
        const stats2 = calculator.getStatistics(scheme2Panels, params.pricePerM2);
        const stats3 = calculator.getStatistics(scheme3Panels, params.pricePerM2);
        
        const schemes = [
            { name: 'Горизонтальная', panels: scheme1Panels, stats: stats1, coverage: parseFloat(stats1.coverageArea) },
            { name: 'Вертикальная', panels: scheme2Panels, stats: stats2, coverage: parseFloat(stats2.coverageArea) },
            { name: 'Комбинированная', panels: scheme3Panels, stats: stats3, coverage: parseFloat(stats3.coverageArea) }
        ];
        
        // Сортируем по площади покрытия (убывание)
        schemes.sort((a, b) => b.coverage - a.coverage);
        const bestScheme = schemes[0];
        
        // Обновляем заголовок
        document.getElementById('selectedSchemeTitle').textContent = 'Схема монтажа';
        
        // Обновляем визуализатор
        if (!visualizers.bestScheme) {
            const scale = calculateAdaptiveScale();
            visualizers.bestScheme = new SchemeVisualizer('canvas1', scale);
        }
        
        const adaptiveScale = calculateAdaptiveScale();
        visualizers.bestScheme.setScale(adaptiveScale);
        visualizers.bestScheme.setRoom(params.room);
        visualizers.bestScheme.setPanels(bestScheme.panels);
        
        // Сохраняем текущую лучшую схему для PDF
        window.currentBestScheme = bestScheme;
        window.currentParams = params;
        
        // Отрисовываем лучшую схему
        renderScheme('bestScheme');
        
        // Обновляем статистику
        updateStatistics(bestScheme.panels, params.pricePerM2);
        updateResultsText(params, bestScheme.panels, bestScheme.name);
        
    } catch (error) {
        console.error('Ошибка при расчете:', error);
        showUserMessage(error.message || 'Произошла ошибка при расчете. Проверьте введённые данные.', 'error');
    }
}

// Показ сообщения пользователю
function showUserMessage(message, type = 'info') {
    // Удаляем предыдущее сообщение, если есть
    const existingMsg = document.querySelector('.user-message');
    if (existingMsg) {
        existingMsg.remove();
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = `user-message user-message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 20px;
        background: ${type === 'error' ? '#e53e3e' : '#01644f'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(messageEl);
    
    // Автоматическое удаление через 5 секунд
    setTimeout(() => {
        messageEl.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => messageEl.remove(), 300);
    }, 5000);
}

// Отрисовка схемы
function renderAllSchemes() {
    renderScheme('bestScheme');
}

// Обновление статистики
function updateStatistics(panels, pricePerM2 = 0) {
    if (!calculator) return;
    
    const stats = calculator.getStatistics(panels, pricePerM2);
    
    // Площадь помещения
    const roomArea = currentRoom.getTotalArea();
    const coveragePercent = ((parseFloat(stats.coverageArea) / roomArea) * 100).toFixed(1);
    
    document.getElementById('totalPanels').textContent = `${stats.withReserve} шт.`;
    document.getElementById('coverageArea').textContent = `${stats.coverageArea} м² (${coveragePercent}%)`;
    document.getElementById('totalCost').textContent = `${stats.totalCost.toLocaleString('ru-RU')} ₽`;
}

function updateResultsText(params, panels, schemeName) {
    if (!calculator || !params || !panels) return;
    
    const stats = calculator.getStatistics(panels, params.pricePerM2);
    const resultsEl = document.getElementById('resultsText');
    if (!resultsEl) return;

    // Площадь помещения
    const roomArea = params.room.getTotalArea();
    const coveragePercent = ((parseFloat(stats.coverageArea) / roomArea) * 100).toFixed(1);

    const lines = [];
    lines.push(`Размер панели: 0,75×0,55 м`);
    if (params.hasLeg) {
        lines.push(`Размер помещения: ${params.room.mainLength.toFixed(2)}×${params.room.mainWidth.toFixed(2)} м (осн.) + ${params.room.legLength.toFixed(2)}×${params.room.legWidth.toFixed(2)} м (выступ)`);
    } else {
        lines.push(`Размер помещения: ${params.room.mainLength.toFixed(2)}×${params.room.mainWidth.toFixed(2)} м`);
    }
    lines.push(`Площадь помещения: ${roomArea.toFixed(2)} м²`);
    lines.push('');
    lines.push(`Всего панелей: ${stats.total}  | с 5% запасом: ${stats.withReserve}`);
    lines.push(`Площадь покрытия: ${stats.coverageArea} м² (${coveragePercent}%)`);
    lines.push(`Общая стоимость материалов: ${stats.totalCost.toLocaleString('ru-RU')} ₽`);

    // Используем innerHTML для форматирования жирным текстом "Общая стоимость материалов:"
    const text = lines.join('\n');
    resultsEl.innerHTML = text.replace(/Общая стоимость материалов:/g, '<strong>Общая стоимость материалов:</strong>');
}

// Управление чекбоксом выступа
function setupLegToggle() {
    const hasLegCheckbox = document.getElementById('hasLeg');
    const legFields = document.getElementById('legFields');
    const legLengthInput = document.getElementById('legLength');
    const legWidthInput = document.getElementById('legWidth');

    const ensureLegDefaults = () => {
        // Если значения пустые или нечисловые — подставляем минимум
        if (!legLengthInput.value || isNaN(parseLocaleNumber(legLengthInput.value))) {
            legLengthInput.value = VALIDATION.MIN_ROOM_SIZE.toFixed(2);
        }
        if (!legWidthInput.value || isNaN(parseLocaleNumber(legWidthInput.value))) {
            legWidthInput.value = VALIDATION.MIN_ROOM_SIZE.toFixed(2);
        }
        // Снимаем ошибки, если были
        clearFieldError('legLength');
        clearFieldError('legWidth');
    };
    
    hasLegCheckbox.addEventListener('change', () => {
        if (hasLegCheckbox.checked) {
            legFields.style.display = 'block';
            ensureLegDefaults();
        } else {
            legFields.style.display = 'none';
        }
        // Всегда выполняем пересчёт при переключении типа помещения
        calculateAllSchemes();
    });

    // Пересчёт при изменении полей выступа, когда включён чекбокс (даже если авторасчёт выключен)
    const recalcIfLegEnabled = () => {
        if (hasLegCheckbox.checked) {
            // Поддержим валидность на лету
            ensureLegDefaults();
            calculateAllSchemes();
        }
    };
    if (legLengthInput) {
        legLengthInput.addEventListener('blur', recalcIfLegEnabled);
        legLengthInput.addEventListener('change', recalcIfLegEnabled);
    }
    if (legWidthInput) {
        legWidthInput.addEventListener('blur', recalcIfLegEnabled);
        legWidthInput.addEventListener('change', recalcIfLegEnabled);
    }
}

// Обработчики событий
function setupEventListeners() {
    // Кнопка расчета
    const calculateBtn = document.getElementById('calculateBtn');
    calculateBtn.addEventListener('click', calculateAllSchemes);
    
    // Клавиатурные сокращения: Enter для расчёта
    document.addEventListener('keydown', (e) => {
        // Enter запускает расчёт, если фокус не на текстовом поле (textarea)
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            const activeElement = document.activeElement;
            // Если фокус на поле ввода или кнопке, выполняем расчёт
            if (activeElement.tagName === 'INPUT' || activeElement === calculateBtn) {
                e.preventDefault();
                calculateAllSchemes();
            }
        }
    });
    
    // Чекбокс автоматического расчета
    document.getElementById('autoCalc').addEventListener('change', () => {
        // При включении/выключении — сразу пересчитать
        calculateAllSchemes();
    });
    
    // Изменение параметров автоматически перерисовывает (если включен автоматический расчёт)
    const inputs = ['mainLength', 'mainWidth', 'legLength', 'legWidth', 'pricePerM2'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            // Форматирование чисел с двумя знаками после запятой для размерных полей (кроме цены)
            const isSizeField = (id === 'mainLength' || id === 'mainWidth' || id === 'legLength' || id === 'legWidth');
            
            // Форматирование значения при изменении через стрелки или потере фокуса
            const formatValue = () => {
                if (isSizeField && element.value !== '') {
                    const numValue = parseLocaleNumber(element.value);
                    if (!isNaN(numValue)) {
                        element.value = numValue.toFixed(2);
                    }
                }
            };
            
            // Валидация при вводе
            element.addEventListener('input', () => {
                // Очищаем ошибку при начале ввода
                clearFieldError(id);
                
                // Если включен автоматический расчёт, запускаем после валидации
                if (document.getElementById('autoCalc').checked) {
                    // Небольшая задержка для завершения ввода
                    clearTimeout(window.inputTimeout);
                    window.inputTimeout = setTimeout(() => {
                        if (validateForm()) {
                            calculateAllSchemes();
                        }
                    }, 500);
                }
            });
            
            // Валидация при потере фокуса
            element.addEventListener('blur', () => {
                const value = element.value;
                let isValid = true;
                
                if (value !== '') {
                    if (id === 'mainLength' || id === 'mainWidth' || id === 'legLength' || id === 'legWidth') {
                        const val = validateNumber(value, VALIDATION.MIN_ROOM_SIZE, VALIDATION.MAX_ROOM_SIZE, '');
                        if (!val.valid) {
                            showFieldError(id, val.message);
                            isValid = false;
                        } else {
                            // Форматируем значение с двумя знаками после запятой
                            formatValue();
                        }
                    } else if (id === 'pricePerM2') {
                        const val = validateNumber(value, VALIDATION.MIN_PRICE, VALIDATION.MAX_PRICE, '');
                        if (!val.valid) {
                            showFieldError(id, val.message);
                            isValid = false;
                        }
                    }
                }
                
                if (isValid) {
                    clearFieldError(id);
                }
            });
            
            // Форматирование при изменении через стрелки (событие change)
            element.addEventListener('change', () => {
                // Форматируем значение для размерных полей
                if (isSizeField) {
                    formatValue();
                }
                
                // При изменении значений — пересчитать, если включён авторасчёт
                if (document.getElementById('autoCalc').checked) {
                    calculateAllSchemes();
                }
            });
        }
    });
    
    // Переключение сетки и номеров
    document.getElementById('showGrid').addEventListener('change', renderAllSchemes);
    document.getElementById('showNumbers').addEventListener('change', renderAllSchemes);
}

// Экспорт в PDF
async function saveToPDF() {
    if (!window.currentBestScheme || !window.currentParams) {
        alert('Сначала выполните расчет');
        return;
    }
    
    try {
        // Создаем временный контейнер для PDF
        const pdfContainer = document.createElement('div');
        pdfContainer.style.cssText = `
            position: fixed;
            left: -10000px;
            top: 0;
            width: 210mm;
            background: white;
            padding: 0;
            font-family: 'Arial', sans-serif;
            color: #333;
            box-sizing: border-box;
        `;
        
        const brandColor = '#01644f';
        const roomArea = window.currentParams.room.getTotalArea();
        const stats = window.currentBestScheme.stats;
        const coveragePercent = ((parseFloat(stats.coverageArea) / roomArea) * 100).toFixed(1);
        
        pdfContainer.innerHTML = `
            <div style="position: relative; height: 297mm; display: flex; flex-direction: column; padding-bottom: 20px;">
                <div>
                    <div style="background: ${brandColor}; color: white; padding: 18px; text-align: left; position: relative;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                            <div style="font-size: 30px; font-weight: bold;">StP MultiFRAME</div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; border-top: 1px solid rgba(255,255,255,0.5); padding-top: 8px;">
                            <div>Звукоизоляционная система для потолка</div>
                            <div style="font-size: 14px; color: rgba(255,255,255,0.7); font-weight: normal;">
                                Prod. by STANDARTPLAST
                            </div>
                        </div>
                    </div>
                    
                    <div style="padding: 22px; display: flex; flex-direction: column;">
                        <h1 style="text-align: center; font-size: 22px; font-weight: bold; margin: 0 0 22px 0; color: #333;">
                            РАСЧЁТ СХЕМЫ МОНТАЖА
                        </h1>
                        
                        <div style="margin-bottom: 18px;">
                            <h2 style="color: ${brandColor}; font-size: 16px; font-weight: bold; margin: 0 0 10px 0;">
                                Параметры помещения:
                            </h2>
                            <div style="font-size: 12px; line-height: 1.6; color: #444; padding-left: 10px;">
                                <div>Размеры: ${window.currentParams.room.mainLength.toFixed(2)} × ${window.currentParams.room.mainWidth.toFixed(2)} м${window.currentParams.hasLeg ? ' (основное)' : ''}</div>
                                ${window.currentParams.hasLeg ? '<div>+ ' + window.currentParams.room.legLength.toFixed(2) + ' × ' + window.currentParams.room.legWidth.toFixed(2) + ' м (выступ)</div>' : ''}
                                <div>Площадь помещения: ${roomArea.toFixed(2)} м²</div>
                                <div>Размер панели: 0,75×0,55 м</div>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 18px;">
                            <h2 style="color: ${brandColor}; font-size: 16px; font-weight: bold; margin: 0 0 10px 0;">
                                Результаты расчёта:
                            </h2>
                            <div style="font-size: 12px; line-height: 1.6; color: #444; padding-left: 10px;">
                                <div>Всего панелей: ${stats.total} шт. (с запасом 5%: ${stats.withReserve} шт.)</div>
                                <div>Площадь покрытия: ${stats.coverageArea} м² (${coveragePercent}%)</div>
                                <div style="font-weight: bold; color: ${brandColor}; font-size: 14px; margin-top: 6px;">
                                    Общая стоимость материалов: ${stats.totalCost.toLocaleString('ru-RU')} ₽
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 14px;">
                            <h2 style="color: ${brandColor}; font-size: 16px; font-weight: bold; margin: 0 0 10px 0;">
                                Схема монтажа:
                            </h2>
                            <div id="pdfCanvasWrapper" style="text-align: center; display: flex; justify-content: center; max-height: 500px;">
                                <!-- Canvas будет скопирован сюда -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(pdfContainer);
        
        // Копируем canvas в PDF с повышенной плотностью пикселей (для резкости)
        const canvasWrapper = pdfContainer.querySelector('#pdfCanvasWrapper');
        const originalCanvas = document.getElementById('canvas1');
        if (originalCanvas && canvasWrapper) {
            // Поднимаем реальное разрешение в 2 раза, визуальный размер оставляем прежним
            const pixelScale = 2; // коэффициент повышения DPI
            const newCanvas = document.createElement('canvas');
            newCanvas.width = originalCanvas.width * pixelScale;
            newCanvas.height = originalCanvas.height * pixelScale;
            // Визуальный размер ограничиваем, чтобы не менять макет (высота ~500px)
            newCanvas.style.maxHeight = '500px';
            newCanvas.style.width = 'auto';

            const ctx = newCanvas.getContext('2d');
            ctx.scale(pixelScale, pixelScale);
            ctx.drawImage(originalCanvas, 0, 0);

            canvasWrapper.appendChild(newCanvas);
        }
        
        // Ждем загрузки изображений
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Конвертируем в canvas через html2canvas с высоким качеством
        const canvasImg = await html2canvas(pdfContainer, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            foreignObjectRendering: false,
            logging: false,
            backgroundColor: '#ffffff',
            width: pdfContainer.offsetWidth,
            height: pdfContainer.offsetHeight,
            windowHeight: pdfContainer.scrollHeight
        });
        
        // Создаем PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Вычисляем размеры изображения для PDF
        const imgData = canvasImg.toDataURL('image/jpeg', 0.85);
        const imgWidth = pageWidth;
        const imgHeight = (canvasImg.height * pageWidth) / canvasImg.width;
        
        // Вписываем в одну страницу без добавления дополнительных страниц
        const yPos = 0;
        const fittedHeight = Math.min(imgHeight, pageHeight);
        doc.addImage(imgData, 'JPEG', 0, yPos, imgWidth, fittedHeight, undefined, 'FAST');
        
        // Удаляем временный контейнер
        document.body.removeChild(pdfContainer);
        
        // Сохраняем файл
        const fileName = 'MultiFrame_Расчет.pdf';
        doc.save(fileName);
        
    } catch (error) {
        console.error('Ошибка при сохранении PDF:', error);
        alert('Ошибка при сохранении PDF: ' + error.message);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initializeVisualizers();
    setupLegToggle();
    setupEventListeners();
    
    // Форматирование начальных значений полей с размерностями (с двумя знаками после запятой)
    const sizeFields = ['mainLength', 'mainWidth', 'legLength', 'legWidth'];
    sizeFields.forEach(id => {
        const element = document.getElementById(id);
        if (element && element.value !== '') {
            const numValue = parseLocaleNumber(element.value);
            if (!isNaN(numValue)) {
                element.value = numValue.toFixed(2);
            }
        }
    });
    // Тема: загрузка и обработчик для переключателя checkbox
    try {
        const savedTheme = localStorage.getItem('mf_theme');
        const isDark = savedTheme === 'dark';
        if (isDark) document.body.classList.add('theme-dark');

        const switchEl = document.getElementById('themeSwitch');
        if (switchEl) {
            switchEl.checked = isDark;
            switchEl.addEventListener('change', () => {
                const dark = switchEl.checked;
                document.body.classList.toggle('theme-dark', dark);
                localStorage.setItem('mf_theme', dark ? 'dark' : 'light');
            });
        }
    } catch (e) {
        // localStorage может быть недоступен в приватных режимах — безопасно игнорируем
    }
    
    // Автоматический расчет при загрузке с параметрами по умолчанию
    calculateAllSchemes();
});

// Глобальная функция для PDF
window.saveToPDF = saveToPDF;

// Глобальная функция renderScheme для visualizer.js
window.renderScheme = renderScheme;

