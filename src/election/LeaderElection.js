import _ from "lodash";
import {
	defaultElectionMessageVersion,
	isValidP2pElectionMessage,
	P2pElectionMessageBuilder,
	P2pElectionMessageType
} from "../models/P2pElectionMessageBuilder.js";
import { LoggerUtil } from "../utils/LoggerUtil.js";
import { PeerUtil } from "../utils/PeerUtil.js";

/**
 *    @typedef {import('@libp2p/interface-pubsub/src')} PublishResult
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
	pClsRelayService = undefined;

	/**
	 * 	the peerId of this node
	 *	@type { string | null}
	 */
	peerId = null;

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
	 *	@type {Set<any>}
	 */
	peers = new Set();

	/**
	 * 	Gossip topic for election
	 *	@type {string}
	 */
	#electionTopic = 'sync-leader-election';

	/**
	 *	Election timer
	 *	@type {NodeJS.Timeout}
	 */
	electionWaitingResultTimer = undefined;

	/**
	 * 	Election timeout value
	 * 	@type {number}
	 */
	electionWaitingResultTimeout = 10 * 1000;


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
	#heartbeatResetRestartingElectionTimerValue = 10 * 1000;

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
		this.peerId = props.peerId;
		this.pClsRelayService = props.pClsRelayService;

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
		return _.isString( this.#leaderPeerId ) && ! _.isEmpty( this.#leaderPeerId );
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
					if ( this.peers.has( peerIdStr ) )
					{
						this.peers.delete( peerIdStr );
					}
					if ( this.#leaderPeerId === peerIdStr )
					{
						//	Start a new election if the leader goes offline
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
					if ( ! this.peers.has( electionPeerId ) )
					{
						this.peers.add( electionPeerId );
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
				this.log.info( `${ this.constructor.name }.#startElection :: 🌼 Starting election...` );

				//	...
				this.#isLeader = false;

				/**
				 *	@type { P2pElectionMessage }
				 */
				const message = P2pElectionMessageBuilder.builder()
					.setElectionMessageType( `election` )
					.setElectionMessageVersion( this.electionMessageVersion )
					.setElectionPeerId( this.peerId )
					.build();
				await this.#broadcast( message );

				//	Compare with other nodes
				if ( _.isNumber( this.electionWaitingResultTimer ) )
				{
					clearTimeout( this.electionWaitingResultTimer );
					this.electionWaitingResultTimer = undefined;
				}
				this.electionWaitingResultTimer = setTimeout( async () =>
				{
					//	...
					await this.#calcElectionResult();
					resolve( true );

				}, this.electionWaitingResultTimeout );
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
				this.log.info( `${ this.constructor.name }.#startHeartbeat :: 💜 Leader ${ this.peerId } broadcast heartbeat` );
				const message = P2pElectionMessageBuilder.builder()
					.setElectionMessageType( P2pElectionMessageType.HEARTBEAT )
					.setElectionMessageVersion( this.electionMessageVersion )
					.setElectionPeerId( this.peerId )
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
			this.log.info( `${ this.constructor.name }.#resetRestartElectionTimer :: 💔💔💔 Leader ${ this.#leaderPeerId } is unreachable, starting a new election...` );

			//	...
			this.peers.delete( this.#leaderPeerId );
			this.#leaderPeerId = null;
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

				this.log.info( `${ this.constructor.name }.#handleElection :: messageBody: [${ JSON.stringify( messageBody ) }]` );

				/**
				 * 	@type {string}
				 */
				const electionPeerId = messageBody.electionPeerId;
				if ( this.hasLeader() )
				{
					/**
					 * 	if the leader has already been elected, ignore further election messages
					 */
					this.log.info( `${ this.constructor.name }.#handleElection :: 🍋 Already elected leader[${ this.#leaderPeerId }], ignoring election message from peer[${ electionPeerId }]` );
					return resolve( true );
				}

				if ( electionPeerId > this.peerId )
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

				//	update leader peerId
				this.#leaderPeerId = electionPeerId;

				//	update leader status
				this.#isLeader = ( electionPeerId === this.peerId );

				//	...
				this.log.info( `${ this.constructor.name }.#handleVictory :: 🧡 this peer[${ this.peerId }] is leader=${ this.#isLeader }` );
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
				if ( this.isLeader() )
				{
					this.log.info( `${ this.constructor.name }.#handleHeartbeat :: i am leader, give up my own heartbeat processing` );
					return resolve( true );
				}

				//	...
				this.log.info( `${ this.constructor.name }.#handleHeartbeat :: messageBody: [${ JSON.stringify( messageBody ) }]` );

				/**
				 * 	@type {string}
				 */
				const electionPeerId = messageBody.electionPeerId;
				if ( electionPeerId === this.#leaderPeerId )
				{
					this.log.info( `${ this.constructor.name }.#handleHeartbeat :: 🩵 Received heartbeat from leader: [${ electionPeerId }]` );

					/**
					 * 	Reset timeout if heartbeat is received from our leader
					 */
					this.#resetRestartElectionTimer();
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
				if ( ! _.isString( this.peerId ) ||
					_.isEmpty( this.peerId ) )
				{
					return reject( `${ this.constructor.name }.#announceVictory :: invalid this.peerId(${ this.peerId })` );
				}

				//	...
				this.log.info( `${ this.constructor.name }.#announceVictory :: 💚🦄🐥 peer[${ this.peerId }] is the new leader` );

				/**
				 * 	update leader
				 */
				this.#isLeader = true;

				/**
				 *	@type { P2pElectionMessage }
				 */
				const message = P2pElectionMessageBuilder.builder()
					.setElectionMessageType( P2pElectionMessageType.VICTORY )
					.setElectionMessageVersion( this.electionMessageVersion )
					.setElectionPeerId( this.peerId )
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
				this.log.info( `${ this.constructor.name }.#calcElectionResult > resultTimer :: this.peerId :`, this.peerId );
				this.log.info( `${ this.constructor.name }.#calcElectionResult > resultTimer :: peers :`, this.peers );
				const higherNodes = Array.from( this.peers )
					.filter( peer => peer > this.peerId );
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
					return reject( `${ this.constructor.name }.#broadcast :: invalid this.peerId(${ this.peerId })` );
				}
				if ( ! this.pClsRelayService )
				{
					return reject( `${ this.constructor.name }.#broadcast :: invalid this.pClsRelayService(${ this.pClsRelayService })` );
				}

				const broadcastResult = await this.pClsRelayService.publish( this.#electionTopic, message );
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
}
