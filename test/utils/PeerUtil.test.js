import assert from "assert";
import { PeerIdService } from "debeem-lib";
import { PeerUtil } from "../../src/utils/PeerUtil.js";


/**
 *        unit test
 */
describe( 'PeerUtil', function ()
{
        describe( 'methods', function ()
        {
                it( '#isValidPeerId', async () =>
                {
                        const rsaPeerId = await PeerIdService.generatePeerId();
                        const isValidPeerId = PeerUtil.isValidPeerId( rsaPeerId );
                        assert.strictEqual( isValidPeerId, true );
                } );

                it( '#getListenAddresses', async () =>
                {
                        assert.deepEqual( PeerUtil.getListenAddresses( undefined ), [ `/ip4/0.0.0.0/tcp/9911` ] );
                        assert.deepEqual( PeerUtil.getListenAddresses( 0 ), [ `/ip4/0.0.0.0/tcp/9911` ] );
                        assert.deepEqual( PeerUtil.getListenAddresses( 65536 ), [ `/ip4/0.0.0.0/tcp/9911` ] );
                        assert.deepEqual( PeerUtil.getListenAddresses( 1111 ), [ `/ip4/0.0.0.0/tcp/1111` ] );
                } );

                it( '#getAnnounceAddresses', async () =>
                {
                        process.env.P2P_ANNOUNCES = undefined;
                        assert.deepEqual( PeerUtil.getAnnounceAddresses(), [] );

                        process.env.P2P_ANNOUNCES = [ `/ip4/1.2.3.4/tcp/9911` ];
                        assert.deepEqual( PeerUtil.getAnnounceAddresses(), [ `/ip4/1.2.3.4/tcp/9911` ] );

                        process.env.P2P_ANNOUNCES = [ `123.123.123.123` ];
                        assert.deepEqual( PeerUtil.getAnnounceAddresses(), [ `123.123.123.123` ] );
                } );
        } );
} );
