import assert from "assert";
import { VaRelayOptions } from "../../src/index.js";


/**
 *        unit test
 */
describe( 'VaRelayOptions', function ()
{
        before(function()
        {
                process.env.NODE_ENV = 'test';
                process.env.JEST_WORKER_ID = `mocha`;
        });

        describe( 'methods', function ()
        {
                it( '#validateRelayOptions', async () =>
                {
                        assert.strictEqual( VaRelayOptions.validateRelayOptions( undefined ), `invalid relayOptions` );
                        assert.strictEqual( VaRelayOptions.validateRelayOptions( null ), `invalid relayOptions` );
                        assert.strictEqual( VaRelayOptions.validateRelayOptions( 1 ), `invalid relayOptions` );
                        assert.strictEqual( VaRelayOptions.validateRelayOptions( {} ), `invalid relayOptions` );
                        assert.strictEqual( VaRelayOptions.validateRelayOptions( { peerId : null } ), `invalid relayOptions.port` );

                        //assert.strictEqual( VaRelayOptions.validateRelayOptions( { peerIdFilename : `` } ), `invalid relayOptions.peerIdFilename` );
                        //assert.strictEqual( VaRelayOptions.validateRelayOptions( { swarmKeyFilename : `` } ), `invalid relayOptions.swarmKeyFilename` );

                        let relayOptions = {
                                port : 0
                        };
                        assert.strictEqual( VaRelayOptions.validateRelayOptions( relayOptions ), `invalid relayOptions.port` );

                        relayOptions = {
                                port : 9999
                        };
                        assert.strictEqual( VaRelayOptions.validateRelayOptions( relayOptions ), `invalid relayOptions.announceAddresses` );

                        relayOptions = {
                                port : 9999,
                                announceAddresses : [],
                        };
                        assert.strictEqual( VaRelayOptions.validateRelayOptions( relayOptions ), `invalid relayOptions.bootstrapperAddresses` );

                        relayOptions = {
                                port : 9999,
                                announceAddresses : [],
                                bootstrapperAddresses : [],
                        };
                        assert.strictEqual( VaRelayOptions.validateRelayOptions( relayOptions ), `invalid relayOptions.pubsubPeerDiscoveryTopics` );

                        relayOptions = {
                                port : 9999,
                                announceAddresses : [],
                                bootstrapperAddresses : [],
                                pubsubPeerDiscoveryTopics : [],
                        };
                        assert.strictEqual( VaRelayOptions.validateRelayOptions( relayOptions ), null );
                } );
        } );
} );
