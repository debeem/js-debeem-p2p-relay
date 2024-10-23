import assert from "assert";
import { ProcessUtil, TestUtil } from "debeem-utils";
import { RedisLogRecorder } from "../../../src/index.js";
import { PrepareUtil } from "../../../src/index.js";


/**
 *        unit test
 */
describe( 'RedisLogConsoleReader', function ()
{
	before(function()
	{
		process.env.NODE_ENV = 'test';
		process.env.JEST_WORKER_ID = `mocha`;
	});

	describe( 'methods', function ()
	{
		const peerId = `peerId123`;

		it( 'should create 100 records', async () =>
		{
			const peerIdFilename = ProcessUtil.getParamStringValue( `peer_id`, undefined );
			const peerIdObject = await PrepareUtil.preparePeerId( peerIdFilename );
			assert.strictEqual( !! peerIdObject, true, "failed to load peerId" );

			console.log( `create 100 records for [${ peerIdObject.toString() }]` );
			const logRecorder = new RedisLogRecorder( { peerId : peerIdObject.toString() } );
			for ( let i = 0; i < 100; i ++ )
			{
				/**
				 *      @type {boolean}
				 */
				const result = await logRecorder.enqueue( { timestamp : 0, value : { index : i, ts : Date.now() } } );
				assert.strictEqual( result, true );

				//      ...
				await TestUtil.sleep( 10 );
			}
		} );
	} );
} );
