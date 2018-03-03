
import { DryUttExpanderData, SourceSlot, SourceIntent } from './types';

const LOG = console.log;

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

export function outputAlexa(data: DryUttExpanderData) {
    LOG("outputAlexa()...");
    let alexaModel = AlexaJson.interactionModel.languageModel;

    alexaModel.invocationName = data.invocationName;

    for (let sourceIntent of data.intents) {
        let alexaIntent: AlexaIntent = { name: sourceIntent.name, samples: [], slots: [] };
        for (let sentence of sourceIntent.expandedSentences) {
            // TODO: Re-format slots like "<number>" into Alexa format:
            alexaIntent.samples.push(sentence);
        }
        // TODO: Add Slot data into Intent, in Alexa format.
        for (let slot of sourceIntent.getSlots()) {
            alexaIntent.slots.push(slot);
        }
        // Clean up empty arrays in Alexa intent:
        if (alexaIntent.samples.length == 0) delete alexaIntent.samples;
        if (alexaIntent.slots.length == 0) delete alexaIntent.slots;
        // And finally, push the Intent into the Alexa output model:
        alexaModel.intents.push(alexaIntent);
    }

    LOG(JSON.stringify(AlexaJson, null, 2));


}