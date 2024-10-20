import { isValidPersistentLogElement, LogRecorder } from "./LogRecorder.js";
import { SystemStatus } from "./SystemStatus.js";
import _ from "lodash";

/**
 *      @typedef {import('@libp2p/interface').PublishResult} PublishResult
 */

/**
 *        @typedef  RelayDoctorPublishData {object}
 *        @property topic       {string}
 *        @property pubString   {string}
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
                _.isString( data.pubString ) && ! _.isEmpty( data.pubString );
}


/**
 *      @class
 */
export class RelayDoctor
{
        /**
         *      @type {NodeJS.Timeout}
         */
        interval = undefined;

        /**
         *      @type {LogRecorder}
         */
        logRecorder = new LogRecorder();

        /**
         *      @typedef {import('@libp2p/interface').PubSub.publish} publish
         */
        pfnPublish = undefined;

        /**
         *      Indicate whether the functions within the interval is working
         *      @type {boolean}
         */
        intervalWorking = false;


        constructor()
        {
        }

        /**
         *      set publish function
         *      @param pfnPublish    {publish}
         *      @returns {void}
         */
        setPublishFunction( pfnPublish )
        {
                if ( ! _.isFunction( pfnPublish ) )
                {
                        throw new Error( `${ this.constructor.name }.setPublishFunction :: invalid pfnPublish` );
                }

                this.pfnPublish = pfnPublish;
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

                //      ...
                this.interval = setInterval( async () =>
                {
                        if ( this.intervalWorking )
                        {
                                return;
                        }

                        //      ...
                        this.intervalWorking = true;
                        try
                        {
                                await this.#intervalThread();
                        }
                        catch ( err )
                        {
                                console.error( err );
                        }
                        this.intervalWorking = false;

                }, intervalInMicroseconds );
        }

        /**
         *      stop worker interval
         */
        stop()
        {
                if ( this.interval )
                {
                        clearInterval( this.interval );
                        this.interval = undefined;
                }
        }

        /**
         *      worker thread of the interval
         *      @returns {Promise<boolean>}
         */
        #intervalThread()
        {
                return new Promise( async ( resolve, reject ) =>
                {
                        try
                        {
                                if ( ! await SystemStatus.isSystemIdle() )
                                {
                                        return reject( `${ this.constructor.name }.intervalThread :: system is busy` );
                                }
                                if ( ! this.pfnPublish || ! _.isFunction( this.pfnPublish ) )
                                {
                                        return reject( `${ this.constructor.name }.intervalThread :: invalid function this.pfnPublish` );
                                }

                                /**
                                 *      @type { PersistentLogElement | null }
                                 */
                                const frontElement = await this.logRecorder.front();
                                if ( null === frontElement )
                                {
                                        //      no element
                                        return resolve( true );
                                }
                                if ( ! isValidPersistentLogElement( frontElement ) )
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

                                //      ...
                                const pubByteData = new TextEncoder().encode( publishData.pubString );
                                await this.pfnPublish( publishData.topic, pubByteData );

                                //      ...
                                resolve( true );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                });
        }


        /**
         *      check publish result
         *
         *      @param publishResult    {PublishResult}
         *      @param publishData      {RelayDoctorPublishData}
         *      @returns {Promise<boolean>}
         */
        diagnosePublishResult( publishResult, publishData )
        {
                return new Promise( async ( resolve, reject ) =>
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
                                resolve( await this.logRecorder.insert( logElement ) );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                });
        }
}
