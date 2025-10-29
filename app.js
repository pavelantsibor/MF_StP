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
    
    const containerWidth = canvasContainer.clientWidth - 40; // Учитываем padding
    const maxRoomDimension = 10; // Максимальный размер помещения для расчета
    
    // Базовый масштаб в зависимости от ширины контейнера
    let scale = Math.floor(containerWidth / maxRoomDimension);
    
    // Ограничиваем масштаб
    scale = Math.max(30, Math.min(scale, 100));
    
    return scale;
}

// Получение параметров из формы
function getInputParameters() {
    const mainLength = parseFloat(document.getElementById('mainLength').value);
    const mainWidth = parseFloat(document.getElementById('mainWidth').value);
    const hasLeg = document.getElementById('hasLeg').checked;
    const legLength = hasLeg ? parseFloat(document.getElementById('legLength').value) : 0;
    const legWidth = hasLeg ? parseFloat(document.getElementById('legWidth').value) : 0;
    const pricePerM2 = parseFloat(document.getElementById('pricePerM2').value || '0');
    
    return {
        room: new LShapedRoom(mainLength, mainWidth, legLength, legWidth),
        pricePerM2,
        hasLeg
    };
}

// Расчет всех схем и выбор лучшей
function calculateAllSchemes() {
    try {
        const params = getInputParameters();
        if (!params || !params.room) {
            console.error('Ошибка получения параметров');
            return;
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
        document.getElementById('selectedSchemeTitle').textContent = 'Схема укладки';
        
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
        alert('Произошла ошибка при расчете. Проверьте консоль браузера (F12).');
    }
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
    lines.push(`Схема укладки`);
    lines.push('====================================');
    lines.push(`Размер панели: 0,75 × 0,55 м`);
    if (params.hasLeg) {
        lines.push(`Размер помещения: ${params.room.mainLength.toFixed(2)}×${params.room.mainWidth.toFixed(2)} м (осн.) + ${params.room.legLength.toFixed(2)}×${params.room.legWidth.toFixed(2)} м (выступ)`);
    } else {
        lines.push(`Размер помещения: ${params.room.mainLength.toFixed(2)}×${params.room.mainWidth.toFixed(2)} м`);
    }
    lines.push(`Площадь помещения: ${roomArea.toFixed(2)} м²`);
    lines.push('');
    lines.push(`Всего панелей: ${stats.total}  | с 5% запасом: ${stats.withReserve}`);
    lines.push(`Горизонтальных: ${stats.horizontal}`);
    lines.push(`Вертикальных: ${stats.vertical}`);
    lines.push(`Площадь покрытия: ${stats.coverageArea} м² (${coveragePercent}%)`);
    lines.push(`Общая стоимость: ${stats.totalCost.toLocaleString('ru-RU')} ₽`);

    resultsEl.textContent = lines.join('\n');
}

// Управление чекбоксом выступа
function setupLegToggle() {
    const hasLegCheckbox = document.getElementById('hasLeg');
    const legFields = document.getElementById('legFields');
    
    hasLegCheckbox.addEventListener('change', () => {
        if (hasLegCheckbox.checked) {
            legFields.style.display = 'block';
        } else {
            legFields.style.display = 'none';
        }
        if (calculator) {
            calculateAllSchemes();
        }
    });
}

// Обработчики событий
function setupEventListeners() {
    // Кнопка расчета
    document.getElementById('calculateBtn').addEventListener('click', calculateAllSchemes);
    
    // Чекбокс автоматического расчета
    document.getElementById('autoCalc').addEventListener('change', () => {
        if (document.getElementById('autoCalc').checked && calculator) {
            calculateAllSchemes();
        }
    });
    
    // Изменение параметров автоматически перерисовывает (если включен автоматический расчёт)
    const inputs = ['mainLength', 'mainWidth', 'legLength', 'legWidth', 'pricePerM2'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                if (calculator && document.getElementById('autoCalc').checked) {
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
        const now = new Date();
        const dateStr = now.toLocaleDateString('ru-RU') + ' ' + now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        // Собираем параметры помещения
        let roomParams = 'Размеры: ' + window.currentParams.room.mainLength.toFixed(2) + ' × ' + window.currentParams.room.mainWidth.toFixed(2) + ' м';
        if (window.currentParams.hasLeg) {
            roomParams += ' (основное) + ' + window.currentParams.room.legLength.toFixed(2) + ' × ' + window.currentParams.room.legWidth.toFixed(2) + ' м (выступ)';
        }
        
        // Генерируем QR-код через API (используем img src для встраивания)
        const qrImageUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://stp-multiframe.ru/';
        
        pdfContainer.innerHTML = `
            <div style="background: ${brandColor}; color: white; padding: 15px; text-align: left;">
                <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">MultiFRAME</div>
                <div style="font-size: 12px; border-top: 1px solid rgba(255,255,255,0.5); padding-top: 8px;">
                    Звукоизоляционная система для потолка
                </div>
            </div>
            
            <div style="padding: 20px; display: flex; flex-direction: column;">
                <h1 style="text-align: center; font-size: 18px; font-weight: bold; margin: 0 0 20px 0; color: #333;">
                    РАСЧЕТ СХЕМЫ УКЛАДКИ
                </h1>
                
                <div style="margin-bottom: 15px;">
                    <h2 style="color: ${brandColor}; font-size: 13px; font-weight: bold; margin: 0 0 8px 0;">
                        Параметры помещения:
                    </h2>
                    <div style="font-size: 10px; line-height: 1.6; color: #444; padding-left: 10px;">
                        <div>Размеры: ${window.currentParams.room.mainLength.toFixed(2)} × ${window.currentParams.room.mainWidth.toFixed(2)} м${window.currentParams.hasLeg ? ' (основное)' : ''}</div>
                        ${window.currentParams.hasLeg ? '<div>+ ' + window.currentParams.room.legLength.toFixed(2) + ' × ' + window.currentParams.room.legWidth.toFixed(2) + ' м (выступ)</div>' : ''}
                        <div>Площадь помещения: ${roomArea.toFixed(2)} м²</div>
                        <div>Размер панели: 0,75 × 0,55 м</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h2 style="color: ${brandColor}; font-size: 13px; font-weight: bold; margin: 0 0 8px 0;">
                        Результаты расчета:
                    </h2>
                    <div style="font-size: 10px; line-height: 1.6; color: #444; padding-left: 10px;">
                        <div>Тип схемы: ${window.currentBestScheme.name}</div>
                        <div>Всего панелей: ${stats.total} шт. (с запасом 5%: ${stats.withReserve} шт.)</div>
                        <div>Горизонтальных панелей: ${stats.horizontal} шт.</div>
                        <div>Вертикальных панелей: ${stats.vertical} шт.</div>
                        <div>Площадь покрытия: ${stats.coverageArea} м² (${coveragePercent}%)</div>
                        <div style="font-weight: bold; color: ${brandColor}; font-size: 11px; margin-top: 5px;">
                            Общая стоимость: ${stats.totalCost.toLocaleString('ru-RU')} ₽
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 12px;">
                    <h2 style="color: ${brandColor}; font-size: 13px; font-weight: bold; margin: 0 0 8px 0;">
                        Схема укладки:
                    </h2>
                    <div id="pdfCanvasWrapper" style="text-align: center; display: flex; justify-content: center; max-height: 350px;">
                        <!-- Canvas будет скопирован сюда -->
                    </div>
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 15px 20px; border-top: 1px solid ${brandColor};">
                <div style="flex: 1;">
                    <div style="font-size: 9px; font-weight: bold; color: ${brandColor}; margin-bottom: 5px;">Контакты:</div>
                    <div style="font-size: 9px; line-height: 1.6; color: #444;">
                        <div>Сайт: https://stp-multiframe.ru/</div>
                        <div>Офис: г. Иваново, ул. Смирнова, д. 74</div>
                        <div>Производитель: ООО "Стандартпласт"</div>
                        <div>Email: stp-russia@stplus.ru</div>
                    </div>
                </div>
                <div style="text-align: center; margin-left: 20px;">
                    <img src="${qrImageUrl}" style="width: 80px; height: 80px; display: block; margin: 0;" />
                    <div style="font-size: 8px; color: #666; margin-top: 5px; text-align: center;">
                        Сканируйте<br>для перехода<br>на сайт
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; font-size: 8px; color: #999; padding: 10px 20px; border-top: 1px solid #eee; margin-top: 10px;">
                Документ создан: ${dateStr}
            </div>
        `;
        
        document.body.appendChild(pdfContainer);
        
        // Копируем canvas в PDF
        const canvasWrapper = pdfContainer.querySelector('#pdfCanvasWrapper');
        const originalCanvas = document.getElementById('canvas1');
        if (originalCanvas && canvasWrapper) {
            // Вычисляем масштаб, сохраняя пропорции
            const maxHeight = 350;
            const scale = maxHeight / originalCanvas.height;
            
            // Создаем новый canvas с увеличенными размерами
            const newCanvas = document.createElement('canvas');
            newCanvas.width = originalCanvas.width * scale;
            newCanvas.height = originalCanvas.height * scale;
            newCanvas.style.maxWidth = '100%';
            newCanvas.style.height = 'auto';
            
            // Копируем контент на новый canvas с масштабированием
            const ctx = newCanvas.getContext('2d');
            ctx.scale(scale, scale);
            ctx.drawImage(originalCanvas, 0, 0);
            
            canvasWrapper.appendChild(newCanvas);
        }
        
        // Ждем загрузки изображений
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Конвертируем в canvas через html2canvas с высоким качеством
        const canvasImg = await html2canvas(pdfContainer, {
            scale: 4,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: pdfContainer.offsetWidth,
            height: pdfContainer.offsetHeight,
            windowHeight: pdfContainer.scrollHeight
        });
        
        // Создаем PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('portrait', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Вычисляем размеры изображения для PDF
        const imgData = canvasImg.toDataURL('image/png');
        const imgWidth = pageWidth;
        const imgHeight = (canvasImg.height * pageWidth) / canvasImg.width;
        
        // Добавляем изображение на страницы (может быть несколько)
        let heightLeft = imgHeight;
        let position = 0;
        
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            doc.addPage();
            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        // Удаляем временный контейнер
        document.body.removeChild(pdfContainer);
        
        // Сохраняем файл
        const fileName = 'MultiFrame_Расчет_' + now.toLocaleDateString('ru-RU').replace(/\./g, '-') + '.pdf';
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
    
    // Автоматический расчет при загрузке с параметрами по умолчанию
    calculateAllSchemes();
});

// Глобальная функция для PDF
window.saveToPDF = saveToPDF;

// Глобальная функция renderScheme для visualizer.js
window.renderScheme = renderScheme;

