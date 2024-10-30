import assert from "assert";
import { ProcessUtil, TimerUtil } from "debeem-utils";
import { PeerUtil, RelayOptionsBuilder, RelayService } from "../../src/index.js";
import { bootstrappers } from "../../examples/bootstrappers.js";

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
		it( '#handlePeerEvent', async ( done ) =>
		{
			this.timeout( 80 * 1000 );

			setTimeout( () =>
			{
				done();

			}, 60 * 1000 );

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
				await fakeRelayServices[ 0 ].stop();

			}, 10 * 1000 );

			await TimerUtil.waitForDelay( 80 * 1000 );

			assert.strictEqual( fakeRelayServices.length, ports.length );

		} );
	} );
} );
