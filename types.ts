
/** A simple interface to define a type that we can add sentences to */
export class SentenceCollection {
    name: string;
    sourceSentences: string[];
    expandedSentences: string[];

    constructor(name: string) {
        this.name = name;
        this.sourceSentences = [];
    }

    // We put the sentences into an array in reverse appearance order via 'unshift'.
    // Why? Because we do a lot of busy work processing later with pop (and push) - potentially more
    // efficient on large arrays, which essentially ends up consuming them in original order:
    public addSentence(sentence: string) {
        this.sourceSentences.unshift(sentence);
    }

    public newExpandedSentence(sentence: string) {
        this.expandedSentences.push(sentence);
    }
}

export interface SourceSlot {
    name: string,
    type: string
}

export class SourceIntent extends SentenceCollection {
    private slots: SourceSlot[];

    constructor(name: string) {
        super(name);
        this.slots = [];
    }

    public setSlot(slotName: string, slotType: string) {
        if (!this.getSlot(slotName))
            this.slots.push({ name: slotName, type: slotType });
    }
    public getSlot(slotName: string): SourceSlot {
        return this.slots.find((testSlot) => { return testSlot.name == slotName });
    }
    public getSlots(): SourceSlot[] {
        return this.slots;
    }
};

export class SourceEntity extends SentenceCollection {
    constructor(name: string) {
        super(name);
    }
};


export class DryUttExpanderData {
    invocationName: string;
    lang: string = "en-US";   // - Default. It's the way the world is...
    vars: object;
    intents: SourceIntent[];
    entities: SourceEntity[];
    currentCollection: SentenceCollection;

    constructor() {
        this.vars = {};
        this.intents = [];
        this.entities = [];
        this.currentCollection = null;
    };

    public getIntent(name: string): SourceIntent {
        return this.intents.find((testIntent) => { return testIntent.name == name });
    }

    public getEntity(name: string): SourceEntity {
        return this.intents.find((testEntity) => { return testEntity.name == name });
    }

    public setIntent(name: string): SourceIntent {
        let intent = this.getIntent(name);
        if (!intent) {
            intent = new SourceIntent(name);
            this.intents.push(intent);
        }
        this.currentCollection = intent;
        return intent;
    }

    public setEntity(name: string): SourceEntity {
        let entity = this.getEntity(name);
        if (!entity) {
            entity = new SourceEntity(name);
            this.entities.push(entity);
        }
        this.currentCollection = entity;
        return entity;
    }


};

