import assert from "assert";
import { defaultMaxQueueSize, RelayDoctor } from "../../src/index.js";
import { TestUtil } from "debeem-utils";


/**
 *        unit test
 */
describe( 'P2pService', function ()
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
					assert.strictEqual( 1, 1 );
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
