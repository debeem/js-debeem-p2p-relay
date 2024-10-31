import assert from "assert";
import { ProcessUtil, TimerUtil } from "debeem-utils";
import { PeerUtil, RelayOptionsBuilder, RelayService } from "../../src/index.js";
import { bootstrappers } from "../../examples/bootstrappers.js";
import _ from "lodash";

let fakeRelayServices = [];


/**
 *        unit test
 */
describe( 'LeaderElection', function ()
{
	//      set the timeout to 5 seconds
	this.timeout( 80 * 1000 );

	//	...
	before(function()
	{
		process.env.NODE_ENV = 'test';
		process.env.JEST_WORKER_ID = `mocha`;
	});

	describe( 'methods', function ()
	{
		it( '#handlePeerEvent', () =>
		{
			this.timeout( 80 * 1000 );
			return new Promise( async ( resolve, reject ) =>
			{
				try
				{
					const ports = [ 61001, 61002, 61003 ];
					const peerIdFiles = [
						`./peers/.relay1.peerId`,
						`./peers/.relay2.peerId`,
						`./peers/.relay3.peerId`,
					];

					for ( let i = 0; i < ports.length; i ++ )
					{
						const port = ports[ i ];
						const announceAddresses = PeerUtil.getAnnounceAddresses();
						const peerIdFilename = peerIdFiles[ i ];
						const swarmKeyFilename = ProcessUtil.getParamStringValue( `swarm_key`, undefined );
						const createRelayOptions = RelayOptionsBuilder.builder()
							.setPeerIdFilename( peerIdFilename )
							.setSwarmKeyFilename( swarmKeyFilename )
							.setPort( port )
							.setAnnounceAddresses( announceAddresses )
							.setBootstrapperAddresses( bootstrappers )
							.setPubsubPeerDiscoveryTopics( [] )
							.build();
						console.log( `////////// ////////// ////////// ////////// ////////// //////////` );
						console.log( `will createRelay with options: `, createRelayOptions );
						const relayService = new RelayService();
						const relayNode = await relayService.createRelay( createRelayOptions );

						//	...
						fakeRelayServices.push( relayService );

						//	...
						await TimerUtil.waitForDelay( 1000 );
					}

					assert.strictEqual( fakeRelayServices.length, ports.length );
					setTimeout( async () =>
					{
						//	make the leader node offline
						//await fakeRelayServices[ 0 ].stop();

						console.log( process.env );
						assert.strictEqual(
							`true` === process.env.P2P_RELAY_IS_LEADER || `false` === process.env.P2P_RELAY_IS_LEADER,
							true
						);
						assert.strictEqual(
							_.isString( process.env.P2P_RELAY_LEADER_PEER_ID ) && ! _.isEmpty( process.env.P2P_RELAY_LEADER_PEER_ID ),
							true
						);

						//	...
						resolve();

					}, 15 * 1000 );

					//await TimerUtil.waitForDelay( 30 * 1000 );
					assert.strictEqual( fakeRelayServices.length, ports.length );
				}
				catch ( err )
				{
					reject( err );
				}
			});
		} );
	} );
} );
