#!/usr/bin/env ts-node

var commander = require('commander');

import { DryUttExpanderData } from './types';
import { readSource } from './read-source';
import { expandSentences } from './expand-sentences';
import { outputAlexa } from './output-alexa';

const LOG = console.log;


/** Our main internal data storage global */
var data = new DryUttExpanderData();

commander
    .version('0.1.0')
    .description("Processes 'DRY' (Don't Repeat Yourself) interaction model source into voice assistant platform formats")
    .usage("[options] <source_file>")
    .option('-a, --alexa', 'Produce Alexa ASK output (default on)')
    .option('-d, --dialogflow', 'Produce Dialogflow (Google) output (default on)')
    .option('-n, --no-order', "Don't order (alphabetise) output")
    .parse(process.argv);

// If neither target specified, then default is both targets:
if (!commander.alexa && !commander.dialogflow) commander.alexa = commander.dialogflow = true;

if (commander.args.length < 1) {
    console.error("index: ERROR: No <source_file> given.")
    commander.help();
    process.exit(1);
} else {
    var currentArg = 0;

    // Read the first source file, and chain to read others:
    nextSource();

    /** Function to read all source files. Uses Promise.then() chaining to deal with async read: */
    function nextSource() {
        LOG("Reading source file:", commander.args[currentArg]);
        readSource(commander.args[currentArg], data)
            .then(() => {
                if (++currentArg < commander.args.length)
                    nextSource();
                else   // Done reading input. Produce output:
                    sourceReadCompletes();
            })
            .catch((err) => {
                console.error("ERROR:", err);
            });
    }
}

function sourceReadCompletes() {
    LOG("produceOutput():...");

    // Sort intents, to make output insentitive to input source details:
    data.intents.sort((i1, i2) => { return (i1.name < i2.name) ? +1 : -1 });

    for (var intent of data.intents) {
        expandSentences(data, intent);
        LOG("Intent data after expansion:\n", intent);
        // console.dir(intent);
    }

    outputAlexa(data);

}

