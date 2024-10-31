import { ChPubService, ChSubService } from "debeem-queue";
import _ from "lodash";
import { LocalParamUtil as LocalParamUtils } from "../utils/LocalParamUtil.js";
import { LoggerUtil } from "../utils/LoggerUtil.js";

/**
 * 	@class
 */
export class AbstractP2pPackagePool
{
	poolName= undefined;
	chPub= undefined;
	chSub= undefined;

	/**
	 *	@type {Logger}
	 */
	log = new LoggerUtil().logger;

	/**
	 *	@param [poolName]	{string}	- optional
	 */
	constructor( poolName = undefined )
	{
		if ( AbstractP2pPackagePool === new.target )
		{
			throw new Error( `${ this.constructor.name } :: Cannot instantiate abstract class AbstractP2pPackagePool` );
		}

		if ( poolName )
		{
			this.setPoolName( poolName );
		}
	}

	/**
	 *	@param poolName	{string}
	 *	@returns {void}
	 */
	setPoolName( poolName )
	{
		if ( ! _.isString( poolName ) || _.isEmpty( poolName ) )
		{
			throw new Error( `${ this.constructor.name } :: invalid poolName` );
		}

		this.poolName = poolName;
	}

	/**
	 * 	@returns {boolean}
	 */
	init()
	{
		if ( this.isInitialized() )
		{
			return true;
		}
		if ( ! _.isString( this.poolName ) || _.isEmpty( this.poolName ) )
		{
			throw new Error( `${ this.constructor.name } :: poolName not set` );
		}

		//
		//	create redis pool for received HTTP requests that been broadcast from other peers
		//
		const redisOptions = LocalParamUtils.getRedisOptions();
		//console.log( `${ this.constructor.name } :: redisOptions :`, redisOptions );
		this.log.info( `${ this.constructor.name }.init :: redisOptions :`, redisOptions );

		this.chPub = new ChPubService( redisOptions.port, redisOptions.host, {
			port : redisOptions.port,
			host : redisOptions.host,
			username : redisOptions.username,
			password : redisOptions.password,
			db : redisOptions.db
		} );
		this.chSub = new ChSubService( redisOptions.port, redisOptions.host, {
			port : redisOptions.port,
			host : redisOptions.host,
			username : redisOptions.username,
			password : redisOptions.password,
			db : redisOptions.db
		} );

		//	...
		return true;
	}

	/**
	 *	@return {boolean}
	 */
	isInitialized()
	{
		return ( !! this.chPub ) && ( !! this.chSub );
	}

	/**
	 * 	push the p2p package to redis pool
	 *	@param p2pPackage	{ object }
	 *	@returns {Promise<boolean>}
	 */
	push( p2pPackage )
	{
		return new Promise( async ( resolve, reject ) =>
		{
			try
			{
				if ( ! this.chPub )
				{
					return reject( `${ this.constructor.name }.push :: not initialized` );
				}

				const errorP2pPackage = this.verifyP2pPackage( p2pPackage );
				if ( null !== errorP2pPackage )
				{
					return reject( `${ this.constructor.name }.push :: ${ errorP2pPackage }` );
				}

				// console.log( `|||||| p2p : received a business broadcasting package, it has been verified.
				// 		topic : ${ p2pPackage.topic },
				// 		from : ${ p2pPackage.from.toString() },
				// 		sequenceNumber: ${ p2pPackage.sequenceNumber.toString() }` );
				this.log.info( `${ this.constructor.name }.push :: |||||| p2p : received a business broadcasting package, it has been verified. 
						topic : ${ p2pPackage.topic }, 
						from : ${ p2pPackage.from.toString() },
						sequenceNumber: ${ p2pPackage.sequenceNumber.toString() }` );
				const item = {
					//
					//	Build your structure here
					//
				};
				const result = await this.chPub.publish( this.poolName, item );
				resolve( result );
			}
			catch ( err )
			{
				reject( err );
			}
		});
	}

	/**
	 *	@param callback	{function}
	 *	@returns {void}
	 */
	subscribe( callback )
	{
		if ( ! this.chSub || ! this.chPub )
		{
			throw Error( `${ this.constructor.name } :: not initialized` );
		}

		//
		//	subscribe to messages from the pool
		//
		const chSubOptions = {
			parseJSON : true
		};
		this.chSub.subscribe( this.poolName, ( /** @type {string} **/ channel, /** @type {string} **/ message, /** @type {any} **/ options ) =>
		{
			this.log.info( `${ this.constructor.name } :: ))) received message from channel [${channel}] : `, message );
			if ( _.isFunction( callback ) )
			{
				callback( channel, message, options );
			}

		}, chSubOptions );
	}

	verifyP2pPackage( p2pPackage )
	{
		if ( ! _.isObject( p2pPackage ) )
		{
			return `invalid p2pPackage`;
		}

		/**
		 * 	add verifications here
		 * 	...
		 */

		/**
		 * 	null means no error
		 */
		return null;
	}
}
