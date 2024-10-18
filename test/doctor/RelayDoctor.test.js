import assert from "assert";
import { SystemStatus } from "../../src/doctor/SystemStatus.js";
import { RelayDoctor } from "../../src/doctor/RelayDoctor.js";
import _ from "lodash";
import { TestUtil } from "debeem-utils";


/**
 *        unit test
 */
describe( 'RelayDoctor', function ()
{
        before(function()
        {
                process.env.NODE_ENV = 'test';
                process.env.JEST_WORKER_ID = `mocha`;
        });

        describe( 'methods', function ()
        {
                //      set the timeout to 5 seconds
                this.timeout( 5000 );

                it( '#diagnosePublishResult', () =>
                {
                        return new Promise( async ( resolve, reject ) =>
                        {
                                try
                                {
                                        const relayDoctor = new RelayDoctor();
                                        await relayDoctor.persistentLogger.clear();

                                        let diagnosedTopic = ``;
                                        let diagnosedPubString = ``;
                                        let diagnosedPubJson = ``;
                                        const publishFunc = ( topic, data ) =>
                                        {
                                                diagnosedPubString = new TextDecoder().decode( data );
                                                try
                                                {
                                                        diagnosedPubJson = JSON.parse( diagnosedPubString );
                                                        console.log( `>.< recBody :`, diagnosedPubString );
                                                }
                                                catch ( err )
                                                {
                                                        console.error( `error in parsing evt.detail.data :`, diagnosedPubString, err );
                                                }

                                                diagnosedTopic = topic;
                                                console.log( `publishFunc is called with parameters :`, topic, diagnosedPubJson );
                                        };
                                        await relayDoctor.start( 1000 );

                                        //      ...
                                        const publishResult = { recipients : [] };
                                        const publishData = {
                                                topic : `testTopic`,
                                                pubString : JSON.stringify( { hello : `world`, ts : Date.now() } )
                                        };
                                        relayDoctor.setPublishFunction( publishFunc );
                                        await relayDoctor.diagnosePublishResult( publishResult, publishData );

                                        //      ...
                                        await TestUtil.sleep( 2000 );
                                        await relayDoctor.stop();

                                        //      ...
                                        assert.strictEqual( diagnosedTopic, publishData.topic );
                                        assert.deepStrictEqual( diagnosedPubString, publishData.pubString );

                                        //      ...
                                        resolve();
                                }
                                catch ( err )
                                {
                                        reject( err );
                                }
                        });
                } );
        } );
} );
