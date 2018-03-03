
interface Dictionary<T> {
    [Key: string]: T;
}

export interface SourceSlot {
    name: string,
    type: string
}

export class SourceIntent {
    name: string;
    sourceSentences: string[];
    expandedSentences: string[];
    private slots: SourceSlot[];

    constructor(name: string) {
        this.name = name;
        this.sourceSentences = [];
        this.slots = [];
    }

    // We put the sentences into an array in reverse appearance order via 'unshift'.
    // Why? Because we do a lot of busy work processing later with pop (and push) - potentially more
    // efficient on large arrays, which essentially ends up consuming them in original order:
    public newSourceSentence(sentence: string) {
        this.sourceSentences.unshift(sentence);
    }

    public newExpandedSentence(sentence: string) {
        this.expandedSentences.push(sentence);
    }

    public setSlot(slotName: string, slotType: string) {
        if (!this.getSlot(slotName))
            this.slots.push({ name: slotName, type: slotType });
    }
    public getSlot(slotName: string) {
        return this.slots.find((testSlot) => { return testSlot.name == slotName });
    }
    public getSlots(): SourceSlot[] {
        return this.slots;
    }
};


export class DryUttExpanderData {
    invocationName: string;
    vars: object;
    intents: SourceIntent[];
    currentIntent: SourceIntent;

    constructor() {
        this.vars = {};
        this.intents = [];
        this.currentIntent = null;
    };

    public getIntent(name: string): SourceIntent {
        return this.intents.find((testIntent) => { return testIntent.name == name });
    }

    public setCurrentIntent(name: string): SourceIntent {
        let intent = this.getIntent(name);
        if (intent)
            this.currentIntent = intent;
        else {
            this.currentIntent = new SourceIntent(name);
            this.intents.push(this.currentIntent);
        }

        return this.currentIntent;
    }
};

