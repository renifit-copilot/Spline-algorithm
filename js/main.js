/**
 * Объединенный JS файл со всей логикой приложения редактора сплайнов
 */

// =================== ОСНОВНЫЕ ФУНКЦИИ ===================

/**
 * Вычисление коэффициентов кубического сплайна
 * @param {Array} nodes - Массив узловых точек [{x, y}, ...]
 * @returns {Array} - Массив сегментов сплайна с коэффициентами для каждого
 */
function computeSpline(nodes) {
    if (nodes.length < 2) {
        return [];
    }

    // Сортируем узлы по возрастанию X (если еще не отсортированы)
    nodes.sort((a, b) => a.x - b.x);
    
    const n = nodes.length;
    
    // Вычисляем разности
    const h = [];
    for (let i = 0; i < n - 1; i++) {
        h.push(nodes[i + 1].x - nodes[i].x);
    }
    
    // Подготавливаем данные для решения системы уравнений
    const alpha = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) {
        alpha[i] = 3 * ((nodes[i + 1].y - nodes[i].y) / h[i] - (nodes[i].y - nodes[i - 1].y) / h[i - 1]);
    }
    
    // Решаем трехдиагональную систему
    const l = new Array(n).fill(0);
    const mu = new Array(n).fill(0);
    const z = new Array(n).fill(0);
    
    l[0] = 1;
    mu[0] = 0;
    z[0] = 0;
    
    for (let i = 1; i < n - 1; i++) {
        l[i] = 2 * (nodes[i + 1].x - nodes[i - 1].x) - h[i - 1] * mu[i - 1];
        mu[i] = h[i] / l[i];
        z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
    }
    
    l[n - 1] = 1;
    z[n - 1] = 0;
    
    // Вычисляем коэффициенты
    const c = new Array(n).fill(0);
    const b = new Array(n).fill(0);
    const d = new Array(n).fill(0);
    
    for (let j = n - 2; j >= 0; j--) {
        c[j] = z[j] - mu[j] * c[j + 1];
        b[j] = (nodes[j + 1].y - nodes[j].y) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
        d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
    }
    
    // Формируем сегменты сплайна
    const segments = [];
    
    for (let i = 0; i < n - 1; i++) {
        segments.push({
            x: nodes[i].x,
            a: nodes[i].y,
            b: b[i],
            c: c[i],
            d: d[i],
            endX: nodes[i + 1].x
        });
    }
    
    return segments;
}

/**
 * Решение трехдиагональной системы уравнений (алгоритм прогонки)
 * @param {Array} a - Нижняя диагональ
 * @param {Array} b - Главная диагональ
 * @param {Array} c - Верхняя диагональ
 * @param {Array} d - Правые части
 * @returns {Array} - Решение системы
 */
function solveTridiagonal(a, b, c, d) {
    const n = d.length;
    const x = new Array(n).fill(0);
    const p = new Array(n).fill(0);
    const q = new Array(n).fill(0);
    
    // Прямой ход
    p[0] = c[0] / b[0];
    q[0] = d[0] / b[0];
    
    for (let i = 1; i < n; i++) {
        const denom = b[i] - a[i] * p[i - 1];
        p[i] = c[i] / denom;
        q[i] = (d[i] - a[i] * q[i - 1]) / denom;
    }
    
    // Обратный ход
    x[n - 1] = q[n - 1];
    
    for (let i = n - 2; i >= 0; i--) {
        x[i] = q[i] - p[i] * x[i + 1];
    }
    
    return x;
}

// =================== CANVAS ===================

/**
 * Класс для управления холстом
 */
class CanvasManager {
    /**
     * @param {HTMLCanvasElement} canvas - DOM элемент холста
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.setupCanvas();
    }

    /**
     * Настройка холста для поддержки высокого разрешения (Retina display)
     */
    setupCanvas() {
        // Получаем размеры контейнера
        const container = this.canvas.parentElement;
        const displayWidth = container.clientWidth;
        const displayHeight = 600;
        
        // Устанавливаем размеры канваса с учетом devicePixelRatio для ретины
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = displayWidth * dpr;
        this.canvas.height = displayHeight * dpr;
        
        // Устанавливаем размеры холста через CSS
        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;
        
        // Масштабируем контекст для ретины
        this.ctx.scale(dpr, dpr);
        
        // Сохраняем реальные размеры для рисования
        this.displayWidth = displayWidth;
        this.displayHeight = displayHeight;
    }

