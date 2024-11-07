import _ from "lodash";
import { RelayService } from "../services/RelayService.js";

/**
 * 	@class
 */
export class VaP2pElectionOptions
{
	/**
	 *    @param p2pElectionOptions    {any}
	 *    @returns {string | null}
	 */
	static validateP2pElectionOptions( p2pElectionOptions )
	{
		if ( ! p2pElectionOptions || ! _.isObject( p2pElectionOptions ) || _.isEmpty( p2pElectionOptions ) )
		{
			return `invalid p2pElectionOptions`;
		}

		if ( ! _.isString( p2pElectionOptions.peerId ) ||
			_.isEmpty( p2pElectionOptions.peerId ) )
		{
			return `invalid p2pElectionOptions.peerId`;
		}

		if ( ! ( p2pElectionOptions.pClsRelayService instanceof RelayService ) )
		{
			return `invalid p2pElectionOptions.pClsRelayService`;
		}

		if ( undefined !== p2pElectionOptions.electionMessageVersion )
		{
			if ( ! _.isString( p2pElectionOptions.electionMessageVersion ) ||
				_.isEmpty( p2pElectionOptions.electionMessageVersion ) )
			{
				return `invalid p2pElectionOptions.electionMessageVersion`;
			}
		}

		if ( ! _.isString( p2pElectionOptions.groupKey ) )
		{
			return `invalid p2pElectionOptions.groupKey`;
		}

		return null;
	}
}
