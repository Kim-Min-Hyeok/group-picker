document.addEventListener('DOMContentLoaded', () => {
    let currentSlide = 1;
    const totalSlides = 38;
    let inputBuffer = '';
    const pageInfo = document.getElementById('pageInfo');
    const timer = document.getElementById('timer');
    const startTimerButton = document.getElementById('startTimer');
    const minutesInput = document.getElementById('minutes');
    const secondsInput = document.getElementById('seconds');
    let timerInterval;
    let timerSeconds = 0;
    const timerSections = [15, 16, 19, 20, 25, 35, 36];

    function showSlide(index) {
        if (index < 1) index = totalSlides;
        if (index > totalSlides) index = 1;
        document.querySelectorAll('.slide, .section30').forEach(slide => slide.style.display = 'none');
        document.querySelector(`#slide${index}`).style.display = 'block';
        currentSlide = index;
        pageInfo.textContent = `Page: ${currentSlide} / ${totalSlides}`;
        
        if (timerSections.includes(currentSlide)) {
            document.getElementById('timerControls').style.display = 'block';
            timer.style.display = 'block';
        } else {
            document.getElementById('timerControls').style.display = 'none';
            timer.style.display = 'none';
            stopTimer();
        }
    }

    function startTimer() {
        stopTimer(); // Reset timer if it's already running
        const minutes = parseInt(minutesInput.value) || 0;
        const seconds = parseInt(secondsInput.value) || 0;
        timerSeconds = minutes * 60 + seconds;
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            if (timerSeconds > 0) {
                timerSeconds--;
                updateTimerDisplay();
            } else {
                stopTimer();
            }
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timerSeconds / 60);
        const seconds = timerSeconds % 60;
        timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    const resetTimerButton = document.getElementById('resetTimer');

resetTimerButton.addEventListener('click', resetTimer);

function resetTimer() {
    stopTimer();
    minutesInput.value = '0';
    secondsInput.value = '0';
    timer.textContent = '00:00';
}

    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    function prevSlide() {
        showSlide(currentSlide - 1);
    }

    function goToSlide(number) {
        if (number >= 1 && number <= totalSlides) {
            showSlide(number);
        }
    }

    // Keyboard navigation
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') {
            nextSlide();
            inputBuffer = '';
        } else if (event.key === 'ArrowLeft') {
            prevSlide();
            inputBuffer = '';
        } else if (event.key >= '0' && event.key <= '9') {
            inputBuffer += event.key;
        } else if (event.key === 'Enter') {
            if (inputBuffer !== '') {
                goToSlide(parseInt(inputBuffer));
                inputBuffer = '';
            }
        } else {
            inputBuffer = '';
        }
    });

    // Start timer button event listener
    startTimerButton.addEventListener('click', startTimer);

    // Initial display
    showSlide(currentSlide);
});

