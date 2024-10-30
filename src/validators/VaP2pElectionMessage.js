import _ from "lodash";
import { isValidP2pElectionMessageType } from "../models/P2pElectionMessageBuilder.js";

/**
 * 	@class
 */
export class VaP2pElectionMessage
{
	/**
	 *    @param p2pElectionMessage    {any}
	 *    @returns {string | null}
	 */
	static validateP2pElectionMessage( p2pElectionMessage )
	{
		if ( ! p2pElectionMessage || ! _.isObject( p2pElectionMessage ) || _.isEmpty( p2pElectionMessage ) )
		{
			return `invalid p2pElectionMessage`;
		}

		if ( ! isValidP2pElectionMessageType( p2pElectionMessage.electionMessageType ) )
		{
			return `invalid p2pElectionMessage.electionMessageType`;
		}
		if ( ! _.isString( p2pElectionMessage.electionPeerId ) ||
			_.isEmpty( p2pElectionMessage.electionPeerId ) )
		{
			return `invalid p2pElectionMessage.electionPeerId`;
		}

		return null;
	}
}
