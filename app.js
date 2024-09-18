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
        speedX: (Math.random() * 1 - 0.5) * 0.5,
        speedY: 0,
        gravity: 0.05,
        finished: false
    }));

    const obstacles = [];
    for (let i = 0; i < 15; i++) {
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

    // Update rails definition
    const railCount = 10; // Number of rails on each side
    const railRadius = 20; // New smaller radius
    const rails = [];
    const finishWidth = 40;
    const finishX = canvas.width / 2;

    // Create rails on the left side (clockwise rotation)
    for (let i = 0; i < railCount; i++) {
        rails.push({
            x: (finishX - finishWidth / 2) * (i + 1) / railCount,
            y: canvas.height - railRadius,
            radius: railRadius,
            angle: 0,
            speed: 0.02, // Positive speed for clockwise rotation
        });
    }

    // Create rails on the right side (counter-clockwise rotation)
    for (let i = 0; i < railCount; i++) {
        rails.push({
            x: finishX + finishWidth / 2 + (canvas.width - finishX - finishWidth / 2) * i / railCount,
            y: canvas.height - railRadius,
            radius: railRadius,
            angle: 0,
            speed: -0.02, // Negative speed for counter-clockwise rotation
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
        
        // 레일의 접선 방향 계산
        const tangentX = -dy / distance;
        const tangentY = dx / distance;
        
        // 공의 속도를 접선 방향으로 조정
        const dotProduct = ball.speedX * tangentX + ball.speedY * tangentY;
        ball.speedX = tangentX * dotProduct;
        ball.speedY = tangentY * dotProduct;
        
        // 레일의 회전 속도를 공에 전달
        ball.speedX += -dy * rail.speed;
        ball.speedY += dx * rail.speed;
        
        // 공을 레일 표면으로 이동
        const overlap = (rail.radius + ball.radius) - distance;
        ball.x += overlap * dx / distance;
        ball.y += overlap * dy / distance;
    }

    function gameStep() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        // Draw finish line
        ctx.beginPath();
        ctx.rect(finishX - finishWidth / 2, canvas.height - 50, finishWidth, 50);
        ctx.fillStyle = 'yellow';
        ctx.fill();

        // Draw rotating rails
        rails.forEach(rail => {
            ctx.beginPath();
            ctx.arc(rail.x, rail.y, rail.radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#00f';
            ctx.lineWidth = 5;
            ctx.stroke();
            
            // Rail rotation marker
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
    
        balls.forEach(ball => {
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

                // Update finish condition
                if (ball.y + ball.radius >= canvas.height - 50 && 
                    Math.abs(ball.x - finishX) < finishWidth / 2) {
                    ball.finished = true;
                    finishOrder.push(ball);
                }
            }
        });
    
        if (finishOrder.length === balls.length) {
            assignTeams(finishOrder, teams);
            return;
        }
    
        requestAnimationFrame(gameStep);
    }
    
    gameStep();
});

// Random color generator
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Assign teams based on game results
function assignTeams(finishOrder, teams) {
    finishOrder.forEach((ball, index) => {
        const teamIndex = index % teams.length;
        teams[teamIndex].push(ball.name);
    });

    displayTeams(teams);
}

// Display teams in the results section
function displayTeams(teams) {
    const resultDiv = document.getElementById('teamResults');
    resultDiv.innerHTML = '<h2>Teams (Based on Race Results):</h2>';
    teams.forEach((team, index) => {
        resultDiv.innerHTML += `<h3>Team ${index + 1}</h3><p>${team.join(', ')}</p>`;
    });
}