
import { DryUttExpanderData } from './types';

const LOG = console.log;
const WARN = console.warn;


//
// Build up our set of processing RegExps:
// We do this somewhat by strings, so that we can contruct some 'by parts', for better clarity:
// (Note that when defining by strings, RegExps backslashes must be doubled)
// The items named like "someRe" are just partial strings:
const identifierRe = "[a-zA-Z_][a-zA-Z0-9_-]*";
/** Slot RegExp matches like "<MySlot>" or "<MySlot:Some.Type>": */
const slotRe = "<(" + identifierRe + ")>";
/** Vanill text is either simple text chars, OR a slot definition: */
const vanillaTextRe = "([a-zA-Z0-9 '-]|(" + slotRe + "))+";
/** Same as item above, but also allowing literal 'OR' pipe: '|' */
const vanillaTextWithOrRe = "([a-zA-Z0-9 '|-]|(" + slotRe + "))+";

// Note that without exception, the following fill 'match[1]' with the useful content, by way of the
// first leading match group always used below: i.e. The un-escaped open bracket '(' :
const reAllVanilla = new RegExp("^(" + vanillaTextRe + ")$");
const reVariableUsage = new RegExp("\\$(" + identifierRe + ")");
const reVanillaOrInRoundBrackets = new RegExp("\\((" + vanillaTextWithOrRe + ")\\)");
const reVanillaOrInSquareBrackets = new RegExp("\\[(" + vanillaTextWithOrRe + ")\\]");
const reSlot = new RegExp(slotRe, 'g');


export function expandSentences(data: DryUttExpanderData, intentName: string) {
    console.log(`Processing Intent: "${intentName}"`);
    //let sourceSentences = data.intents[intent].sourceSentences;
    let intent = data.intents[intentName];
    intent.expandedSentences = [];
    /** A temporary array storing sentence permutations DURING expansion: */
    let expanding: string[] = [];
    for (let sourceSentence of intent.sourceSentences) {

        // Pull a sentence from 'source' and pop it onto 'expanding':
        //let sourceSentence = sentences.source.pop();
        expanding.push('(' + sourceSentence + ')');

        // Now keep expanding what is on 'expanding', until all expanded fully onto 'sentences.expanded':
        while (expanding.length > 0) {

            let sentence = expanding.pop();
            console.log(`Processing Sentence: ${sentence}`);
            let match;

            if (reAllVanilla.exec(sentence)) {
                // Sentence is all vanilla characters - Time to emit:
                // (But first check any slot references for sanity)
                while (null !== (match = reSlot.exec(sentence))) {
                    let slotName = match[1];
                    if (!intent.getSlot(slotName)) {
                        WARN(`Undefined slot '${slotName}' referenced via sentence source: "${sourceSentence}" `)
                    }
                }
                intent.expandedSentences.push(sentence);
            } else if (null != (match = reVariableUsage.exec(sentence))) {
                // Variable usage:
                let varName = match[1].toLowerCase();
                let varValue = data.vars[varName];
                // Sentence, with variable replace with its contents:
                // Note that variables always get brackets to deal with '|' structures properly:
                expanding.push(expandMatch(sentence, match, '(' + varValue + ')'));
            } else if (null != (match = reVanillaOrInRoundBrackets.exec(sentence))) {
                // Simple text within brackets, POSSIBLY containing a pipe:
                LOG(`Processing simple / '|' contruct: ${match[0]}`);
                // Note that the 'split' logic devolves to a single item if no '|' exists:
                let split = match[1].split('|');
                for (let variant of split) {
                    LOG(`Variant: ${variant}`);
                    expanding.push(expandMatch(sentence, match, variant));
                }
            } else if (null != (match = reVanillaOrInSquareBrackets.exec(sentence))) {
                // Optionality construct, possibly containing an 'OR':
                // Like '[a]' or '[a|b]':
                LOG(`Processing optionality contruct: ${match[0]}`);
                let split = match[1].split('|');
                for (let variant of split) {
                    LOG(`Variant: ${variant}`);
                    expanding.push(expandMatch(sentence, match, variant));
                }
                // Effect the optionality - With replacement empty:
                expanding.push(expandMatch(sentence, match, ''));
            } else {
                LOG(`!!!! Whoah! Can't grok sentence: "${sentence}"`);
            }
        }
    }
}

/** Shorthand: Replace the given RegEx match in sentence, with replacement: */
function expandMatch(sentence, match, replacement) {
    return sentence.substring(0, match.index) + replacement + sentence.substring(match.index + match[0].length);
}
