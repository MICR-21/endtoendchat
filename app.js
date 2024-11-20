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
        scrollbar: { bg: 'blue' },
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
        ch: ' ',
        track: { bg: 'cyan' },
    },
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

// Event listener for input
input.key('enter', () => {
    const message = input.getValue().trim();
    if (message && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ from: username, message }));
        // Immediately display the sent message
        appendToMessageLog(`{bold}${username} (You):{/bold} ${message}`);
        input.clearValue();
        input.focus(); // Ensure focus remains on the input box
        screen.render();
    }
});

// Append messages to the log safely
const appendToMessageLog = (message) => {
    messageLog.setContent(`${messageLog.content}\n${message}`);
    messageLog.setScrollPerc(100); // Auto-scroll to the bottom
    screen.render();
};

// Handle incoming WebSocket messages
ws.on('message', (data) => {
    const parsed = JSON.parse(data);
    appendToMessageLog(`{bold}${parsed.from}:{/bold} ${parsed.message}`);
});

// WebSocket connection events
ws.on('open', () => {
    appendToMessageLog(`{green-fg}Connected as ${username}{/green-fg}`);
});

ws.on('error', (err) => {
    appendToMessageLog(`{red-fg}Error: ${err.message}{/red-fg}`);
});

// Exit handling
screen.key(['escape', 'C-c'], () => process.exit(0));

// Initial render
screen.render();
