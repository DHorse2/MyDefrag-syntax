'use strict';

const socket = new WebSocket(process.argv[2]);
socket.addEventListener('open', () => {
    socket.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
            expression: `JSON.stringify({
                dirty: document.getElementById('dirty-badge')?.textContent,
                headings: Array.from(document.querySelectorAll('h2,h3')).map((node) => node.textContent),
                dialogs: Array.from(document.querySelectorAll('dialog')).map((dialog) => ({
                    open: dialog.open,
                    text: dialog.textContent.slice(0, 1500)
                })),
                matchingButtons: Array.from(document.querySelectorAll('button.candidate-choice'))
                    .filter((button) => button.textContent.includes('Enable MyDefrag extension debug logging.'))
                    .map((button) => ({ className: button.className, text: button.textContent })),
                result: document.getElementById('result-content')?.textContent
            })`,
            returnByValue: true
        }
    }));
});
socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== 1) { return; }
    console.log(JSON.stringify(JSON.parse(message.result.result.value), null, 2));
    socket.close();
});
socket.addEventListener('error', (error) => {
    console.error(error.message || error);
    process.exitCode = 1;
});
