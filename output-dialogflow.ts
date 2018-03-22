
import { DryUttExpanderData, SourceSlot, SourceIntent } from './types';
import * as fs from 'fs';

var debug = require('debug')('dry-vac:output-dialogflow');
const LOG = debug;
const WARN = console.warn;
const ERROR = console.error;

/** 'global' object contains our source data: */
declare var global: { dieData: DryUttExpanderData };

/** Structure used for one Entity entry in Dialogflow 'entities/*_entries_en.json' */
interface DialogflowEntityItem {
    value: string,
    synonyms: string[]
};

/** Structure used for one example sentence in Dialogflow 'intents/*_usersays_en.json' file */
interface DialogflowUserSaysItem_V1 {
    id: string,
    data: Array<{ text: string, userDefined: boolean }>,
    isTemplate: boolean,
    count: number,
    updated: number
};

interface DialogflowUserSaysItem {
    name: string,
    type: string,
    timesAddedCount: number,
    parts: any[]
};


export function outputDialogflow(outputFolder: string) {
    LOG("outputDialogflow()...");
    let fd: number, outfilePath: string, guid: string;

    //checkAgentRootFiles(outputFolder);

    let data = global.dieData;

    const lang = data.lang.substr(0, 2);
    let comma: string;   // - Array separator mechanism


    // For each Intent, write out the 'usersays' file:
    // for (let sourceIntent of data.intents) {
    //     outfilePath = `${intentsPath}/${sourceIntent.name}_usersays_${lang}.json`;
    //     try {
    //         fd = fs.openSync(outfilePath, 'w');
    //         fs.appendFileSync(fd, '[');
    //         console.log(`Writing to ${outfilePath}`);
    //         comma = "";
    //         for (let sentence of sourceIntent.expandedSentences) {
    //             let userSaysItem = getDialogflowUserSaysItem(sentence, sourceIntent);
    //             fs.appendFileSync(fd, comma + '\n' + JSON.stringify(userSaysItem, null, 2));
    //         }
    //         fs.appendFileSync(fd, '\n]');
    //         fs.closeSync(fd);
    //     } catch (err) {
    //         ERROR(`ERROR: ${err}\nWriting Dialogflow intent file: ${outfilePath}`);
    //         process.exit(1);
    //     }
    // }

    // For each Intent, write out the 'usersays' file:
    for (let sourceIntent of data.intents)
        writeIntent(sourceIntent, outputFolder);


    // For each Entity, write out the 'entries' file:
    for (let sourceEntity of data.entities)
        writeEntity(sourceEntity, outputFolder);

}

function writeIntent(sourceIntent, outputFolder: string) {
    const outfilePath = `${outputFolder}/INTENT-${sourceIntent.name}.json`;

    // Setup new Entity structure, and set some defaults:
    let newIntent: any;

    // Use the pre-existing file as a template for the new file:
    // This keeps the Intent as unchanged as possible from what it looks like
    // when downloaded from Dialogflow:
    try {
        newIntent = JSON.parse(fs.readFileSync(outfilePath).toString(),
            // Use parse() 'reviver' to skip training phrases from disk:    
            (k, v) => { return (k === "trainingPhrases") ? undefined : v });
    } catch (e) {
        newIntent = {};
    };
    newIntent.displayName = sourceIntent.name;
    newIntent.trainingPhrases = [];

    // Detect file read failure OR a file just lacking important details:        
    if (typeof newIntent.isFallBack === 'undefined') {
        WARN(`WARNING:Couldn't read Intent config details in file '${outfilePath}'.`);
        WARN(`       :Output file will likely NOT be importable into Dialogflow.`);
        WARN(`       :Recommend downloading a working Intent as a skeleton.`);
    }

    try {
        for (let sentence of sourceIntent.expandedSentences) {
            let templatePart = getDialogflowTemplatePart(sentence, sourceIntent);
            let newPhrase = {
                parts: [templatePart],
                name: undefined,   // TODO: Blank GUIDs(Names) might be problematic...
                type: "TEMPLATE",
                timesAddedCount: 0
            };
            newIntent.trainingPhrases.push(newPhrase);
        }
        console.log(`Writing to ${outfilePath}`);
        fs.writeFileSync(outfilePath, JSON.stringify(newIntent, null, 2));

    } catch (err) {
        ERROR(`ERROR: ${err}\nWriting Dialogflow intent file: ${outfilePath}`);
        process.exit(1);
    }
}

