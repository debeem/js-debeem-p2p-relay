import assert from "assert";
import { LocalParamUtil } from "../../src/utils/LocalParamUtil.js";
import _ from "lodash";


/**
 *        unit test
 */
describe( 'LocalParamUtil', function ()
{
        describe( 'methods', function ()
        {
                it( '#getPort', async () =>
                {
                        const portValue = 9999;
                        process.env.PORT = String( portValue );

                        const port = LocalParamUtil.getPort( `1234` );
                        assert.strictEqual( port, portValue );
                } );

                it( '#getDefaultPort', async () =>
                {
                        const port = LocalParamUtil.getDefaultPort();
                        assert.strictEqual( port, 9900 );
                } );

                it( '#getRedisOptions', async () =>
                {
                        const redisPort = 63999;
                        const redisHost = `192.168.66.66`;
                        const redisUsername = `redisUser`;
                        const redisPassword = `redisPwd`;
                        const redisDb = 0;

                        process.env.REDIS_PORT  = String( redisPort );
                        process.env.REDIS_HOST  = redisHost;
                        process.env.REDIS_USERNAME  = redisUsername;
                        process.env.REDIS_PASSWORD  = redisPassword;
                        process.env.REDIS_DB  = String( redisDb );

                        // return {
                        //         port : ProcessUtil.getParamIntValue( 'REDIS_PORT', 6379 ),
                        //         host : ProcessUtil.getParamStringValue( 'REDIS_HOST', 'host.docker.internal' ),
                        //         username : ProcessUtil.getParamStringValue( 'REDIS_USERNAME', null ),
                        //         password : ProcessUtil.getParamStringValue( 'REDIS_PASSWORD', null ),
                        //         db : ProcessUtil.getParamIntValue( 'REDIS_DB', 0 ),
                        // };
                        const redisOptions = LocalParamUtil.getRedisOptions();
                        assert.notStrictEqual( redisOptions, null );
                        assert.strictEqual( _.isObject( redisOptions ), true );
                        assert.strictEqual( redisOptions.port, redisPort );
                        assert.strictEqual( redisOptions.host, redisHost );
                        assert.strictEqual( redisOptions.username, redisUsername );
                        assert.strictEqual( redisOptions.password, redisPassword );
                        assert.strictEqual( redisOptions.db, redisDb );
                } );
        } );
} );
