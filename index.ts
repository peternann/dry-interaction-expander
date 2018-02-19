#!/usr/bin/env ts-node

var commander = require('commander');

import { DieData } from './types';
import { readSource } from './read-source';
import { expandSentences } from './expand-sentences';

const LOG = console.log;


/** Our main internal data storage global */
var data = new DieData();

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
    /** Function to read all source files. Uses Promise.then() chaining to deal with async read: */
    function nextSource() {
        LOG("Reading source file:", commander.args[currentArg]);
        readSource(commander.args[currentArg], data)
            .then(() => {
                if (++currentArg < commander.args.length)
                    nextSource();
                else
                    produceOutput();
            })
            .catch((err) => {
                console.error("ERROR:", err);
            });
    }
    nextSource();
}

function produceOutput() {
    LOG("produceOutput():...");
    for (var intent in data.intents) if (data.intents.hasOwnProperty(intent)) {
        expandSentences(data, intent);
    }
}


// process.exit();

// console.log('you ordered a pizza with:');
// if (program.peppers) console.log('  - peppers');
// if (program.pineapple) console.log('  - pineapple');
// if (program.bbqSauce) console.log('  - bbq');
// console.log('  - %s cheese', program.cheese);

