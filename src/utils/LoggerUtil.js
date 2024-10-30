import { createLogger, format, transports, config } from "winston";
import { ProcessUtil } from "debeem-utils";

/**
 *        @typedef {import('winston').Logger} Logger
 */

/**
 * 	@class
 */
export class LoggerUtil
{
	/**
	 *	@type {*}
	 */
	static logger = undefined;

	/**
	 * 	default min log level
	 *	@type {string}
	 */
	static defaultMinLogLevel = `info`;

	/**
	 * 	as specified exactly in RFC5424 the syslog levels are prioritized from 0 to 7 (highest to lowest).
	 * 	{
	 *		emerg: 0,
	 *		alert: 1,
	 *		crit: 2,
	 *		error: 3,
	 *		warning: 4,
	 *		notice: 5,
	 *		info: 6,
	 *		debug: 7
	 *	}
	 *
	 * 	Similarly, npm logging levels are prioritized from 0 to 6 (highest to lowest):
	 * 	{
	 *		error: 0,
	 *		warn: 1,
	 *		info: 2,
	 *		http: 3,
	 *		verbose: 4,
	 *		debug: 5,
	 *		silly: 6
	 *	}
	 *
	 *	@type {string}
	 */
	minLogLevel = LoggerUtil.defaultMinLogLevel;

	constructor()
	{
		/**
		 *	@type {string}
		 */
		this.minLogLevel = ProcessUtil.getParamStringValue( `DEBEEM_P2P_RELAY_LOGGER_MIN_LOG_LEVEL`, LoggerUtil.defaultMinLogLevel );
		if ( ! this.isValidLogLevel( this.minLogLevel ) )
		{
			this.minLogLevel = LoggerUtil.defaultMinLogLevel;
		}

		/**
		 * 	create a singleton logger instance
		 */
		if ( ! LoggerUtil.logger )
		{
			LoggerUtil.logger = createLogger( {
				level : this.minLogLevel,
				format : format.combine(
					format.timestamp(),
					format.json()
				),
				transports : [
					new transports.Console(),
					//new transports.File( { filename : 'debeem-p2p-relay-error.log', level : 'error' } ),
					//new transports.File( { filename : 'debeem-p2p-relay-combined.log' } )
				]
			} );
		}
	}

	/**
	 *	@param level	{string}
	 *	@returns {boolean}
	 */
	isValidLogLevel( level )
	{
		return level in config.npm.levels;
	}

	/**
	 * 	@returns {Logger}
	 */
	get logger()
	{
		return LoggerUtil.logger;
	}
}
