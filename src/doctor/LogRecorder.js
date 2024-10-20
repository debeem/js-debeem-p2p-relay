import { LevelDbManager } from "./LevelDbManager.js";
import _ from "lodash";
import { VaPersistentLogElement } from "../validators/VaPersistentLogElement.js";

/**
 *        @typedef  PersistentLogElement {object}
 *        @property timestamp {number}
 *        @property value {string}
 */

/**
 *      check if the input value is a valid PersistentLogElement
 *
 *      @param element          {any}
 *      @returns {boolean}
 */
export function isValidPersistentLogElement( element )
{
        return _.isObject( element ) &&
                _.isNumber( element.timestamp ) && element.timestamp > 0 &&
                ( _.isObject( element.value ) || _.isString( element.value ) ) && ! _.isEmpty( element.value );
}




/**
 *        @class
 */
export class LogRecorder extends LevelDbManager
{
        /**
         *        calculate log key
         *        @param timestamp        {number}
         *        @returns {string|null}
         */
        calcLogKey( timestamp )
        {
                if ( ! _.isNumber( timestamp ) || timestamp <= 0 )
                {
                        return null;
                }

                return `${ this.getLogPrefix() }::${ timestamp }`;
        }

        /**
         *      @param logKey   {string}
         *      @returns {number}
         */
        extractTimestampFromLogKey( logKey )
        {
                if ( ! _.isString( logKey ) || ! logKey.includes( this.getLogPrefix() ) )
                {
                        return 0;
                }

                const regex = new RegExp( `${ this.getLogPrefix() }::(\\d+)` );
                const match = logKey.match( regex );
                if ( match && match[ 1 ] )
                {
                        const extractedNumber = parseInt( match[ 1 ] );
                        if ( _.isNumber( extractedNumber ) )
                        {
                                return extractedNumber;
                        }
                }

                return 0;
        }

