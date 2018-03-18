
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
interface DialogflowUserSaysItem {
    id: string,
    data: Array<{ text: string, userDefined: boolean }>,
    isTemplate: boolean,
    count: number,
    updated: number
};


export function outputDialogflow(outputFolder: string) {
    LOG("outputDialogflow()...");
    let fd: number, outfilePath: string;

    //checkAgentRootFiles(outputFolder);

    let data = global.dieData;

    // const intentsPath = `${outputFolder}/intents`;
    // const entitiesPath = `${outputFolder}/entities`;
    // if (data.intents.length > 0) mkdir(intentsPath);
    // if (data.entities.length > 0) mkdir(entitiesPath);
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

    // For each Entity, write out the 'entries' file:
    for (let sourceEntity of data.entities) {
        outfilePath = `${outputFolder}/ENTITY-${sourceEntity.name}.json`;

        try {
            fd = fs.openSync(outfilePath, 'w');
            fs.appendFileSync(fd,
                `{\n` +
                `"name": "",\n` +
                `"displayName": "Animal",\n` +
                `"kind": "KIND_MAP",\n` +
                `"autoExpansionMode": "AUTO_EXPANSION_MODE_UNSPECIFIED",\n` +
                `"entities": [`
            );
            console.log(`Writing to ${outfilePath}`);
            let entityItem: DialogflowEntityItem;
            comma = "";   // - Array separator mechanism
            for (let sentence of sourceEntity.expandedSentences) {
                entityItem = { value: sentence, synonyms: [sentence] };
                fs.appendFileSync(fd, comma + '\n' + JSON.stringify(entityItem, null, 2));
                if (comma === "") comma = ',';
            }
            fs.appendFileSync(fd, '\n]\n}');
            fs.closeSync(fd);
        } catch (err) {
            ERROR(`ERROR: ${err}\nWriting Dialogflow entity file: ${outfilePath}`);
            process.exit(1);
        }
    }
}

function getDialogflowUserSaysItem(sentence: string, sourceIntent: SourceIntent): DialogflowUserSaysItem {

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

    let userSaysItem: DialogflowUserSaysItem = { id: '', data: [], isTemplate: true, count: 0, updated: 1503833609 };

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