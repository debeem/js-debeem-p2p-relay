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
                it( '#validateP2pRelayOptions', async () =>
                {
                        assert.strictEqual( VaRelayOptions.validateP2pRelayOptions( undefined ), `invalid p2pRelayOptions` );
                        assert.strictEqual( VaRelayOptions.validateP2pRelayOptions( null ), `invalid p2pRelayOptions` );
                        assert.strictEqual( VaRelayOptions.validateP2pRelayOptions( 1 ), `invalid p2pRelayOptions` );
                        assert.strictEqual( VaRelayOptions.validateP2pRelayOptions( {} ), `invalid p2pRelayOptions` );
                        assert.strictEqual( VaRelayOptions.validateP2pRelayOptions( { peerId : null } ), `invalid p2pRelayOptions.port` );

                        //assert.strictEqual( VaRelayOptions.validateP2pRelayOptions( { peerIdFilename : `` } ), `invalid p2pRelayOptions.peerIdFilename` );
                        //assert.strictEqual( VaRelayOptions.validateP2pRelayOptions( { swarmKeyFilename : `` } ), `invalid p2pRelayOptions.swarmKeyFilename` );

                        let p2pRelayOptions = {
                                port : 0
                        };
                        assert.strictEqual( VaRelayOptions.validateP2pRelayOptions( p2pRelayOptions ), `invalid p2pRelayOptions.port` );

                        p2pRelayOptions = {
                                port : 9999
                        };
                        assert.strictEqual( VaRelayOptions.validateP2pRelayOptions( p2pRelayOptions ), `invalid p2pRelayOptions.announceAddresses` );

                        p2pRelayOptions = {
                                port : 9999,
                                announceAddresses : [],
                        };
                        assert.strictEqual( VaRelayOptions.validateP2pRelayOptions( p2pRelayOptions ), `invalid p2pRelayOptions.bootstrapperAddresses` );

                        p2pRelayOptions = {
                                port : 9999,
                                announceAddresses : [],
                                bootstrapperAddresses : [],
                        };
                        assert.strictEqual( VaRelayOptions.validateP2pRelayOptions( p2pRelayOptions ), `invalid p2pRelayOptions.pubsubPeerDiscoveryTopics` );

                        p2pRelayOptions = {
                                port : 9999,
                                announceAddresses : [],
                                bootstrapperAddresses : [],
                                pubsubPeerDiscoveryTopics : [],
                        };
                        assert.strictEqual( VaRelayOptions.validateP2pRelayOptions( p2pRelayOptions ), null );
                } );
        } );
} );
