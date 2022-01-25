var canvas = document.querySelector('canvas');
var statusText = document.querySelector('#statusText');

statusText.addEventListener('click', function() {
    statusText.textContent = 'Searching sensors...';
    tempRhs = [];
    tempRhSensor.connect()
        .then(() => tempRhSensor.startNotificationsTempRhMeasurement().then(handleTempRhMeasurement))
        .catch(error => {
            statusText.textContent = error;
        });
});

function handleTempRhMeasurement(tempRhMeasurement) {
    tempRhMeasurement.addEventListener('characteristicvaluechanged', event => {
        var tempRhMeasurement = tempRhSensor.parseTempRh(event.target.value);
        statusText.innerHTML = tempRhMeasurement.tempRh + ' &#127777;';
        tempRhs.push(tempRhMeasurement.tempRh);
        drawWaves();
    });
}

var tempRhs = [];
var mode = 'bar';

canvas.addEventListener('click', event => {
    mode = mode === 'bar' ? 'line' : 'bar';
    drawWaves();
});

function drawWaves() {
    requestAnimationFrame(() => {
        canvas.width = parseInt(getComputedStyle(canvas).width.slice(0, -2)) * devicePixelRatio;
        canvas.height = parseInt(getComputedStyle(canvas).height.slice(0, -2)) * devicePixelRatio;

        var context = canvas.getContext('2d');
        var margin = 2;
        var max = Math.max(0, Math.round(canvas.width / 11));
        var offset = Math.max(0, tempRhs.length - max);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = '#00796B';
        if (mode === 'bar') {
            for (var i = 0; i < Math.max(tempRhs.length, max); i++) {
                var barHeight = Math.round(tempRhs[i + offset] * canvas.height / 200);
                context.rect(11 * i + margin, canvas.height - barHeight, margin, Math.max(0, barHeight - margin));
                context.stroke();
            }
        } else if (mode === 'line') {
            context.beginPath();
            context.lineWidth = 6;
            context.lineJoin = 'round';
            context.shadowBlur = '1';
            context.shadowColor = '#333';
            context.shadowOffsetY = '1';
            for (var i = 0; i < Math.max(tempRhs.length, max); i++) {
                var lineHeight = Math.round(tempRhs[i + offset] * canvas.height / 200);
                if (i === 0) {
                    context.moveTo(11 * i, canvas.height - lineHeight);
                } else {
                    context.lineTo(11 * i, canvas.height - lineHeight);
                }
                context.stroke();
            }
        }
    });
}

window.onresize = drawWaves;

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        drawWaves();
    }
});