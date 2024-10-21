import { AbstractLogRecorder, isValidDiagnosticLogElement } from "../../AbstractLogRecorder.js";
import { TsQueuePullOrder, TsQueueService } from "debeem-queue";

import "deyml/config";
import { ProcessUtil } from "debeem-utils";
import _ from "lodash";
import { VaDiagnosticLogElement } from "../../../../validators/VaDiagnosticLogElement.js";


/**
 * 	@typedef {import('debeem-queue').TsQueueService} TsQueueService
 */


/**
 * 	@class
 */
export class RedisLogRecorder extends AbstractLogRecorder
{
	/**
	 * 	peerId string
	 *	@type {string}
	 */
	peerId = ``;

	/**
	 * 	channel name
	 *	@type {string}
	 */
	channel = ``;

	/**
	 * 	@type {TsQueueService}
	 */
	tsQueueService = undefined;


	constructor( { peerId = `` } = {} )
	{
		super();
		if ( ! _.isString( peerId ) || _.isEmpty( peerId.trim() ) )
		{
			throw new Error( `${ this.constructor.name }.constructor :: invalid peerId` );
		}

		this.peerId = peerId.trim().toLowerCase();
		this.channel = `p2p-relay-doctor-log-${ this.peerId }`;

		//	...
		this.#initRedis();
	}

	/**
	 *	@param logKey	{number}
	 *	@returns {number}
	 */
	extractTimestampFromLogKey( logKey )
	{
		return Number( logKey );
	}

	/**
	 *      @param element             {DiagnosticLogElement}
	 *      @returns { Promise< boolean > }
	 */
	enqueue( element )
	{
		return new Promise( async (
			resolve,
			reject
		) =>
		{
			try
			{
				const errorElement = VaDiagnosticLogElement.validateLogElement( element );
				if ( null !== errorElement )
				{
					return reject( `${ this.constructor.name }.enqueue :: ${ errorElement }` );
				}
				if ( ! _.isNumber( element.timestamp ) || element.timestamp <= 0 )
				{
					element.timestamp = Date.now();
				}
				if ( ! isValidDiagnosticLogElement( element ) )
				{
					return reject( `${ this.constructor.name }.enqueue :: invalid element` );
				}

				const result = await this.tsQueueService.enqueue( this.channel, element.timestamp, element );
				resolve( 1 === result );
			}
			catch ( err )
			{
				reject( err );
			}
		} );
	}

