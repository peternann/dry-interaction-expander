
const readLineByLine = require('linebyline');

const LOG = console.log;

import { DryUttExpanderData, SourceIntent } from './types';


export function readSource(sourceFile: string, data: DryUttExpanderData): Promise<string> {

    return new Promise((resolve, reject) => {
        readLineByLine(sourceFile)
            .on('line', function (line, lineCount, byteCount) {
                line = line.trim();
                LOG('Got (trimmed) line:', ('"' + line + '"'));
                var match;

                if ((match = line.match(/(.*)(#.*)$/i)) !== null) {
                    LOG(`Erasing comment:${match[2]}`);
                    line = match[1].trim();
                }

                // Compact any whitespace strings to single space:
                line = line.replace(/\s\s+/g, ' ');

                if (line.length == 0) {
                    LOG("Ignoring empty line...");
                } else if ((match = line.match(/^([a-z0-9_-]+)\s*=\s*(.*)$/i)) !== null) {
                    gotVarDecl(line, match);
                } else if ((match = line.match(/^INVOCATION_NAME:\s*([a-z0-9_ -]+)$/i)) !== null) {
                    data.invocationName = match[1];
                    LOG("Got Invocation name:", data.invocationName);
                } else if ((match = line.match(/^INTENT:\s*([a-z0-9_-]+)$/i)) !== null) {
                    gotIntentDecl(line, match);
                    // } else if ((match = line.match(/^[a-z0-9_'\$ -]+$/i)) !== null) {
                    //     gotUtterance(line, match);
                } else if ((match = line.match(/^SLOT:\s*([a-z0-9_-]+)(:([a-z0-9_.-]+))?\s*$/i)) !== null) {
                    gotSlotDecl(line, match);
                    // } else if ((match = line.match(/^[a-z0-9_'\$ -]+$/i)) !== null) {
                    //     gotUtterance(line, match);
                } else {
                    // LOG(`Unknown line format: "${line}"`);
                    gotUtterance(line);
                }

            })
            .on('error', (e) => {
                // something went wrong 
                reject(e);
            })
            .on('end', () => { resolve("OK") });

    });


    function gotVarDecl(line, match) {
        let name = match[1].toLowerCase();
        let value = match[2];
        LOG(`Got variable: "${name}" = "${value}"`);
        data.vars[name] = value;
    }

    function gotIntentDecl(line, match) {
        let name = match[1];
        LOG(`Got Intent: "${name}"`);
        data.setCurrentIntent(name);
    }

    function gotSlotDecl(line, match) {
        // See RegEx used above:
        let name = match[1],
            type = match[3];
        LOG(`Got Slot: "${name}:${type}"`);
        data.currentIntent.setSlot(name, type);
    }

    function gotUtterance(utt) {
        LOG(`Got Utterance: "${utt}"`);
        // We put the sentences into an array in reverse appearance order via 'unshift'.
        // Why? Because we do a lot of busy work processing later with pop (and push) - potentially more
        // efficient on large arrays, which essentially ends up consuming them in original order:
        data.currentIntent.newSourceSentence(utt);
    }

}



