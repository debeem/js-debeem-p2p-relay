import assert from "assert";
import { defaultMaxQueueSize, RelayDoctor } from "../../src/index.js";
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
                                        let diagnosedTopic = ``;
                                        let diagnosedPubJson = ``;
                                        const virtualRelayServiceClass = {
                                                publish : ( topic, data ) =>
                                                {
                                                        diagnosedTopic = topic;
                                                        console.log( `>.< recBody :`, data );
                                                        console.log( `publishFunc is called with parameters :`, topic, diagnosedPubJson );
                                                }
                                        };

                                        const drOptions = {
                                                maxQueueSize : defaultMaxQueueSize,
                                                peerId : `peerId-123`,
                                                pClsRelayService : virtualRelayServiceClass
                                        };
                                        const relayDoctor = new RelayDoctor( drOptions );
                                        await relayDoctor.logRecorder.clear();

                                        await relayDoctor.start( 1000 );

                                        //      ...
                                        const publishResult = { recipients : [] };
                                        const publishData = {
                                                topic : `testTopic`,
                                                data : { hello : `world`, ts : Date.now() }
                                        };
                                        await relayDoctor.diagnosePublishResult( publishResult, publishData );

                                        //      ...
                                        await TestUtil.sleep( 2000 );
                                        await relayDoctor.stop();

                                        //      ...
                                        assert.strictEqual( diagnosedTopic, publishData.topic );

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
