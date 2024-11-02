import _ from "lodash";
import { VaP2pElectionMessage } from "../validators/VaP2pElectionMessage.js";


/**
 *	@typedef {Object} P2pElectionMessage
 *	@property {string} electionMessageType
 *	@property {string} electionMessageVersion
 *	@property {string} electionPeerId
 */


/**
 * 	P2pElectionMessageType
 *	@type { Readonly<{HEARTBEAT: string, VICTORY: string, ELECTION: string}> }
 */
export const P2pElectionMessageType = Object.freeze( {
	HEARTBEAT : `heartbeat`,
	ELECTION : `election`,
	VICTORY : `victory`
} );

/**
 *	@param value	{any}
 *	@returns {boolean}
 */
export function isValidP2pElectionMessageType( value )
{
	return _.isString( value ) &&
		! _.isEmpty( value ) &&
		Object.values( P2pElectionMessageType ).includes( value );
}


/**
 * 	default electionMessageVersion
 *	@type {string}
 */
export const defaultElectionMessageVersion = `1.0`;

/**
 *	check if the specified message is of the election message type
 *
 *	@param message	{P2pElectionMessage}
 *	@returns {boolean}
 */
export function isValidP2pElectionMessage( message )
{
	return message &&
		_.isObject( message ) &&
		isValidP2pElectionMessageType( message.electionMessageType ) &&
		_.isString( message.electionMessageVersion ) && ! _.isEmpty( message.electionMessageVersion ) &&
		_.isString( message.electionPeerId ) && ! _.isEmpty( message.electionPeerId )
		;
}


/**
 * 	@class
 */
export class P2pElectionMessageBuilder
{
	/**
	 * 	@type {string}
	 */
	electionMessageType = undefined;

	/**
	 * 	@type {string}
	 */
	electionMessageVersion = undefined;

	/**
	 * 	@type {string}
	 */
	electionPeerId = undefined;


	constructor()
	{
	}

	/**
	 *        @returns {P2pElectionMessageBuilder}
	 */
	static builder()
	{
		return new P2pElectionMessageBuilder();
	}

	/**
	 * 	@param value	{string}
	 *	@returns {P2pElectionMessageBuilder}
	 */
	setElectionMessageType( value )
	{
		this.electionMessageType = value;
		return this;
	}

	/**
	 * 	@param value
	 * 	@returns {P2pElectionMessageBuilder}
	 */
	setElectionMessageVersion( value )
	{
		this.electionMessageVersion = value;
		return this;
	}

	/**
	 * 	@param value	{string}
	 *	@returns {P2pElectionMessageBuilder}
	 */
	setElectionPeerId( value )
	{
		this.electionPeerId = value;
		return this;
	}

	/**
	 *	@returns {P2pElectionMessage}
	 */
	build()
	{
		const error = VaP2pElectionMessage.validateP2pElectionMessage( this );
		if ( null !== error )
		{
			throw new Error( `${ this.constructor.name }.build :: ${ error }` );
		}

		return {
			electionMessageType : this.electionMessageType,
			electionMessageVersion : this.electionMessageVersion,
			electionPeerId : this.electionPeerId,
		}
	}
}

