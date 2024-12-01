import assert from "assert";
import _ from "lodash";
import { ElectionCrypto } from "../../src/election/ElectionCrypto.js";


/**
 *        unit test
 */
describe( 'ElectionCrypto', function ()
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
		it( '#encryptMessage with invalid input', () =>
		{
			const electionCrypto = new ElectionCrypto();
			const password = `GuTs, MaMa`;

			const encrypted1 = electionCrypto.encryptMessage( ``, password );
			assert.strictEqual( ! _.isString( encrypted1 ) && _.isEmpty( encrypted1 ), true );

			const encrypted2 = electionCrypto.encryptMessage( undefined, password );
			assert.strictEqual( ! _.isString( encrypted2 ) && _.isEmpty( encrypted2 ), true );

			const encrypted3 = electionCrypto.encryptMessage( null, password );
			assert.strictEqual( ! _.isString( encrypted3 ) && _.isEmpty( encrypted3 ), true );
		} );

		it( '#encryptMessage and #decryptMessage', () =>
		{
			const electionCrypto = new ElectionCrypto();
			const password = `GuTs, MaMa`;

			const source = { auth : `GuTs`, song : `MaMa` };
			const encrypted1 = electionCrypto.encryptMessage( source, password );
			assert.strictEqual( _.isString( encrypted1 ) && ! _.isEmpty( encrypted1 ), true );

			const decrypted = electionCrypto.decryptMessage( encrypted1, password );
			assert.deepStrictEqual( source, decrypted );
		} );
	} );
} );
