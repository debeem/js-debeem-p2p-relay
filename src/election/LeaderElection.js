import _ from "lodash";
import { isHexString, keccak256 } from "ethers";
import {
	defaultElectionMessageVersion,
	isValidP2pElectionMessage,
	P2pElectionMessageBuilder,
	P2pElectionMessageType
} from "../models/P2pElectionMessageBuilder.js";
import { LoggerUtil } from "../utils/LoggerUtil.js";
import { PeerUtil } from "../utils/PeerUtil.js";
import { ProcessUtil } from "debeem-utils";

/**
 *	@typedef {import('@libp2p/interface-pubsub/src')} PublishResult
 */

/**
 * 	@typedef {import('@libp2p/interface')} Peer
 */


/**
 *	@typedef {Object} ElectionInitializationProps
 *	@property {string} peerId
 *	@property {RelayService} pClsRelayService
 *	@property {string} [electionMessageVersion]
 */


/**
 * 	@class
 */
export class LeaderElection
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
	 * 	the peerId of this node
	 *	@type { string | null}
	 */
	#peerId = null;

	/**
	 * 	leader peerId
	 * 	@type { string | null}
	 */
	#leaderPeerId = null;

	/**
	 * 	indicates whether the current node is the leader node
	 *	@type {boolean}
	 */
	#isLeader = false;

	/**
	 * 	Keep track of connected peers
	 * 	@example
	 * 	[
	 * 	    `peerId1`,
	 * 	    `peerId2`,
	 * 	    `...`
	 * 	]
	 *	@type {Set<string>}
	 */
	#intercommunicablePeers = new Set();

	/**
	 * 	Gossip topic for election
	 *	@type {string}
	 */
	#electionTopic = 'sync-leader-election';

	/**
	 *	Election timer
	 *	@type {NodeJS.Timeout}
	 */
	#electionWaitingResultTimer = null;

	/**
	 * 	Election timeout value
	 * 	@type {number}
	 */
	#electionWaitingResultTimeout = 10 * 1000;


	/**
	 *	heartbeat interval
	 * 	@type { NodeJS.Timeout | null }
	 */
	#heartbeatInterval = null;

	/**
	 * 	Heartbeat interval in milliseconds
	 *	@type {number}
	 */
	#heartbeatIntervalValue = 5 * 1000;

	/**
	 * 	Timer for re-start Election
	 * 	@type { NodeJS.Timeout | null }
	 */
	#heartbeatResetRestartingElectionTimer = null;

	/**
	 * 	timeout for heartbeat response
	 *	@type {number}
	 */
	#heartbeatResetRestartingElectionTimerValue = 20 * 1000;

	/**
	 *	mark the election is in progress
	 *	@type {boolean}
	 */
	#isElectionInProgress = false;

	/**
	 *	@type {Logger}
	 */
	log = new LoggerUtil().logger;


	/**
	 *	@param props	{ElectionInitializationProps}
	 */
	constructor( props )
	{
		if ( ! _.isObject( props ) )
		{
			throw new Error( `${ this.constructor.name }.constructor :: invalid props` );
		}
		if ( ! _.isString( props.peerId ) ||
			_.isEmpty( props.peerId ) )
		{
			throw new Error( `${ this.constructor.name }.constructor :: invalid props.peerId` );
		}
		if ( ! props.pClsRelayService )
		{
			throw new Error( `${ this.constructor.name }.constructor :: invalid props.pClsRelayService` );
		}

		//	...
		this.#peerId = props.peerId;
		this.#pClsRelayService = props.pClsRelayService;

		if ( _.isString( props.electionMessageVersion ) &&
			! _.isEmpty( props.electionMessageVersion ) )
		{
			this.electionMessageVersion = props.electionMessageVersion;
		}
	}

	/**
	 *	@returns {string}
	 */
	getElectionTopic()
	{
		return this.#electionTopic;
	}

	/**
	 *	@returns {boolean}
	 */
	isLeader()
	{
		return this.#isLeader;
	}

	/**
	 *	@returns {string|null}
	 */
	getLeaderPeerId()
	{
		return this.#leaderPeerId;
	}

	/**
	 *	@returns {boolean}
	 */
	hasLeader()
	{
		return _.isString( this.getLeaderPeerId() ) && ! _.isEmpty( this.getLeaderPeerId() );
	}

	/**
	 * 	returns intercommunicable peers
	 *	@returns {Set<string>}
	 */
	getIntercommunicablePeers()
	{
		return this.#intercommunicablePeers;
	}

	/**
	 *	@returns { Promise<boolean> }
	 */
	start()
	{
		return new Promise( async (
			resolve,
			reject
		) =>
		{
			try
			{
				this.log.info( `${ this.constructor.name }.start :: Starting...` );

				/**
				 *	start election
				 */
				await this.#startElection();

				/**
				 *	start heartbeat to others from leader
				 */
				this.#startHeartbeat();

				//	...
				resolve( true );
			}
			catch ( err )
			{
				reject( err );
			}
		} );
	}

	/**
	 *	@param event		{string}
	 *	@param peerId		{PeerId}
	 *	@returns {Promise<boolean>}
	 */
	handlePeerEvent(
		event,
		peerId
	)
	{
		return new Promise( async (
			resolve,
			reject
		) =>
		{
			try
			{
				if ( ! PeerUtil.isValidPeerId( peerId ) )
				{
					return reject( `${ this.constructor.name }.handlePeerEvent :: invalid peerId` );
				}

				const peerIdStr = peerId.toString().trim();
				this.log.info( `${ this.constructor.name }.handlePeerEvent :: event[${ event }], peerIdStr[${ peerIdStr }]` );

				if ( `peer:connect` === event )
				{
					// if ( ! this.peers.has( peerIdStr ) )
					// {
					// 	this.peers.add( peerIdStr );
					// }
				}
				else if ( `peer:disconnect` === event )
				{
					if ( this.#intercommunicablePeers.has( peerIdStr ) )
					{
						this.log.info( `${ this.constructor.name }.handlePeerEvent :: 🍄 will remove peer[${ peerIdStr }] from intercommunicablePeers` );
						this.#intercommunicablePeers.delete( peerIdStr );
					}
					if ( this.getLeaderPeerId() === peerIdStr )
					{
						//	Start a new election if the leader goes offline
						this.log.info( `${ this.constructor.name }.handlePeerEvent :: 🦄 will start a new election while the leader peer[${ peerIdStr }] goes offline` );
						await this.#startElection();
					}
				}

				//	...
				resolve( true );
			}
			catch ( err )
			{
				reject( err );
			}
		} );
	}

	/**
	 *	@param param	{CallbackMessageParams}
	 *	@returns { Promise<boolean> }
	 */
	handleElectionMessage( param )
	{
		return new Promise( async (
			resolve,
			reject
		) =>
		{
			try
			{
				if ( ! param )
				{
					return reject( `${ this.constructor.name }.handleElectionMessage :: invalid param` );
				}

				/**
				 * 	@type {P2pElectionMessage}
				 */
				const messageBody = param.body;
				this.log.info( `${ this.constructor.name }.handleElectionMessage :: messageBody`, messageBody );
				if ( ! isValidP2pElectionMessage( messageBody ) )
				{
					//return reject( `${ this.constructor.name }.handleElectionMessage :: invalid param.body` );
					this.log.info( `${ this.constructor.name }.handleElectionMessage :: invalid param.body` );
					return resolve( false );
				}

				/**
				 *	@type {string}
				 */
				const electionMessageType = messageBody.electionMessageType;

				/**
				 *	@type {string}
				 */
				const electionMessageVersion = messageBody.electionMessageVersion;

				/**
				 * 	@type {string}
				 */
				const electionPeerId = messageBody.electionPeerId;

				/**
				 * 	Only process messages with version numbers greater than or equal to the current node
				 */
				if ( electionMessageVersion >= this.electionMessageVersion )
				{
					/**
					 * 	if the peer does not exist, add it to the set
					 */
					if ( ! this.#intercommunicablePeers.has( electionPeerId ) )
					{
						this.#intercommunicablePeers.add( electionPeerId );
						await this.#startElection();
					}
				}

				/**
				 * 	process message
				 */
				if ( P2pElectionMessageType.ELECTION === electionMessageType )
				{
					await this.#handleElection( messageBody );
				}
				else if ( P2pElectionMessageType.VICTORY === electionMessageType )
				{
					await this.#handleVictory( messageBody );
				}
				else if ( P2pElectionMessageType.HEARTBEAT === electionMessageType )
				{
					await this.#handleHeartbeat( messageBody );
				}

				//	...
				resolve( true );
			}
			catch ( err )
			{
				reject( err );
			}
		} );
	}

	/**
	 *	@returns { Promise<boolean> }
	 */
	#startElection()
	{
		return new Promise( async (
			resolve,
			reject
		) =>
		{
			try
			{
				this.log.debug( `${ this.constructor.name }.#startElection :: 🌼 Starting election...` );

				if ( this.#isElectionInProgress )
				{
					this.log.debug( `${ this.constructor.name }.#startElection :: 🐸 quit while election is in progress.` );
					return resolve( true );
				}

				/**
				 * 	election is in progress
				 * 	@type {boolean}
				 */
				this.#isElectionInProgress = true;

				/**
				 * 	update leader status
				 */
				this.#updateLeaderStatus( {
					isLeader : false,
					leaderPeerId : null
				} );

				/**
				 *	@type { P2pElectionMessage }
				 */
				const message = P2pElectionMessageBuilder.builder()
					.setElectionMessageType( `election` )
					.setElectionMessageVersion( this.electionMessageVersion )
					.setElectionPeerId( this.#peerId )
					.build();
				await this.#broadcast( message );

				/**
				 * 	wait for the election result
				 *	- compare with other nodes
				 */
				if ( this.#electionWaitingResultTimer )
				{
					clearTimeout( this.#electionWaitingResultTimer );
					this.#electionWaitingResultTimer = undefined;
				}
				this.#electionWaitingResultTimer = setTimeout( async () =>
				{
					//	...
					await this.#calcElectionResult();

					/**
					 * 	election is in progress
					 * 	@type {boolean}
					 */
					this.#isElectionInProgress = false;

					//	...
					resolve( true );

				}, this.#electionWaitingResultTimeout );
			}
			catch ( err )
			{
				reject( err );
			}
		} );
	}

	/**
	 * 	broadcast heartbeat to others from leader
	 */
	#startHeartbeat()
	{
		if ( this.#heartbeatInterval )
		{
			clearInterval( this.#heartbeatInterval );
			this.#heartbeatInterval = null;
		}
		this.#heartbeatInterval = setInterval( async () =>
		{
			//	only leader broadcast this heartbeat
			if ( this.#isLeader )
			{
				this.log.info( `${ this.constructor.name }.#startHeartbeat :: 💜 Leader ${ this.#peerId } broadcast heartbeat` );
				const message = P2pElectionMessageBuilder.builder()
					.setElectionMessageType( P2pElectionMessageType.HEARTBEAT )
					.setElectionMessageVersion( this.electionMessageVersion )
					.setElectionPeerId( this.#peerId )
					.build();
				await this.#broadcast( message );
			}

		}, this.#heartbeatIntervalValue );
	}

	/**
	 * 	reset restarting election timer
	 */
	#resetRestartElectionTimer()
	{
		if ( this.#heartbeatResetRestartingElectionTimer )
		{
			clearTimeout( this.#heartbeatResetRestartingElectionTimer );
			this.#heartbeatResetRestartingElectionTimer = null;
		}
		this.#heartbeatResetRestartingElectionTimer = setTimeout( async () =>
		{
			this.log.info( `${ this.constructor.name }.#resetRestartElectionTimer :: 💔💔💔 Leader ${ this.getLeaderPeerId() } is unreachable, starting a new election...` );
			if ( this.hasLeader() )
			{
				this.#intercommunicablePeers.delete( this.getLeaderPeerId() );
			}

			/**
			 * 	update leader status
			 */
			this.#updateLeaderStatus( {
				isLeader : false,
				leaderPeerId : null
			} );

			await this.#startElection();

		}, this.#heartbeatResetRestartingElectionTimerValue );
	}

	/**
	 *	@param messageBody	{P2pElectionMessage}
	 *	@returns {Promise<boolean>}
	 */
	#handleElection( messageBody )
	{
		return new Promise( async (
			resolve,
			reject
		) =>
		{
			try
			{
				if ( ! isValidP2pElectionMessage( messageBody ) )
				{
					return reject( `${ this.constructor.name }.#handleElection :: invalid messageBody` );
				}
				if ( P2pElectionMessageType.ELECTION !== messageBody.electionMessageType )
				{
					return reject( `${ this.constructor.name }.#handleElection :: invalid messageBody.electionMessageType` );
				}
				if ( ! _.isString( this.#peerId ) || _.isEmpty( this.#peerId ) )
				{
					return reject( `${ this.constructor.name }.#handleElection :: invalid this.#peerId` );
				}

				//	...
				this.log.info( `${ this.constructor.name }.#handleElection :: 📣 messageBody: [${ JSON.stringify( messageBody ) }]` );

				/**
				 * 	@type {string}
				 */
				const electionPeerId = messageBody.electionPeerId;
				if ( this.hasLeader() )
				{
					/**
					 * 	if the leader has already been elected, ignore further election messages
					 */
					this.log.info( `${ this.constructor.name }.#handleElection :: 🍋 Already elected leader[${ this.getLeaderPeerId() }], ignoring election message from peer[${ electionPeerId }]` );
					return resolve( true );
				}

				/**
				 *	compare their hash values
				 */
				const electionPeerIdHash = keccak256( new TextEncoder().encode( electionPeerId ) );
				const thisPeerIdHash = keccak256( new TextEncoder().encode( this.#peerId ) );
				if ( electionPeerIdHash > thisPeerIdHash )
				{
					this.log.info( `${ this.constructor.name }.#handleElection :: Node ${ electionPeerId } has higher priority, yielding...` );
				}
				else
				{
					//	Re-start the election if this node has higher ID
					await this.#startElection();
				}

				//	...
				resolve( true );
			}
			catch ( err )
			{
				reject( err );
			}
		} );
	}

	/**
	 *	@param messageBody	{P2pElectionMessage}
	 *	@returns { Promise<boolean> }
	 */
	#handleVictory( messageBody )
	{
		return new Promise( async (
			resolve,
			reject
		) =>
		{
			try
			{
				if ( ! isValidP2pElectionMessage( messageBody ) )
				{
					return reject( `${ this.constructor.name }.#handleVictory :: invalid messageBody` );
				}
				if ( P2pElectionMessageType.VICTORY !== messageBody.electionMessageType )
				{
					return reject( `${ this.constructor.name }.#handleVictory :: invalid messageBody.electionMessageType` );
				}

				this.log.info( `${ this.constructor.name }.#handleVictory :: messageBody: `, messageBody );

				/**
				 * 	@type {string}
				 */
				const electionPeerId = messageBody.electionPeerId;

				/**
				 * 	update leader status
				 */
				this.#updateLeaderStatus( {
					isLeader : ( electionPeerId === this.#peerId ),
					leaderPeerId : electionPeerId
				} );

				//	...
				this.log.info( `${ this.constructor.name }.#handleVictory :: 🧡 this peer[${ this.#peerId }] is leader=${ this.#isLeader }` );
				this.log.info( `${ this.constructor.name }.#handleVictory :: 🧡 ${ electionPeerId } has been elected as leader` );
				resolve( true );
			}
			catch ( err )
			{
				reject( err );
			}
		} );
	}

	/**
	 *	@param messageBody	{P2pElectionMessage}
	 *	@returns { Promise<boolean> }
	 */
	#handleHeartbeat( messageBody )
	{
		return new Promise( async (
			resolve,
			reject
		) =>
		{
			try
			{
				if ( ! isValidP2pElectionMessage( messageBody ) )
				{
					return reject( `${ this.constructor.name }.#handleHeartbeat :: invalid messageBody` );
				}
				if ( P2pElectionMessageType.HEARTBEAT !== messageBody.electionMessageType )
				{
					return reject( `${ this.constructor.name }.#handleHeartbeat :: invalid messageBody.electionMessageType` );
				}
				if ( this.hasLeader() && this.isLeader() )
				{
					this.log.warn( `${ this.constructor.name }.#handleHeartbeat :: i am leader, give up my own heartbeat processing` );
					return resolve( true );
				}

				//	...
				this.log.debug( `${ this.constructor.name }.#handleHeartbeat :: messageBody: `, messageBody );
				this.log.debug( `${ this.constructor.name }.#handleHeartbeat :: this.#isLeader=${ this.isLeader() }` );
				this.log.debug( `${ this.constructor.name }.#handleHeartbeat :: this.#leaderPeerId=${ this.getLeaderPeerId() }` );

				/**
				 * 	@type {string}
				 */
				const electionPeerId = messageBody.electionPeerId;
				if ( this.hasLeader() )
				{
					if ( electionPeerId === this.getLeaderPeerId() )
					{
						this.log.debug( `${ this.constructor.name }.#handleHeartbeat :: 🩵 received heartbeat from leader: [${ electionPeerId }]` );
						this.log.debug( `${ this.constructor.name }.#handleHeartbeat :: 🩵 will reset restart election watch timer` );

						/**
						 * 	Reset timeout if heartbeat is received from our leader
						 */
						this.#resetRestartElectionTimer();
					}
					else
					{
						/**
						 * 	fatal error:
						 * 	a heartbeat message is received, but it doesn't come from the marked leader
						 *
						 * 	Next Step:
						 * 	re-start election
						 */
						this.log.debug( `${ this.constructor.name }.#handleHeartbeat :: 👠 heartbeat does not come from our leader: this.#leaderPeerId=${ this.getLeaderPeerId() }, electionPeerId=${ electionPeerId }` );
						this.log.debug( `${ this.constructor.name }.#handleHeartbeat :: 👠 heartbeat does not come from our leader: this.peers : `, this.#intercommunicablePeers );
						await this.#startElection();
					}
				}
				else
				{
					this.log.debug( `${ this.constructor.name }.#handleHeartbeat :: 💊 heartbeat does not come from leader and i don't know who is leader` );
					await this.#startElection();
				}

				//	...
				resolve( true );
			}
			catch ( err )
			{
				reject( err );
			}
		} );
	}

	/**
	 * 	@returns {Promise< PublishResult >}
	 */
	#announceVictory()
	{
		return new Promise( async (
			resolve,
			reject
		) =>
		{
			try
			{
				if ( ! _.isString( this.#peerId ) ||
					_.isEmpty( this.#peerId ) )
				{
					return reject( `${ this.constructor.name }.#announceVictory :: invalid this.peerId(${ this.#peerId })` );
				}

				//	...
				this.log.info( `${ this.constructor.name }.#announceVictory :: 💚💚🦄🦄🐥🐥 peer[${ this.#peerId }] is the new leader` );

				/**
				 * 	update leader status
				 */
				this.#updateLeaderStatus( {
					isLeader : true,
					leaderPeerId : this.#peerId
				} );

				/**
				 *	@type { P2pElectionMessage }
				 */
				const message = P2pElectionMessageBuilder.builder()
					.setElectionMessageType( P2pElectionMessageType.VICTORY )
					.setElectionMessageVersion( this.electionMessageVersion )
					.setElectionPeerId( this.#peerId )
					.build();
				const broadcastResult = await this.#broadcast( message );
				resolve( broadcastResult );
			}
			catch ( err )
			{
				reject( err );
			}
		} );
	}

	/**
	 * 	query currently connected peerIds from node peerStore
	 *	@param [rawPeerId]	{boolean}
	 *	@returns {Promise< Array< PeerId | string > >}
	 */
	#queryConnectedPeersFromPeerStore( rawPeerId = false )
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

	/**
	 *	@returns {Promise<boolean>}
	 */
	#calcElectionResult()
	{
		return new Promise( async (
			resolve,
			reject
		) =>
		{
			try
			{
				this.log.info( `${ this.constructor.name }.#calcElectionResult > resultTimer :: will calc result` );
				this.log.info( `${ this.constructor.name }.#calcElectionResult > resultTimer :: this.peerId :`, this.#peerId );
				this.log.info( `${ this.constructor.name }.#calcElectionResult > resultTimer :: peers :`, this.#intercommunicablePeers );

				const connectedPeerIds = await this.#queryConnectedPeersFromPeerStore();
				const intercommunicablePeers = this.getIntercommunicablePeers();
				this.log.info( `${ this.constructor.name }.#calcElectionResult > resultTimer :: 🐳🐳🐳 connectedPeerIds :`, connectedPeerIds );
				this.log.info( `${ this.constructor.name }.#calcElectionResult > resultTimer :: 🐡🐡🐡 intercommunicablePeers :`, intercommunicablePeers );

				const higherNodes = Array.from( this.#intercommunicablePeers )
					.filter( peer => peer > this.#peerId );
				//console.log( `${ this.constructor.name }.#calcElectionResult > resultTimer :: higherNodes :`, higherNodes );
				this.log.info( `${ this.constructor.name }.#calcElectionResult > resultTimer :: higherNodes :`, higherNodes );
				if ( 0 === higherNodes.length )
				{
					this.log.info( `${ this.constructor.name }.#calcElectionResult > resultTimer :: will announce victory` );
					await this.#announceVictory(); // No higher node, become master
				}
				else
				{
					this.log.info( `${ this.constructor.name }.#calcElectionResult > resultTimer :: i am not the victory` );
				}

				//	...
				resolve( true );
			}
			catch ( err )
			{
				reject( err );
			}
		} );
	}

	/**
	 *	#broadcast
	 *	@param message	{ P2pElectionMessage }
	 *	@returns { Promise< PublishResult > }
	 */
	#broadcast( message )
	{
		return new Promise( async (
			resolve,
			reject
		) =>
		{
			try
			{
				if ( ! isValidP2pElectionMessage( message ) )
				{
					return reject( `${ this.constructor.name }.#broadcast :: invalid this.peerId(${ this.#peerId })` );
				}
				if ( ! this.#pClsRelayService )
				{
					return reject( `${ this.constructor.name }.#broadcast :: invalid this.pClsRelayService(${ this.#pClsRelayService })` );
				}

				const broadcastResult = await this.#pClsRelayService.publish( this.#electionTopic, message );
				this.log.info( `${ this.constructor.name }.#broadcast :: ///***///***/// broadcastResult :`, broadcastResult );

				//	...
				resolve( broadcastResult );
			}
			catch ( err )
			{
				reject( err );
			}
		} );
	}

	/**
	 * 	update leader status
	 *	@param isLeader		{boolean}
	 *	@param leaderPeerId	{ string | null | undefined }
	 */
	#updateLeaderStatus( {
			       isLeader = false,
			       leaderPeerId = undefined
		       } )
	{
		/**
		 * 	update leader status
		 */
		if ( _.isBoolean( isLeader ) )
		{
			//	update leader status
			this.#isLeader = isLeader;
			if ( ProcessUtil.isNodeEnvironment() )
			{
				process.env.P2P_RELAY_IS_LEADER = ( this.#isLeader ? `true` : `false` );
			}
		}

		/**
		 * 	update leader peerId
		 */
		//	update leader peerId
		this.#leaderPeerId = _.isString( leaderPeerId ) ? leaderPeerId : undefined;
		if ( ProcessUtil.isNodeEnvironment() )
		{
			process.env.P2P_RELAY_LEADER_PEER_ID = _.isString( leaderPeerId ) ? leaderPeerId : undefined;
		}

		//	...
		this.log.info( `${ this.constructor.name }.#updateLeaderStatus :: isLeader=${ this.isLeader() }, leaderPeerId=${ String( this.getLeaderPeerId() ) }` );
	}
}
