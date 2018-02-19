
export class DieData {
    vars: object;
    intents: object;
    currentIntent: string;

    constructor() {
        this.vars = {};
        this.intents = {};
        this.currentIntent = null;
    }
};

