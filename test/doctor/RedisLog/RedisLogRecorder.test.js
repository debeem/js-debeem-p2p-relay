import assert from "assert";
import { TestUtil } from "debeem-utils";
import _ from "lodash";
import { RedisLogRecorder } from "../../../src/doctor/logger/impls/RedisLog/RedisLogRecorder.js";


/**
 *        unit test
 */
describe( 'RedisLogRecorder', function ()
{
        before(function()
        {
                process.env.NODE_ENV = 'test';
                process.env.JEST_WORKER_ID = `mocha`;
        });

        describe( 'methods', function ()
        {
                const peerId = `peerId123`;

                it( '#enqueue : unexpected', async () =>
                {
                        const logRecorder = new RedisLogRecorder( { peerId : peerId } );

                        try
                        {
                                await logRecorder.enqueue( { timestamp : 0, value : 0 } );
                        }
                        catch ( err )
                        {
                                assert.strictEqual( err.includes( `invalid logElement.value` ), true );
                        }

                        try
                        {
                                await logRecorder.enqueue( { timestamp : 0, value : `` } );
                        }
                        catch ( err )
                        {
                                assert.strictEqual( err.includes( `empty logElement.value` ), true );
                        }

                        try
                        {
                                await logRecorder.enqueue( { timestamp : 0, value : {} } );
                        }
                        catch ( err )
                        {
                                assert.strictEqual( err.includes( `empty logElement.value` ), true );
                        }

                } );

                it( '#enqueue : case 1', async () =>
                {
                        const logRecorder = new RedisLogRecorder( { peerId : peerId } );
                        await logRecorder.clear();

                        /**
                         *      @type {boolean}
                         */
                        const result = await logRecorder.enqueue( { timestamp : 0, value : { ts : Date.now() } } );
                        assert.strictEqual( result, true );

                        const size = await logRecorder.size();
                        assert.strictEqual( size, 1 );
                } );

                it( '#enqueue : case 2', async () =>
                {
                        const logRecorder = new RedisLogRecorder( { peerId : peerId } );
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
                        //console.log( `size :`, size );
                        //size : 10
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

                it( '#getPaginatedKeys', async () =>
                {
                        const logRecorder = new RedisLogRecorder( { peerId : peerId } );
                        await logRecorder.clear();

                        for ( let i = 0; i < 30; i ++ )
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
                        assert.strictEqual( size, 30 );

                        let loadedKeys = [];
                        let lastTimestamp = 0;
                        while ( true )
                        {
                                /**
                                 *      @type { Array<string> }
                                 */
                                const keys = await logRecorder.getPaginatedKeys( lastTimestamp, 10 );
                                console.log( `keys :`, keys );
                                if ( ! Array.isArray( keys ) || 0 === keys.length )
                                {
                                        break;
                                }

                                //      ...
                                lastTimestamp = logRecorder.extractTimestampFromLogKey( keys[ keys.length - 1 ] );
                                console.log( `lastTimestamp :`, lastTimestamp )
                                if ( ! _.isNumber( lastTimestamp ) || lastTimestamp <= 0 )
                                {
                                        break;
                                }

                                loadedKeys = loadedKeys.concat( keys );
                        }

                        assert.strictEqual( Array.isArray( loadedKeys ), true );
                        assert.strictEqual( loadedKeys.length, 30 );
                } );

                it( '#getPaginatedElements', async () =>
                {
                        const logRecorder = new RedisLogRecorder( { peerId : peerId } );
                        await logRecorder.clear();

                        for ( let i = 0; i < 30; i ++ )
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
                        assert.strictEqual( size, 30 );

                        /**
                         *      @type { Array<DiagnosticLogElement> }
                         */
                        let loadedElements = [];

                        /**
                         *      @type {number}
                         */
                        let lastTimestamp = 0;

                        while ( true )
                        {
                                /**
                                 *      @type { Array<DiagnosticLogElement> }
                                 */
                                const elements = await logRecorder.getPaginatedElements( lastTimestamp, 10 );
                                if ( ! Array.isArray( elements ) || 0 === elements.length )
                                {
                                        break;
                                }

                                /**
                                 *      @type {number}
                                 */
                                lastTimestamp = elements[ elements.length - 1 ].timestamp;
                                if ( ! _.isNumber( lastTimestamp ) || lastTimestamp <= 0 )
                                {
                                        break;
                                }

                                /**
                                 *      @type { Array<DiagnosticLogElement> }
                                 */
                                loadedElements = loadedElements.concat( elements );
                        }

                        assert.strictEqual( Array.isArray( loadedElements ), true );
                        assert.strictEqual( loadedElements.length, 30 );
                } );

                it( '#front', async () =>
                {
                        const logRecorder = new RedisLogRecorder( { peerId : peerId } );
                        await logRecorder.clear();

                        /**
                         *      @type { DiagnosticLogElement }
                         */
                        let firstElement = undefined;

                        for ( let i = 0; i < 10; i ++ )
                        {
                                const newElement = { timestamp : 0, value : { index : i, ts : Date.now() } };
                                if ( undefined === firstElement )
                                {
                                        firstElement = newElement;
                                }

                                /**
                                 *      @type {boolean}
                                 */
                                const result = await logRecorder.enqueue( newElement );
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
                         *      @type { DiagnosticLogElement }
                         */
                        const frontElement = await logRecorder.front();
                        //console.log( `frontElement :`, frontElement );
                        //      frontElement :
                        //      { timestamp: 1729183983853, value: { index: 0, ts: 1729183983853 } }
                        //
                        assert.strictEqual( _.isObject( frontElement ), true );
                        assert.strictEqual( _.isObject( frontElement.value ), true );
                        assert.strictEqual( _.isNumber( frontElement.value.index ), true );
                        assert.strictEqual( frontElement.value.index, 0 );
                        assert.deepStrictEqual( frontElement.value, firstElement.value );
                } );

                it( '#isEmpty', async () =>
                {
                        const logRecorder = new RedisLogRecorder( { peerId : peerId } );
                        await logRecorder.clear();
                        assert.deepStrictEqual( await logRecorder.isEmpty(), true );

                        for ( let i = 0; i < 10; i ++ )
                        {
                                const newElement = { timestamp : 0, value : { index : i, ts : Date.now() } };

                                /**
                                 *      @type {boolean}
                                 */
                                const result = await logRecorder.enqueue( newElement );
                                assert.strictEqual( result, true );

                                //      ...
                                await TestUtil.sleep( 10 );
                        }

                        assert.deepStrictEqual( await logRecorder.isEmpty(), false );
                } );
        } );
} );
