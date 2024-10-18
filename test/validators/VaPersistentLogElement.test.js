import assert from "assert";
import { VaPersistentLogElement } from "../../src/validators/VaPersistentLogElement.js";


/**
 *        unit test
 */
describe( 'VaPersistentLogElement', function ()
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
                        assert.strictEqual( VaPersistentLogElement.validateLogElement( undefined ), `invalid logElement` );
                        assert.strictEqual( VaPersistentLogElement.validateLogElement( null ), `invalid logElement` );
                        assert.strictEqual( VaPersistentLogElement.validateLogElement( 1 ), `invalid logElement` );
                        assert.strictEqual( VaPersistentLogElement.validateLogElement( {} ), `invalid logElement` );

                        assert.strictEqual( VaPersistentLogElement.validateLogElement( { value : null } ), `invalid logElement.value` );
                        assert.strictEqual( VaPersistentLogElement.validateLogElement( { value : 1 } ), `invalid logElement.value` );

                        assert.strictEqual( VaPersistentLogElement.validateLogElement( { value : {} } ), `empty logElement.value` );
                        assert.strictEqual( VaPersistentLogElement.validateLogElement( { value : `` } ), `empty logElement.value` );

                        assert.strictEqual( VaPersistentLogElement.validateLogElement( { value : { ts : Date.now() } } ), null );
                        assert.strictEqual( VaPersistentLogElement.validateLogElement( { value : `123` } ), null );
                } );
        } );
} );
