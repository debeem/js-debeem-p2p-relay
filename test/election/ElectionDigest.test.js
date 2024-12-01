import assert from "assert";
import _ from "lodash";
import { ElectionCrypto } from "../../src/election/ElectionCrypto.js";
import { ElectionDigest } from "../../src/election/ElectionDigest.js";


/**
 *        unit test
 */
describe( 'ElectionDigest', function ()
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
		it( '#calcHash with invalid input', () =>
		{
			const electionDigest = new ElectionDigest();

			const hash1 = electionDigest.calcHash( undefined );
			assert.strictEqual( ! _.isString( hash1 ) && _.isEmpty( hash1 ), true );

			const hash2 = electionDigest.calcHash( null );
			assert.strictEqual( ! _.isString( hash2 ) && _.isEmpty( hash2 ), true );

			const hash3 = electionDigest.calcHash( {} );
			assert.strictEqual( ! _.isString( hash3 ) && _.isEmpty( hash3 ), true );

			const hash4 = electionDigest.calcHash( { auth : `GuTs`, song : `MaMa` } );
			assert.strictEqual( ! _.isString( hash4 ) && _.isEmpty( hash4 ), true );
		} );

		it( '#calcHash', () =>
		{
			const electionDigest = new ElectionDigest();

			const source = `Yesterday is a history`;
			const hash1 = electionDigest.calcHash( source );
			assert.strictEqual( _.isString( hash1 ) && ! _.isEmpty( hash1 ), true );
			assert.strictEqual( hash1.length, 66 );

			//console.log( hash1 );
			//	0xe0f61788210b573bd683f92e3de62df2357a15a148e1bd0015afbe832122b846
		} );
	} );
} );
