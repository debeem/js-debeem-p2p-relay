import { createLibp2p } from 'libp2p';
//import { preSharedKey } from 'libp2p/pnet';
import { preSharedKey } from '@libp2p/pnet';
//import { createRSAPeerId, createFromJSON } from '@libp2p/peer-id-factory'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { mplex } from '@libp2p/mplex'
import { tcp } from '@libp2p/tcp';
import { webRTC } from '@libp2p/webrtc'
//import { webSockets } from '@libp2p/websockets';
import { webTransport } from '@libp2p/webtransport'
import { bootstrap } from '@libp2p/bootstrap'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
//import { verifySignature } from '@libp2p/pubsub';
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
//import { gossipsub } from 'debeem-gossipsub'
//import { floodsub } from '@libp2p/floodsub'
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'
import { circuitRelayTransport, circuitRelayServer } from '@libp2p/circuit-relay-v2'
//import { identifyService } from 'libp2p/identify'
import { identify, identifyPush } from '@libp2p/identify'

import { LogUtil, ProcessUtil } from 'debeem-utils';

import { logger } from "@libp2p/logger";
import _ from "lodash";
import chalk from "chalk";
import { VaP2pNodeOptions } from "../validators/VaP2pNodeOptions.js";
import { P2pNodeTransports } from "../models/P2pNodeOptionsBuilder.js";
//enable( 'libp2p:floodsub' );


//enable( 'debeem:gossipsub' );

const log = logger( 'debeem:P2pService' )
//enable( 'debeem:P2pService' );


//	enable doctor in debeem:gossipsub
//enable( 'libp2p:gossipsub' );


/**
 * 	@class
 */
export class P2pService
{
	/**
	 * @typedef {import('@libp2p/interface').Libp2p} Libp2p
	 *
	 * @typedef {import('@libp2p/interface/peer-id').PeerId} PeerId
	 * @typedef {import('@libp2p/interface/peer-id').RSAPeerId} RSAPeerId
	 * @typedef {import('@libp2p/interface/peer-id').Ed25519PeerId} Ed25519PeerId
	 * @typedef {import('@libp2p/interface/peer-id').Secp256k1PeerId} Secp256k1PeerId
	 *
	 * @typedef {import('@libp2p/interface/pubsub').PubSub} PubSub
	 * @typedef {import('@libp2p/interface/pubsub').PubSubEvents} PubSubEvents
	 *
	 * @typedef {import('libp2p').Libp2pOptions} Libp2pOptions
	 *
	 */


	/**
	 * @typedef {Object} HopRelayOptions
	 * @property {string[]} [listenAddresses = []]
	 * @property {string[]} [announceAddresses = []]
	 * @property {boolean} [pubsubDiscoveryEnabled = true]
	 * @property {string[]} [pubsubDiscoveryTopics = ['_peer-discovery._p2p._pubsub']] uses discovery default
	 */


	/**
	 *	@type {Libp2p}
	 */
	static node = null;


	constructor()
	{
		if ( ! ProcessUtil.isNodeVersionSufficient( `20.17.0` ) )
		{
			throw new Error( `${ this.constructor.name }.constructor :: node version cannot be lower than 20.17.0` );
		}
		if ( this.node )
		{
			throw new Error( `${ this.constructor.name }.constructor ::  already created` );
		}
	}

	/**
	 *	@return {Libp2p}
	 */
	getNode()
	{
		return this.node;
	}


