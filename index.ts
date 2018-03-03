#!/usr/bin/env ts-node

var commander = require('commander');

import { DryUttExpanderData, SentenceCollection } from './types';
import { readSource } from './read-source';
import { expandSentence } from './expand-sentences';
import { outputAlexa } from './output-alexa';

var debug = require('debug')('dry-interaction-expander:index');
const LOG = debug;
const ERROR = console.error;


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
    ERROR("index: ERROR: No <source_file> given.")
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
                    produceOutput();
            })
            .catch((err) => {
                ERROR("ERROR:", err);
            });
    }
}

function produceOutput() {
    LOG("produceOutput():...");

    // Sort intents, to make output insentitive to input source details:
    data.intents.sort((i1, i2) => { return (i1.name < i2.name) ? +1 : -1 });

    // We can expand the sentences in Intents and Entities in one loop since they
    // both are SentenceCollections:
    let BothCollections: SentenceCollection[] = data.intents;
    BothCollections = BothCollections.concat(data.entities);
    for (var sentenceCollection of BothCollections) {
        sentenceCollection.expandedSentences = [];
        for (let sourceSentence of sentenceCollection.sourceSentences)
            expandSentence(sourceSentence, data, sentenceCollection.expandedSentences);
        // By default, we sort the output sentences. This should make it neater to compare
        // 'before and after' vesions of all expanded sentences, irrespective of the input source
        //  details/order, or the vagueries of the expansion logic:
        sentenceCollection.expandedSentences.sort();
    }

    outputAlexa(data);

}

