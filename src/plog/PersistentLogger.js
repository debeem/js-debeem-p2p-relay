import { LevelDbManager } from "./LevelDbManager.js";
import _ from "lodash";
import { VaPersistentLogElement } from "../validators/VaPersistentLogElement.js";

/**
 *        @typedef  PersistentLogElement {object}
 *        @property timestamp {number}
 *        @property value {string}
 */


/**
 *        @class
 */
export class PersistentLogger extends LevelDbManager
{
        /**
         *        @type {string}
         */
        prefix = `empty_recipients_log`;

        /**
         *      @returns {string}
         */
        getPrefix()
        {
                return this.prefix;
        }

        /**
         *        get log key
         *        @param timestamp        {number}
         *        @returns {string|null}
         */
        getLogKey( timestamp )
        {
                if ( ! _.isNumber( timestamp ) || timestamp <= 0 )
                {
                        return null;
                }

                return `${ this.prefix }::${ timestamp }`;
        }

        /**
         *      @param logKey   {string}
         *      @returns {number}
         */
        extractTimestampFromLogKey( logKey )
        {
                if ( ! _.isString( logKey ) || ! logKey.includes( this.prefix ) )
                {
                        return 0;
                }

                const regex = new RegExp( `${ this.prefix }::(\\d+)` );
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
        insertLog( element )
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
                                        return reject( `${ this.constructor.name }.insertLog :: ${ errorElement }` );
                                }
                                if ( ! _.isNumber( element.timestamp ) || element.timestamp <= 0 )
                                {
                                        element.timestamp = Date.now();
                                }

                                const logKey = this.getLogKey( element.timestamp );
                                if ( ! _.isString( logKey ) )
                                {
                                        return reject( `${ this.constructor.name }.insertLog :: failed to calculate logKey` );
                                }

                                /**
                                 *        @type {any}
                                 */
                                let logData;
                                logData = element;

                                //	...
                                await LevelDbManager.getDB().put( logKey, logData );
                                resolve( true );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
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
                                const logKey = this.getLogKey( startTimestamp );

                                /**
                                 *      @type {{lt: string, limit: number, reverse: boolean, gt: (string|null)}}
                                 */
                                const options = {
                                        gt : _.isString( logKey ) ? logKey : this.prefix,
                                        lt : `${ this.prefix }\xFF`,
                                        limit : limit,
                                        reverse : false,        //      by ascending order
                                };

                                /**
                                 *      @type {Array< string >}
                                 */
                                const keys = await LevelDbManager.getDB().keys( options ).all();
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
                        const logKey = this.getLogKey( startTimestamp );

                        /**
                         *      @type {{lt: string, limit: number, reverse: boolean, gt: (string|null)}}
                         */
                        const options = {
                                gt : _.isString( logKey ) ? logKey : this.prefix,
                                lt : `${ this.prefix }\xFF`,
                                limit : limit,
                                reverse : false,        //      by ascending order
                        };

                        /**
                         *      @type {Array< PersistentLogElement >}
                         */
                        const values = await LevelDbManager.getDB().values( options ).all();
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
                                        gte : this.prefix,
                                        lt : `${ this.prefix }\xFF`
                                };

                                /**
                                 *      @type {Array< string >}
                                 */
                                const keys = await LevelDbManager.getDB().keys( options ).all();

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
                                        gte : this.prefix,
                                        lt : `${ this.prefix }\xFF`
                                };
                                await LevelDbManager.getDB().clear( options );
                                resolve();
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }
}
