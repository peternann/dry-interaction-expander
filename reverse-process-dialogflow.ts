
import * as fs from "fs";

var debug = require('debug')('dry-vac:reverse-process-dialogflow');
const LOG = debug;
const ERROR = console.error;
const SAY = console.log;


function exists(path) { return fs.existsSync(path) }
function getJSON(path) { return JSON.parse(fs.readFileSync(path, 'utf8')) }


export function reverseProcessDialogflow(dfFolder, fileToCreate) {

	if (exists(`${dfFolder}/package.json`)
		&& exists(`${dfFolder}/agent.json`)
		&& exists(`${dfFolder}/intents/.`)) {

		reverseProcessDFV1(dfFolder, fileToCreate);
	} else {
		ERROR(`ERROR: TODO: code does not exist for V2 Dialogflow reverse processing!`);
	}

	process.on('exit', () => {
		if (fs.existsSync(fileToCreate))
			SAY(`Created file ${fileToCreate}.\nSuccessful if no errors reported.`);
		process.exit(0);
	});

}

export function reverseProcessDFV1(dfFolder, fileToCreate) {
	const outFile = fs.openSync(fileToCreate, 'wx');   // wx = Write, must not exist.

	function doWrite(str) {
		fs.writeSync(outFile, str + '\n');
	}
	/** Utility function to write a line, ignoring errors: */
	function tryWrite(str) {
		try { fs.writeSync(outFile, str + '\n') } catch (e) { }
	}

	doWrite(`#### dry-vac source. Reverse engineered from ${dfFolder} at ${new Date()}.`);

	const DFAgent = getJSON(`${dfFolder}/agent.json`);

	//tryWrite(`PROJECTID: ${DFAgent.googleAssistant.project}`);
	tryWrite(`LANG: ${DFAgent.language}`);
	tryWrite(`WEBHOOK: ${DFAgent.webhook.url}`);

	const entityExamples = {};

	if (exists(`${dfFolder}/entities/.`))
		fs.readdirSync(`${dfFolder}/entities`)
			.forEach(writeEntity);
	function writeEntity(fileName) {
		if (fileName.endsWith(`_entries_${DFAgent.language}.json`)) {
			const entityName = fileName.split('_entries_')[0];
			doWrite(`\nENTITY: ${entityName}`);

			const entityValues = getJSON(`${dfFolder}/entities/${fileName}`);

			// Print out line like "dog" or "dog ~ puppy|mutt":
			for (let item of entityValues) {
				let itemLine = item.value;
				if (item.synonyms && item.synonyms.length > 0) {
					itemLine += ' ~ ' + item.synonyms.join('|');
				}
				doWrite('  ' + itemLine);
				// And capture the first entity value as the example for the entity:
				if (!entityExamples[entityName]) entityExamples[entityName] = item.value;
			}
		}
	}

	if (exists(`${dfFolder}/intents/.`))
		fs.readdirSync(`${dfFolder}/intents`)
			.forEach(writeIntent);

	function writeIntent(fileName) {
		if (fileName.endsWith(`_usersays_${DFAgent.language}.json`)) {
			const intentName = fileName.split('_usersays_')[0];

			const examples = getJSON(`${dfFolder}/intents/${fileName}`)

			let slotSet = {};
			let itemLines = [];

			// Print out line like "i like <color:red>":
			for (let example of examples) {
				let itemLine = '  ';
				for (let snippet of example.data) {
					// If the snippet has a slot reference (Evident by an 'alias' name),
					// Then store that slot info:
					if (snippet.alias) {
						// TODO: Should check that any slot appearing always has a consistent meta:
						slotSet[snippet.alias] = snippet.meta.substr(1)
						// Include the text and alias in the sentence output:
						// Like: "colour is <color~light blue>"
						itemLine += `<${snippet.alias}~${snippet.text}>`
					} else {
						// Dialogflow lines may still have content like "find me some @fuelTypeEntity:fuelType":
						// In this case, the 'type' is on the left, and the alias/handle on the right:
						// Turn it into like: "<fuelType>", and store the slot type:
						itemLine += snippet.text.replace(/@([^\s]+):([^\s]+)/g, (match, m1, m2) => {
							slotSet[m2] = m1
							return `<${m2}>`
						});
					}
				}
				itemLines.push(itemLine);
				// doWrite('  ' + itemLine);
			}

			// Finally, write out the Intent name, slots, and examples:
			doWrite(`\nINTENT: ${intentName}`);

			for (let slotName of Object.keys(slotSet)) {
				const slotType = slotSet[slotName]
				const example = entityExamples[slotType]
				let line = `SLOT: ${slotName}`
				if (slotName !== slotType) line += ` :${slotType}`
				if (example) line += ` ~${example}`
				doWrite(line)

				if (!example) {
					console.warn(`WARNING: No example text derivable for SLOT:${slotName} in INTENT:${intentName}`)
					console.warn(`       :  You should add an example like so:`)
					console.warn(`       : ${line} ~ example`)
				}
			}

			for (let line of itemLines)
				doWrite(line);

		}
	}

	fs.closeSync(outFile);
}
