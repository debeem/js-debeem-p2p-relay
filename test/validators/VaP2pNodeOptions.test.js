import assert from "assert";
import { P2pNodeTransports, VaP2pNodeOptions } from "../../src/index.js";
import { PeerIdService } from "debeem-lib";


/**
 *        unit test
 */
describe( 'VaP2pNodeOptions', function ()
{
        before(function()
        {
                process.env.NODE_ENV = 'test';
                process.env.JEST_WORKER_ID = `mocha`;
        });

        describe( 'methods', function ()
        {
                it( '#validateP2pNodeOptions', async () =>
                {
                        assert.strictEqual( VaP2pNodeOptions.validateP2pNodeOptions( undefined ), `invalid p2pNodeOptions` );
                        assert.strictEqual( VaP2pNodeOptions.validateP2pNodeOptions( null ), `invalid p2pNodeOptions` );
                        assert.strictEqual( VaP2pNodeOptions.validateP2pNodeOptions( 1 ), `invalid p2pNodeOptions` );
                        assert.strictEqual( VaP2pNodeOptions.validateP2pNodeOptions( {} ), `invalid p2pNodeOptions` );
                        assert.strictEqual( VaP2pNodeOptions.validateP2pNodeOptions( { peerId : null } ), `invalid p2pNodeOptions.peerId` );

                        const peerId = await PeerIdService.generatePeerId();
                        assert.strictEqual( VaP2pNodeOptions.validateP2pNodeOptions( { peerId : peerId, swarmKey : `111` } ), `invalid p2pNodeOptions.listenAddresses` );

                        let p2pNodeOptions = {
                                peerId : peerId,
                                swarmKey : `111`,
                                listenAddresses : []
                        };
                        assert.strictEqual( VaP2pNodeOptions.validateP2pNodeOptions( p2pNodeOptions ), `invalid p2pNodeOptions.announceAddresses` );

                        p2pNodeOptions = {
                                peerId : peerId,
                                swarmKey : `111`,
                                listenAddresses : [],
                                announceAddresses : []
                        };
                        assert.strictEqual( VaP2pNodeOptions.validateP2pNodeOptions( p2pNodeOptions ), `invalid p2pNodeOptions.bootstrapperAddresses` );

                        p2pNodeOptions = {
                                peerId : peerId,
                                swarmKey : `111`,
                                listenAddresses : [],
                                announceAddresses : [],
                                bootstrapperAddresses : []
                        };
                        assert.strictEqual( VaP2pNodeOptions.validateP2pNodeOptions( p2pNodeOptions ), `invalid p2pNodeOptions.pubsubPeerDiscoveryTopics` );

                        p2pNodeOptions = {
                                peerId : peerId,
                                swarmKey : `111`,
                                listenAddresses : [],
                                announceAddresses : [],
                                bootstrapperAddresses : [],
                                pubsubPeerDiscoveryTopics : []
                        };
                        assert.strictEqual( VaP2pNodeOptions.validateP2pNodeOptions( p2pNodeOptions ), `invalid p2pNodeOptions.callbackMessage` );

                        p2pNodeOptions = {
                                peerId : peerId,
                                swarmKey : `111`,
                                listenAddresses : [],
                                announceAddresses : [],
                                bootstrapperAddresses : [],
                                pubsubPeerDiscoveryTopics : [],
                                callbackMessage : function (){},
                        };
                        assert.strictEqual( VaP2pNodeOptions.validateP2pNodeOptions( p2pNodeOptions ), `invalid p2pNodeOptions.transports` );

                        p2pNodeOptions = {
                                peerId : peerId,
                                swarmKey : `111`,
                                listenAddresses : [],
                                announceAddresses : [],
                                bootstrapperAddresses : [],
                                pubsubPeerDiscoveryTopics : [],
                                callbackMessage : function (){},
                                transports : 0,
                        };
                        assert.strictEqual( VaP2pNodeOptions.validateP2pNodeOptions( p2pNodeOptions ), `invalid p2pNodeOptions.transports` );

                        p2pNodeOptions = {
                                peerId : peerId,
                                swarmKey : `111`,
                                listenAddresses : [],
                                announceAddresses : [],
                                bootstrapperAddresses : [],
                                pubsubPeerDiscoveryTopics : [],
                                callbackMessage : function (){},
                                transports : P2pNodeTransports.TCP | P2pNodeTransports.WEBSOCKETS,
                        };
                        assert.strictEqual( VaP2pNodeOptions.validateP2pNodeOptions( p2pNodeOptions ), null );
                } );
        } );
} );
