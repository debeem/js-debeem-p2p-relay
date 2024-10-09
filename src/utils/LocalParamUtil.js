import { ProcessUtil } from "debeem-utils";
//import { DeRedisOptions } from "debeem-queue";
// import debeem_queue from "debeem-queue";
// const { DeRedisOptions } = debeem_queue;


/**
 * 	@typedef {import('debeem-queue').DeRedisOptions} DeRedisOptions
 */


/**
 * 	@class
 */
export class LocalParamUtil
{
	/**
	 *	@param defaultPort	{any}
	 *	@return {number}
	 */
	static getPort( defaultPort )
	{
		if ( ! ProcessUtil.isValidPortNumber( defaultPort ) )
		{
			defaultPort = this.getDefaultPort();
		}

		//	...
		let port = ProcessUtil.getParamIntValue( 'PORT', defaultPort );
		if ( ProcessUtil.isValidPortNumber( port ) )
		{
			return port;
		}

		return defaultPort;
	}

	/**
	 *	@return {number}
	 */
	static getDefaultPort()
	{
		return 9900;
	}

	static getScriptFilename( filenameOnly )
	{
		if ( ! process )
		{
			return '';
		}
		if ( ! Array.isArray( process.argv ) || process.argv.length < 2 )
		{
			return '';
		}

		//	process.argv :  [
		//		'/Users/you/.nvm/versions/node/v18.17.1/bin/node',
		//		'/Users/your/debeem/js-debeem-sync/demo/clientDemo1.js'
		//	]
		const scriptFullFilename = process.argv.slice( 1, 2 )[ 0 ];
		if ( filenameOnly )
		{
			//	will return the last item, filename only
			const fileNameMatch = scriptFullFilename.split( /[\\/]+/ );
			return fileNameMatch.pop();
		}
		else
		{
			return scriptFullFilename;
		}
	}

	/**
	 * 	@returns {DeRedisOptions}
	 */
	static getRedisOptions()
	{
		return {
			port : ProcessUtil.getParamIntValue( 'REDIS_PORT', 6379 ),
			host : ProcessUtil.getParamStringValue( 'REDIS_HOST', 'host.docker.internal' ),
			username : ProcessUtil.getParamStringValue( 'REDIS_USERNAME', null ),
			password : ProcessUtil.getParamStringValue( 'REDIS_PASSWORD', null ),
			db : ProcessUtil.getParamIntValue( 'REDIS_DB', 0 ),
		};
	}

}
