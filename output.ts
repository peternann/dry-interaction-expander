

import { DryUttExpanderData, SentenceCollection } from './types';
import { expandSentence } from './expand-sentences';
import { outputAlexa } from './output-alexa';
import { outputDialogflow } from './output-dialogflow';

var debug = require('debug')('dry-interaction-expander:index');
const LOG = debug;
const ERROR = console.error;

declare var global: any;


export function produceOutput(platform: string, outPath: string) {
    LOG("produceOutput():...");

    let data = global.dieData;

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

    if (platform == 'a') {
        outputAlexa(data, outPath);
    }
    if (platform == 'd') {
        outputDialogflow(data, outPath);
    }
}

