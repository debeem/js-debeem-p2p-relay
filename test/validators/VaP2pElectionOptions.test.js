import assert from "assert";
import { PeerIdService } from "debeem-lib";
import { VaP2pElectionOptions } from "../../src/validators/VaP2pElectionOptions.js";
import { RelayService } from "../../src/index.js";


/**
 *        unit test
 */
describe( 'VaP2pElectionOptions', function ()
{
	before( function ()
	{
		process.env.NODE_ENV = 'test';
		process.env.JEST_WORKER_ID = `mocha`;
	} );

	describe( 'methods', function ()
	{
		it( '#validateP2pElectionOptions', async () =>
		{
			assert.strictEqual( VaP2pElectionOptions.validateP2pElectionOptions( undefined ), `invalid p2pElectionOptions` );
			assert.strictEqual( VaP2pElectionOptions.validateP2pElectionOptions( null ), `invalid p2pElectionOptions` );
			assert.strictEqual( VaP2pElectionOptions.validateP2pElectionOptions( 1 ), `invalid p2pElectionOptions` );
			assert.strictEqual( VaP2pElectionOptions.validateP2pElectionOptions( {} ), `invalid p2pElectionOptions` );
			assert.strictEqual( VaP2pElectionOptions.validateP2pElectionOptions( { peerId : null } ), `invalid p2pElectionOptions.peerId` );

			const peerId = await PeerIdService.generatePeerId();

			//	#1
			assert.strictEqual( VaP2pElectionOptions.validateP2pElectionOptions( {
				peerId : peerId.toString()
			} ), `invalid p2pElectionOptions.pClsRelayService` );

			//	#2
			assert.strictEqual( VaP2pElectionOptions.validateP2pElectionOptions( {
				peerId  : peerId.toString(),
				pClsRelayService : new RelayService(),
				electionMessageVersion : 1,
			} ), `invalid p2pElectionOptions.electionMessageVersion` );

			//	#3
			assert.strictEqual( VaP2pElectionOptions.validateP2pElectionOptions( {
				peerId  : peerId.toString(),
				pClsRelayService : new RelayService(),
				electionMessageVersion : ``,
				groupKey : 1,
			} ), `invalid p2pElectionOptions.electionMessageVersion` );

			//	#4
			assert.strictEqual( VaP2pElectionOptions.validateP2pElectionOptions( {
				peerId  : peerId.toString(),
				pClsRelayService : new RelayService(),
				electionMessageVersion : `1.0`,
				groupKey : 1,
			} ), `invalid p2pElectionOptions.groupKey` );

			//	#5
			assert.strictEqual( VaP2pElectionOptions.validateP2pElectionOptions( {
				peerId  : peerId.toString(),
				pClsRelayService : new RelayService(),
				electionMessageVersion : `1.0`,
				groupKey : ``,
			} ), null );

			//	#6
			assert.strictEqual( VaP2pElectionOptions.validateP2pElectionOptions( {
				peerId  : peerId.toString(),
				pClsRelayService : new RelayService(),
				electionMessageVersion : `1.0`,
				groupKey : `media-relay-key98813`,
			} ), null );


		} );
	} );
} );
