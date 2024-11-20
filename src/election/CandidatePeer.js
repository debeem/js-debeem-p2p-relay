import _ from "lodash";
import { defaultElectionMessageVersion } from "../models/P2pElectionMessageBuilder.js";
import { LoggerUtil } from "../utils/LoggerUtil.js";


/**
 *	@typedef {Object} CandidatePeersOptions
 *	@property {RelayService} pClsRelayService
 *	@property {string} electionMessageVersion
 *	@property {string} electionTopic
 */


/**
 *	@typedef {Object} CandidatePeer
 *	@property {string} version
 *	@property {string} peerId
 *	@property {number} lastHeartbeatTimestamp	the last time the heartbeat was received
 *	@property {number} totalHeartbeatsReceived	total value of heartbeat
 */

export class CandidatePeer
{
	/**
	 * 	election message version
	 *	@type {string}
	 */
	electionMessageVersion = defaultElectionMessageVersion;

	/**
	 *      @typedef {RelayService}
	 */
	#pClsRelayService = undefined;

	/**
	 *	@type {string}
	 */
	#electionTopic = undefined;

	/**
	 *	all available communicable peers
	 * 	@example
	 * 	{
	 *		`peerIdString` : {
	 *		 	version	: {string}
	 *		 	peerId : {PeerId}
	 *		 	lastHeartbeatTimestamp : {number}	the last time the heartbeat was received
	 *		 	totalHeartbeatsReceived : {number}	total value of heartbeat
	 *		}
	 * 	}
	 *	@type {Map<string, CandidatePeer>}
	 */
	#availableCommunicablePeers = new Map();

	/**
	 *	@type {Logger}
	 */
	log = new LoggerUtil().logger;


	constructor( props )
	{
		if ( ! _.isObject( props ) )
		{
			throw new Error( `${ this.constructor.name }.constructor :: invalid props` );
		}
		if ( ! props.pClsRelayService )
		{
			throw new Error( `${ this.constructor.name }.constructor :: invalid props.pClsRelayService` );
		}
		if ( ! _.isString( props.electionTopic ) || _.isEmpty( props.electionTopic ) )
		{
			throw new Error( `${ this.constructor.name }.constructor :: invalid props.electionTopic` );
		}

		//	...
		this.log.debug( `${ this.constructor.name }.constructor :: 🎂🎂🎂 props.peerId=${ props.peerId }` );
		this.#pClsRelayService = props.pClsRelayService;
		this.#electionTopic = props.electionTopic;

		if ( _.isString( props.electionMessageVersion ) &&
			! _.isEmpty( props.electionMessageVersion ) )
		{
			this.electionMessageVersion = props.electionMessageVersion;
		}
	}

	/**
	 *	@param version	{string}
	 *	@param peerId	{string}
	 *	@returns {void}
	 */
	addPeer( {
			 version = ``,
			 peerId = ``,
		 } )
	{
		if ( ! _.isString( version ) || _.isEmpty( version ) )
		{
			throw new Error( `${ this.constructor.name }.addPeer :: invalid version` );
		}
		if ( ! _.isString( peerId ) || _.isEmpty( peerId ) )
		{
			throw new Error( `${ this.constructor.name }.addPeer :: invalid peerId` );
		}

		/**
		 * 	intercommunicable peers:
		 *	version must be greater than or equal to the current peer's version
		 */
		if ( version >= this.electionMessageVersion )
		{
			if ( ! this.#availableCommunicablePeers.has( peerId ) )
			{
				this.log.silly( `${ this.constructor.name }.addPeer :: 💫 will insert Map[${ peerId }]`, { version } );
				this.#availableCommunicablePeers.set( peerId, {
					version : version,
					peerId : peerId,
					lastHeartbeatTimestamp : 0,
					totalHeartbeatsReceived : 0,
				} );
			}
			else
			{
				const peerItem = this.#availableCommunicablePeers.get( peerId );
				this.log.silly( `${ this.constructor.name }.addPeer :: 💫 will update Map[${ peerId }]`, { peerItem } );
				this.#availableCommunicablePeers.set( peerId, {
					version : peerItem.version,
					peerId : peerItem.peerId,
					lastHeartbeatTimestamp : Date.now(),
					totalHeartbeatsReceived : peerItem.totalHeartbeatsReceived + 1,
				} );
			}
		}
	}

	/**
	 * 	returns intercommunicable peers:
	 * 	version must be greater than or equal to the current peer's version
	 *	@returns {Array<string>}
	 */
	getIntercommunicablePeers()
	{
		try
		{
			/**
			 * 	@type { PeerId[] | null }
			 */
			const subscriberPeers = this.#pClsRelayService.getSubscribers( this.#electionTopic );

			/**
			 * 	convert PeerId[] to string[]
			 *	@type {string[]}
			 */
			const subscriberPeerIdStrList = Array.isArray( subscriberPeers ) ? subscriberPeers.map( peer => peer.toString() ) : [];

			/**
			 *	@type {string[]}
			 */
			const availableCommunicablePeerList = Array.from( this.#availableCommunicablePeers.keys() );

			this.log.silly( `${ this.constructor.name }.getIntercommunicablePeers :: 🚙 subscriberPeerIdStrList :`, { subscriberPeerIdStrList } );
			this.log.silly( `${ this.constructor.name }.getIntercommunicablePeers :: 🚙 availableCommunicablePeerList :`, { availableCommunicablePeerList } );

			//	...
			return subscriberPeerIdStrList.filter( item => availableCommunicablePeerList.includes( item ) );
		}
		catch ( err )
		{
		}

		return [];
	}

	/**
	 * 	query currently connected peerIds from node peerStore
	 *
	 *	@param [rawPeerId]	{boolean}
	 *	@returns {Promise< Array< PeerId | string > >}
	 */
	queryConnectedPeersFromPeerStore( rawPeerId = false )
	{
		return new Promise( async ( resolve, reject ) =>
		{
			try
			{
				if ( this.#pClsRelayService &&
					this.#pClsRelayService.getP2pNode() &&
					this.#pClsRelayService.getP2pNode().peerStore )
				{
					/**
					 *	@type {Peer[]}
					 */
					const connectedPeers = await this.#pClsRelayService.getP2pNode().peerStore.all({
						filters: [
							() => true
						]
					});
					if ( Array.isArray( connectedPeers ) )
					{
						let peerIds = [];
						for ( const peer of connectedPeers )
						{
							if ( peer && peer.id )
							{
								peerIds.push(
									rawPeerId ? peer.id : peer.id.toString()
								);
							}
						}

						return resolve( peerIds );
					}
				}

				resolve( [] );
			}
			catch ( err )
			{
				reject( err );
			}
		});
	}
}
