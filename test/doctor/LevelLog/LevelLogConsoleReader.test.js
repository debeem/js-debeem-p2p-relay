import assert from "assert";
import { TestUtil } from "debeem-utils";
import { LevelLogRecorder } from "../../../src/doctor/logger/impls/LevelLog/LevelLogRecorder.js";


/**
 *        unit test
 */
describe( 'LevelLogConsoleReader', function ()
{
        before(function()
        {
                process.env.NODE_ENV = 'test';
                process.env.JEST_WORKER_ID = `mocha`;
        });

        describe( 'methods', function ()
        {
                it( 'should create 10 logs', async () =>
                {
                        const logRecorder = new LevelLogRecorder();
                        await logRecorder.clear();

                        for ( let i = 0; i < 10; i ++ )
                        {
                                /**
                                 *      @type {boolean}
                                 */
                                const result = await logRecorder.enqueue( { timestamp : 0, value : { index : i, ts : Date.now() } } );
                                assert.strictEqual( result, true );

                                //      ...
                                await TestUtil.sleep( 10 );
                        }

                        /**
                         *      @type {number}
                         */
                        const size = await logRecorder.size();
                        assert.strictEqual( size, 10 );


                        /**
                         *      @type { Array<string> }
                         */
                        const keys = await logRecorder.getPaginatedKeys( 0, 10 );
                        //console.log( `keys :`, keys );
                        //      keys : [
                        //   'empty_recipients_log::1729182220398',
                        //   'empty_recipients_log::1729182220410',
                        //   'empty_recipients_log::1729182220421',
                        //   'empty_recipients_log::1729182220431',
                        //   'empty_recipients_log::1729182220442',
                        //   'empty_recipients_log::1729182220453',
                        //   'empty_recipients_log::1729182220464',
                        //   'empty_recipients_log::1729182220475',
                        //   'empty_recipients_log::1729182220487',
                        //   'empty_recipients_log::1729182220497'
                        // ]
                        assert.strictEqual( Array.isArray( keys ), true );
                        assert.strictEqual( keys.length, 10 );


                        /**
                         *      @type { Array<DiagnosticLogElement> }
                         */
                        const values = await logRecorder.getPaginatedElements( 0, 10 );
                        //console.log( 'values :', values );
                        //      values : [
                        //   { timestamp: 1729181984965, value: { index: 0, ts: 1729181984965 } },
                        //   { timestamp: 1729181984976, value: { index: 1, ts: 1729181984976 } },
                        //   { timestamp: 1729181984987, value: { index: 2, ts: 1729181984987 } },
                        //   { timestamp: 1729181984998, value: { index: 3, ts: 1729181984998 } },
                        //   { timestamp: 1729181985009, value: { index: 4, ts: 1729181985009 } },
                        //   { timestamp: 1729181985020, value: { index: 5, ts: 1729181985020 } },
                        //   { timestamp: 1729181985031, value: { index: 6, ts: 1729181985031 } },
                        //   { timestamp: 1729181985042, value: { index: 7, ts: 1729181985042 } },
                        //   { timestamp: 1729181985053, value: { index: 8, ts: 1729181985053 } },
                        //   { timestamp: 1729181985064, value: { index: 9, ts: 1729181985064 } }
                        // ]
                        assert.strictEqual( Array.isArray( values ), true );
                        assert.strictEqual( values.length, 10 );
                } );
        } );
} );
