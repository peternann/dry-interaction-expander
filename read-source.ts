
import * as fs from 'fs';

import { LineReader } from './line-reader';
import { DryUttExpanderData, SourceIntent } from './types';

var debug = require('debug')('dry-interaction-expander:read-source');
const LOG = debug;
const WARN = console.warn;
const ERROR = console.error;

/** 'global' object contains our source data: */
declare var global: { dieData: DryUttExpanderData };


export function readSource(sourceFile: string, platform: string) {

    let data = global.dieData;


    let reader = new LineReader(sourceFile);
    let line: string, originalLine: string;
    let lineCount: number = 0;
    while (null !== (line = reader.nextLine())) {
        ++lineCount;

        originalLine = line;
        line = line.trim();
        LOG('Got (trimmed) line:', ('"' + line + '"'));
        var match;

        if ((match = line.match(/(.*)(#.*)$/i)) !== null) {
            LOG(`Erasing comment:${match[2]}`);
            line = match[1].trim();
        }

        // Clean whitespace:
        line = line
            .replace(/\s+$/, '')       // - Trim trailing
            .replace(/\s\s+/g, ' ');   // - Compact any multiples to one ' '

        if (line.length == 0) {
            LOG("Ignoring empty line...");

            // By having the 'normal sentence' RegEx near the top, I assume we save CPU by not
            // having to do the othes, HOWEVER this may or not be optimal...
        } else if ((match = line.match(/^[^:=]+$/i)) !== null) {
            // Anything without a colon or equals we take to be a sentence line:
            // Probably we could be a lot smarter:
            gotUtterance(line);
        } else if ((match = line.match(/^([a-z0-9_-]+)\s*=\s*(.*)$/i)) !== null) {
            gotVarDecl(line, match);
        } else if ((match = line.match(/^INVOCATION_NAME:\s*([a-z0-9_ -]+)$/i)) !== null) {
            data.invocationName = match[1];
            LOG("Got Invocation name:", data.invocationName);
        } else if ((match = line.match(/^INTENT:\s*(.+)$/i)) !== null) {
            gotIntentDecl(line, match);
        } else if ((match = line.match(/^SLOT:\s*([a-z0-9_-]+)(:([a-z0-9_.-]+))?\s*$/i)) !== null) {
            gotSlotDecl(line, match);
        } else if ((match = line.match(/^ENTITY:\s*([a-z0-9_-]+)$/i)) !== null) {
            gotEntityDecl(line, match);
        } else if ((match = line.match(/^LANG(UAGE)?:\s*([a-z0-9._-]+)$/i)) !== null) {
            data.lang = match[2];
            LOG(`Got Language Decl: "${data.lang}"`);
        } else {
            // Only reason we get here (currently), is a colon in an unrecognised line:
            ERROR(`ERROR: Malformed line: "${originalLine}", located at:\n${sourceFile}:${lineCount}`);
            process.exit(1);
        }
    }
    return;

    function gotVarDecl(line, match) {
        let name = match[1].toLowerCase();
        let value = match[2];
        LOG(`Got variable: "${name}" = "${value}"`);
        data.vars[name] = value;
    }

    function gotIntentDecl(line, match) {
        let name = match[1];
        LOG(`Got Intent Decl: "${name}"`);
        data.setIntent(name);
    }

    function gotEntityDecl(line, match) {
        let name = match[1];
        LOG(`Got Entity Decl: "${name}"`);
        data.setEntity(name);
    }

    function gotSlotDecl(line, match) {
        // See RegEx used above:
        let name = match[1],
            type = match[3];
        LOG(`Got Slot: "${name}:${type}"`);
        if (data.currentCollection instanceof SourceIntent) {
            data.currentCollection.setSlot(name, type);
        } else {
            WARN(`Detected SLOT declaration not in INTENT definition. (Ignored)\nLine: ${line}`);
        }
    }

    function gotUtterance(utt) {
        LOG(`Got Utterance: "${utt}"`);
        // We put the sentences into an array in reverse appearance order via 'unshift'.
        // Why? Because we do a lot of busy work processing later with pop (and push) - potentially more
        // efficient on large arrays, which essentially ends up consuming them in original order:
        data.currentCollection.addSentence(utt);
    }

}



