import { VaP2pElectionOptions } from "../validators/VaP2pElectionOptions.js";

/**
 *	@typedef {Object} P2pElectionOptions
 *	@property {string} peerId
 *	@property {RelayService} pClsRelayService
 *	@property {string} electionMessageVersion
 *	@property {string} groupKey
 */


/**
 * 	@class
 */
export class P2pElectionOptionsBuilder
{
	/**
	 * 	@type {string}
	 */
	peerId = undefined;

	/**
	 * 	@type {RelayService}
	 */
	pClsRelayService = undefined;

	/**
	 * 	@type {string}
	 */
	electionMessageVersion = undefined;

	/**
	 * 	@type {string}
	 */
	groupKey = undefined;


	constructor()
	{
	}

	/**
	 *        @returns {P2pElectionOptionsBuilder}
	 */
	static builder()
	{
		return new P2pElectionOptionsBuilder();
	}

	/**
	 * 	@param value	{string}
	 *	@returns {P2pElectionOptionsBuilder}
	 */
	setPeerId( value )
	{
		this.peerId = value;
		return this;
	}

	/**
	 * 	@param value	{RelayService}
	 *	@returns {P2pElectionOptionsBuilder}
	 */
	setPClsRelayService( value )
	{
		this.pClsRelayService = value;
		return this;
	}

	/**
	 * 	@param value	{string}
	 *	@returns {P2pElectionOptionsBuilder}
	 */
	setElectionMessageVersion( value )
	{
		this.electionMessageVersion = value;
		return this;
	}

	/**
	 * 	@param value	{string}
	 *	@returns {P2pElectionOptionsBuilder}
	 */
	setGroupKey( value )
	{
		this.groupKey = value;
		return this;
	}

	/**
	 *	@returns {P2pElectionOptionsBuilder}
	 */
	build()
	{
		const error = VaP2pElectionOptions.validateP2pElectionOptions( this );
		if ( null !== error )
		{
			throw new Error( `${ this.constructor.name }.build :: ${ error }` );
		}

		return {
			peerId : this.peerId,
			pClsRelayService : this.pClsRelayService,
			electionMessageVersion : this.electionMessageVersion,
			groupKey : this.groupKey,
		}
	}
}
