// Глобальные переменные
const canvas = document.getElementById('splineCanvas');
const ctx = canvas.getContext('2d');
const pointsTable = document.getElementById('pointsTable').getElementsByTagName('tbody')[0];
const pointIndexSelect = document.getElementById('pointIndexSelect');
const pointX = document.getElementById('pointX');
const pointY = document.getElementById('pointY');

// Массив контрольных точек [{x, y}, ...]
let points = [];
// Режим добавления точки
let addPointMode = false;
// Текущая выбранная точка (для перемещения/удаления)
let selectedPointIndex = -1;
// Размер точки на холсте
const POINT_RADIUS = 6;

// Инициализация канваса с учетом ретины
function initCanvas() {
    // Получаем размеры контейнера
    const container = canvas.parentElement;
    const displayWidth = container.clientWidth;
    const displayHeight = 600;
    
    // Устанавливаем размеры канваса с учетом devicePixelRatio для ретины
    const dpr = window.devicePixelRatio || 1;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    
    // Устанавливаем размеры холста через CSS
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    
    // Масштабируем контекст для ретины
    ctx.scale(dpr, dpr);
    
    // Сохраняем реальные размеры для рисования
    canvas.displayWidth = displayWidth;
    canvas.displayHeight = displayHeight;
}

// Очистка холста
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Отрисовка сетки на холсте (для удобства)
function drawGrid() {
    const gridSize = 50;
    const width = canvas.displayWidth;
    const height = canvas.displayHeight;
    
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    
    // Вертикальные линии
    for (let x = gridSize; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // Горизонтальные линии
    for (let y = gridSize; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

// Отрисовка контрольных точек
function drawControlPoints() {
    points.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, POINT_RADIUS, 0, Math.PI * 2);
        
        if (index === selectedPointIndex) {
            ctx.fillStyle = '#e74c3c'; // Выделенная точка
            ctx.fill();
        } else {
            ctx.fillStyle = '#3498db';
            ctx.fill();
        }
        
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Отрисовка номера точки
        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px Arial';
        ctx.fillText(index.toString(), point.x + POINT_RADIUS + 2, point.y - POINT_RADIUS - 2);
    });
}

// Обновление таблицы точек
function updatePointsTable() {
    // Очищаем таблицу
    pointsTable.innerHTML = '';
    
    // Заполняем таблицу точками
    points.forEach((point, index) => {
        const row = pointsTable.insertRow();
        row.addEventListener('click', () => selectPoint(index));
        
        const cellIndex = row.insertCell(0);
        const cellX = row.insertCell(1);
        const cellY = row.insertCell(2);
        
        cellIndex.textContent = index;
        cellX.textContent = point.x.toFixed(1);
        cellY.textContent = point.y.toFixed(1);
    });
    
    // Обновляем выпадающий список
    updatePointSelect();
}

// Обновление выпадающего списка с точками
function updatePointSelect() {
    pointIndexSelect.innerHTML = '';
    
    if (points.length === 0) {
        const option = document.createElement('option');
        option.text = 'Нет точек';
        option.disabled = true;
        pointIndexSelect.add(option);
    } else {
        points.forEach((_, index) => {
            const option = document.createElement('option');
            option.text = `Точка ${index}`;
            option.value = index;
            pointIndexSelect.add(option);
        });
    }
    
    // Если есть выбранная точка, выбираем её в списке
    if (selectedPointIndex >= 0 && selectedPointIndex < points.length) {
        pointIndexSelect.value = selectedPointIndex;
        pointX.value = points[selectedPointIndex].x;
        pointY.value = points[selectedPointIndex].y;
    } else if (points.length > 0) {
        // Если нет выбранной точки, но есть точки, выбираем первую
        pointIndexSelect.value = 0;
        pointX.value = points[0].x;
        pointY.value = points[0].y;
        selectedPointIndex = 0;
    } else {
        // Если нет точек, очищаем поля
        pointX.value = '';
        pointY.value = '';
        selectedPointIndex = -1;
    }
}

// Выбор точки (по клику на таблицу или на холсте)
function selectPoint(index) {
    selectedPointIndex = index;
    pointIndexSelect.value = index;
    pointX.value = points[index].x;
    pointY.value = points[index].y;
    redraw();
}

// Добавление новой точки
function addPoint(x, y) {
    // Проверяем, что точка в пределах холста
    if (x < 0 || x > canvas.displayWidth || y < 0 || y > canvas.displayHeight) {
        alert('Точка должна быть внутри холста!');
        return;
    }
    
    const point = { x, y };
    points.push(point);
    
    // Если точки упорядочены по X, сортируем их
    points.sort((a, b) => a.x - b.x);
    
    // Находим индекс добавленной точки после сортировки
    const newIndex = points.findIndex(p => p.x === point.x && p.y === point.y);
    selectedPointIndex = newIndex;
    
    updatePointsTable();
    redraw();
}