	/**
	 *	Create a Libp2p Relay with HOP service
	 *
	 *	@param p2pNodeOptions	{P2pNodeOptions}
	 *	@returns {Promise<Libp2p>}
	 */
	async createP2pNode( /** @type {P2pNodeOptions} */ p2pNodeOptions )
	{
		return new Promise( async ( resolve, reject ) =>
		{
			try
			{
				const errorP2pNodeOptions = VaP2pNodeOptions.validateP2pNodeOptions( p2pNodeOptions );
				if ( null !== errorP2pNodeOptions )
				{
					return reject( `${ this.constructor.name }.createP2pNode :: ${ errorP2pNodeOptions }` );
				}

				//const announceAddresses = [ `/ip4/1.2.3.4/tcp/9911` ];
				//
				//	@libp2p/pubsub-peer-discovery
				//	export declare const TOPIC = "_peer-discovery._p2p._pubsub";
				//


				/**
				 * 	@typedef {import('libp2p').Components} Components
				 * 	@typedef {import('libp2p').Transport} Transport
				 * 	@typedef {import('libp2p').PeerDiscovery} PeerDiscovery
				 */

				/**
				 *	options.transports
				 *	@type {Array<(components: Components | any ) => Transport>}
				 */
				let transportList = [];
				if ( P2pNodeTransports.CIRCUIT_RELAY === ( P2pNodeTransports.CIRCUIT_RELAY & p2pNodeOptions.transports ) )
				{
					transportList.push( circuitRelayTransport( {
						//
						//	make a reservation on any discovered relays - this will let other
						//	peers use the relay to contact us
						//
						discoverRelays : 1
					} ) );
				}
				if ( P2pNodeTransports.TCP === ( P2pNodeTransports.TCP & p2pNodeOptions.transports ) )
				{
					transportList.push( tcp() );
				}
				if ( P2pNodeTransports.WEBRTC === ( P2pNodeTransports.WEBRTC & p2pNodeOptions.transports ) )
				{
					transportList.push( webRTC() );
				}
				if ( P2pNodeTransports.WEBSOCKETS === ( P2pNodeTransports.WEBSOCKETS & p2pNodeOptions.transports ) )
				{
					transportList.push( webSockets({
						filter: filters.all
					}) );
				}
				if ( P2pNodeTransports.WEBTRANSPORT === ( P2pNodeTransports.WEBTRANSPORT & p2pNodeOptions.transports ) )
				{
					transportList.push( webTransport() );
				}

				/**
				 * 	options.peerDiscovery
				 * 	@type {Array<(components: Components | any ) => PeerDiscovery>}
				 */
				let peerDiscoveryList = [];
				if ( Array.isArray( p2pNodeOptions.bootstrapperAddresses ) &&
					p2pNodeOptions.bootstrapperAddresses.length > 0 )
				{
					peerDiscoveryList.push( bootstrap({
						list: p2pNodeOptions.bootstrapperAddresses
					}) );
				}
				peerDiscoveryList.push(
					//	https://github.com/libp2p/js-libp2p-pubsub-peer-discovery
					pubsubPeerDiscovery({
						//	How often (in ms), after initial broadcast,
						//	your node should broadcast your peer data.
						//	Default (10000ms)
						interval: 3000,

						//	What topics to subscribe to.
						//	An Array of topic strings. If set, the default topic will
						//	not be used and must be included explicitly here
						//	Default ('_peer-discovery._p2p._pubsub')
						topics: p2pNodeOptions.pubsubPeerDiscoveryTopics,

						//	If true it will not broadcast peer data.
						//	Do not set this unless you have a specific reason to.
						//	Default (false)
						listenOnly: false
					})
				);


				/**
				 *	@type {Libp2pOptions<P2pService>}
				 */
				const options = {
					peerId: p2pNodeOptions.peerId,
					addresses : {
						listen : p2pNodeOptions.listenAddresses,
						//announce: ['/dns4/auto-relay.libp2p.io/tcp/443/wss/p2p/QmWDn2LY8nannvSWJzruUYoLZ4vV83vfCBwd8DipvdgQc3']
						announce : p2pNodeOptions.announceAddresses,
					},
					transports : transportList,
					streamMuxers : [
						yamux(), mplex()
					],
					connectionEncryption : [
						noise()
					],
					peerDiscovery: peerDiscoveryList,
					services : {
						relay : circuitRelayServer({
							reservations: {
								maxReservations: Infinity,
								applyDefaultLimit: false
							}
						}),
						identify: identify(),
						identifyPush: identifyPush(),
						pubsub: gossipsub({
							//
							//	https://github.com/ChainSafe/js-libp2p-gossipsub
							//

							//	boolean identifying whether the node should emit to self on publish,
							//	in the event of the topic being subscribed
							//	(defaults to false).
							emitSelf : false,

							//	Do not throw `InsufficientPeers` error if publishing to zero peers
							allowPublishToZeroPeers: true,

							//
							//	Do not throw PublishError.NoPeersSubscribedToTopic error
							//	if there are no peers listening on the topic.
							//
							//	N.B. if you sent this option to true,
							//	and you publish a message on a topic with
							//	no peers listening on that topic,
							//	no other network node will ever receive the message.
							//
							allowPublishToZeroTopicPeers: true,

							//	Do not throw `PublishError.Duplicate` if publishing duplicate messages
							ignoreDuplicatePublishError: true,

							//	boolean identifying if incoming messages on a subscribed topic
							//	should be automatically gossiped
							//	(defaults to true).
							gossipIncoming : true,

							//	boolean identifying whether the node should fall back to the floodsub protocol,
							//	if another connecting peer does not support gossipsub (defaults to true).
							fallbackToFloodsub : true,

							//	boolean identifying if self-published messages should be sent to all peers, (defaults to true).
							floodPublish : true,

							//	boolean identifying whether PX is enabled;
							//	this should be enabled in bootstrappers and other
							//	well-connected/trusted nodes (defaults to false).
							doPX : true,

							//	boolean identifying if we want to sign outgoing messages or not (default: true)
							signMessages : true,

							//	boolean identifying if message signing is required for incoming messages or not (default: true)
							strictSigning : true,
						}),
					},
					connectionProtector : preSharedKey( {
						//	private network
						psk : p2pNodeOptions.swarmKey
					}),
					connectionManager: {
						inboundConnectionThreshold: Infinity,
						maxConnections: 1024,
						minConnections: 2
					},
					// connectionGater: {},
					// transportManager: {},
					// datastore: {},
					// peerStore: {},
					// keychain: {},
				};

				/**
				 *	@typedef P2pService {object}
				 *	@property node {Libp2p}
				 */

				/**
				 *	@type {import('@libp2p/interface').Libp2p<P2pService>}
				 */
				this.node = await createLibp2p( /** @type {Libp2pOptions<P2pService>} */ options );

				//	...
				this.node.addEventListener( 'peer:connect',  ( /** @type {{ detail: any; }} */ evt ) =>
				{
					this.handleNodePeerConnect( evt );
				});
				this.node.addEventListener( 'peer:discovery', ( /** @type {{ detail: any; }} */ evt ) =>
				{
					this.handleNodePeerDiscovery( evt );
				});
				this.node.addEventListener('self:peer:update', ( /** @type {{ detail: any; }} */ evt ) =>
				{
					this.handleNodeSelfPeerUpdate( evt );
				});

				//
				//	pub/sub
				//
				//this.node.services.pubsub.subscribe( this.getSyncTopic() );
				this.node.services.pubsub.addEventListener( 'message', ( /** @type {{ detail: { type: any; topic: any; from: any; }; }} */ evt ) =>
				{
					//console.doctor( `||||||||||-||||||||||-> Pub/Sub received message :`, evt );
					this.handleNodePeerMessage( this.node, p2pNodeOptions.callbackMessage, evt );
				});
				this.node.services.pubsub.addEventListener( 'gossipsub:heartbeat', ( _evt ) =>
				{
					//console.doctor( chalk.red( `|||||| [${ new Date().toLocaleString() }] |||||| -> received gossipsub:heartbeat :` ), _evt );
				});
				this.node.services.pubsub.addEventListener( 'subscription-change', async ( evt ) =>
				{
					const eventData = evt.detail;
					console.log( chalk.bgCyan( `))) ${ new Date().toLocaleString() } -> received subscription-change :` ), evt, eventData );
					// if ( eventData &&
					//      _.has( eventData, 'subscriptions' ) &&
					//      Array.isArray( eventData.subscriptions ) )
					// {
					// 	for ( const subscription of eventData.subscriptions )
					// 	{
					// 	}
					// }
				});

				//	...
				resolve( this.node );
			}
			catch ( err )
			{
				reject( err );
			}
		});
	}


