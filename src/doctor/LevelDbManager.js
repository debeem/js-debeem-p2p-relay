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
	static dbName = `levelDb`;

	/**
	 *	@type { DatabaseOptions<string, string> }
	 */
	static dbOptions = { valueEncoding : 'json' };


	/**
	 * 	initialize database
	 *	@protected
	 *
	 * 	@param [dbName]	 	{string}
	 * 	@returns {void}
	 */
	static initDB( dbName)
	{
		if ( _.isString( dbName ) && ! _.isEmpty( dbName ) )
		{
			this.dbName = _.cloneDeep( dbName );
		}
		if ( ! this.db )
		{
			this.db = new Level( this.dbName, this.dbOptions );
		}
	}

	/**
	 * 	get database name
	 * 	@returns {string}
	 */
	static getDbName()
	{
		return this.dbName;
	}

	/**
	 * 	get database instance
	 * 	@param [dbName]		{string}
	 * 	@returns {Level}
	 */
	static getDB( dbName )
	{
		if ( ! this.db )
		{
			this.initDB( dbName );
		}
		return this.db;
	}
}
