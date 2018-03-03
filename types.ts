
interface Dictionary<T> {
    [Key: string]: T;
}

export class SourceIntent {
    name: string;
    sourceSentences: string[];
    expandedSentences: string[];
    private slots: Array<{
        name: string,
        type: string
    }>;

    constructor(name: string) {
        this.name = name;
        this.sourceSentences = [];
        this.slots = [];
    }

    // We put the sentences into an array in reverse appearance order via 'unshift'.
    // Why? Because we do a lot of busy work processing later with pop (and push) - potentially more
    // efficient on large arrays, which essentially ends up consuming them in original order:
    public newSentence(sentence: string) {
        this.sourceSentences.unshift(sentence);
    }

    public setSlot(slotName: string, slotType: string) {
        if (!this.getSlot(slotName))
            this.slots.push({ name: slotName, type: slotType });
    }
    public getSlot(slotName: string) {
        return this.slots.find((testSlot) => { return testSlot.name == slotName });
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

