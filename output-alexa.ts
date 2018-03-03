
import { DryUttExpanderData, SourceSlot, SourceIntent } from './types';
import * as fs from 'fs';

var debug = require('debug')('dry-interaction-expander:output-alexa');
const LOG = debug;
const WARN = console.warn;

interface AlexaIntent {
    name: string,
    // Slots and samples are optional for the case of using built-in intents:
    slots?: Array<{
        name: string,
        type: string
    }>
    samples?: Array<string>
};

interface AlexaEntity {
    name: string,
    values: Array<{
        name: {
            value: string
        }
    }>
};

// Instatiate a skeleton object of the Alexa JSON format, defining types:
let AlexaJson = {
    interactionModel: {
        languageModel: {
            invocationName: "name",
            intents: <AlexaIntent[]>[],
            types: <AlexaEntity[]>[]
        }
    }
};

export function outputAlexa(data: DryUttExpanderData, outputFolder: string) {
    LOG("outputAlexa()...");
    let alexaModel = AlexaJson.interactionModel.languageModel;

    alexaModel.invocationName = data.invocationName;

    for (let sourceIntent of data.intents) {
        let alexaIntent: AlexaIntent = { name: sourceIntent.name, slots: [], samples: [] };
        for (let sentence of sourceIntent.expandedSentences) {

            alexaIntent.samples.push(
                // Reformat <slot> to {slot}:
                sentence.replace(/(<([a-zA-Z_][a-zA-Z0-9_-]*)>)/g, "{$2}")
            );
        }
        for (let slot of sourceIntent.getSlots()) {
            alexaIntent.slots.push(slot);
        }
        // Clean up empty arrays in Alexa intent:
        if (alexaIntent.samples.length == 0) delete alexaIntent.samples;
        if (alexaIntent.slots.length == 0) delete alexaIntent.slots;
        // And finally, push the Intent into the Alexa output model:
        alexaModel.intents.push(alexaIntent);
    }
    for (let sourceEntity of data.entities) {
        let alexaEntity: AlexaEntity = { name: sourceEntity.name, values: [] };
        for (let sentence of sourceEntity.expandedSentences) {
            // Alexa entity values have a strange format:
            alexaEntity.values.push({ name: { value: sentence } });
        }

        if (alexaEntity.values.length == 0) delete alexaEntity.values;

        alexaModel.types.push(alexaEntity);
    }

    console.log(JSON.stringify(AlexaJson, null, 2));

    fs.writeFileSync(`${outputFolder}/${data.lang}.json`, JSON.stringify(AlexaJson, null, 2));

}