	/**
	 *	@param evt
	 *	@return {boolean}
	 */
	handleNodePeerConnect( /** @type {{ detail: any; }} */ evt )
	{
		if ( ! this.node )
		{
			log( `${ this.constructor.name }.handleNodePeerConnect :: node is not initialized` );
			return false;
		}
		if ( ! evt )
		{
			log( `${ this.constructor.name }.handleNodePeerConnect :: undefined evt` );
			return false;
		}

		try
		{
			const peerId = evt.detail;
			log( 'Connection established to: %s', peerId.toString() ) // Emitted when a peer has been found
		}
		catch ( err )
		{
			log( 'exception in handleNodePeerConnect: %O', err );
		}
	}


	/**
	 *	@param evt
	 *	@return {boolean}
	 */
	handleNodePeerDiscovery( /** @type {{ detail: any; }} */ evt )
	{
		if ( ! this.node )
		{
			log( `${ this.constructor.name }.handleNodePeerDiscovery :: node is not initialized` );
			return false;
		}
		if ( ! evt )
		{
			log( `${ this.constructor.name }.handleNodePeerDiscovery :: undefined evt` );
			return false;
		}

		try
		{
			const peerInfo = evt.detail;
			//console.doctor( `peerInfo : `, peerInfo );
			//node.dial( peerInfo.id );
			console.log( `))) Discovered: ${ peerInfo.id.toString() }` )

			//
			//	Notifies the router that a peer has been connected
			//		addPeer( peerId : PeerId, protocol : string ) : PeerStreams
			//
			//const newPeerStreams = this.node.services.pubsub.addPeer( peerInfo.id, 'ws' );
		}
		catch ( err )
		{
			log( 'exception in handleNodePeerDiscovery: %O', err );
		}
	}