        /**
         *        add new element to database
         *        @param element        {PersistentLogElement}
         *        @returns {Promise< boolean >}
         */
        insert( element )
        {
                return new Promise( async (
                        resolve,
                        reject
                ) =>
                {
                        try
                        {
                                const errorElement = VaPersistentLogElement.validateLogElement( element );
                                if ( null !== errorElement )
                                {
                                        return reject( `${ this.constructor.name }.insert :: ${ errorElement }` );
                                }
                                if ( ! _.isNumber( element.timestamp ) || element.timestamp <= 0 )
                                {
                                        element.timestamp = Date.now();
                                }

                                const logKey = this.calcLogKey( element.timestamp );
                                if ( ! _.isString( logKey ) || _.isEmpty( logKey ) )
                                {
                                        return reject( `${ this.constructor.name }.insert :: failed to calculate logKey` );
                                }

                                /**
                                 *        @type {any}
                                 */
                                let logData;
                                logData = element;

                                //	...
                                await this.getDB().put( logKey, logData );
                                resolve( true );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }

        /**
         * 	remove and return an element from the beginning of the list
         *
         *	@returns { Promise< PersistentLogElement | null > }
         */
        dequeue()
        {
                return new Promise( async ( resolve, reject ) =>
                {
                        try
                        {
                                //      query the first element from the beginning of the list
                                const frontElement = await this.front();
                                if ( frontElement )
                                {
                                        /**
                                         *      @type {string|null}
                                         */
                                        const logKey = this.calcLogKey( frontElement.timestamp );
                                        if ( ! _.isString( logKey ) || _.isEmpty( logKey ) )
                                        {
                                                return reject( `${ this.constructor.name }.dequeue :: failed to calculate logKey` );
                                        }

                                        //      ...
                                        await this.getDB().del( logKey );

                                        //      ...
                                        return resolve( frontElement );
                                }

                                resolve( null );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                });
        }

        /**
         *      delete an element
         *
         *      @param elementOrTimestamp       { PersistentLogElement | number }
         *      @returns {Promise<boolean>}
         */
        delete( elementOrTimestamp )
        {
                return new Promise( async ( resolve, reject ) =>
                {
                        try
                        {
                                let logKey = null;
                                if ( _.isNumber( elementOrTimestamp ) && elementOrTimestamp > 0 )
                                {
                                        logKey = this.calcLogKey( elementOrTimestamp );
                                }
                                else if ( isValidPersistentLogElement( elementOrTimestamp ) )
                                {
                                        logKey = this.calcLogKey( elementOrTimestamp.timestamp );
                                }
                                else
                                {
                                        return reject( `${ this.constructor.name }.delete :: invalid elementOrTimestamp` );
                                }

                                if ( ! _.isString( logKey ) || _.isEmpty( logKey ) )
                                {
                                        return reject( `${ this.constructor.name }.delete :: failed to calculate logKey` );
                                }

                                //      ...
                                await this.getDB().del( logKey );
                                resolve( true );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                });
        }

        /**
         *      get paginated keys
         *
         *      @param startTimestamp   {number}
         *      @param limit            {number}
         *      @returns { Promise< Array<string> > }
         */
        getPaginatedKeys(
                startTimestamp,
                limit
        )
        {
                return new Promise( async (
                        resolve,
                        reject
                ) =>
                {
                        try
                        {
                                if ( ! _.isNumber( startTimestamp ) )
                                {
                                        return reject( `${ this.constructor.name }.getPaginatedKeys :: invalid startTimestamp` );
                                }
                                if ( ! _.isNumber( limit ) || limit <= 0 )
                                {
                                        return reject( `${ this.constructor.name }.getPaginatedKeys :: invalid limit` );
                                }


                                /**
                                 *      @type {string|null}
                                 */
                                const logKey = this.calcLogKey( startTimestamp );

                                /**
                                 *      @type {{lt: string, limit: number, reverse: boolean, gt: (string|null)}}
                                 */
                                const options = {
                                        gt : _.isString( logKey ) ? logKey : this.getLogPrefix(),
                                        lt : `${ this.getLogPrefix() }\xFF`,
                                        limit : limit,
                                        reverse : false,        //      by ascending order
                                };

                                /**
                                 *      @type {Array< string >}
                                 */
                                const keys = await this.getDB().keys( options ).all();
                                resolve( Array.isArray( keys ) ? keys : [] );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }


        /**
         *     get paginated keys
         *
         *      @param startTimestamp   {number}
         *      @param limit            {number}
         *      @returns { Promise< PersistentLogElement > }
         */
        getPaginatedElements(
                startTimestamp,
                limit
        )
        {
                return new Promise( async (
                        resolve,
                        reject
                ) =>
                {
                        if ( ! _.isNumber( startTimestamp ) )
                        {
                                return reject( `${ this.constructor.name }.getPaginatedElements :: invalid startTimestamp` );
                        }
                        if ( ! _.isNumber( limit ) || limit <= 0 )
                        {
                                return reject( `${ this.constructor.name }.getPaginatedElements :: invalid limit` );
                        }

                        /**
                         *      @type {string|null}
                         */
                        const logKey = this.calcLogKey( startTimestamp );

                        /**
                         *      @type {{lt: string, limit: number, reverse: boolean, gt: (string|null)}}
                         */
                        const options = {
                                gt : _.isString( logKey ) ? logKey : this.getLogPrefix(),
                                lt : `${ this.getLogPrefix() }\xFF`,
                                limit : limit,
                                reverse : false,        //      by ascending order
                        };

                        /**
                         *      @type {Array< PersistentLogElement >}
                         */
                        const values = await this.getDB().values( options ).all();
                        resolve( Array.isArray( values ) ? values : [] );
                } );
        }




        /**
         *      get the first element by ascending order
         *      @returns { Promise< PersistentLogElement | null > }
         */
        front()
        {
                return new Promise( async (
                        resolve,
                        reject
                ) =>
                {
                        try
                        {
                                const values = await this.getPaginatedElements( 0, 1 );
                                if ( Array.isArray( values ) && values.length > 0 )
                                {
                                        return resolve( values[ 0 ] );
                                }

                                resolve( null );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }

        /**
         *      check if database is empty
         *      @returns { Promise< boolean > }
         */
        isEmpty()
        {
                return new Promise( async (
                        resolve,
                        reject
                ) =>
                {
                        try
                        {
                                const keys = await this.getPaginatedKeys( 0, 1 );
                                resolve( ! ( Array.isArray( keys ) && keys.length > 0 ) );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }

        /**
         *        get database size
         *        @returns { Promise< number > }
         */
        size()
        {
                return new Promise( async (
                        resolve,
                        reject
                ) =>
                {
                        try
                        {
                                const options = {
                                        gte : this.getLogPrefix(),
                                        lt : `${ this.getLogPrefix() }\xFF`
                                };

                                /**
                                 *      @type {Array< string >}
                                 */
                                const keys = await this.getDB().keys( options ).all();

                                //      ...
                                resolve( Array.isArray( keys ) ? keys.length : 0 );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }

        /**
         *      clear database
         *      @returns { Promise< void > }
         */
        clear()
        {
                return new Promise( async (
                        resolve,
                        reject
                ) =>
                {
                        try
                        {
                                const options = {
                                        gte : this.getLogPrefix(),
                                        lt : `${ this.getLogPrefix() }\xFF`
                                };
                                await this.getDB().clear( options );
                                resolve();
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }
}
