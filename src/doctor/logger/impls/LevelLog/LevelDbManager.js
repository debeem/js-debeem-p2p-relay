import { Level } from 'level';
import _ from "lodash";


/**
 * 	@typedef {import('level').DatabaseOptions} DatabaseOptions
 */


/**
 * 	@class
 */
export class LevelDbManager
{
	/**
	 * 	@type {Level< string, any >}
	 */
	static db;

	/**
	 *	@type {string}
	 */
	dbName = `levelDb`;

	/**
	 *	@type { DatabaseOptions<string, string> }
	 */
	dbOptions = { valueEncoding : 'json' };

	/**
	 *        @type {string}
	 */
	logPrefix = `empty_recipients_log`;


	/**
	 *      @returns {string}
	 */
	getLogPrefix()
	{
		return this.logPrefix;
	}

	/**
	 * 	initialize database
	 *	@protected
	 *
	 * 	@param [dbName]	 	{string}
	 * 	@returns {void}
	 */
	initDB( dbName)
	{
		if ( _.isString( dbName ) &&
			! _.isEmpty( dbName ) &&
			this.dbName !== dbName )
		{
			this.dbName = _.cloneDeep( dbName );
		}
		if ( ! LevelDbManager.db )
		{
			LevelDbManager.db = new Level( this.dbName, this.dbOptions );
		}
	}

	/**
	 * 	get database name
	 * 	@returns {string}
	 */
	getDbName()
	{
		return this.dbName;
	}

	/**
	 * 	get database instance
	 * 	@param [dbName]		{string}
	 * 	@returns {Level}
	 */
	getDB( dbName )
	{
		if ( ! LevelDbManager.db )
		{
			this.initDB( dbName );
		}
		return LevelDbManager.db;
	}
}
