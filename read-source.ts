
import * as fs from 'fs';

import { LineReader } from './line-reader';
import { DryUttExpanderData, SourceEntity, SourceIntent } from './types';

var debug = require('debug')('dry-vac:read-source');
const LOG = debug;
const WARN = console.warn;
const ERROR = console.error;

/** 'global' object contains our source data: */
declare var global: { dieData: DryUttExpanderData };

/**
 * SLOT RegEx. Supports variants like:
 * (All whitespace breaks are optional)
 * SLOT: mySlotAlias
 * SLOT:mySlotAlias : slotType                 { slotType via: (?:\s*:\s*([a-z0-9_.-]+))? }
 * SLOT:mySlotAlias:slotType ~ example text    { example text via: (?:\s*~\s*([a-z0-9_.-]*[a-z0-9_. -]*[a-z0-9_.-]))? }
 * SLOT:mySlotAlias~example text    { example text via: (?:\s*~\s*([a-z0-9_.-]*[a-z0-9_. -]*[a-z0-9_.-]))? }
 */
const reSLOT = /^SLOT:\s*([a-z0-9_-]+)(?:\s*:\s*([a-z0-9_.-]+))?(?:\s*~\s*([a-z0-9_.-]*[a-z0-9_. -]*[a-z0-9_.-]))?\s*$/i;


export function readSource(sourceFile: string, platform: string) {

	let data = global.dieData;


	let reader = new LineReader(sourceFile);
	let line: string, originalLine: string;
	let lineCount: number = 0;
	while (null !== (line = reader.nextLine())) {
		++lineCount;
		LOG(`Got original line #${lineCount}: "${line}"`);

		originalLine = line;
		line = line.trim();
		var match;

		// Trim off any comments:
		if ((match = line.match(/(.*?)(#.*)$/i)) !== null) {
			LOG(`Erasing comment:${match[2]}`);
			line = match[1].trim();
		}

		// - Compact any multiple space to one ' '
		line = line.replace(/\s\s+/g, ' ');

		LOG(`Cleaned and trimmed to: "${line}"`);


		if (line.length == 0) {
			LOG("Ignoring empty line...");

			// By having a relatively simple 'normal sentence' RegEx near the top, I assume we save CPU by not
			// having to do the othes, HOWEVER this may or may not be optimal...
		} else if ((match = line.match(/^[^:=]+$/)) !== null
			// But slots can have : and =, so more complex sentence RegEx to catch them:
			// (Slots simply bounded by matching '<>' pairs)
			|| (match = line.match(/^([^:=<>]|(<[^>]+>))+$/))) {
			// So, pretty much anything without a colon or equals we take to be a sentence line:
			// Probably we could be a smarter:
			gotUtterance(line);

			// "~" is used for synonym declarations with an entity:
		} else if ((match = line.match(/^([a-z0-9 _'-]+)\s*~\s*(.*)$/i)) !== null) {
			gotEntity(line);

		} else if ((match = line.match(/^\$([a-z0-9_-]+)\s*=\s*(.*)$/i)) !== null) {
			gotVarDecl(line, match);

		} else if ((match = line.match(/^INVOCATION_NAME:\s*([a-z0-9_ -]+)$/i)) !== null) {
			data.invocationName = match[1];
			LOG("Got Invocation name:", data.invocationName);

		} else if ((match = line.match(/^INTENT:\s*(.+)$/i)) !== null) {
			gotIntentDecl(line, match);

		} else if ((match = line.match(reSLOT)) !== null) {
			// TODO: Slots should support a default 'example' string, since Dialogflow requires example text
			// for every slot usage (in non-template mode, which we are forced to use due DF instability)
			// Perhaps like:   SLOT: location : sys.location ~ New York
			gotSlotDecl(line, match);

		} else if ((match = line.match(/^ENTITY:\s*([a-z0-9_-]+)$/i)) !== null) {
			gotEntityDecl(line, match);

		} else if ((match = line.match(/^LANG(UAGE)?:\s*([a-z0-9._-]+)$/i)) !== null) {
			data.lang = match[2];
			LOG(`Got Language Decl: "${data.lang}"`);

		} else if ((match = line.match(/^WEBHOOK:\s*(.+)$/i)) !== null) {
			data.webhook = match[1];
			LOG(`Got Webhook: "${data.webhook}"`);

		} else {
			// Only reason we get here (currently), is a colon in an unrecognised line:
			ERROR(`ERROR: Malformed line: "${originalLine}", located at:\n${sourceFile}:${lineCount}`);
			process.exit(1);
		}
	}
	return;

	function gotVarDecl(line, match) {
		let name = match[1].toLowerCase();
		let value = match[2];
		LOG(`Got variable: "${name}" = "${value}"`);
		data.vars[name] = value;
	}

	function gotIntentDecl(line, match) {
		let name = match[1];
		LOG(`Got Intent Decl: "${name}"`);
		data.setIntent(name);
	}

	function gotEntityDecl(line, match) {
		let name = match[1];
		LOG(`Got Entity Decl: "${name}"`);
		data.setEntity(name);
	}

	/**
	 * 
	 * @param line The line that the slot decl was detected in
	 * @param match A RegExpmatch result for a spotted slot decl
	 */
	function gotSlotDecl(line: string, match: string) {
		// See RegEx used above:
		let name = match[1],
			// - Note that match[2] may be 'undefined', if the type was not stated:
			// - This means the type was not explicit, which generally means: type === name.
			type = match[2],
			example = match[3];
		LOG(`Got Slot: "${name} : ${type} ~ ${example}"`);
		if (data.currentCollection instanceof SourceIntent) {
			data.currentCollection.setSlot(name, type, example);
		} else {
			WARN(`Detected SLOT declaration not in INTENT definition. (Ignored)\nLine: ${line}`);
		}
	}

	function gotUtterance(utt) {
		LOG(`Got Utterance: "${utt}"`);
		data.currentCollection.addSentence(utt);
	}

	function gotEntity(line) {
		LOG(`Got Entity item: "${line}"`);
		// if (data.currentCollection.constructor.name === 'SourceEntity') {
		if (data.currentCollection instanceof SourceEntity) {
			data.currentCollection.addSentence(line);
		} else {
			ERROR(`Entity with synonym detected outside entity decl.\nLine: ${line}`);
			ERROR(`Current collection type: ${data.currentCollection.constructor.name}`);
			process.exit(1);
		}

	}
}



