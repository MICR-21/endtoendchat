const blessed = require('blessed');
const WebSocket = require('ws');

const username = process.argv[2];
if (!username) {
    console.error('Usage: node app.js <username>');
    process.exit(1);
}

const ws = new WebSocket('ws://localhost:8080');

// GUI setup
const screen = blessed.screen({
    smartCSR: true,
    title: `Chat - ${username}`,
});

const messageLog = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '90%',
    content: '',
    tags: true,
    border: { type: 'line' },
    style: { 
        border: { fg: 'green' },
        scrollbar: { bg: 'blue' }
    },
    scrollable: true,
    alwaysScroll: true,
});

const input = blessed.textbox({
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3,
    inputOnFocus: true,
    border: { type: 'line' },
    style: { border: { fg: 'cyan' } },
});

screen.append(messageLog);
screen.append(input);

// Focus input box
input.focus();

// Send messages
input.key('enter', () => {
    const message = input.getValue().trim();
    if (message && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ from: username, message }));
        // Immediately display sent message
        messageLog.setContent(`${messageLog.content}\n{bold}${username} (You):{/bold} ${message}`);
        input.clearValue();
        screen.render();
    }
});

// Handle incoming WebSocket messages
ws.on('message', (data) => {
    const parsed = JSON.parse(data);
    // Append incoming messages directly
    messageLog.setContent(`${messageLog.content}\n{bold}${parsed.from}:{/bold} ${parsed.message}`);
    screen.render();
});

// WebSocket connection handling
ws.on('open', () => {
    messageLog.setContent(`Connected as ${username}`);
    screen.render();
});

// WebSocket error handling
ws.on('error', (err) => {
    messageLog.setContent(`{red-fg}Error: ${err.message}{/red-fg}`);
    screen.render();
});

// Exit handling
screen.key(['escape', 'C-c'], () => process.exit(0));

// Ensure screen can be re-rendered
screen.render();