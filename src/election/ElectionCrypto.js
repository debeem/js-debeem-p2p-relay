import { AesCrypto } from "debeem-cipher";
import _ from "lodash";

/**
 * 	@class
 */
export class ElectionCrypto
{
	prefixPassword = `debeem_p2p_relay_password`;

	/**
	 *	encrypt message
	 *
	 *	@param messageObject	{any}
	 *	@param password		{any}
	 *	@return { string | null }
	 */
	encryptMessage( messageObject, password )
	{
		try
		{
			const jsonString = JSON.stringify( messageObject );
			return new AesCrypto().encrypt( jsonString, this.#getFinalPassword( password ) );
		}
		catch ( err )
		{
			return null;
		}
	}

	/**
	 *	decrypt message
	 *
	 *	@param encryptedString	{string}
	 *	@param password		{any}
	 *	@return { any | null }
	 */
	decryptMessage( encryptedString, password )
	{
		try
		{
			const decrypted = new AesCrypto().decrypt( encryptedString, this.#getFinalPassword( password ) );
			return JSON.parse( decrypted );
		}
		catch ( err )
		{
			return null;
		}
	}

	/**
	 * 	get final password
	 *
	 *	@param password		{string}
	 *	@return {string}
	 */
	#getFinalPassword( password )
	{
		return `${ this.prefixPassword }-${ _.isString( password ) ? password : '' }`;
	}
}
