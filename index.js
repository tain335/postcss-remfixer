const postcss = require('postcss');
const PX_REGEX = /(-?\d+(\.\d+)?)px/g;
const DEFAULT = {
    psd: 1080,
    precision: 6,
    disabled: 1
}

let state = Object.assign({}, DEFAULT);

function reset() {
    state = Object.assign({}, DEFAULT);
}

function tryParseCommand(text) {
    if (text.startsWith('##')) {
        let vals = text.slice(2).split(':');
        let command = vals[0].trim();
        let content = vals[1] && vals[1].trim();
        return {
            command: command,
            content: content || 1
        }
    } else {
        return;
    }
}

function execCommand(command) {
    if (!command) return;
    switch (command.command) {
        case 'remfixer':
            command.content && (state.psd = Number(command.content));
            break;
        case 'precision':
            command.content && (state.precision = Number(command.content));
            break;
    }
}

function computeRem(source) {
    return Math.round((source / state.psd * 10) * Math.pow(10, state.precision)) / Math.pow(10, state.precision);
}

function fixContent(root) {
    root.walk(function(node) {
        switch(node.type) {
            case 'decl':
                let nextNode = node.next();
                if(nextNode && nextNode.type == 'comment') {
                    let command = tryParseCommand(nextNode.text);
                    if(command && command.command == 'disabled') return;
                }
                node.value = node.value.replace(PX_REGEX, function($0, $1) {
                    return computeRem(Number($1)) + 'rem';
                });
                break;
            case 'comment':
                let command = tryParseCommand(node.text);
                execCommand(command);
                break;
        }
    });
}

module.exports = postcss.plugin('postcss-remfixer', function(opts) {
    return function(root) {
        let nodes = root.nodes;
        let firstNode = nodes && nodes[0];
        if(firstNode && firstNode.type == 'comment') {
            let command = tryParseCommand(firstNode.text);
            if(command && command.command == 'remfixer') {
                execCommand(command);
                reset();
                fixContent(root);
            }
        }
    };
});