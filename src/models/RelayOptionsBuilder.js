import { TOPIC as pubsubPeerDiscoveryDefaultTopic } from '@libp2p/pubsub-peer-discovery';
import { VaRelayOptions } from "../validators/VaRelayOptions.js";
import _ from "lodash";

/**
 *    @typedef  RelayOptions {object}
 *    @property peerIdFilename {string}
 *    @property swarmKeyFilename {string}
 *    @property port {number}
 *    @property announceAddresses {string[]}
 *    @property bootstrapperAddresses {string[]}
 *    @property pubsubPeerDiscoveryTopics {string[]}
 *    @property callbackPeerEvent {CallbackPeerEvent}
 */


/**
 *    @class
 */
export class RelayOptionsBuilder
{
	/**
	 *    @type {string}
	 */
	peerIdFilename = undefined;

	/**
	 *    @type {string}
	 */
	swarmKeyFilename = undefined;

	/**
	 *    @type {number}
	 */
	port = 9911;

	/**
	 *    @type {string[]}
	 */
	announceAddresses = [];

	/**
	 *    @type {string[]}
	 */
	bootstrapperAddresses = [];

	/**
	 *    @type {string[]}
	 */
	pubsubPeerDiscoveryTopics = [ pubsubPeerDiscoveryDefaultTopic ];

	/**
	 *    @type {CallbackPeerEvent}
	 */
	callbackPeerEvent = null;


	constructor()
	{
	}

	/**
	 *    @returns {RelayOptionsBuilder}
	 */
	static builder()
	{
		return new RelayOptionsBuilder();
	}


	/**
	 *    @returns {this}
	 */
	setPeerIdFilename( /** @type {string} */
			   value )
	{
		this.peerIdFilename = value;
		return this;
	}

	/**
	 *    @returns {this}
	 */
	setSwarmKeyFilename( /** @type {string} */
			     value )
	{
		this.swarmKeyFilename = value;
		return this;
	}

	/**
	 *    @returns {this}
	 */
	setPort( /** @type {number} */
		 value )
	{
		this.port = value;

		if ( _.isNumber( value ) &&
			Array.isArray( this.announceAddresses ) )
		{
			for ( let i = 0; i < this.announceAddresses.length; i++ )
			{
				this.announceAddresses[ i ] = this.announceAddresses[ i ].replace( /{P2P_PORT}/g, value.toString() );
			}
		}

		return this;
	}

	/**
	 *    @returns {this}
	 */
	setAnnounceAddresses( /** @type {string[]} */
			      value )
	{
		if ( Array.isArray( value ) )
		{
			for ( let i = 0; i < value.length; i++ )
			{
				value[ i ] = value[ i ].replace( /{P2P_PORT}/g, this.port.toString() );
			}
		}

		this.announceAddresses = value;
		return this;
	}

	/**
	 *    @returns {this}
	 */
	setBootstrapperAddresses( /** @type {string[]} */
				  value )
	{
		this.bootstrapperAddresses = value;
		return this;
	}

	/**
	 *    @returns {this}
	 */
	setPubsubPeerDiscoveryTopics( /** @type {string[]} */
				      value )
	{
		this.pubsubPeerDiscoveryTopics = value;
		if ( ! this.pubsubPeerDiscoveryTopics.includes( pubsubPeerDiscoveryDefaultTopic ) )
		{
			this.pubsubPeerDiscoveryTopics.unshift( pubsubPeerDiscoveryDefaultTopic );
		}
		return this;
	}

	/**
	 *    @param value    {CallbackPeerEvent}
	 *    @returns {RelayOptionsBuilder}
	 */
	setCallbackPeerEvent( value )
	{
		if ( _.isFunction( value ) )
		{
			this.callbackPeerEvent = value;
		}
		return this;
	}

	/**
	 *    @returns {RelayOptions}
	 */
	build()
	{
		const error = VaRelayOptions.validateRelayOptions( this );
		if ( null !== error )
		{
			throw new Error( `${ this.constructor.name }.build :: ${ error }` );
		}

		return {
			peerIdFilename : this.peerIdFilename,
			swarmKeyFilename : this.swarmKeyFilename,
			port : this.port,
			announceAddresses : this.announceAddresses,
			bootstrapperAddresses : this.bootstrapperAddresses,
			pubsubPeerDiscoveryTopics : this.pubsubPeerDiscoveryTopics,
			callbackPeerEvent : this.callbackPeerEvent,
		}
	}
}
