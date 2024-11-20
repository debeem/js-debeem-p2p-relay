import _ from "lodash";
import { keccak256 } from "ethers";

/**
 * 	@class
 */
export class ElectionDigest
{
	/**
	 *	@type {Map<string, string>}
	 */
	#hashCache = new Map();


	/**
	 *	calc hash value
	 *
	 *	@param source	{string}
	 *	@returns {string|null}
	 */
	calcHash( source )
	{
		if ( ! _.isString( source ) || _.isEmpty( source ) )
		{
			return null;
		}

		if ( this.#hashCache.has( source ) )
		{
			return this.#hashCache.get( source );
		}

		const hashValue = keccak256( new TextEncoder().encode( source ) );
		this.#hashCache.set( source, hashValue );
		return hashValue;
	}
}
