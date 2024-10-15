import { TOPIC as pubsubPeerDiscoveryDefaultTopic } from '@libp2p/pubsub-peer-discovery';
import { VaP2pNodeOptions } from "../validators/VaP2pNodeOptions.js";

/**
 * 	@typedef {import('./CallbackMessage.js')} CallbackMessage
 */

/**
 *	@typedef  P2pNodeOptions {object}
 *	@property peerId {PeerId}
 *	@property swarmKey {Uint8Array}
 *	@property port {number}
 *	@property listenAddresses {string[]}
 *	@property announceAddresses {string[]}
 *	@property bootstrapperAddresses {string[]}
 *	@property pubsubPeerDiscoveryTopics {string[]}
 *	@property callbackMessage {CallbackMessage}
 *	@property transports {number}
 */

/**
 *	p2p node transports
 */
export const P2pNodeTransports = Object.freeze({
	/**
	 * 	circuitRelayTransport
	 */
	CIRCUIT_RELAY: 1 << 0,	//	00001 = 1

	/**
	 * 	tcp
	 */
	TCP: 1 << 1,		//	00010 = 2

	/**
	 * 	webrtc
	 */
	WEBRTC: 1 << 2,		//	00100 = 4

	/**
	 * 	websockets
	 */
	WEBSOCKETS: 1 << 3,	//	01000 = 8,

	/**
	 * 	webtransport
	 */
	WEBTRANSPORT: 1 << 4,	//	10000 = 16
});


/**
 * 	@class
 */
export class P2pNodeOptionsBuilder
{
	/**
	 *	@type {PeerId}
	 */
	peerId = null;

	/**
	 *	@type {Uint8Array}
	 */
	swarmKey = null;

	/**
	 *	@type {string[]}
	 */
	listenAddresses = [];

	/**
	 *	@type {string[]}
	 */
	announceAddresses = [];

	/**
	 *	@type {string[]}
	 */
	bootstrapperAddresses = [];

	/**
	 *	@type {string[]}
	 */
	pubsubPeerDiscoveryTopics = [ pubsubPeerDiscoveryDefaultTopic ];

	/**
	 *	@type {CallbackMessage}
	 */
	callbackMessage = null;

	/**
	 *	p2p node transports
	 * 	@type {number}
	 */
	transports = P2pNodeTransports.TCP | P2pNodeTransports.CIRCUIT_RELAY;



	constructor()
	{
	}

	/**
	 *	@returns {P2pNodeOptionsBuilder}
	 */
	static builder()
	{
		return new P2pNodeOptionsBuilder();
	}




	/**
	 *	@returns {this}
	 */
	setPeerId( /** @type {PeerId} */ value )
	{
		this.peerId = value;
		return this;
	}

	/**
	 *	@returns {this}
	 */
	setSwarmKey( /** @type {Uint8Array} */ value )
	{
		this.swarmKey = value;
		return this;
	}

	/**
	 *	@returns {this}
	 */
	setListenAddresses( /** @type {string[]} */ value )
	{
		this.listenAddresses = value;
		return this;
	}

	/**
	 *	@returns {this}
	 */
	setAnnounceAddresses( /** @type {string[]} */ value )
	{
		this.announceAddresses = value;
		return this;
	}

	/**
	 *	@returns {this}
	 */
	setBootstrapperAddresses( /** @type {string[]} */ value )
	{
		this.bootstrapperAddresses = value;
		return this;
	}

	/**
	 *	@returns {this}
	 */
	setPubsubPeerDiscoveryTopics( /** @type {string[]} */ value )
	{
		this.pubsubPeerDiscoveryTopics = value;
		if ( ! this.pubsubPeerDiscoveryTopics.includes( pubsubPeerDiscoveryDefaultTopic ) )
		{
			this.pubsubPeerDiscoveryTopics.unshift( pubsubPeerDiscoveryDefaultTopic );
		}
		return this;
	}

	/**
	 *	@returns {this}
	 */
	setCallbackMessage( /** @type {CallbackMessage} */ value )
	{
		this.callbackMessage = value;
		return this;
	}

	/**
	 *	@returns {this}
	 */
	setTransports( /** @type {number} */ transports )
	{
		this.transports = transports;
		return this;
	}


	/**
	 *	@returns {P2pNodeOptions}
	 */
	build()
	{
		const error = VaP2pNodeOptions.validateP2pNodeOptions( this );
		if ( null !== error )
		{
			throw new Error( `${ this.constructor.name }.build :: ${ error }` );
		}

		return {
			peerId : this.peerId,
			swarmKey : this.swarmKey,
			listenAddresses : this.listenAddresses,
			announceAddresses : this.announceAddresses,
			bootstrapperAddresses : this.bootstrapperAddresses,
			pubsubPeerDiscoveryTopics : this.pubsubPeerDiscoveryTopics,
			callbackMessage : this.callbackMessage,
			transports : this.transports,
		}
	}
}
