import assert from "assert";
import { SystemStatus } from "../../src/index.js";


/**
 *        unit test
 */
describe( 'SystemStatus', function ()
{
        before(function()
        {
                process.env.NODE_ENV = 'test';
                process.env.JEST_WORKER_ID = `mocha`;
        });

        describe( 'methods', function ()
        {
                it( '#queryCpuUsage', async () =>
                {
                        const cpuUsage = await SystemStatus.queryCpuUsage();
                        assert.strictEqual( cpuUsage > 0 && cpuUsage < 100, true );
                } );
                it( '#isCpuIdle', async () =>
                {
                        const isCpuIdle = await SystemStatus.isCpuIdle( 90 );
                        assert.strictEqual( isCpuIdle, true );
                } );

                it( '#queryMemoryUsage', async () =>
                {
                        const memoryUsage = await SystemStatus.queryMemoryUsage();
                        //console.log( `memoryUsage :`, memoryUsage );
                        //      memoryUsage : 99.02839660644531
                        assert.strictEqual( memoryUsage > 0 && memoryUsage < 100, true );
                } );
                it( '#isMemoryIdle', async () =>
                {
                        const isMemoryIdle = await SystemStatus.isMemoryIdle( 100 );
                        assert.strictEqual( isMemoryIdle, true );
                } );

                it( '#getEventLoopLagging', async () =>
                {
                        const eventLoopLagging = await SystemStatus.getEventLoopLagging();
                        console.log( `eventLoopLagging :`, eventLoopLagging );
                        //      eventLoopLagging : 1.479208
                        assert.strictEqual( eventLoopLagging >= 0, true );
                } );
                it( '#isEventLoopLaggingIdle', async () =>
                {
                        const isEventLoopLaggingIdle = await SystemStatus.isEventLoopLaggingIdle( 100 );
                        assert.strictEqual( isEventLoopLaggingIdle, true );
                } );

                it( '#isSystemIdle', async () =>
                {
                        const isSystemIdle = await SystemStatus.isSystemIdle( 75, 100, 100 );
                        assert.strictEqual( isSystemIdle, true );
                } );
        } );
} );
