import { peerIdFromString } from "@libp2p/peer-id";
import _ from "lodash";
import "deyml/config";

/**
 * 	@class
 */
export class PeerUtil
{
	/**
	 * @typedef {import('@libp2p/interface/peer-id').PeerId} PeerId
	 */

	/**
	 * @param peerId {PeerId}
	 * @return {boolean}
	 */
	static isValidPeerId( peerId )
	{
		try
		{
			if ( ! peerId )
			{
				return false;
			}

			//	...
			const newPeerIdObj = peerIdFromString( peerId.toString() );
			const srcString = peerId.toString();
			const newString = newPeerIdObj.toString();
			// console.plog( `srcString :`, srcString );
			// console.plog( `newString :`, newString );
			//
			return srcString === newString;
		}
		catch ( err )
		{
			console.error( `err111111 :`, err );
		}

		return false;
	}

	/**
	 *	@param port	{number} port number
	 *	@returns {string[]}
	 */
	static getListenAddresses( port )
	{
		port = ( _.isNumber( port ) && port > 0 && port < 65536 ) ? port : 9911;
		//let listenAddresses = [ '/ip4/127.0.0.1/tcp/10010/ws', '/ip4/127.0.0.1/tcp/10000' ]
		// let listenAddresses = [ '/ip4/0.0.0.0/tcp/10000/ws' ]
		// const argvAddr = argv.listenMultiaddrs || argv.lm
		//
		// if ( argvAddr )
		// {
		// 	listenAddresses = [ argvAddr ]
		//
		// 	const extraParams = this.getExtraParams( '--listenMultiaddrs', '--lm' )
		// 	extraParams.forEach( ( p ) => listenAddresses.push( p ) )
		// }
		// else if ( process.env.LISTEN_MULTIADDRS )
		// {
		// 	listenAddresses = process.env.LISTEN_MULTIADDRS.split( ',' )
		// }
		return [ `/ip4/0.0.0.0/tcp/${ port }` ];
	}

	/**
	 *	@return {string[]}
	 */
	static getAnnounceAddresses()
	{
		try
		{
			let announceAddresses = [];
			const p2pAnnounces = process.env.P2P_ANNOUNCES;
			if ( Array.isArray( p2pAnnounces ) )
			{
				for ( const address of p2pAnnounces )
				{
					if ( _.isString( address ) && ! _.isEmpty( address ) )
					{
						//	address
						//	e.g.: `/ip4/1.2.3.4/tcp/9911`
						announceAddresses.push( address );
					}
				}
			}

			return announceAddresses;
		}
		catch ( err )
		{
		}

		return [];
	}
}
