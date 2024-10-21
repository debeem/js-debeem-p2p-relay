import assert from "assert";
import { VaDiagnosticLogElement } from "../../src/validators/VaDiagnosticLogElement.js";


/**
 *        unit test
 */
describe( 'VaDiagnosticLogElement', function ()
{
        before(function()
        {
                process.env.NODE_ENV = 'test';
                process.env.JEST_WORKER_ID = `mocha`;
        });

        describe( 'methods', function ()
        {
                it( '#validateLogElement', async () =>
                {
                        assert.strictEqual( VaDiagnosticLogElement.validateLogElement( undefined ), `invalid logElement` );
                        assert.strictEqual( VaDiagnosticLogElement.validateLogElement( null ), `invalid logElement` );
                        assert.strictEqual( VaDiagnosticLogElement.validateLogElement( 1 ), `invalid logElement` );
                        assert.strictEqual( VaDiagnosticLogElement.validateLogElement( {} ), `invalid logElement` );

                        assert.strictEqual( VaDiagnosticLogElement.validateLogElement( { value : null } ), `invalid logElement.value` );
                        assert.strictEqual( VaDiagnosticLogElement.validateLogElement( { value : 1 } ), `invalid logElement.value` );

                        assert.strictEqual( VaDiagnosticLogElement.validateLogElement( { value : {} } ), `empty logElement.value` );
                        assert.strictEqual( VaDiagnosticLogElement.validateLogElement( { value : `` } ), `empty logElement.value` );

                        assert.strictEqual( VaDiagnosticLogElement.validateLogElement( { value : { ts : Date.now() } } ), null );
                        assert.strictEqual( VaDiagnosticLogElement.validateLogElement( { value : `123` } ), null );
                } );
        } );
} );
