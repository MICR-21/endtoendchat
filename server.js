const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('New client connected.');

    ws.on('message', (message) => {
        console.log('Message received:', message);

        // Broadcast the message to all connected clients except the sender
        clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected.');
        clients.delete(ws);
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        clients.delete(ws);
    });
});

console.log('WebSocket server running at ws://localhost:8080');