	/**
	 *      @returns { Promise< DiagnosticLogElement | null > }
	 */
	dequeue()
	{
		return new Promise( async (
			resolve,
			reject
		) =>
		{
			try
			{
				//      query the first element from the beginning of the list
				const frontElement = await this.front();
				if ( frontElement &&
					frontElement.data )
				{
					if ( ! isValidDiagnosticLogElement( frontElement.data ) )
					{
						return reject( `${ this.constructor.name }.dequeue :: invalid frontElement` );
					}

					//      ...
					await this.tsQueueService.delete( this.channel, frontElement.data.timestamp );
					return resolve( frontElement.data );
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
	 *      @returns { Promise< DiagnosticLogElement | null > }
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
				const member = await this.tsQueueService.front( this.channel );
				resolve( ( member && member.data ) ? member.data : null );
			}
			catch ( err )
			{
				reject( err );
			}
		} );
	}

	/**
	 *      @param [timestamp]      {number}
	 *      @returns { Promise< DiagnosticLogElement | null > }
	 */
	peek( timestamp = 0 )
	{
		return new Promise( async (
			resolve,
			reject
		) =>
		{
			try
			{
				const member = await this.tsQueueService.peek( this.channel, timestamp );
				resolve( ( member && member.data ) ? member.data : null );
			}
			catch ( err )
			{
				reject( err );
			}
		} );
	}

	/**
	 *      @returns { Promise< number > }
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
				resolve( await this.tsQueueService.size( this.channel ) );
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
				resolve( 0 === await this.size() );
			}
			catch ( err )
			{
				reject( err );
			}
		} );
	}

	/**
	 *      @param elementOrTimestamp	{ DiagnosticLogElement | number }
	 *      @returns { Promise<number> }
	 */
	delete( elementOrTimestamp )
	{
		return new Promise( async (
			resolve,
			reject
		) =>
		{
			try
			{
				let timestampValue = undefined;
				if ( _.isNumber( elementOrTimestamp ) && elementOrTimestamp > 0 )
				{
					timestampValue = elementOrTimestamp;
				}
				else if ( isValidDiagnosticLogElement( elementOrTimestamp ) )
				{
					timestampValue = elementOrTimestamp.timestamp;
				}
				else
				{
					return reject( `${ this.constructor.name }.delete :: invalid elementOrTimestamp` );
				}

				resolve( this.tsQueueService.delete( this.channel, timestampValue ) );
			}
			catch ( err )
			{
				reject( err );
			}
		} );
	}

	/**
	 *      @returns { Promise<number> }
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
				resolve( await this.tsQueueService.clear( this.channel ) );
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
		return new Promise( async ( resolve, reject ) =>
		{
			try
			{
				const elements = await this.getPaginatedElements( startTimestamp, limit );
				console.log(  `elements :`, elements );
				if ( Array.isArray( elements ) &&
					elements.length > 0 )
				{
					let keys = [];
					for ( const element of elements )
					{
						if ( isValidDiagnosticLogElement( element ) )
						{
							keys.push( element.timestamp );
						}
					}

					return resolve( keys );
				}

				resolve( [] );
			}
			catch ( err )
			{
				reject( err );
			}
		});
	}

	/**
	 *     get paginated elements
	 *
	 *      @param startTimestamp   {number}
	 *      @param limit            {number}
	 *      @returns { Promise< Array<DiagnosticLogElement> > }
	 */
	getPaginatedElements(
		startTimestamp,
		limit
	)
	{
		return new Promise( async ( resolve, reject ) =>
		{
			try
			{
				if ( ! _.isNumber( startTimestamp ) || startTimestamp < 0 )
				{
					return reject( `${ this.constructor.name }.getPaginatedElements :: invalid startTimestamp` );
				}
				if ( ! _.isNumber( limit ) || limit <= 0 )
				{
					return reject( `${ this.constructor.name }.getPaginatedElements :: invalid limit` );
				}

				const options = {
					pageNo: 1,
					pageSize: limit,
					order: TsQueuePullOrder.ASC,
					excludeStartMember : ( startTimestamp > 0 ),
				};
				const result = await this.tsQueueService.pull( this.channel, startTimestamp, -1, options );
				console.log( `result :`, options, result );
				if ( result &&
					result.total > 0 &&
					Array.isArray( result.list ) &&
					result.list.length > 0 )
				{
					let elements = [];
					for ( const member of result.list )
					{
						if ( member &&
							member.data &&
							isValidDiagnosticLogElement( member.data ) )
						{
							elements.push( member.data );
						}
					}

					return resolve( elements );
				}

				resolve( [] );
			}
			catch ( err )
			{
				reject( err );
			}
		});
	}

	#initRedis()
	{
		const port = ProcessUtil.getParamIntValue( `REDIS_PORT`, 6379 );
		const host = ProcessUtil.getParamStringValue( `REDIS_HOST`, `host.docker.internal` );
		const username = ProcessUtil.getParamStringValue( `REDIS_USERNAME`, `` );
		const password = ProcessUtil.getParamStringValue( `REDIS_PASSWORD`, `` );
		const db = ProcessUtil.getParamIntValue( `REDIS_DB`, 0 );

		//	...
		this.tsQueueService = new TsQueueService( port, host, {
			port : port,
			host : host,
			username : username,
			password : password,
			db : db
		} );
	}
}