// Handle the game logic
document.getElementById('teamForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const canvas = document.getElementById('ballCanvas');
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const names = document.getElementById('names').value.split(',').map(name => name.trim());
    const teamCount = parseInt(document.getElementById('teamCount').value);
    
    if (names.length < teamCount) {
        alert('Not enough names for the number of teams!');
        return;
    }

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const balls = names.map((name, i) => ({
        name: name,
        x: Math.random() * (canvas.width - 40) + 20,
        y: 0,
        prevX: 0,
        prevY: 0,
        radius: 15,
        color: getRandomColor(),
        speedX: (Math.random() * 1 - 0.5) * 2,
        speedY: Math.random() * 1 + 0.5,
        gravity: 0.05,
        finished: false
    }));    

    const obstacles = [];
    for (let i = 0; i < 10; i++) {
        obstacles.push({
            x: Math.random() * (canvas.width - 40) + 20,
            y: Math.random() * (canvas.height - 300) + 100,
            radius: 25,
            speedX: (Math.random() < 0.5 ? 1 : -1) * 0.5
        });
    }

    const rotatingPillars = [];
    for (let i = 0; i < 4; i++) {
        rotatingPillars.push({
            x: Math.random() * (canvas.width - 60) + 30,
            y: Math.random() * (canvas.height - 300) + 100,
            width: 20,
            height: 150,
            angle: 0,
            speed: (Math.random() < 0.5 ? -1 : 1) * 0.01
        });
    }

    const railCount = 15;
    const railRadius = 20;
    const rails = [];
    const finishWidth = 40;
    const finishX = canvas.width / 2;

    for (let i = 0; i < railCount; i++) {
        rails.push({
            x: (finishX - finishWidth / 2) * (i + 1) / railCount,
            y: canvas.height - railRadius,
            radius: railRadius,
            angle: 0,
            speed: 0.02,
        });
    }

    for (let i = 0; i < railCount; i++) {
        rails.push({
            x: finishX + finishWidth / 2 + (canvas.width - finishX - finishWidth / 2) * i / railCount,
            y: canvas.height - railRadius,
            radius: railRadius,
            angle: 0,
            speed: -0.02,
        });
    }

    const teams = Array.from({ length: teamCount }, () => []);
    const finishOrder = [];

    function checkCircleCollision(x1, y1, r1, x2, y2, r2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < r1 + r2;
    }

    function resolveCircleCollision(ball, obstacle) {
        const dx = obstacle.x - ball.x;
        const dy = obstacle.y - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const overlap = (ball.radius + obstacle.radius) - distance;
        
        if (overlap > 0) {
            const angle = Math.atan2(dy, dx);
            ball.x -= overlap * Math.cos(angle);
            ball.y -= overlap * Math.sin(angle);
            
            const normalX = dx / distance;
            const normalY = dy / distance;
            const dotProduct = ball.speedX * normalX + ball.speedY * normalY;
            ball.speedX = ball.speedX - 2 * dotProduct * normalX;
            ball.speedY = ball.speedY - 2 * dotProduct * normalY;
            
            ball.speedX *= 0.8;
            ball.speedY *= 0.8;
        }
    }

    function checkRectangleCollision(ballX, ballY, ballRadius, rectX, rectY, rectWidth, rectHeight, angle) {
        const relativeX = ballX - rectX;
        const relativeY = ballY - rectY;
        const rotatedX = relativeX * Math.cos(-angle) - relativeY * Math.sin(-angle);
        const rotatedY = relativeX * Math.sin(-angle) + relativeY * Math.cos(-angle);
        
        const closestX = Math.max(-rectWidth/2, Math.min(rectWidth/2, rotatedX));
        const closestY = Math.max(-rectHeight/2, Math.min(rectHeight/2, rotatedY));
        
        const distanceX = rotatedX - closestX;
        const distanceY = rotatedY - closestY;
        
        return (distanceX * distanceX + distanceY * distanceY) < (ballRadius * ballRadius);
    }

    function resolveRectangleCollision(ball, pillar) {
        const relativeX = ball.x - pillar.x;
        const relativeY = ball.y - pillar.y;
        const rotatedX = relativeX * Math.cos(-pillar.angle) - relativeY * Math.sin(-pillar.angle);
        const rotatedY = relativeX * Math.sin(-pillar.angle) + relativeY * Math.cos(-pillar.angle);
        
        let normalX, normalY;
        if (Math.abs(rotatedX) > Math.abs(rotatedY)) {
            normalX = rotatedX > 0 ? 1 : -1;
            normalY = 0;
        } else {
            normalX = 0;
            normalY = rotatedY > 0 ? 1 : -1;
        }
        
        const rotatedSpeedX = ball.speedX * Math.cos(-pillar.angle) - ball.speedY * Math.sin(-pillar.angle);
        const rotatedSpeedY = ball.speedX * Math.sin(-pillar.angle) + ball.speedY * Math.cos(-pillar.angle);
        
        const dotProduct = 2 * (rotatedSpeedX * normalX + rotatedSpeedY * normalY);
        const reflectedSpeedX = rotatedSpeedX - dotProduct * normalX;
        const reflectedSpeedY = rotatedSpeedY - dotProduct * normalY;
        
        ball.speedX = reflectedSpeedX * Math.cos(pillar.angle) - reflectedSpeedY * Math.sin(pillar.angle);
        ball.speedY = reflectedSpeedX * Math.sin(pillar.angle) + reflectedSpeedY * Math.cos(pillar.angle);
        
        ball.speedX *= 0.8;
        ball.speedY *= 0.8;
        
        const overlap = ball.radius - Math.abs(rotatedX);
        if (overlap > 0) {
            ball.x += overlap * normalX * Math.cos(pillar.angle);
            ball.y += overlap * normalX * Math.sin(pillar.angle);
        }
    }

    function checkRailCollision(ball, rail) {
        const dx = ball.x - rail.x;
        const dy = ball.y - rail.y;
        return Math.sqrt(dx * dx + dy * dy) <= rail.radius + ball.radius;
    }

    function resolveRailCollision(ball, rail) {
        const dx = ball.x - rail.x;
        const dy = ball.y - rail.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const tangentX = -dy / distance;
        const tangentY = dx / distance;
        
        const dotProduct = ball.speedX * tangentX + ball.speedY * tangentY;
        ball.speedX = tangentX * dotProduct;
        ball.speedY = tangentY * dotProduct;
        
        ball.speedX += -dy * rail.speed;
        ball.speedY += dx * rail.speed;
        
        const overlap = (rail.radius + ball.radius) - distance;
        ball.x += overlap * dx / distance;
        ball.y += overlap * dy / distance;
    }

    function gameStep() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        ctx.beginPath();
        ctx.rect(finishX - finishWidth / 2, canvas.height - 50, finishWidth, 50);
        ctx.fillStyle = 'yellow';
        ctx.fill();
    
        rails.forEach(rail => {
            ctx.beginPath();
            ctx.arc(rail.x, rail.y, rail.radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#00f';
            ctx.lineWidth = 5;
            ctx.stroke();
            
            const markerX = rail.x + Math.cos(rail.angle) * rail.radius;
            const markerY = rail.y + Math.sin(rail.angle) * rail.radius;
            ctx.beginPath();
            ctx.arc(markerX, markerY, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#f00';
            ctx.fill();
            
            rail.angle += rail.speed;
        });
    
        obstacles.forEach(obstacle => {
            obstacle.x += obstacle.speedX;
            if (obstacle.x - obstacle.radius < 0 || obstacle.x + obstacle.radius > canvas.width) {
                obstacle.speedX = -obstacle.speedX;
            }
    
            ctx.beginPath();
            ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#555';
            ctx.fill();
            ctx.closePath();
        });
    
        rotatingPillars.forEach(pillar => {
            ctx.save();
            ctx.translate(pillar.x, pillar.y);
            ctx.rotate(pillar.angle);
            ctx.fillStyle = '#ff5500';
            ctx.fillRect(-pillar.width / 2, -pillar.height / 2, pillar.width, pillar.height);
            ctx.restore();
    
            pillar.angle += pillar.speed;
        });
    
        balls.forEach((ball, index) => {
            if (!ball.finished) {
                ball.prevX = ball.x;
                ball.prevY = ball.y;
    
                ball.speedY += ball.gravity;
                ball.x += ball.speedX;
                ball.y += ball.speedY;
    
                if (ball.x + ball.radius > canvas.width) {
                    ball.x = canvas.width - ball.radius;
                    ball.speedX = 0;
                } else if (ball.x - ball.radius < 0) {
                    ball.x = ball.radius;
                    ball.speedX = 0;
                }
    
                if (ball.y + ball.radius > canvas.height) {
                    ball.y = canvas.height - ball.radius;
                    ball.speedY = 0;
                }
    
                obstacles.forEach(obstacle => {
                    if (checkCircleCollision(ball.x, ball.y, ball.radius, obstacle.x, obstacle.y, obstacle.radius)) {
                        resolveCircleCollision(ball, obstacle);
                    }
                });
    
                rotatingPillars.forEach(pillar => {
                    if (checkRectangleCollision(ball.x, ball.y, ball.radius, pillar.x, pillar.y, pillar.width, pillar.height, pillar.angle)) {
                        resolveRectangleCollision(ball, pillar);
                    }
                });
    
                rails.forEach(rail => {
                    if (checkRailCollision(ball, rail)) {
                        resolveRailCollision(ball, rail);
                    }
                });
    
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2, false);
                ctx.fillStyle = ball.color;
                ctx.fill();
                ctx.closePath();
    
                ctx.fillStyle = "#fff";
                ctx.font = "12px Arial";
                ctx.fillText(ball.name, ball.x - ball.radius, ball.y - ball.radius - 5);
    
                if (ball.y + ball.radius >= canvas.height - 50 && Math.abs(ball.x - finishX) < finishWidth / 2) {
                    ball.finished = true;
                    assignTeams(ball, teams);
                }
            }
        });
    
        if (finishOrder.length === balls.length) {
            return;
        }
    
        requestAnimationFrame(gameStep);
    }

    function assignTeams(ball, teams) {
        const teamIndex = finishOrder.length % teams.length;
        teams[teamIndex].push(ball.name);
        finishOrder.push(ball);

        displayTeams(teams);
    }
    
    gameStep();
});

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function displayTeams(teams) {
    const resultDiv = document.getElementById('teamResults');
    
    resultDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    resultDiv.style.padding = '20px';
    resultDiv.style.borderRadius = '10px';

    resultDiv.innerHTML = '<h2 style="color: white;">Teams (Based on Race Results):</h2>';
    
    const teamContainer = document.createElement('div');
    teamContainer.style.display = 'grid';
    teamContainer.style.gridTemplateColumns = '1fr 1fr';
    teamContainer.style.gap = '20px';

    teams.forEach((team, index) => {
        const teamDiv = document.createElement('div');
        teamDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        teamDiv.style.padding = '10px';
        teamDiv.style.borderRadius = '5px';
        teamDiv.style.color = 'white';
        
        teamDiv.innerHTML = `<h3>Team ${index + 1}</h3><p>${team.join(', ')}</p>`;
        teamContainer.appendChild(teamDiv);
    });

    resultDiv.appendChild(teamContainer);
}