    /**
     * Очистка холста
     */
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Отрисовка сетки на холсте
     */
    drawGrid() {
        const gridSize = 50;
        const width = this.displayWidth;
        const height = this.displayHeight;
        
        this.ctx.strokeStyle = '#f0f0f0';
        this.ctx.lineWidth = 1;
        
        // Вертикальные линии
        for (let x = gridSize; x < width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        
        // Горизонтальные линии
        for (let y = gridSize; y < height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }

    /**
     * Отрисовка контрольных точек
     * @param {Array} points - Массив точек [{x, y}, ...]
     * @param {Number} selectedPointIndex - Индекс выбранной точки
     * @param {Number} pointRadius - Радиус контрольной точки
     */
    drawControlPoints(points, selectedPointIndex, pointRadius) {
        points.forEach((point, index) => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
            
            if (index === selectedPointIndex) {
                this.ctx.fillStyle = '#e74c3c'; // Выделенная точка
                this.ctx.fill();
            } else {
                this.ctx.fillStyle = '#3a86ff';
                this.ctx.fill();
            }
            
            this.ctx.strokeStyle = '#2c3e50';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
            
            // Отрисовка номера точки
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(index.toString(), point.x + pointRadius + 2, point.y - pointRadius - 2);
        });
    }

    /**
     * Отрисовка сплайна
     * @param {Array} segments - Массив сегментов сплайна
     */
    drawSpline(segments) {
        if (segments.length === 0) return;
        
        this.ctx.strokeStyle = '#3a86ff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        // Начальная точка
        const firstSegment = segments[0];
        let lastX = firstSegment.x;
        let lastY = firstSegment.a;
        this.ctx.moveTo(lastX, lastY);
        
        for (const segment of segments) {
            // Рисуем кривую с шагом 1 пиксель для гладкости
            for (let x = segment.x + 1; x <= segment.endX; x++) {
                // Параметризация для текущего сегмента
                const t = x - segment.x;
                
                // Кубический полином: a + b*t + c*t^2 + d*t^3
                const y = segment.a + segment.b * t + segment.c * t * t + segment.d * t * t * t;
                
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.stroke();
    }

    /**
     * Обработчик изменения размера окна
     */
    handleResize() {
        this.setupCanvas();
    }
}

// =================== ОСНОВНОЙ КОД ПРИЛОЖЕНИЯ ===================

/**
 * Основной класс приложения
 */
class SplineApp {
    constructor() {
        // Инициализация DOM элементов
        this.canvas = document.getElementById('splineCanvas');
        this.pointsTable = document.getElementById('pointsTable').getElementsByTagName('tbody')[0];
        this.pointIndexSelect = document.getElementById('pointIndexSelect');
        this.pointX = document.getElementById('pointX');
        this.pointY = document.getElementById('pointY');
        this.addPointBtn = document.getElementById('addPointBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.movePointBtn = document.getElementById('movePointBtn');
        this.deletePointBtn = document.getElementById('deletePointBtn');
        
        // Инициализация состояния
        this.points = []; // Массив контрольных точек
        this.addPointMode = false; // Режим добавления точки
        this.selectedPointIndex = -1; // Текущая выбранная точка
        this.POINT_RADIUS = 6; // Размер точки на холсте
        
        // Инициализация холста
        this.canvasManager = new CanvasManager(this.canvas);
        
        // Привязка обработчиков событий
        this.initEventHandlers();
        
        // Первоначальная отрисовка
        this.redraw();
    }
    
    /**
     * Инициализация обработчиков событий
     */
    initEventHandlers() {
        // Обработчик кнопки добавления точки
        this.addPointBtn.addEventListener('click', () => {
            this.addPointMode = true;
            this.canvas.style.cursor = 'crosshair';
        });
        
        // Обработчик клика по холсту
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            if (this.addPointMode) {
                this.addPoint(x, y);
                this.addPointMode = false;
                this.canvas.style.cursor = 'default';
            } else {
                // Проверяем, кликнули ли по существующей точке
                const pointIndex = this.findPointUnderCursor(x, y);
                if (pointIndex !== -1) {
                    this.selectPoint(pointIndex);
                }
            }
        });
        
        // Обработчик кнопки очистки
        this.clearBtn.addEventListener('click', () => {
            this.points = [];
            this.selectedPointIndex = -1;
            this.updatePointsTable();
            this.redraw();
        });
        
        // Обработчик выбора точки из выпадающего списка
        this.pointIndexSelect.addEventListener('change', () => {
            const index = parseInt(this.pointIndexSelect.value, 10);
            if (!isNaN(index) && index >= 0 && index < this.points.length) {
                this.selectPoint(index);
            }
        });
        
        // Обработчик кнопки перемещения точки
        this.movePointBtn.addEventListener('click', () => {
            if (this.selectedPointIndex !== -1) {
                const x = parseFloat(this.pointX.value);
                const y = parseFloat(this.pointY.value);
                if (!isNaN(x) && !isNaN(y)) {
                    this.movePoint(this.selectedPointIndex, x, y);
                }
            }
        });
        
        // Обработчик кнопки удаления точки
        this.deletePointBtn.addEventListener('click', () => {
            if (this.selectedPointIndex !== -1) {
                this.removePoint(this.selectedPointIndex);
            }
        });
        
        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            this.canvasManager.handleResize();
            this.redraw();
        });
    }
    
