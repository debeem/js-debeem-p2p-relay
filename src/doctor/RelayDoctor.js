import { SystemStatus } from "./SystemStatus.js";
import _ from "lodash";
import { RedisLogRecorder } from "./logger/impls/RedisLog/RedisLogRecorder.js";
import { isValidDiagnosticLogElement } from "./logger/AbstractLogRecorder.js";

/**
 *      @typedef {import('@libp2p/interface').PublishResult} PublishResult
 */

/**
 *        @typedef  RelayDoctorPublishData {object}
 *        @property topic       {string}
 *        @property data        {any}
 */


/**
 *      check if the input value is a valid RelayDoctorPublishData
 *
 *      @param data     {any}
 *      @returns {boolean}
 */
export function isValidRelayDoctorPublishData( data )
{
        return _.isObject( data ) &&
                _.isString( data.topic ) && ! _.isEmpty( data.topic ) &&
                _.isObject( data.data ) && ! _.isEmpty( data.data );
}

/**
 *      default value of the maximum queue length
 *      @type {number}
 */
export const defaultMaxQueueSize = 9999;


/**
 *      @class
 */
export class RelayDoctor
{
        /**
         * 	peerId string
         *	@type {string}
         */
        peerId = ``;

        /**
         *      @type {NodeJS.Timeout}
         */
        intervalRepublish = undefined;

        /**
         *      Indicate whether the functions within the interval is working
         *      @type {boolean}
         */
        intervalRepublishWorking = false;

        /**
         *      @type {RedisLogRecorder}
         */
        logRecorder = undefined;

        /**
         *      @typedef {import('@libp2p/interface').PubSub.publish} publish
         */
        pClsRelayService = undefined;

        /**
         *      the maximum queue length
         *      @type {number}
         */
        maxQueueSize = defaultMaxQueueSize;


        constructor( {
                             maxQueueSize = defaultMaxQueueSize,
                             peerId = ``
                     } = {} )
        {
                if ( _.isNumber( maxQueueSize ) && maxQueueSize > 0 )
                {
                        this.maxQueueSize = maxQueueSize;
                }

                /**
                 *      copy peerId
                 */
                if ( ! _.isString( peerId ) || _.isEmpty( peerId.trim() ) )
                {
                        throw new Error( `${ this.constructor.name }.constructor :: invalid peerId` );
                }
                this.peerId = peerId.trim().toLowerCase();

                /**
                 *      create log recorder
                 *      @type {RedisLogRecorder}
                 */
                this.logRecorder = new RedisLogRecorder( { peerId : peerId } );
        }

        /**
         *      set RelayService class instance address
         *      @param pClsRelayService    {publish}
         *      @returns {void}
         */
        setRelayServiceAddress( pClsRelayService )
        {
                if ( ! pClsRelayService )
                {
                        throw new Error( `${ this.constructor.name }.setRelayServiceAddress :: invalid pClsRelayService` );
                }
                this.pClsRelayService = pClsRelayService;
        }

        /**
         *      start worker interval
         *
         *      @param [intervalInMicroseconds]         {number}
         *      @returns {void}
         */
        start( intervalInMicroseconds = 3000 )
        {
                if ( ! _.isNumber( intervalInMicroseconds ) || intervalInMicroseconds <= 0 )
                {
                        intervalInMicroseconds = 3000;
                }

                //      ...
                this.stop();

                //      republish
                this.intervalRepublish = setInterval( async () =>
                {
                        if ( this.intervalRepublishWorking )
                        {
                                return;
                        }

                        //      ...
                        this.intervalRepublishWorking = true;
                        try
                        {
                                await this.#intervalRepublishThread();
                        }
                        catch ( err )
                        {
                                console.error( err );
                        }
                        this.intervalRepublishWorking = false;

                }, intervalInMicroseconds );
        }

        /**
         *      stop worker interval
         */
        stop()
        {
                if ( this.intervalRepublish )
                {
                        clearInterval( this.intervalRepublish );
                        this.intervalRepublish = undefined;
                }
        }


        /**
         *      republishing worker thread of the interval
         *      @returns {Promise<boolean>}
         */
        #intervalRepublishThread()
        {
                return new Promise( async (
                        resolve,
                        reject
                ) =>
                {
                        try
                        {
                                if ( ! await SystemStatus.isSystemIdle() )
                                {
                                        return reject( `${ this.constructor.name }.intervalThread :: system is busy` );
                                }
                                // if ( ! this.pfnPublish || ! _.isFunction( this.pfnPublish ) )
                                // {
                                //         return reject( `${ this.constructor.name }.intervalThread :: invalid function this.pfnPublish` );
                                // }

                                /**
                                 *      @type { DiagnosticLogElement | null }
                                 */
                                const frontElement = await this.logRecorder.front();
                                if ( null === frontElement )
                                {
                                        //      no element
                                        return resolve( true );
                                }
                                if ( ! isValidDiagnosticLogElement( frontElement ) )
                                {
                                        return reject( `${ this.constructor.name }.intervalThread :: invalid loaded frontElement` );
                                }

                                /**
                                 *      @type {RelayDoctorPublishData}
                                 */
                                const publishData = frontElement.value;
                                //console.log( `publishData :`, publishData );
                                //      publishData : {
                                //   topic: 'testTopic',
                                //   pubString: '{"hello":"world","ts":1729252724799}'
                                // }
                                //
                                if ( ! isValidRelayDoctorPublishData( publishData ) )
                                {
                                        return reject( `${ this.constructor.name }.intervalThread :: invalid loaded publishData` );
                                }

                                //
                                //      republish
                                //
                                const republishResult = await this.pClsRelayService.publish( publishData.topic, publishData.data );
                                console.log( `///***///***/// republishResult :`, republishResult );

                                //
                                //      delete the element
                                //
                                await this.logRecorder.delete( frontElement );

                                //
                                //      purge
                                //      if the queue exceeds the limit, the earliest data will be deleted
                                //
                                const size = this.logRecorder.size();
                                if ( size > this.maxQueueSize )
                                {
                                        const toBePurgedKeys = await this.logRecorder.getPaginatedKeys( 0, size - this.maxQueueSize );
                                        for ( const key of toBePurgedKeys )
                                        {
                                                await this.logRecorder.delete( key );
                                        }
                                }

                                //      ...
                                resolve( true );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }

        /**
         *      check publish result
         *
         *      @param publishResult    {PublishResult}
         *      @param publishData      {RelayDoctorPublishData}
         *      @returns {Promise<boolean>}
         */
        diagnosePublishResult(
                publishResult,
                publishData
        )
        {
                return new Promise( async (
                        resolve,
                        reject
                ) =>
                {
                        try
                        {
                                if ( ! _.isObject( publishResult ) ||
                                        ! Array.isArray( publishResult.recipients ) )
                                {
                                        return reject( `${ this.constructor.name }.diagnosePublishResult :: invalid publishResult` );
                                }
                                if ( ! isValidRelayDoctorPublishData( publishData ) )
                                {
                                        return reject( `${ this.constructor.name }.diagnosePublishResult :: invalid publishData` );
                                }
                                if ( publishResult.recipients.length > 0 )
                                {
                                        //      every thing is okay
                                        return resolve( true );
                                }

                                const logElement = { timestamp : 0, value : publishData };
                                resolve( await this.logRecorder.enqueue( logElement ) );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }
}
