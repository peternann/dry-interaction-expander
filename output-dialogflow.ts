
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
	data: Array<{ text: string, alias?: string, meta?: string, userDefined: boolean }>,
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
	//             fs.appendFileSync(fd, comma + '\n' + JSON.stringify(userSaysItem, null, 4));
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
		updateIntent(sourceIntent, lang, outputFolder);


	// For each Entity, write out the 'entries' file:
	for (let sourceEntity of data.entities)
		updateEntity(sourceEntity, lang, outputFolder);

}

function updateIntent(sourceIntent, lang: string, outputFolder: string) {
	// const outfilePath = `${outputFolder}/INTENT-${sourceIntent.name}.json`;
	const pathV1 = `${outputFolder}/intents/${sourceIntent.name}_usersays_${lang.toLowerCase()}.json`;
	const pathV2 = `${outputFolder}/INTENT-${sourceIntent.name}.json`;

	let format: string, filePath: string;
	let intentData: any;
	if (fs.existsSync(pathV1)) {
		format = "V1";
		filePath = pathV1;
	} else if (fs.existsSync(pathV2)) {
		format = "V2";
		filePath = pathV2;
	} else {
		WARN(`Didn't find existing Intent data for ${sourceIntent.name} - Writing V2 format...`);
		format = "V2";
		filePath = pathV2;
	}


	// Use the pre-existing file as a template for the new file:
	// This keeps the Intent as unchanged as possible from what it looks like
	// when downloaded from Dialogflow:
	try {
		intentData = JSON.parse(fs.readFileSync(filePath).toString(),
			// Use parse() 'reviver' to skip training phrases from disk:    
			(k, v) => { return (k === "trainingPhrases") ? undefined : v });
	} catch (e) {
		WARN(`Didn't find existing Intent data at '${filePath}' - Writing V2 format...`);
		format = "V2";
		filePath = pathV2;
		intentData = {};
	};

	try {
		if (format === 'V1') {

			// WARN(`HACK: Sort input file for better diffing:`);
			// intentData.sort(sentenceCompare);
			// fs.writeFileSync(pathV1.replace('OUTPUT', 'INPUT'), JSON.stringify(intentData, null, 4));

			// To maintain as much data as possible from the existing file, we build a map of existing sentences,
			// keyed to the sentence text, as a potential template for new, equivalent data:
			const oldSentences = {};
			for (let sentence of intentData) {
				let dataString = JSON.stringify(sentence.data);
				oldSentences[dataString] = sentence;
			}

			// Create the new sentence data:
			intentData = [];
			for (let sentence of sourceIntent.expandedSentences) {
				let newSentence = getDialogflowV1UserSaysItem_NotTemplate(sentence, sourceIntent);

				// If there is an old matching sentence, copy some stuff over:
				let oldSentence = oldSentences[JSON.stringify(newSentence.data)];
				if (oldSentence) {
					newSentence.id = oldSentence.id;
					newSentence.count = oldSentence.count;
					newSentence.updated = oldSentence.updated;
				}

				intentData.push(newSentence);
			}

			// Sort the sentences in a deterministic way to aid diffing:
			// We sort by length first to float simplest versions to the top, then by text:
			intentData.sort(sentenceCompare);

		} else if (format === 'V2') {

			intentData.trainingPhrases = [];

			// Detect file read failure OR a file just lacking important details:        
			if (typeof intentData.isFallBack === 'undefined') {
				WARN(`WARNING:Couldn't read Intent config details in file '${filePath}'.`);
				WARN(`       :Output file will likely NOT be importable into Dialogflow.`);
				WARN(`       :Recommend downloading a working Intent as a skeleton.`);
			}

			for (let sentence of sourceIntent.expandedSentences) {
				let templatePart = getDialogflowV2TemplatePart(sentence, sourceIntent);
				let newPhrase = {
					parts: [templatePart],
					name: undefined,   // TODO: Blank GUIDs(Names) might be problematic...
					type: "TEMPLATE",
					timesAddedCount: 0
				};
				intentData.trainingPhrases.push(newPhrase);
			}

		}

	} catch (err) {
		ERROR(`ERROR:Writing Dialogflow intent file: ${filePath} :`, err);
		process.exit(1);
	}

	console.log(`Writing to ${filePath}`);
	fs.writeFileSync(filePath, JSON.stringify(intentData, null, 4));

}