// Удаление точки
function removePoint(index) {
    if (index >= 0 && index < points.length) {
        points.splice(index, 1);
        selectedPointIndex = -1;
        updatePointsTable();
        redraw();
    }
}

// Перемещение точки
function movePoint(index, x, y) {
    // Проверяем, что точка в пределах холста
    if (x < 0 || x > canvas.displayWidth || y < 0 || y > canvas.displayHeight) {
        alert('Точка должна быть внутри холста!');
        return;
    }
    
    if (index >= 0 && index < points.length) {
        points[index].x = parseFloat(x);
        points[index].y = parseFloat(y);
        
        // Если точки упорядочены по X, сортируем их
        points.sort((a, b) => a.x - b.x);
        
        // Находим индекс перемещенной точки после сортировки
        const newIndex = points.findIndex(p => p.x === parseFloat(x) && p.y === parseFloat(y));
        selectedPointIndex = newIndex;
        
        updatePointsTable();
        redraw();
    }
}

// Найти точку под курсором
function findPointUnderCursor(x, y) {
    for (let i = 0; i < points.length; i++) {
        const dx = points[i].x - x;
        const dy = points[i].y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= POINT_RADIUS * 2) {
            return i;
        }
    }
    return -1;
}

// Общая функция перерисовки всего холста
function redraw() {
    clearCanvas();
    drawGrid();
    
    // Если есть хотя бы 2 точки, рисуем сплайн
    if (points.length >= 2) {
        const segments = computeSpline(points);
        drawSpline(segments);
    }
    
    drawControlPoints();
}

//////////////////////////////////////////////////
// АЛГОРИТМ КУБИЧЕСКОГО СПЛАЙНА
//////////////////////////////////////////////////

/**
 * Решение тридиагональной системы методом прогонки (алгоритм Томаса)
 * a[i]*x[i-1] + b[i]*x[i] + c[i]*x[i+1] = d[i], i = 0,1,...,n-1
 * a[0] = 0, c[n-1] = 0
 * @param {Array} a - диагональ под главной (a[0] не используется)
 * @param {Array} b - главная диагональ
 * @param {Array} c - диагональ над главной (c[n-1] не используется)
 * @param {Array} d - правая часть системы
 * @returns {Array} - решение системы
 */
function solveTridiagonal(a, b, c, d) {
    const n = b.length;
    const x = new Array(n).fill(0);
    
    // Прямой ход - вычисляем прогоночные коэффициенты
    const alpha = new Array(n).fill(0);
    const beta = new Array(n).fill(0);
    
    // Начальные значения
    alpha[1] = -c[0] / b[0];
    beta[1] = d[0] / b[0];
    
    // Прямой ход прогонки
    for (let i = 1; i < n - 1; i++) {
        const denominator = a[i] * alpha[i] + b[i];
        alpha[i + 1] = -c[i] / denominator;
        beta[i + 1] = (d[i] - a[i] * beta[i]) / denominator;
    }
    
    // Обратный ход прогонки - находим решение
    x[n - 1] = (d[n - 1] - a[n - 1] * beta[n - 1]) / (b[n - 1] + a[n - 1] * alpha[n - 1]);
    
    for (let i = n - 2; i >= 0; i--) {
        x[i] = alpha[i + 1] * x[i + 1] + beta[i + 1];
    }
    
    return x;
}

/**
 * Вычисление кубического сплайна через систему линейных уравнений
 * @param {Array} nodes - массив точек {x, y}
 * @returns {Array} - массив сегментов сплайна (коэффициенты для каждого отрезка)
 */
function computeSpline(nodes) {
    if (nodes.length < 2) return [];
    
    // Сортируем точки по x для корректности сплайна
    const sortedNodes = [...nodes].sort((a, b) => a.x - b.x);
    
    const n = sortedNodes.length;
    
    // Если всего 2 точки, возвращаем линейный сегмент
    if (n === 2) {
        const p1 = sortedNodes[0];
        const p2 = sortedNodes[1];
        const h = p2.x - p1.x;
        
        return [{
            x1: p1.x,
            x2: p2.x,
            a: p1.y,
            b: (p2.y - p1.y) / h,
            c: 0,
            d: 0
        }];
    }
    
    // Вычисляем шаги по x
    const h = [];
    for (let i = 0; i < n - 1; i++) {
        h.push(sortedNodes[i + 1].x - sortedNodes[i].x);
    }
    
    // Формируем правую часть системы
    const d = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) {
        d[i] = 6 * (
            (sortedNodes[i + 1].y - sortedNodes[i].y) / h[i] -
            (sortedNodes[i].y - sortedNodes[i - 1].y) / h[i - 1]
        );
    }
    
    // Формируем диагонали матрицы системы
    const a = new Array(n).fill(0); // под главной диагональю
    const b = new Array(n).fill(0); // главная диагональ
    const c = new Array(n).fill(0); // над главной диагональю
    
    // Граничные условия - естественный сплайн (вторые производные на концах равны 0)
    b[0] = 1;
    b[n - 1] = 1;
    
    // Заполняем диагонали
    for (let i = 1; i < n - 1; i++) {
        a[i] = h[i - 1];
        b[i] = 2 * (h[i - 1] + h[i]);
        c[i] = h[i];
    }
    
    // Решаем систему - находим вторые производные в узлах
    const m = solveTridiagonal(a, b, c, d);
    
    // Вычисляем коэффициенты сплайна для каждого сегмента
    const segments = [];
    for (let i = 0; i < n - 1; i++) {
        const x1 = sortedNodes[i].x;
        const x2 = sortedNodes[i + 1].x;
        const y1 = sortedNodes[i].y;
        const y2 = sortedNodes[i + 1].y;
        
        // Коэффициенты кубического многочлена на i-м отрезке
        const a = y1;
        const b = (y2 - y1) / h[i] - h[i] * (2 * m[i] + m[i + 1]) / 6;
        const c = m[i] / 2;
        const d = (m[i + 1] - m[i]) / (6 * h[i]);
        
        segments.push({ x1, x2, a, b, c, d });
    }
    
    return segments;
}