function writeEntity(sourceEntity, outputFolder) {
    const outfilePath = `${outputFolder}/ENTITY-${sourceEntity.name}.json`;

    // Setup new Entity structure, and set some defaults:
    let newEntity = {
        name: undefined,
        displayName: sourceEntity.name,

        kind: "KIND_MAP",
        autoExpansionMode: "AUTO_EXPANSION_MODE_UNSPECIFIED",
        entities: []
    };


    // Try to get some fields from existing file:
    // This keeps the Entity as unchanged as possible from what it looks like
    // when downloaded from Dialogflow:
    try {
        let onDiskEntity = JSON.parse(fs.readFileSync(outfilePath).toString());
        newEntity.name = onDiskEntity.name;
        newEntity.kind = onDiskEntity.kind;
        newEntity.autoExpansionMode = onDiskEntity.AUTO_EXPANSION_MODE_UNSPECIFIED;
    } catch (e) { };


    // Now construct the core content of the entity:
    try {
        for (let sentence of sourceEntity.expandedSentences) {
            let entityItem: DialogflowEntityItem = { value: sentence, synonyms: [sentence] };
            newEntity.entities.push(entityItem);
        }
        console.log(`Writing to ${outfilePath}`);
        fs.writeFileSync(outfilePath, JSON.stringify(newEntity, null, 2));
    } catch (err) {
        ERROR(`ERROR: ${err}\nWriting Dialogflow entity file: ${outfilePath}`);
        process.exit(1);
    }
}

function getDialogflowTemplatePart(sentence: string, sourceIntent: SourceIntent): DialogflowUserSaysItem {

    // We create a Dialogflow sentence in TEMPLATE mode, because:
    // a) It's a simpler, more compact structure
    // b) It doesn't need sample text for the slot position.
    // It need to look something like this:
    // {
    //     "parts": [
    //         {
    //             "text": "I just fed the @Animal:Animal",
    //             "entityType": "",
    //             "alias": "",
    //             "userDefined": false
    //         }
    //     ],
    //     "name": "4d284def-9442-41ab-9db6-61040ec7f994",
    //     "type": "TEMPLATE",
    //     "timesAddedCount": 0
    // },

    let dfText = sentence.replace(/(<[^>]+>)/g, (slotSpec: string) => {
        let slotName = slotSpec.substr(1, slotSpec.length - 2);
        let slotType = sourceIntent.getSlot(slotName).type;
        return `@${slotType}:${slotName}`;
    });

    let trainingPhrase: DialogflowUserSaysItem = {
        parts: [{
            text: dfText,
            entityType: "",
            alias: "",
            userDefined: false
        }],
        name: undefined, type: "TEMPLATE", timesAddedCount: 0
    };
    return trainingPhrase;
}

function getDialogflowUserSaysItem_V1(sentence: string, sourceIntent: SourceIntent): DialogflowUserSaysItem_V1 {

    // We create a Dialogflow sentence in TEMPLATE mode, because:
    // a) It's a simpler, more compact structure
    // b) It doesn't need sample text for the slot position.
    // It need to look something like this:
    //   {
    //     "id": "359d56b2-49f0-4067-ba94-cac511081a36",
    //     "data": [
    //       {
    //         "text": "I just fed the @AnimalEntity:Animal",
    //         "userDefined": false
    //       }
    //     ],
    //     "isTemplate": true,
    //     "count": 0,
    //     "updated": 1520250450
    //   },

    let userSaysItem: DialogflowUserSaysItem_V1 = { id: '', data: [], isTemplate: true, count: 0, updated: 1503833609 };

    let dfText = sentence.replace(/(<[^>]+>)/g, (slotSpec: string) => {
        let slotName = slotSpec.substr(1, slotSpec.length - 2);
        let slotType = sourceIntent.getSlot(slotName).type;
        return `@${slotType}:${slotName}`;
    });

    userSaysItem.data.push({ text: dfText, userDefined: false });
    return userSaysItem;
}

function checkAgentRootFiles(outputFolder: string) {
    let path = `${outputFolder}/agent.json`;
    let missing = false;
    if (fs.existsSync(path) && fs.statSync(path).isFile()) {
        // All good
    } else {
        WARN(`WARNING: Dialogflow Agent folder appears non-complete. Missing: ${path}`);
        missing = true;
    }
    path = `${outputFolder}/package.json`;
    if (!fs.accessSync(path)) {
        WARN(`WARNING: Dialogflow Agent folder appears non-complete. Missing: ${path}`);
    }
    if (missing) {
        WARN(`       : You may want to 'Export' and extract an existing project as a template.`);
    }
}


function mkdir(path: string) {
    try {
        if (!fs.existsSync(`${path}/.`)) fs.mkdirSync(path);
    } catch (err) {
        ERROR(`ERROR: ${err}\nCreating required Dialogflow output folder: ${path}`);
        process.exit(1);
    }
}