function updateEntity(sourceEntity, lang: string, outputFolder) {
	const pathV1 = `${outputFolder}/entities/${sourceEntity.name}_entries_${lang.toLowerCase()}.json`;
	const pathV2 = `${outputFolder}/ENTITY-${sourceEntity.name}.json`;

	let format: string, outfilePath: string;
	let entityData: any;
	if (fs.existsSync(pathV1)) {
		format = "V1";
		entityData = JSON.parse(fs.readFileSync(pathV1).toString());
		outfilePath = pathV1;
	} else if (fs.existsSync(pathV2)) {
		format = "V2";
		entityData = JSON.parse(fs.readFileSync(pathV2).toString());
		outfilePath = pathV2;
	} else {
		WARN(`Didn't find existing Entity data for ${sourceEntity.name} - Writing V2 format...`);
		format = "V2";
		outfilePath = pathV2;
		entityData = {};
	}


	// // Try to get some fields from existing file:
	// // This keeps the Entity as unchanged as possible from what it looks like
	// // when downloaded from Dialogflow:
	// try {
	// 	entityData = JSON.parse(fs.readFileSync(outfilePath).toString());
	// 	newEntity.name = onDiskEntity.name;
	// 	newEntity.kind = onDiskEntity.kind;
	// 	newEntity.autoExpansionMode = onDiskEntity.AUTO_EXPANSION_MODE_UNSPECIFIED;
	// } catch (e) { };


	// // Setup new Entity structure, and set some defaults:
	// let newEntity = {
	// 	name: undefined,
	// 	displayName: sourceEntity.name,

	// 	kind: "KIND_MAP",
	// 	autoExpansionMode: "AUTO_EXPANSION_MODE_UNSPECIFIED",
	// 	entities: []
	// };




	// Now construct the core content of the entity:
	try {

		if (format === 'V1') {
			entityData.entities = [];
			for (let sentence of sourceEntity.expandedSentences) {
				let entityItem: DialogflowEntityItem = { value: sentence, synonyms: [sentence] };
				entityData.entities.push(entityItem);
			}
			console.log(`Writing to ${outfilePath}`);
		}

		fs.writeFileSync(outfilePath, JSON.stringify(entityData, null, 4));

	} catch (err) {
		ERROR(`ERROR:Writing Dialogflow entity file: ${outfilePath}\n`, err);
		process.exit(1);
	}
}

