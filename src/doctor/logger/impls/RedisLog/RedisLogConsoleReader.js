import Redis from 'ioredis';
import readline from 'readline';
import { RedisLogRecorder } from "./RedisLogRecorder.js";
import { ProcessUtil } from "debeem-utils";
import { PrepareUtil } from "../../../../utils/PrepareUtil.js";


export class RedisSortedSetIterator
{
	/**
	 *	@type {number}
	 */
	size = 0;

	/**
	 * 	@type {number}
	 */
	currentIndex = 0;

	/**
	 * 	@type {number}
	 */
	nextIndex = 0;


	constructor( {
			     redisConfig = redisConfig,
			     sortedSetKey = sortedSetKey,
			     size = size
		     } )
	{
		// Initialize Redis client
		this.redis = new Redis( redisConfig );

		// Sorted set key in Redis
		this.sortedSetKey = sortedSetKey;

		this.size = size;

		// Current index for iteration
		this.currentIndex = 0;
	}

	// Method to get a member from the sorted set based on the current index
	async getNextMember()
	{
		// Use ZRANGE to get one member at a time from the sorted set
		const members = await this.redis.zrange( this.sortedSetKey, this.currentIndex, this.currentIndex );
		if ( members.length > 0 )
		{
			//	Move to the next index for future calls
			this.currentIndex ++;
			this.nextIndex = this.currentIndex;

			return JSON.parse( members[ 0 ] );
		}
		else
		{
			return null; // Return null if no more members are found
		}
	}

	// Close the Redis connection when done
	close()
	{
		this.redis.disconnect();
	}
}

export class RedisLogConsoleReader
{
	redisClient = null;	//	Redis client
	iterator = null;		//	Iterator for the sorted set members

	constructor(
		redisUrl,
		sortedSetKey
	)
	{
		this.redisUrl = redisUrl; // Redis connection URL
		this.sortedSetKey = sortedSetKey; // The key of the sorted set in Redis
	}

	/**
	 * 	create Redis iterator
	 *	@returns {Promise<RedisSortedSetIterator>}
	 */
	async createIterator()
	{
		return new Promise( async (
			resolve,
			reject
		) =>
		{
			try
			{
				const peerIdFilename = ProcessUtil.getParamStringValue( `peer_id`, undefined );
				const peerIdObject = await PrepareUtil.preparePeerId( peerIdFilename );
				if ( ! peerIdObject )
				{
					return reject( `${ this.constructor.name }.#init :: failed to load peerId` );
				}

				this.logRecorder = new RedisLogRecorder( {
					peerId : peerIdObject.toString(),
				} );

				const port = ProcessUtil.getParamIntValue( `REDIS_PORT`, 6379 );
				const host = ProcessUtil.getParamStringValue( `REDIS_HOST`, `host.docker.internal` );
				const username = ProcessUtil.getParamStringValue( `REDIS_USERNAME`, `` );
				const password = ProcessUtil.getParamStringValue( `REDIS_PASSWORD`, `` );
				const db = ProcessUtil.getParamIntValue( `REDIS_DB`, 0 );

				//	...
				const redisConfig = { host : host, port : port };
				const options = {
					redisConfig : redisConfig,
					sortedSetKey : this.logRecorder.getChannel(),
					size : await this.logRecorder.size(),
				};
				const iterator = new RedisSortedSetIterator( options );

				//	...
				resolve( iterator );
			}
			catch ( err )
			{
				reject( err );
			}
		} );
	}

	// Method to start reading from the sorted set
	async startReading()
	{
		const iterator = await this.createIterator();
		console.log( `[${ iterator.size }] record(s) in total. Press Enter to read one, Ctrl+C to exit` );
		console.log( `` );

		//	Function to handle CLI input and output
		const rl = readline.createInterface( {
			input : process.stdin,
			output : process.stdout
		} );

		//	Event listener for when 'Enter' is pressed
		rl.on( 'line', async () =>
		{
			const member = await iterator.getNextMember();
			if ( member )
			{
				const channel = member.channel;
				const timestamp = member.timestamp;
				const data = member.data;
				const elementKey = `${ channel }->${ timestamp }`;
				console.log( `(${ iterator.nextIndex }/${ iterator.size }) :: Key: \`${ elementKey }\`:` );
				console.log( JSON.stringify( data, null, 8 ) );
				//console.log( 'Next member:', member );
			}
			else
			{
				console.log( 'No more members in the sorted set.' );
				rl.close();
				iterator.close();
			}
		} );
	}
}
