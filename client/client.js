// File: client/client.js

// --- Lấy các phần tử DOM ---
const loginArea = document.getElementById('login-area');
const gameArea = document.getElementById('game-area');
const usernameInput = document.getElementById('username-input');
const roomIdInput = document.getElementById('room-id-input');
const joinBtn = document.getElementById('join-btn');
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const messagesList = document.getElementById('messages');
const playerList = document.getElementById('player-list');

let socket;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// --- Chức năng hệ thống ---
function showGameArea() {
    loginArea.classList.add('hidden');
    gameArea.classList.remove('hidden');
}

function addMessage(message, type = 'normal') {
    const item = document.createElement('li');
    item.textContent = message;
    if (type === 'system') {
        item.style.fontStyle = 'italic';
        item.style.color = 'gray';
    }
    messagesList.appendChild(item);
    messagesList.scrollTop = messagesList.scrollHeight; // Tự cuộn xuống dưới
}

// --- Logic kết nối WebSocket ---
joinBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const roomId = roomIdInput.value.trim();

    if (!username || !roomId) {
        alert('Please enter both username and room ID.');
        return;
    }

    // Kết nối tới server. Thay đổi URL này khi bạn deploy online
    // Ví dụ: wss://your-app.onrender.com
    socket = new WebSocket('ws://localhost:3001');

    socket.onopen = () => {
        console.log('Connected to server');
        // Gửi yêu cầu tham gia phòng
        const joinMessage = {
            type: 'join_room',
            payload: { roomId, username }
        };
        socket.send(JSON.stringify(joinMessage));
        showGameArea();
        addMessage(`You joined Room: ${roomId}`, 'system');
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
            case 'user_joined':
                addMessage(`${data.payload.username} has joined the room.`, 'system');
                break;
            case 'user_left':
                addMessage(`${data.payload.username} has left the room.`, 'system');
                break;
            case 'drawing':
                const { x0, y0, x1, y1 } = data.payload;
                drawOnCanvas(x0, y0, x1, y1);
                break;
            case 'new_chat_message':
                addMessage(`${data.payload.username}: ${data.payload.message}`);
                break;
        }
    };

    socket.onclose = () => {
        addMessage('Disconnected from server. Please refresh.', 'system');
    };

    socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
        addMessage('Connection error.', 'system');
    };
});


// --- Logic vẽ trên Canvas ---
function drawOnCanvas(x0, y0, x1, y1) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
}

function sendDrawData(x0, y0, x1, y1) {
    const drawingData = {
        type: 'drawing',
        payload: { x0, y0, x1, y1 }
    };
    if (socket && socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(drawingData));
    }
}

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const [currentX, currentY] = [e.offsetX, e.offsetY];
    
    // Vẽ trên canvas của mình
    drawOnCanvas(lastX, lastY, currentX, currentY);

    // Gửi dữ liệu nét vẽ lên server
    sendDrawData(lastX, lastY, currentX, currentY);

    [lastX, lastY] = [currentX, currentY];
});

canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseout', () => isDrawing = false);


// --- Logic Chat ---
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (message && socket && socket.readyState === socket.OPEN) {
        const chatMessage = {
            type: 'chat_message',
            payload: { message }
        };
        socket.send(JSON.stringify(chatMessage));
        chatInput.value = '';
    }
});