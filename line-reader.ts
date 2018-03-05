
import * as fs from 'fs';

const buffSize = 4096;


export class LineReader {
    infd: number;
    byteBuff = new Buffer(buffSize);
    strBuff = '';
    eof = false;

    constructor(file) {
        this.infd = fs.openSync(file, "r");
        this.slurp();
    }

    private slurp() {
        let bytesRead = fs.readSync(this.infd, this.byteBuff, 0, buffSize, null);
        // Deal with CRLF by converting to single 'LF':
        this.strBuff += this.byteBuff.toString('utf8', 0, bytesRead).replace(/\r\n/g, '\n');
        if (bytesRead < buffSize) {
            this.eof = true;
            // No more reading. Might as well free our buffer:
            delete this.byteBuff;
        }
    }

    nextLine(): string {
        if (this.strBuff === null) return null;

        var line: string;
        var newLineIdx = this.strBuff.indexOf('\n');
        if (newLineIdx < 0) {
            // No newline. Could be dangling partial line...
            if (this.eof) {
                // Well, stream is finished. Must be last line:
                line = this.strBuff;
                this.strBuff = null;
                return line;
            } else {
                this.slurp();
                return this.nextLine();
            }
        }

        // Rather than mutate strBuff, this would be more efficient if it kept
        // track of consumed index and used indexOf('\n,idx) above:
        line = this.strBuff.substr(0, newLineIdx);
        this.strBuff = this.strBuff.substr(newLineIdx + 1);
        return line;
    }

    // hasNextLine(): boolean {
    //     var newLineIdx = this.strBuffer.indexOf('\n');
    //     if (newLineIdx < 0) {
    //         if (this.finishedStream) {
    //             return !!(this.strBuffer);
    //         }
    //         else {
    //             this.fillBuffer();
    //             return this.hasNextLine();
    //         }
    //     }
    //     return true;
    // }

}
