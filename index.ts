#!/usr/bin/env ts-node

import * as commander from 'commander';
import * as fs from 'fs';


import { DryUttExpanderData } from './types';
import { readSource } from './read-source';
import { produceOutput } from './output';

var debug = require('debug')('dry-interaction-expander:index');
const LOG = debug;
const ERROR = console.error;

// Declare 'global' variable for convenient access to source NL data:
declare var global: any;


// Define our CLI interface with 'commander' package:
commander
    .description("Processes 'DRY' (Don't Repeat Yourself) interaction model source into voice assistant platform formats")
    .usage("[options] <-a path and/or -d path> <source_file>")
    .option('-a, --alexa <path>', "Produce Alexa ASK output into 'path/'")
    .option('-d, --dialogflow <path>', "Produce Dialogflow (Google) output into 'path/'")
    .option('-n, --no-order', "Don't order (alphabetise) output")
    .version('0.1.0')
    .parse(process.argv);

/** Helper function to show usage and exit */
function usage() { commander.help(); process.exit(1) }

// If neither target specified, we've got nothing to do:
if (!commander.alexa && !commander.dialogflow) {
    ERROR("ERROR: One of either -a or -d must be given.");
    usage();
}

for (let platform of ['alexa', 'dialogflow']) {
    if (commander[platform]) {
        // Remove any trailing slashes: They look bad on error output:
        commander[platform] = commander[platform].replace(/\/+$/, '');

        if (fs.existsSync(commander[platform] + '/.')) {
            LOG("${platform} output folder OK - Carry on.");
        } else {
            ERROR(`ERROR: ${platform} folder specified does not exist: '${commander[platform]}'`);
            process.exit(1);
        }
    }
}

if (commander.args.length < 1) {
    ERROR("index: ERROR: No <source_file> given.")
    commander.help();
    process.exit(1);
}

//
// ################################################################################################
// #### Finally, process the files and produce output:
// #### We do separate runs for each platform, to cater for platform-directives in source:
// ################################################################################################
//

if (commander.alexa) {
    global.dieData = new DryUttExpanderData();
    for (let sourceFile of commander.args)
        readSource(sourceFile, 'a');
    produceOutput('a', commander.alexa);
}

if (commander.dialogflow) {
    global.dieData = new DryUttExpanderData();
    for (let sourceFile of commander.args)
        readSource(sourceFile, 'd');
    produceOutput('d', commander.dialogflow);
}

// Processing finished, seemingly OK:
console.log("Done.");
process.exit(0);

