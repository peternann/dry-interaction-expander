
import { DryUttExpanderData, SourceIntent } from './types';

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

export function outputAlexa(data: any) {
    let model = AlexaJson.interactionModel.languageModel;

    model.invocationName = data.invocationName;

    for (var intentName in data.intents) if (data.intents.hasOwnProperty(intentName)) {
        let intentData: SourceIntent = data.intents[intentName];
        let newIntent: AlexaIntent = { name: intentName };
        for (let sentence of intentData.expandedSentences) {
            if (!newIntent.samples) newIntent.samples = [];
            // TODO: Re-format slots like "<number>" into Alexa format:
            newIntent.samples.push(sentence);
        }
        // TODO: Add Slot data into Intent, in Alexa format.
        // if (intentData.slots) for (let sentence of intentData.slots) {
        //     newIntent.
        //         model.intents.push(newIntent);

        // }
    }

    LOG(JSON.stringify(model, null, 2));


}