/**
 * Отрисовка сплайна по сегментам
 * @param {Array} segments - массив сегментов сплайна
 */
function drawSpline(segments) {
    if (segments.length === 0) return;
    
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Начинаем с первой точки первого сегмента
    const firstSegment = segments[0];
    let startX = firstSegment.x1;
    let startY = firstSegment.a;
    ctx.moveTo(startX, startY);
    
    // Для каждого сегмента разбиваем его на маленькие отрезки
    segments.forEach(segment => {
        const { x1, x2, a, b, c, d } = segment;
        const steps = Math.max(30, Math.floor((x2 - x1) / 5)); // Количество шагов (больше для длинных сегментов)
        
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + (x2 - x1) * t;
            const dx = x - x1;
            
            // Вычисляем значение сплайна в точке x
            // S(x) = a + b*dx + c*dx^2 + d*dx^3
            const y = a + b * dx + c * dx * dx + d * dx * dx * dx;
            
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Рисуем дополнительно пунктирную линию между контрольными точками
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.stroke();
    ctx.setLineDash([]);
}

//////////////////////////////////////////////////
// ОБРАБОТЧИКИ СОБЫТИЙ
//////////////////////////////////////////////////

// Обработка клика на канвас
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (addPointMode) {
        // Режим добавления новой точки
        addPoint(x, y);
        addPointMode = false;
        document.getElementById('addPointBtn').textContent = 'Добавить точку';
        canvas.style.cursor = 'crosshair';
    } else {
        // Проверяем, не кликнули ли на существующую точку
        const pointIndex = findPointUnderCursor(x, y);
        if (pointIndex >= 0) {
            selectPoint(pointIndex);
        }
    }
});

// Обработка движения мыши над канвасом
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const pointIndex = findPointUnderCursor(x, y);
    
    if (pointIndex >= 0) {
        canvas.style.cursor = 'pointer';
    } else if (!addPointMode) {
        canvas.style.cursor = 'crosshair';
    }
});

// Кнопка "Добавить точку"
document.getElementById('addPointBtn').addEventListener('click', () => {
    addPointMode = !addPointMode;
    
    if (addPointMode) {
        document.getElementById('addPointBtn').textContent = 'Отменить добавление';
        canvas.style.cursor = 'cell';
    } else {
        document.getElementById('addPointBtn').textContent = 'Добавить точку';
        canvas.style.cursor = 'crosshair';
    }
});

// Кнопка "Очистить всё"
document.getElementById('clearBtn').addEventListener('click', () => {
    points = [];
    selectedPointIndex = -1;
    updatePointsTable();
    redraw();
});

// Обработчик выбора точки из выпадающего списка
pointIndexSelect.addEventListener('change', () => {
    const index = parseInt(pointIndexSelect.value);
    if (index >= 0 && index < points.length) {
        selectedPointIndex = index;
        pointX.value = points[index].x;
        pointY.value = points[index].y;
        redraw();
    }
});

// Кнопка "Переместить точку"
document.getElementById('movePointBtn').addEventListener('click', () => {
    const index = parseInt(pointIndexSelect.value);
    const x = parseFloat(pointX.value);
    const y = parseFloat(pointY.value);
    
    if (isNaN(x) || isNaN(y)) {
        alert('Введите корректные числовые координаты');
        return;
    }
    
    movePoint(index, x, y);
});

// Кнопка "Удалить точку"
document.getElementById('deletePointBtn').addEventListener('click', () => {
    const index = parseInt(pointIndexSelect.value);
    removePoint(index);
});

// Инициализация приложения
window.addEventListener('load', () => {
    initCanvas();
    drawGrid();
    
    // Обработчик изменения размера окна
    window.addEventListener('resize', () => {
        initCanvas();
        redraw();
    });
}); 