import readline from 'readline';
import { LevelDbManager } from "./LevelDbManager.js";
import { LevelLogRecorder } from "./LevelLogRecorder.js";
import { LoggerUtil } from "../../../../utils/LoggerUtil.js";

/**
 *      @class
 */
export class LevelLogConsoleReader extends LevelDbManager
{
        /**
         *      @type {any}
         */
        iterator = null;

        /**
         *      log recorder
         *      @type {LevelLogRecorder}
         */
        logRecorder = new LevelLogRecorder();


        //      Open the iterator to read records in ascending order by key (time)
        async openIterator()
        {
                this.iterator = this.getDB().iterator( {
                        gte : this.getLogPrefix(),
                        lte : this.getLogPrefix() + '\xff',     // '\xff' ensures all matching keys are included
                        keys : true,
                        values : true,
                        reverse : false
                } );
        }

        // Fetch the next record in the sequence
        async readNextLog()
        {
                return new Promise( (
                        resolve,
                        reject
                ) =>
                {
                        this.iterator.next( (
                                err,
                                key,
                                value
                        ) =>
                        {
                                if ( err ) return reject( err );
                                if ( ! key || ! value ) return resolve( null ); // End of records
                                resolve( { key, value } );
                        } );
                } );
        }

        // Close the iterator after reading is complete
        async closeIterator()
        {
                this.iterator.close( ( err ) =>
                {
                        if ( err ) console.error( 'Error closing iterator:', err );
                } );
        }

        // Print log record and wait for the next spacebar press to continue
        async startReading()
        {
                // Setup readline to capture spacebar presses
                const rl = readline.createInterface( {
                        input : process.stdin,
                        output : process.stdout
                } );

                console.log( `Press enter key to show the next log entry` );
                console.log( `Press Ctrl+C key to exit` );
                console.log( `` );

                //      Open the LevelDB iterator
                await this.openIterator();

                const totalSize = await this.logRecorder.size();
                let serialNumber = 1;

                rl.on( 'line', async ( input ) =>
                {
                        const log = await this.readNextLog();
                        if ( log )
                        {
                                console.log( `(${ serialNumber ++ }/${ totalSize }) :: Key: \`${ log.key }\`:` );
                                console.log( JSON.stringify( log.value, null, 8 ) );
                        }
                        else
                        {
                                console.log( `No more records.\n\n` );
                                rl.close();
                                await this.closeIterator();
                        }
                } );
        }
}
