import os from 'os';
import fs from 'fs';
import { join } from 'path';
import assert from "assert";
import { PeerIdService, SwarmKeyStorageService } from "debeem-lib";
import { PeerIdStorageService } from "debeem-lib/src/services/storage/PeerIdStorageService.js";
import { PrepareUtil } from "../../src/utils/PrepareUtil.js";


/**
 *        unit test
 */
describe( 'PrepareUtil', function ()
{
        before(function()
        {
                process.env.NODE_ENV = 'test';
                process.env.JEST_WORKER_ID = `mocha`;
        });

        describe( 'methods', function ()
        {
                it( '#preparePeerId : flush new', async () =>
                {
                } );

                it( '#preparePeerId : load from an existing file', async () =>
                {
                        const tempDir = os.tmpdir();
                        const uniquePeerIdTmpFullPath = join( tempDir, `peerId-${ Date.now() }.tmp` );

                        const storagePeerIdString = `{"id":"QmaS6HGfowodZa1AQvWZmSu6S3kaZDgZ8mPdmnwzH9tinz","privKey":"CAASqQkwggSlAgEAAoIBAQDGn3leZnLWH1FBH7YTqtdpH4i9SihmXbX5QGoWe7soAUiflBs4jW74Cx9a3zxx/hwWZO14oIlP1CAJlID0S+Q5u5ssMmi8LpFjH3K6w6lFr2AsurmnVKB9WDBGwywm8zEo/TtUVrPR6x5W4p7hBA7mC56csFTB3sjQ0f1+l2s/amOq+f7ErzuqOR/XI2c/cnmGwLnCQc+dKPgAz9Gfcbp5sSVU8QT+xHMPNv3nIVALjYHO+v5Oz5L4MUNvrUnNt+/gnxBil8Z/lj4xhpNr14EGFgWzEyEj9eGicVYpPYPXC+Gu1n35/jYqqGctZQvgWq/ZlXufHjzl2sVvTYEoAgUzAgMBAAECggEABlOmG2M8eaSzEXI1JMM77ABq6/WIUT370CUoO+/+zp4UvTz9m6Y3cyAc6AQcXa4Ty2gnKhZEyXFJqxKsyqmMo/aWUW/dLjMhGDXe5pT11ELc9A/LCTuvhlzSGxJ7k1WZHJyw0HIJrodvMU1QdO7h7/EVCFJ3WZPKO4rRRTIh/xYuifByG/RWVPdotQ7zP0MKrn85pd795vVGWmM+42o8OVKM5E7dUvXJsnEtLALPd9fsveGKb4CXboe1JeIEkM936RHe3na55GZKMSLcpBV76IazuLBjqRrr87DwB2Ur7KxKCGoiKwEc2m6mWznqItzeTOnlLGFI72eoAC7AISfd4QKBgQDodlA9XDV9GD/f1jegORLJF59SHN8o8kY96NDQfjwgdAg7pbs+VX4wep88Gu/OsD7cuMmL+DCXdrq+sjO0xn7AXH3IEiI8Jia1/HfpuF2gh9OjsClNhmwTU/bxc8RNBB8I7K2MZlzEsex1DKITOwy6fXSdNBLRfJjZNSjjqwEHpwKBgQDavAJfCS1S0liWmxjeTILEywGqmsmwdPlnIJM0auxI+d++YrfIgjIfV+fee+muDPO3gVaiHlRxuJ3M0N8J6sTJv23B7HgBABVI1hfRx+00ueRxrINDi2Yx49DeiVerV8bobGgRfB59hJ9KI1gyUszcq2f1B8QT2XX9y/t7U5UHlQKBgQDlhYwMSbL2ZK8MjzI1HKUTsCM6rA8bGruH/QvQEBPF50sJucV68ma57xix+9azOQmYXUuCy/cOVchk6QZsg2A7BhebJ2xt/y1Rmom7VrH7AqFQiWr+hK7JFqpIFInJkTwjT6y7Z4ZJH3PczjBo1HDo4V32qae6907jh71rrThDGQKBgQDBCCJflE23RYKAhqdPpt3Qpgb2dFuBqflflVPTcnjLfhiCf8QI4z0wg/dQVLJIs41xaGb38yQ6p946nin3KoQ4NwO5m+HboCMogCfNLk6btWFxH/lHZoHtjUsK2NHRmEklXGYK6CpQQvYAC2kOIBxCsdGwYAYeLk7+h0GL+JsQcQKBgQCbDUrdxvleJL/o55rqVmx4J4cpww6ND3Bzi4X7tRKfgTov8QHI4pp0yfFz4pD/CHNMRduFnrvvuxXh2LoB0O4yQeQ/vmIASkbSvvA4F10Goyng7EmU14DjDYYhiQ4j5l4DeiKbwUjYJz/AgVLr8a51drJ+yTjGdPo++fGfg1cf6w==","pubKey":"CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDGn3leZnLWH1FBH7YTqtdpH4i9SihmXbX5QGoWe7soAUiflBs4jW74Cx9a3zxx/hwWZO14oIlP1CAJlID0S+Q5u5ssMmi8LpFjH3K6w6lFr2AsurmnVKB9WDBGwywm8zEo/TtUVrPR6x5W4p7hBA7mC56csFTB3sjQ0f1+l2s/amOq+f7ErzuqOR/XI2c/cnmGwLnCQc+dKPgAz9Gfcbp5sSVU8QT+xHMPNv3nIVALjYHO+v5Oz5L4MUNvrUnNt+/gnxBil8Z/lj4xhpNr14EGFgWzEyEj9eGicVYpPYPXC+Gu1n35/jYqqGctZQvgWq/ZlXufHjzl2sVvTYEoAgUzAgMBAAE="}`;
                        const storagePeerIdObj = JSON.parse( storagePeerIdString );
                        const peerIdStorageService = new PeerIdStorageService();
                        const rawPeerId = await peerIdStorageService.peerIdFromStorage( storagePeerIdObj );
                        await peerIdStorageService.savePeerId( uniquePeerIdTmpFullPath, rawPeerId );

                        const loadedRawPeerId = await PrepareUtil.preparePeerId( uniquePeerIdTmpFullPath );
                        const loadedStoragePeerId = peerIdStorageService.storagePeerIdFromRaw( loadedRawPeerId );
                        //
                        //      console.plog( `loadedStoragePeerId :`, loadedStoragePeerId );
                        //      loadedStoragePeerId : {
                        //         id: 'QmaS6HGfowodZa1AQvWZmSu6S3kaZDgZ8mPdmnwzH9tinz',
                        //         privKey: 'CAASqQkwggSlAgEAAoIBAQDGn3leZnLWH1FBH7YTqtdpH4i9SihmXbX5QGoWe7soAUiflBs4jW74Cx9a3zxx/hwWZO14oIlP1CAJlID0S+Q5u5ssMmi8LpFjH3K6w6lFr2AsurmnVKB9WDBGwywm8zEo/TtUVrPR6x5W4p7hBA7mC56csFTB3sjQ0f1+l2s/amOq+f7ErzuqOR/XI2c/cnmGwLnCQc+dKPgAz9Gfcbp5sSVU8QT+xHMPNv3nIVALjYHO+v5Oz5L4MUNvrUnNt+/gnxBil8Z/lj4xhpNr14EGFgWzEyEj9eGicVYpPYPXC+Gu1n35/jYqqGctZQvgWq/ZlXufHjzl2sVvTYEoAgUzAgMBAAECggEABlOmG2M8eaSzEXI1JMM77ABq6/WIUT370CUoO+/+zp4UvTz9m6Y3cyAc6AQcXa4Ty2gnKhZEyXFJqxKsyqmMo/aWUW/dLjMhGDXe5pT11ELc9A/LCTuvhlzSGxJ7k1WZHJyw0HIJrodvMU1QdO7h7/EVCFJ3WZPKO4rRRTIh/xYuifByG/RWVPdotQ7zP0MKrn85pd795vVGWmM+42o8OVKM5E7dUvXJsnEtLALPd9fsveGKb4CXboe1JeIEkM936RHe3na55GZKMSLcpBV76IazuLBjqRrr87DwB2Ur7KxKCGoiKwEc2m6mWznqItzeTOnlLGFI72eoAC7AISfd4QKBgQDodlA9XDV9GD/f1jegORLJF59SHN8o8kY96NDQfjwgdAg7pbs+VX4wep88Gu/OsD7cuMmL+DCXdrq+sjO0xn7AXH3IEiI8Jia1/HfpuF2gh9OjsClNhmwTU/bxc8RNBB8I7K2MZlzEsex1DKITOwy6fXSdNBLRfJjZNSjjqwEHpwKBgQDavAJfCS1S0liWmxjeTILEywGqmsmwdPlnIJM0auxI+d++YrfIgjIfV+fee+muDPO3gVaiHlRxuJ3M0N8J6sTJv23B7HgBABVI1hfRx+00ueRxrINDi2Yx49DeiVerV8bobGgRfB59hJ9KI1gyUszcq2f1B8QT2XX9y/t7U5UHlQKBgQDlhYwMSbL2ZK8MjzI1HKUTsCM6rA8bGruH/QvQEBPF50sJucV68ma57xix+9azOQmYXUuCy/cOVchk6QZsg2A7BhebJ2xt/y1Rmom7VrH7AqFQiWr+hK7JFqpIFInJkTwjT6y7Z4ZJH3PczjBo1HDo4V32qae6907jh71rrThDGQKBgQDBCCJflE23RYKAhqdPpt3Qpgb2dFuBqflflVPTcnjLfhiCf8QI4z0wg/dQVLJIs41xaGb38yQ6p946nin3KoQ4NwO5m+HboCMogCfNLk6btWFxH/lHZoHtjUsK2NHRmEklXGYK6CpQQvYAC2kOIBxCsdGwYAYeLk7+h0GL+JsQcQKBgQCbDUrdxvleJL/o55rqVmx4J4cpww6ND3Bzi4X7tRKfgTov8QHI4pp0yfFz4pD/CHNMRduFnrvvuxXh2LoB0O4yQeQ/vmIASkbSvvA4F10Goyng7EmU14DjDYYhiQ4j5l4DeiKbwUjYJz/AgVLr8a51drJ+yTjGdPo++fGfg1cf6w==',
                        //         pubKey: 'CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDGn3leZnLWH1FBH7YTqtdpH4i9SihmXbX5QGoWe7soAUiflBs4jW74Cx9a3zxx/hwWZO14oIlP1CAJlID0S+Q5u5ssMmi8LpFjH3K6w6lFr2AsurmnVKB9WDBGwywm8zEo/TtUVrPR6x5W4p7hBA7mC56csFTB3sjQ0f1+l2s/amOq+f7ErzuqOR/XI2c/cnmGwLnCQc+dKPgAz9Gfcbp5sSVU8QT+xHMPNv3nIVALjYHO+v5Oz5L4MUNvrUnNt+/gnxBil8Z/lj4xhpNr14EGFgWzEyEj9eGicVYpPYPXC+Gu1n35/jYqqGctZQvgWq/ZlXufHjzl2sVvTYEoAgUzAgMBAAE='
                        //      }
                        //
                        assert.strictEqual( loadedStoragePeerId.id, storagePeerIdObj.id );
                        assert.strictEqual( loadedStoragePeerId.privKey, storagePeerIdObj.privKey );
                        assert.strictEqual( loadedStoragePeerId.pubKey, storagePeerIdObj.pubKey );
                } );

                it( '#prepareSwarmKey : load from an existing file', async () =>
                {
                        const tempDir = os.tmpdir();
                        const uniqueSwarmKeyTmpFullPath = join( tempDir, `peerId-${ Date.now() }.tmp` );
                        const swarmKeyStringProtocol    = `/key/swarm/psk/1.0.0/`;
                        const swarmKeyStringEncode    = `/base16/`;
                        const swarmKeyStringKey    = `f8063e718de593ca26617aa1935916c0d023c504d7d969058f251c6da7bd6efd`;
                        const swarmKeyString = `${ swarmKeyStringProtocol }\n${ swarmKeyStringEncode }\n${ swarmKeyStringKey }`;

                        try
                        {
                                fs.writeFileSync( uniqueSwarmKeyTmpFullPath, swarmKeyString, 'utf8' );
                                //console.plog( '#prepareSwarmKey successfully write swarmKey to file :', uniqueSwarmKeyTmpFullPath );
                        }
                        catch ( err )
                        {
                                console.error( '#prepareSwarmKey failed to write swarmKey to file: ', err );
                        }

                        const loadedSwarmKey = await PrepareUtil.prepareSwarmKey( uniqueSwarmKeyTmpFullPath );
                        const loadedSwarmKeyObj = new SwarmKeyStorageService().swarmKeyToObject( loadedSwarmKey );
                        //console.plog( `loadedSwarmKeyObj :`, loadedSwarmKeyObj );
                        //      loadedSwarmKeyObj : {
                        //         protocol: '/key/swarm/psk/1.0.0/',
                        //         encode: '/base16/',
                        //         key: 'f8063e718de593ca26617aa1935916c0d023c504d7d969058f251c6da7bd6efd'
                        //      }
                        assert.strictEqual( loadedSwarmKeyObj.protocol, swarmKeyStringProtocol );
                        assert.strictEqual( loadedSwarmKeyObj.encode, swarmKeyStringEncode );
                        assert.strictEqual( loadedSwarmKeyObj.key, swarmKeyStringKey );
                } );
        } );
} );