	/**
	 *	@param evt
	 *	@return {boolean}
	 */
	handleNodeSelfPeerUpdate( /** @type {{ detail: any; }} */ evt )
	{
		if ( ! this.node )
		{
			log( `${ this.constructor.name }.handleNodeSelfPeerUpdate :: node is not initialized` );
			return false;
		}
		if ( ! evt )
		{
			log( `${ this.constructor.name }.handleNodeSelfPeerUpdate :: undefined evt` );
			return false;
		}

		//	Updated self multiaddrs?
		console.log( `))) Advertising with a relay address of ${ this.node.getMultiaddrs()[0].toString() }` );
	}

	/**
	 *	@param node
	 *	@param callbackMessage	{CallbackMessage}
	 *	@param evt
	 *	@return {boolean}
	 */
	handleNodePeerMessage
	(
		node,
		callbackMessage,
		/** @type {{ detail: { type: any; topic: any; from: any; }; }} */ evt
	)
	{
		if ( ! this.node )
		{
			LogUtil.error( `${ this.constructor.name }.handleNodePeerMessage :: node is not initialized` );
			return false;
		}

		try
		{
			//
			//	evt:
			//	CustomEventPolyfill {
			//   		type: 'message',
			//   		defaultPrevented: false,
			//   		cancelable: false,
			//   		timeStamp: 126177.69412505627
			// 	}
			//
			//
			//	evt.detail:
			//{
			//   type: 'signed',
			//   from: PeerId(QmV7tUHJnYD2PbDCiUo6g57SRKbeGYKuvj1Th16hFvLa3U),
			//   topic: 'news',
			//   sequenceNumber: 17497035497166456225n,
			//   data: Uint8Array(64) [
			//     123,  34, 100,  97, 116, 101, 116, 105, 109, 101,  34,
			//      58,  34,  50,  48,  50,  51,  45,  48,  56,  45,  48,
			//      56,  84,  49,  56,  58,  53,  53,  58,  51,  54,  46,
			//      48,  54,  55,  90,  34,  44,  34, 109, 101, 115, 115,
			//      97, 103, 101,  34,  58,  34, 104, 101, 108, 108, 111,
			//      32, 119, 111, 114, 108, 100,  33,  34, 125
			//   ],
			//   signature: Uint8Array(256) [
			//     104,  34, 164, 251, 106, 191, 215, 238, 244, 136, 162, 179,
			//     208,  44,  95,  22, 175, 199,  67, 174,  95, 254, 149, 158,
			//      39,  63, 175, 227, 126,  51,  87, 125, 162, 146, 107,  89,
			//     224, 154,   8,  46, 242,  48,  71, 223, 171,  77, 225,  62,
			//     144, 129, 170, 248, 243, 105, 220, 213,  44, 228, 104, 103,
			//      88, 164, 154,  30, 130, 148, 115,  42,  27, 233, 152, 144,
			//      59, 231,   4,  82,  12, 215, 190,  75,  94, 115, 232,  36,
			//      67,  73,  87,  52, 241, 146, 227,  93,  20, 185, 128, 221,
			//      88, 179, 243,  29,
			//     ... 156 more items
			//   ],
			//   key: Uint8Array(299) [
			//       8,   0,  18, 166,   2,  48, 130,   1,  34,  48,  13,   6,
			//       9,  42, 134,  72, 134, 247,  13,   1,   1,   1,   5,   0,
			//       3, 130,   1,  15,   0,  48, 130,   1,  10,   2, 130,   1,
			//       1,   0, 192, 115,  33,  36,  22,  25, 113, 212,  49, 115,
			//     255, 119,  22, 136,   5, 164, 102, 222, 109,  73,   5, 248,
			//     239, 106, 235, 210, 211,  20, 114,  62,  91, 195,   3, 158,
			//     251, 102, 242,  27, 185,  44,  68,  63,  21, 255, 247, 244,
			//     208,  52,  37, 137, 174,  28, 131,  99,  94,  88,  40,  12,
			//     210, 123, 110, 128,
			//     ... 199 more items
			//   ]
			// }

			const recType = evt.detail.type;
			const recTopic = evt.detail.topic;
			const recFrom = evt.detail.from;
			const recSequenceNumber = evt.detail.sequenceNumber;
			let recBody = null;

			if ( 'signed' !== recType )
			{
				LogUtil.warn( `${ this.constructor.name }.handleNodePeerMessage :: not signed` );
				return false;
			}
			if ( '_peer-discovery._p2p._pubsub' === recTopic )
			{
				//LogUtil.info( `<.> PEER-DISCOVERY[${ recSequenceNumber }] from ${ recFrom }` );
				return false;
			}

			LogUtil.info( `>.< BUSINESS-MESSAGE[${ recSequenceNumber }] from ${ recFrom }` );
			const stringData = new TextDecoder().decode( evt.detail.data );
			try
			{
				recBody = JSON.parse( stringData );
				console.log( `>.< recBody :`, recBody );
			}
			catch ( err )
			{
				console.error( `${ this.constructor.name }.handleNodePeerMessage :: error in parsing evt.detail.data :`, stringData, err );
			}

			//	...
			//const allSubscribers = node.services.pubsub.getSubscribers( this.getSyncTopic() );
			// console.doctor( `allSubscribers : `, allSubscribers );
			//const allTopics = node.services.pubsub.getTopics();
			//console.doctor( `allTopics : `, allTopics );

			//	...
			//const allPeers = this.node.services.pubsub.getPeers();
			// console.doctor( `allPeers : `, allPeers );

			//
			//	Validates the given message. The signature will be checked for authenticity.
			//	Throws an error on invalid messages
			//
			// try
			// {
			// 	node.services.pubsub.validate( evt.detail.from, evt.detail );
			// }
			// catch ( errValidate )
			// {
			// 	console.error( errValidate );
			// 	return false;
			// }

			//		getMsgId( msg : Message ) : Promise<Uint8Array> | Uint8Array
			//const msgIdUInt8Arr = this.node.services.pubsub.getMsgId( evt.detail );
			// if ( msgIdUInt8Arr instanceof Uint8Array )
			// {
			// 	const msgId = uint8ArrayToString( msgIdUInt8Arr );
			// 	console.doctor( `msgId : ${ msgIdUInt8Arr }` );
			// }

			//
			//	In certain applications, computing the message id (`getMsgId`) is relatively expensive.
			//	This addition allows for an application to optionally define a "fast" message id
			//	function that will be used internally.
			//	So, the author removed method this.node.services.pubsub.getMsgId.
			//	Let's implement one ourselves.
			//
			let msgId = undefined;
			if ( recFrom && 'bigint' === typeof recSequenceNumber )
			{
				msgId = `${ recFrom.toString() }-${ recSequenceNumber.toString() }`;
			}
			else
			{
				LogUtil.warn( `${ this.constructor.name }.handleNodePeerMessage :: failed to build msgId` );
				LogUtil.warn( `${ this.constructor.name }.handleNodePeerMessage :: recFrom :`, recFrom );
				LogUtil.warn( `${ this.constructor.name }.handleNodePeerMessage :: recSequenceNumber :`, recSequenceNumber );
			}

			//console.doctor( `will call callbackMessage` );
			if ( _.isFunction( callbackMessage ) )
			{
				callbackMessage({
					type : recType,
					topic : recTopic,
					msgId : msgId,
					from : recFrom,
					sequenceNumber : recSequenceNumber,
					data : evt.detail,
					body : recBody,
				});
			}
			else
			{
				LogUtil.warn( `${ this.constructor.name }.handleNodePeerMessage :: callbackMessage is not a function :`, callbackMessage );
			}

			//
			//	....
			//

			// let recObject	= null;
			// if ( 'string' === typeof recData )
			// {
			// 	recObject = JSON.parse( recData.trim() );
			// }
			// const signature = uint8ArrayToString( evt.detail.signature );
			// console.doctor( `received [${ recSequence }] \n- from: ${ recFrom }\n- type: ${ recType }\n- topic ${ recTopic }` );
			// console.doctor( `- data: ${ recData }` );
			// //console.doctor( `- signature: ${ signature }` );
			// console.doctor( `\n` );
		}
		catch ( err )
		{
			LogUtil.error( `${ this.constructor.name }.handleNodePeerMessage :: error `, err );
			log( 'exception in handleNodePeerMessage: %O', err );
		}
	}

}
