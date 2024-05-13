import _ from 'lodash';
import { TOPIC as pubsubPeerDiscoveryDefaultTopic } from '@libp2p/pubsub-peer-discovery';

/**
 *	@typedef  CreateRelayOptions {object}
 *	@property peerIdFilename {string}
 *	@property swarmKeyFilename {string}
 *	@property port {number}
 *	@property announceAddresses {string[]}
 *	@property bootstrapperAddresses {string[]}
 * 	@property pubsubPeerDiscoveryTopics {string[]}
 */



/**
 * 	@class
 */
export class CreateRelayOptionsBuilder
{
	/**
	 *	@type {string}
	 */
	peerIdFilename = '';

	/**
	 *	@type {string}
	 */
	swarmKeyFilename = '';

	/**
	 *	@type {number}
	 */
	port = 9911;

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



	constructor()
	{
	}

	/**
	 *	@returns {CreateRelayOptionsBuilder}
	 */
	static builder()
	{
		return new CreateRelayOptionsBuilder();
	}


	/**
	 *	@returns {this}
	 */
	setPeerIdFilename( /** @type {string} */ value )
	{
		this.peerIdFilename = value;
		return this;
	}

	/**
	 *	@returns {this}
	 */
	setSwarmKeyFilename( /** @type {string} */ value )
	{
		this.swarmKeyFilename = value;
		return this;
	}

	/**
	 *	@returns {this}
	 */
	setPort( /** @type {number} */ value )
	{
		this.port = value;
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
	 *	@returns {CreateRelayOptions}
	 */
	build()
	{
		//
		//	if the user does not specify the correct peerIdFilename,
		//	the default peerIdFilename will be used
		//
		// if ( ! _.isString( this.peerIdFilename ) || _.isEmpty( this.peerIdFilename ) )
		// {
		// 	throw new Error( `invalid peerIdFilename` );
		// }
		if ( this.swarmKeyFilename )
		{
			if ( ! _.isString( this.swarmKeyFilename ) || _.isEmpty( this.swarmKeyFilename ) )
			{
				throw new Error( `${ this.constructor.name }.build :: invalid swarmKeyFilename` );
			}
		}

		//
		//	if the user does not specify the correct port,
		//	the default port will be used
		//
		// if ( ! ProcessUtil.isValidPortNumber( this.port ) )
		// {
		// 	throw new Error( `${ this.constructor.name }.build :: invalid port` );
		// }
		if ( ! Array.isArray( this.announceAddresses ) )
		{
			throw new Error( `${ this.constructor.name }.build :: invalid announceAddresses` );
		}
		if ( ! Array.isArray( this.bootstrapperAddresses ) )
		{
			throw new Error( `${ this.constructor.name }.build :: invalid bootstrapperAddresses` );
		}
		if ( ! Array.isArray( this.pubsubPeerDiscoveryTopics ) )
		{
			throw new Error( `${ this.constructor.name }.build :: invalid pubsubPeerDiscoveryTopics` );
		}

		return {
			peerIdFilename : this.peerIdFilename,
			swarmKeyFilename : this.swarmKeyFilename,
			port : this.port,
			announceAddresses : this.announceAddresses,
			bootstrapperAddresses : this.bootstrapperAddresses,
			pubsubPeerDiscoveryTopics : this.pubsubPeerDiscoveryTopics,
		}
	}
}