function getDialogflowV2TemplatePart(sentence: string, sourceIntent: SourceIntent): DialogflowUserSaysItem {

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

/**
 * CURRENTLY UNUSED. Dialogflow is not stable with 'isTemplate: true' style example sentences.
 * INSTEAD, see getDialogflowV1UserSaysItem_NotTemplate() further below:
 * @param sentence 
 * @param sourceIntent 
 */
function getDialogflowV1UserSaysItem_IsTemplate(sentence: string, sourceIntent: SourceIntent): DialogflowUserSaysItem_V1 {

	// We create a Dialogflow sentence in isTemplate=true mode, because:
	// a) It's a simpler, more compact structure
	// b) It doesn't need sample text for the slot position.
	// It needs to look something like this:
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

	// Slot specs could be either like:
	// <slotType> or:
	// <slotType:example words>:

	let dfText = sentence;
	// Translate slot notation into Dialogflow format:
	// First, simple slots like "<location>"" or "<location:New York>"
	dfText = dfText.replace(/<([^:>]+)(:([^>]+))?>/g, (match: string, slotName: string, ign, slotExample: string) => {
		LOG("getDialogflowV1UserSaysItem():Processing slot spec:", match);
		let slotInfo = sourceIntent.getSlot(slotName);
		if (!slotInfo) {
			ERROR(`getDialogflowV1UserSaysItem():Couldn't get slot info for slot: ${slotName}`);
			ERROR(`                             :Slots available: %O`, sourceIntent.getSlots());
		}
		if (typeof slotExample !== 'undefined') {
			WARN(`WARNING:Ignoring example value '${slotExample}' in slotSpec: '${match}'`);
		}
		// Non-explicit slot type means: type === name
		let slotType = slotInfo.type || slotInfo.name;
		return `@${slotType}:${slotName}`;
	});

	let userSaysItem: DialogflowUserSaysItem_V1 = {
		id: '',
		data: [{
			text: dfText,
			userDefined: false
		}],
		isTemplate: true,
		count: 0,
		updated: Math.trunc((new Date()).getTime() / 1000)
	};

	return userSaysItem;
}

function getDialogflowV1UserSaysItem_NotTemplate(sentence: string, sourceIntent: SourceIntent): DialogflowUserSaysItem_V1 {

	// We create a Dialogflow sentence in isTemplate=false mode,
	// because the Dialogflow integration with Actions is flakey with Template mode...
	// It needs to look something like this:
	//	{
	// 		"id": "47a95500-36ff-41ef-8b74-ac5ebf8a1ad2",
	// 		"data": [
	// 			{
	// 				"text": "find some cheap ",
	// 				"userDefined": false
	// 			},
	// 			{
	// 				"text": "fuel",
	// 				"alias": "fuelType",
	// 				"meta": "@fuelType",
	// 				"userDefined": false
	// 			},
	// 			{
	// 				"text": " around ",
	// 				"userDefined": false
	// 			},
	// 			{
	// 				"text": "rydalmere",
	// 				"alias": "location",
	// 				"meta": "@sys.location",
	// 				"userDefined": true
	// 			}
	// 		],
	// 		"isTemplate": false,
	// 		"count": 0,
	// 		"updated": 1533999525
	//	},

	let userSaysItem: DialogflowUserSaysItem_V1 = {
		id: '',
		data: <Array<any>>[],
		isTemplate: false,
		count: 0,
		updated: Math.trunc((new Date()).getTime() / 1000)
	};

	// Slot specs could be either like:
	// <slotType> or:
	// <slotType:example words>:

	// This RegEx is basically: ( (Anything but <>) or (A slot spec) )
	const partsRegEx = /(([^<>]+)|(<([^:>]+)(:([^>]+))?>))/g;

	var result: RegExpExecArray;
	while ((result = partsRegEx.exec(sentence)) !== null) {
		const plainText = result[2];
		const slotName = result[4];
		const exampleText = result[6];
		if (typeof plainText !== 'undefined') {
			userSaysItem.data.push({
				text: plainText,
				userDefined: false
			});
		} else {
			const slot = sourceIntent.getSlot(slotName)
			if (!exampleText && !slot.example) {
				WARN(`WARNING: Example missing in slot spec in: '${sentence}', and not defined for SLOT:`);
				WARN(`       :  Using slot name '${slotName}' as example (questionable!)`);
			}
			userSaysItem.data.push({
				text: exampleText || slot.example || slotName,
				alias: slotName,
				meta: "@" + (slot.type || slotName),
				userDefined: false
			});
		}
	}


	return userSaysItem;
}


function sentenceCompare(a, b) {
	// Get the full text sentences from the 'data' array of snippets:
	const aText = a.data.map(s => s.text).join('');
	const bText = b.data.map(s => s.text).join('');
	if (aText.length > bText.length)
		return +1;
	else if (aText.length < bText.length)
		return -1;
	else   // Lengths are equal, compare on string content:
		return (aText > bText) ? +1 : -1;
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
	if (!fs.existsSync(path)) {
		WARN(`WARNING: Dialogflow Agent folder appears non-complete. Missing: ${path}`);
	}
	if (missing) {
		WARN(`       : You may want to 'Export' and extract an existing project as a template.`);
	}
}