    /**
     * Добавление новой точки
     * @param {Number} x - X-координата
     * @param {Number} y - Y-координата
     */
    addPoint(x, y) {
        // Проверяем, что точка в пределах холста
        if (x < 0 || x > this.canvasManager.displayWidth || y < 0 || y > this.canvasManager.displayHeight) {
            alert('Точка должна быть внутри холста!');
            return;
        }
        
        const point = { x, y };
        this.points.push(point);
        
        // Если точки упорядочены по X, сортируем их
        this.points.sort((a, b) => a.x - b.x);
        
        // Находим индекс добавленной точки после сортировки
        const newIndex = this.points.findIndex(p => p.x === point.x && p.y === point.y);
        this.selectedPointIndex = newIndex;
        
        this.updatePointsTable();
        this.redraw();
    }
    
    /**
     * Удаление точки
     * @param {Number} index - Индекс точки
     */
    removePoint(index) {
        if (index >= 0 && index < this.points.length) {
            this.points.splice(index, 1);
            this.selectedPointIndex = -1;
            this.updatePointsTable();
            this.redraw();
        }
    }
    
    /**
     * Перемещение точки
     * @param {Number} index - Индекс точки
     * @param {Number} x - Новая X-координата
     * @param {Number} y - Новая Y-координата
     */
    movePoint(index, x, y) {
        // Проверяем, что точка в пределах холста
        if (x < 0 || x > this.canvasManager.displayWidth || y < 0 || y > this.canvasManager.displayHeight) {
            alert('Точка должна быть внутри холста!');
            return;
        }
        
        if (index >= 0 && index < this.points.length) {
            this.points[index].x = parseFloat(x);
            this.points[index].y = parseFloat(y);
            
            // Если точки упорядочены по X, сортируем их
            this.points.sort((a, b) => a.x - b.x);
            
            // Находим индекс перемещенной точки после сортировки
            const newIndex = this.points.findIndex(p => p.x === parseFloat(x) && p.y === parseFloat(y));
            this.selectedPointIndex = newIndex;
            
            this.updatePointsTable();
            this.redraw();
        }
    }
    
    /**
     * Выбор точки
     * @param {Number} index - Индекс точки
     */
    selectPoint(index) {
        this.selectedPointIndex = index;
        this.pointIndexSelect.value = index;
        this.pointX.value = this.points[index].x;
        this.pointY.value = this.points[index].y;
        this.redraw();
    }
    
    /**
     * Найти точку под курсором
     * @param {Number} x - X-координата курсора
     * @param {Number} y - Y-координата курсора
     * @returns {Number} - Индекс точки или -1, если точка не найдена
     */
    findPointUnderCursor(x, y) {
        for (let i = 0; i < this.points.length; i++) {
            const dx = this.points[i].x - x;
            const dy = this.points[i].y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.POINT_RADIUS * 2) {
                return i;
            }
        }
        return -1;
    }
    
    /**
     * Обновление таблицы точек
     */
    updatePointsTable() {
        // Очищаем таблицу
        this.pointsTable.innerHTML = '';
        
        // Заполняем таблицу точками
        this.points.forEach((point, index) => {
            const row = this.pointsTable.insertRow();
            row.addEventListener('click', () => this.selectPoint(index));
            
            const cellIndex = row.insertCell(0);
            const cellX = row.insertCell(1);
            const cellY = row.insertCell(2);
            
            cellIndex.textContent = index;
            cellX.textContent = point.x.toFixed(1);
            cellY.textContent = point.y.toFixed(1);
        });
        
        // Обновляем выпадающий список
        this.updatePointSelect();
    }
    
    /**
     * Обновление выпадающего списка с точками
     */
    updatePointSelect() {
        this.pointIndexSelect.innerHTML = '';
        
        if (this.points.length === 0) {
            const option = document.createElement('option');
            option.text = 'Нет точек';
            option.disabled = true;
            this.pointIndexSelect.add(option);
        } else {
            this.points.forEach((_, index) => {
                const option = document.createElement('option');
                option.text = `Точка ${index}`;
                option.value = index;
                this.pointIndexSelect.add(option);
            });
        }
        
        // Если есть выбранная точка, выбираем её в списке
        if (this.selectedPointIndex >= 0 && this.selectedPointIndex < this.points.length) {
            this.pointIndexSelect.value = this.selectedPointIndex;
            this.pointX.value = this.points[this.selectedPointIndex].x;
            this.pointY.value = this.points[this.selectedPointIndex].y;
        } else if (this.points.length > 0) {
            // Если нет выбранной точки, но есть точки, выбираем первую
            this.pointIndexSelect.value = 0;
            this.pointX.value = this.points[0].x;
            this.pointY.value = this.points[0].y;
            this.selectedPointIndex = 0;
        } else {
            // Если нет точек, очищаем поля
            this.pointX.value = '';
            this.pointY.value = '';
            this.selectedPointIndex = -1;
        }
    }
    
    /**
     * Общая функция перерисовки всего холста
     */
    redraw() {
        this.canvasManager.clearCanvas();
        this.canvasManager.drawGrid();
        
        // Если есть хотя бы 2 точки, рисуем сплайн
        if (this.points.length >= 2) {
            const segments = computeSpline(this.points);
            this.canvasManager.drawSpline(segments);
        }
        
        this.canvasManager.drawControlPoints(this.points, this.selectedPointIndex, this.POINT_RADIUS);
    }
}

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    new SplineApp();
}); 