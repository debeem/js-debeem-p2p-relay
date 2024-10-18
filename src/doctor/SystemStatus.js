import os from 'os';

/**
 *      @class
 */
export class SystemStatus
{
        /**
         *      query CPU usage
         *
         *      @returns {Promise<number>}
         */
        static queryCpuUsage()
        {
                return new Promise( (
                        resolve,
                        reject
                ) =>
                {
                        try
                        {
                                const cpus = os.cpus();
                                let idleTime = 0;
                                let totalTime = 0;

                                for ( const cpu of cpus )
                                {
                                        const times = cpu.times;
                                        idleTime += times.idle;
                                        totalTime += times.user + times.nice + times.sys + times.idle + times.irq;
                                }

                                const idlePercentage = ( idleTime / totalTime ) * 100;
                                const cpuUsage = 100 - idlePercentage;
                                resolve( cpuUsage );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }

        /**
         *      Checks if the CPU usage is below the specified threshold.
         *
         *      @param {number} threshold - Maximum percentage of CPU usage (0-100).
         *      @returns {Promise<boolean>} - Resolves to true if CPU is not busy, false otherwise.
         */
        static isCpuIdle( threshold = 75 )
        {
                return new Promise( async (
                        resolve,
                        reject
                ) =>
                {
                        try
                        {
                                const cpuUsage = await this.queryCpuUsage();
                                resolve( cpuUsage < threshold );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }


        /**
         *      query memory usage
         *
         *      @returns {Promise<number>}
         */
        static queryMemoryUsage()
        {
                return new Promise( (
                        resolve,
                        reject
                ) =>
                {
                        try
                        {
                                const totalMemory = os.totalmem();
                                const freeMemory = os.freemem();
                                const memoryUsagePercentage = ( ( totalMemory - freeMemory ) / totalMemory ) * 100;
                                resolve( memoryUsagePercentage );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }

        /**
         *      Checks if the memory usage is below the specified threshold.
         *
         *      @param {number} threshold - Maximum percentage of memory usage (0-100).
         *      @returns {Promise<boolean>} - Resolves to true if memory is not busy, false otherwise.
         */
        static isMemoryIdle( threshold = 75 )
        {
                return new Promise( async (
                        resolve,
                        reject
                ) =>
                {
                        try
                        {
                                const usedMemoryPercentage = await this.queryMemoryUsage();
                                resolve( usedMemoryPercentage < threshold );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }


        /**
         *      get event loop lagging in microsecond
         *
         *      @returns {Promise<number>}
         */
        static getEventLoopLagging()
        {
                return new Promise( ( resolve, reject ) =>
                {
                        try
                        {
                                const start = process.hrtime();
                                setTimeout( () =>
                                {
                                        const delta = process.hrtime( start );
                                        const lagging = ( delta[ 0 ] * 1e9 + delta[ 1 ] ) / 1e6;        //      in microsecond

                                        resolve( lagging );
                                }, 0 );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }

        /**
         *      checks if the event loop lagging is below the specified threshold.
         *
         *      @param threshold        {number} in microseconds
         *      @returns {Promise<boolean>}
         */
        static isEventLoopLaggingIdle( threshold = 100 )
        {
                return new Promise( async ( resolve, reject ) =>
                {
                        try
                        {
                                const eventLoopLagging = await this.getEventLoopLagging();
                                resolve( eventLoopLagging < threshold );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }


        /**
         *      checks if the system in idle status
         *
         *      @param cpuThreshold                     {number}
         *      @param memoryThreshold                  {number}
         *      @param eventLoopLaggingThreshold        {number}
         *      @returns {Promise<boolean>}
         */
        static isSystemIdle( cpuThreshold = 75, memoryThreshold = 100, eventLoopLaggingThreshold = 100 )
        {
                return new Promise( async ( resolve, reject ) =>
                {
                        try
                        {
                                const isCpuIdle = await this.isCpuIdle( cpuThreshold );
                                const isMemoryIdle = await this.isMemoryIdle( memoryThreshold );
                                const isEventLoopLaggingIdle = await this.isEventLoopLaggingIdle( eventLoopLaggingThreshold );

                                //      ...
                                resolve( isCpuIdle && isMemoryIdle && isEventLoopLaggingIdle );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }
}
