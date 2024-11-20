import _ from "lodash";
import { keccak256 } from "ethers";
import {
	defaultElectionMessageVersion,
	isValidP2pElectionMessage,
	P2pElectionMessageBuilder,
	P2pElectionMessageType
} from "../models/P2pElectionMessageBuilder.js";
import { LoggerUtil } from "../utils/LoggerUtil.js";
import { PeerUtil } from "../utils/PeerUtil.js";
import { ProcessUtil } from "debeem-utils";
import { CandidatePeer } from "./CandidatePeer.js";
import { ElectionDigest } from "./ElectionDigest.js";
import { ElectionCrypto } from "./ElectionCrypto.js";

/**
 *    @typedef {import('@libp2p/interface-pubsub/src')} PublishResult
 */

/**
 *    @typedef {import('@libp2p/interface')} Peer
 */


/**
 *    @class
 *
 *    Notice:
 *
 *    BULLY ALGORITHM
 *    When using the Bully Algorithm as the election algorithm,
 *    to prevent spoofing attacks on peer IDs, we compare the hash values of the peer IDs instead of the IDs themselves.
 */
export class LeaderElection
{
	/**
	 *    @type {ElectionDigest}
	 */
	electionDigest = new ElectionDigest();

	/**
	 *    @type {ElectionCrypto}
	 */
	electionCrypto = new ElectionCrypto();

	/**
	 *    election message version
	 *    @type {string}
	 */
	electionMessageVersion = defaultElectionMessageVersion;

	/**
	 *      @typedef {RelayService}
	 */
	#pClsRelayService = undefined;

	/**
	 *    @type {string}
	 */
	#groupKey = undefined;

	/**
	 *    the peerId of this node
	 *    @type { string | null}
	 */
	#peerId = null;

	/**
	 *    leader peerId
	 *    @type { string | null}
	 */
	#leaderPeerId = null;

	/**
	 *    indicates whether the current node is the leader node
	 *    @type {boolean}
	 */
	#isLeader = false;

	/**
	 *    all candidate peers
	 *    @type {CandidatePeer}
	 */
	#candidatePeer = undefined;

	/**
	 *    Gossip topic for election
	 *    @type {string}
	 */
	#electionTopic = 'sync-leader-election';

	/**
	 *    final Gossip topic with hash value of #groupKey
	 *    @type {string}
	 */
	#finalElectionTopic = undefined;

	/**
	 *    Election timer
	 *    @type {NodeJS.Timeout}
	 */
	#electionWaitingResultTimer = null;

	/**
	 *    Election timeout value
	 *    @type {number}
	 */
	#electionWaitingResultTimeout = 10 * 1000;


	/**
	 *	heartbeat interval
	 *	@type {{ handler: NodeJS.Timeout | null, timeout: number }}
	 */
	#heartbeatInterval = {
		handler : null,
		timeout : 3 * 1000	//	heartbeat interval in milliseconds
	};

	/**
	 *	Timer for re-start Election
	 *	@type {{ handler: NodeJS.Timeout | null, timeout: number }}
	 */
	#leaderWatchDogTimer = {
		handler : null,
		timeout : 10 * 1000	//	timeout for leader heartbeat response
	};


	/**
	 *    Timer for re-start Election
	 *    @type { NodeJS.Timeout | null }
	 */
	#allHandsWatchDogTimer = {
		handler : null,
		timeout : 10 * 1000	//	timeout for all hands heartbeat response
	};


	/**
	 *    mark the election is in progress
	 *    @type {boolean}
	 */
	#isElectionInProgress = false;

	/**
	 *    @type {Logger}
	 */
	log = new LoggerUtil().logger;


	/**
	 *    @param props    {P2pElectionOptions}
	 */
	constructor( props )
	{
		if ( ! _.isObject( props ) )
		{
			throw new Error( `${ this.constructor.name }.constructor :: invalid props` );
		}
		if ( ! _.isString( props.peerId ) || _.isEmpty( props.peerId ) )
		{
			throw new Error( `${ this.constructor.name }.constructor :: invalid props.peerId` );
		}
		if ( ! props.pClsRelayService )
		{
			throw new Error( `${ this.constructor.name }.constructor :: invalid props.pClsRelayService` );
		}

		//	...
		this.log.debug( `${ this.constructor.name }.constructor :: 🎂🎂🎂 props.peerId=${ props.peerId }` );
		this.#peerId = props.peerId;
		this.#pClsRelayService = props.pClsRelayService;
		this.#groupKey = props.groupKey;

		if ( _.isString( props.electionMessageVersion ) &&
			! _.isEmpty( props.electionMessageVersion ) )
		{
			this.electionMessageVersion = props.electionMessageVersion;
		}

		const candidatePeerOptions = {
			pClsRelayService : props.pClsRelayService,
			electionMessageVersion : this.electionMessageVersion,
			electionTopic : this.getElectionTopic(),
		};
		this.#candidatePeer = new CandidatePeer( candidatePeerOptions );
	}

	/**
	 *    @returns {string|null}
	 */
	getPeerId()
	{
		return this.#peerId;
	}

	/**
	 *    @returns {string}
	 */
	getElectionTopic()
	{
		if ( this.#finalElectionTopic )
		{
			return this.#finalElectionTopic;
		}

		//	...
		this.#finalElectionTopic = this.#electionTopic;
		if ( _.isString( this.#groupKey ) &&
			! _.isEmpty( this.#groupKey.trim() ) )
		{
			const groupKeyHash = keccak256( new TextEncoder().encode( this.#groupKey ) );
			this.#finalElectionTopic = `${ this.#electionTopic }${ groupKeyHash }`;
		}

		//	...
		this.log.silly( `${ this.constructor.name }.getElectionTopic :: 🔫 this.#groupKey = ${ this.#groupKey }` );
		this.log.silly( `${ this.constructor.name }.getElectionTopic :: 🔫 this.#finalElectionTopic = ${ this.#finalElectionTopic }` );
		return this.#finalElectionTopic;
	}


	/**
	 *    @returns {boolean}
	 */
	isLeader()
	{
		return this.#isLeader;
	}

	/**
	 *    @returns {string|null}
	 */
	getLeaderPeerId()
	{
		return this.#leaderPeerId;
	}

	/**
	 *    @returns {boolean}
	 */
	hasLeader()
	{
		return _.isString( this.getLeaderPeerId() ) && ! _.isEmpty( this.getLeaderPeerId() );
	}

	// /**
	//  * 	returns intercommunicable peers
	//  *	@returns {Array<string>}
	//  */
	// getIntercommunicablePeers()
	// {
	// 	return Array.from( this.#intercommunicablePeers );
	// }

	/**
	 *    @returns { Promise<boolean> }
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
				this.log.info( `${ this.constructor.name }.start :: 🥇 this.#groupKey = ${ this.#groupKey }` );
				this.log.info( `${ this.constructor.name }.start :: 🥇 this.#finalElectionTopic = ${ this.#finalElectionTopic }` );

				/**
				 *    start election
				 */
				await this.#startElection();

				/**
				 *    start heartbeat to others from leader
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
	 *    @param event        {string}
	 *    @param peerId        {PeerId}
	 *    @returns {Promise<boolean>}
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
				this.log.silly( `${ this.constructor.name }.handlePeerEvent :: event[${ event }], peerIdStr[${ peerIdStr }]` );

				if ( `peer:connect` === event )
				{
					// if ( ! this.peers.has( peerIdStr ) )
					// {
					// 	this.peers.add( peerIdStr );
					// }
				}
				else if ( `peer:disconnect` === event )
				{
					// if ( this.#intercommunicablePeers.has( peerIdStr ) )
					// {
					// 	this.log.silly( `${ this.constructor.name }.handlePeerEvent :: 🍄 will remove peer[${ peerIdStr }] from intercommunicablePeers` );
					// 	this.#intercommunicablePeers.delete( peerIdStr );
					// }

					if ( this.getLeaderPeerId() === peerIdStr )
					{
						//	Start a new election if the leader goes offline
						this.log.silly( `${ this.constructor.name }.handlePeerEvent :: 🦄 will start a new election while the leader peer[${ peerIdStr }] goes offline` );
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
	 *    @param param    {CallbackMessageParams}
	 *    @returns { Promise<boolean> }
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
				if ( ! param || ! param.body )
				{
					return reject( `${ this.constructor.name }.handleElectionMessage :: invalid param` );
				}
				if ( ! param.body )
				{
					return reject( `${ this.constructor.name }.handleElectionMessage :: invalid param.body` );
				}
				if ( ! _.isString( param.body.message ) )
				{
					return reject( `${ this.constructor.name }.handleElectionMessage :: invalid param.body.message` );
				}

				this.log.silly( `${ this.constructor.name }.handleElectionMessage :: param:`, { body : param.body } );

				/**
				 * 	param :
				 *	{
				 *		body:
				 *		{
				 *			message: "0b9e386505755d80eee674558f8c52......49ae"
				 *		}
				 *	}
				 *
				 * 	messageBody :
				 * 	{
				 *		electionMessageType : "heartbeat",
				 *		electionMessageVersion : "1.0",
				 *		electionPeerId : "QmY2jcGpRciCDpGKa2SbHNMzvWmeBKBYBEjGiEmnHZ9hJq"
				 * 	}
				 *
				 *	@type {P2pElectionMessage}
				 */
				const messageBody = this.electionCrypto.decryptMessage( param.body.message, this.#groupKey );
				this.log.silly( `${ this.constructor.name }.handleElectionMessage :: messageBody`, { messageBody } );
				if ( ! isValidP2pElectionMessage( messageBody ) )
				{
					//return reject( `${ this.constructor.name }.handleElectionMessage :: invalid param.body` );
					this.log.silly( `${ this.constructor.name }.handleElectionMessage :: invalid param.body` );
					return resolve( false );
				}

				/**
				 *    @type {string}
				 */
				const electionMessageType = messageBody.electionMessageType;

				/**
				 *    @type {string}
				 */
				const electionMessageVersion = messageBody.electionMessageVersion;

				/**
				 *    @type {string}
				 */
				const electionPeerId = messageBody.electionPeerId;

				/**
				 *    Only process messages with version numbers greater than or equal to the current node
				 */
				this.#candidatePeer.addPeer( {
					version : electionMessageVersion,
					peerId : electionPeerId
				} );
				// if ( electionMessageVersion >= this.electionMessageVersion )
				// {
				// 	/**
				// 	 * 	if the peer does not exist, add it to the set
				// 	 */
				// 	if ( ! this.#intercommunicablePeers.has( electionPeerId ) )
				// 	{
				// 		this.#intercommunicablePeers.add( electionPeerId );
				// 		this.log.silly( `${ this.constructor.name }.handleElectionMessage :: 💫 a new peer[${ electionPeerId }] join` );
				// 	}
				// }

				//	...
				this.log.debug( `${ this.constructor.name }.handleElectionMessage :: ❄️ this.#intercommunicablePeers: `, { peers : this.#candidatePeer.getIntercommunicablePeers() } );

				/**
				 *    process message
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
				else if ( P2pElectionMessageType.PING === electionMessageType )
				{
					await this.#handlePing( messageBody );
				}

				/**
				 *    check if there is an opportunity to become the leader
				 */


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
	 *    @returns { Promise<boolean> }
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
				this.log.silly( `${ this.constructor.name }.#startElection :: 🌼 Starting election...` );

				if ( this.#isElectionInProgress )
				{
					this.log.silly( `${ this.constructor.name }.#startElection :: 🐸 quit while election is in progress.` );
					return resolve( true );
				}

				/**
				 *    election is in progress
				 *    @type {boolean}
				 */
				this.#isElectionInProgress = true;

				/**
				 *    update leader status
				 */
				this.#updateLeaderStatus( {
					isLeader : false,
					leaderPeerId : null
				} );

				/**
				 *    @type { P2pElectionMessage }
				 */
				const message = P2pElectionMessageBuilder.builder()
					.setElectionMessageType( P2pElectionMessageType.ELECTION )
					.setElectionMessageVersion( this.electionMessageVersion )
					.setElectionPeerId( this.getPeerId() )
					.build();
				await this.#broadcast( message );

				/**
				 *    wait for the election result
				 *    - compare with other nodes
				 */
				if ( this.#electionWaitingResultTimer )
				{
					clearTimeout( this.#electionWaitingResultTimer );
					this.#electionWaitingResultTimer = null;
				}
				this.#electionWaitingResultTimer = setTimeout( async () =>
				{
					//	...
					await this.#calcElectionResult();

					/**
					 *    election is in progress
					 *    @type {boolean}
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
	 *    broadcast heartbeat to others from leader
	 */
	#startHeartbeat()
	{
		if ( this.#heartbeatInterval.handler )
		{
			clearInterval( this.#heartbeatInterval.handler );
			this.#heartbeatInterval.handler = null;
		}
		this.#heartbeatInterval.handler = setInterval( async () =>
		{
			if ( this.#isLeader )
			{
				//	only leader broadcast `heartbeat`
				this.log.info( `${ this.constructor.name }.#startHeartbeat :: 💜 Leader [${ this.getPeerId() }] broadcast heartbeat` );
				const message = P2pElectionMessageBuilder.builder()
					.setElectionMessageType( P2pElectionMessageType.HEARTBEAT )
					.setElectionMessageVersion( this.electionMessageVersion )
					.setElectionPeerId( this.getPeerId() )
					.build();
				await this.#broadcast( message );
			}
			else
			{
				//	member broadcast `ping`
				this.log.info( `${ this.constructor.name }.#startHeartbeat :: 🟦 Member [${ this.getPeerId() }] broadcast ping` );
				const message = P2pElectionMessageBuilder.builder()
					.setElectionMessageType( P2pElectionMessageType.PING )
					.setElectionMessageVersion( this.electionMessageVersion )
					.setElectionPeerId( this.getPeerId() )
					.build();
				await this.#broadcast( message );
			}

			/**
			 *	@type {Array<string>}
			 */
			const intercommunicablePeers = this.#candidatePeer.getIntercommunicablePeers();
			this.log.debug( `${ this.constructor.name }.#startHeartbeat :: 🎀(${ intercommunicablePeers.length }) intercommunicablePeers:`, { intercommunicablePeers } );

		}, this.#heartbeatInterval.timeout );
	}

	/**
	 *    reset leader watch dog
	 */
	#resetLeaderWatchDog()
	{
		if ( this.#leaderWatchDogTimer.handler )
		{
			clearTimeout( this.#leaderWatchDogTimer.handler );
			this.#leaderWatchDogTimer.handler = null;
		}
		this.#leaderWatchDogTimer.handler = setTimeout( async () =>
		{
			this.log.silly( `${ this.constructor.name }.#resetRestartElectionTimer :: 💔💔💔 Leader ${ this.getLeaderPeerId() } is unreachable, starting a new election...` );

			/**
			 *    update leader status
			 */
			this.#updateLeaderStatus( {
				isLeader : false,
				leaderPeerId : null
			} );

			await this.#startElection();

		}, this.#leaderWatchDogTimer.timeout );
	}

	/**
	 *    reset all hands watch dog
	 */
	#resetAllHandsWatchDog()
	{
		if ( this.#allHandsWatchDogTimer.handler )
		{
			clearTimeout( this.#allHandsWatchDogTimer.handler );
			this.#allHandsWatchDogTimer.handler = null;
		}
		this.#allHandsWatchDogTimer.handler = setTimeout( async () =>
		{
			this.log.silly( `${ this.constructor.name }.#resetAllHandsWatchDog :: 💋💋💋 no one is unreachable, set myself as the leader` );
			//this.#intercommunicablePeers.clear();

			/**
			 *    update leader status
			 */
			this.#updateLeaderStatus( {
				isLeader : true,
				leaderPeerId : this.getPeerId(),
			} );

		}, this.#allHandsWatchDogTimer.timeout );
	}


	/**
	 *    @param messageBody    {P2pElectionMessage}
	 *    @returns {Promise<boolean>}
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

				//	...
				this.log.silly( `${ this.constructor.name }.#handleElection :: 📣 messageBody:`, { messageBody } );

				/**
				 *    @type {string}
				 */
				const proposerPeerId = messageBody.electionPeerId;

				/**
				 *    compare them by their hash values
				 */
				const proposerPeerIdHash = this.electionDigest.calcHash( proposerPeerId );
				const leaderPeerIdHash = this.electionDigest.calcHash( this.getLeaderPeerId() );
				const thisPeerIdHash = this.electionDigest.calcHash( this.getPeerId() );
				let hasOpportunityToBecomeLeader = false;
				if ( this.hasLeader() )
				{
					hasOpportunityToBecomeLeader = ( thisPeerIdHash >= leaderPeerIdHash && thisPeerIdHash >= proposerPeerIdHash );
				}
				else
				{
					hasOpportunityToBecomeLeader = ( thisPeerIdHash >= proposerPeerIdHash );
				}
				if ( hasOpportunityToBecomeLeader )
				{
					//
					//	Re-start the election if this node has higher ID
					//
					//	Since the current node believes it is qualified to become the leader (because its ID is equal to or higher),
					//	it needs to initiate a new election to ensure that it can be elected as the leader.
					//
					this.log.silly( `${ this.constructor.name }.#handleElection :: 🌈 no peers have a higher peer ID than mine.` );
					this.log.silly( `${ this.constructor.name }.#handleElection :: 🌈 i believe i have the potential to become the leader.` );
					this.log.silly( `${ this.constructor.name }.#handleElection :: 🌈 try to initiate a new election` );
					await this.#startElection();
				}
				else
				{
					//
					//	If the received peerId is greater than mine,
					//	it means there is a peer in the network with a higher priority.
					//	Therefore, the current peer will choose to 'abandon' the election and wait for the peer with the higher ID to become the leader.
					//
					//	At this point, the current peer will not take any further action,
					//	only recording this information and continuing to listen for messages from other peers.
					//
					this.log.silly( `${ this.constructor.name }.#handleElection :: proposerPeer[${ proposerPeerId }] or leaderPeerId[${ this.getLeaderPeerId() }] has higher priority, yielding...` );
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
	 *    @param messageBody    {P2pElectionMessage}
	 *    @returns { Promise<boolean> }
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

				this.log.silly( `${ this.constructor.name }.#handleVictory :: messageBody: `, { messageBody } );

				/**
				 *    @type {string}
				 */
				const proposerPeerId = messageBody.electionPeerId;

				const proposerPeerIdHash = this.electionDigest.calcHash( proposerPeerId );
				const leaderPeerIdHash = this.electionDigest.calcHash( this.getLeaderPeerId() );
				const thisPeerIdHash = this.electionDigest.calcHash( this.getPeerId() );
				let canProposerBecomeNewLeader = false;
				if ( this.hasLeader() )
				{
					canProposerBecomeNewLeader = ( proposerPeerIdHash >= leaderPeerIdHash && proposerPeerIdHash >= thisPeerIdHash );
				}
				else
				{
					canProposerBecomeNewLeader = ( proposerPeerIdHash >= thisPeerIdHash );
				}
				if ( ! canProposerBecomeNewLeader )
				{
					this.log.silly( `${ this.constructor.name }.#handleVictory :: invalid proposerPeerId, proposerPeerId: `, { proposerPeerId } );
					this.log.silly( `${ this.constructor.name }.#handleVictory :: invalid proposerPeerId, leaderPeerId: `, { leaderPeerId : this.getLeaderPeerId() } );
					this.log.silly( `${ this.constructor.name }.#handleVictory :: invalid proposerPeerId, thisPeerId: `, { thisPeerId : this.getPeerId() } );
					this.log.silly( `${ this.constructor.name }.#handleVictory :: invalid proposerPeerId, ||| proposerPeerIdHash: `, { proposerPeerIdHash } );
					this.log.silly( `${ this.constructor.name }.#handleVictory :: invalid proposerPeerId, ||| leaderPeerIdHash: `, { leaderPeerIdHash } );
					this.log.silly( `${ this.constructor.name }.#handleVictory :: invalid proposerPeerId, ||| thisPeerIdHash: `, { thisPeerIdHash } );
					return reject( `${ this.constructor.name }.#handleVictory :: invalid proposerPeerId, less then mine or leader` );
				}

				/**
				 *    update leader status
				 */
				this.#updateLeaderStatus( {
					isLeader : ( proposerPeerId === this.getPeerId() ),
					leaderPeerId : proposerPeerId
				} );

				//	...
				this.log.debug( `${ this.constructor.name }.#handleVictory :: 🚦🚦🚦 yielding, this peer[${ this.getPeerId() }] is leader=${ this.isLeader() }` );
				this.log.debug( `${ this.constructor.name }.#handleVictory :: 🚦🚦🚦 yielding, ${ proposerPeerId } has been elected as the new leader` );
				resolve( true );
			}
			catch ( err )
			{
				reject( err );
			}
		} );
	}

	/**
	 *    sending by leader
	 *
	 *    @param messageBody    {P2pElectionMessage}
	 *    @returns { Promise<boolean> }
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
				if ( ! this.hasLeader() )
				{
					this.log.warn( `${ this.constructor.name }.#handleHeartbeat :: conflict: no leader found, but received leader's heartbeat` );
					return resolve( true );
				}

				//	...
				this.log.silly( `${ this.constructor.name }.#handleHeartbeat :: messageBody: `, { messageBody } );
				this.log.silly( `${ this.constructor.name }.#handleHeartbeat :: this.#peerId=${ this.getPeerId() }` );
				this.log.silly( `${ this.constructor.name }.#handleHeartbeat :: this.#isLeader=${ this.isLeader() }` );
				this.log.silly( `${ this.constructor.name }.#handleHeartbeat :: this.#leaderPeerId=${ this.getLeaderPeerId() }` );

				/**
				 *    @type {string}
				 */
				const proposerPeerId = messageBody.electionPeerId;

				const proposerPeerIdHash = this.electionDigest.calcHash( proposerPeerId );
				const leaderPeerIdHash = this.electionDigest.calcHash( this.getLeaderPeerId() );
				const thisPeerIdHash = this.electionDigest.calcHash( this.getPeerId() );

				this.log.silly( `${ this.constructor.name }.#handleHeartbeat :: ||| proposerPeerId=${ proposerPeerId }` );
				this.log.silly( `${ this.constructor.name }.#handleHeartbeat :: ||| proposerPeerIdHash=${ proposerPeerIdHash }` );
				this.log.silly( `${ this.constructor.name }.#handleHeartbeat :: ||| leaderPeerIdHash=${ leaderPeerIdHash }` );
				this.log.silly( `${ this.constructor.name }.#handleHeartbeat :: ||| thisPeerIdHash=${ thisPeerIdHash }` );

				if ( proposerPeerIdHash < leaderPeerIdHash ||
					proposerPeerIdHash < thisPeerIdHash )
				{
					this.log.warn( `${ this.constructor.name }.#handleHeartbeat :: error :: received heartbeat from a lower-level peerId` );
					return resolve( true );
				}

				//	...
				this.log.info( `${ this.constructor.name }.#handleHeartbeat :: 🩵 received heartbeat from leader: [${ proposerPeerId }]` );

				/**
				 *    First, just reset the timer of leader watch dog,
				 *    regardless of whether the heartbeat comes from yourself or the leader.
				 */
				this.#resetLeaderWatchDog();

				/**
				 *    if proposerPeerId has a higher peerId level, then temporarily consider proposerPeerId as the new leader.
				 */
				let canProposerBecomeNewLeader = false;
				if ( this.hasLeader() )
				{
					canProposerBecomeNewLeader = ( proposerPeerIdHash > leaderPeerIdHash && proposerPeerIdHash > thisPeerIdHash );
				}
				else
				{
					canProposerBecomeNewLeader = ( proposerPeerIdHash > thisPeerIdHash );
				}
				if ( canProposerBecomeNewLeader )
				{
					this.log.debug( `${ this.constructor.name }.#handleHeartbeat :: ☀️☀️☀️ proposerPeerId has a higher peerId level, accept proposerPeerId as the new leader` );
					this.#updateLeaderStatus( {
						isLeader : ( proposerPeerId === this.getPeerId() ),
						leaderPeerId : proposerPeerId,
					} );
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
	 *    sending by all hands
	 *
	 *    @param messageBody    {P2pElectionMessage}
	 *    @returns { Promise<boolean> }
	 */
	#handlePing( messageBody )
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
					return reject( `${ this.constructor.name }.#handlePing :: invalid messageBody` );
				}
				if ( P2pElectionMessageType.PING !== messageBody.electionMessageType )
				{
					return reject( `${ this.constructor.name }.#handlePing :: invalid messageBody.electionMessageType` );
				}

				//	...
				this.log.silly( `${ this.constructor.name }.#handlePing :: messageBody: `, { messageBody } );
				this.log.silly( `${ this.constructor.name }.#handlePing :: this.#peerId=${ this.getPeerId() }` );
				this.log.silly( `${ this.constructor.name }.#handlePing :: this.#isLeader=${ this.isLeader() }` );
				this.log.silly( `${ this.constructor.name }.#handlePing :: this.#leaderPeerId=${ this.getLeaderPeerId() }` );

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
	 *    @returns {Promise< PublishResult >}
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
				this.log.info( `${ this.constructor.name }.#announceVictory :: 💚💚🦄🦄🐥🐥 announce I/this peer[${ this.getPeerId() }] am/is the new leader` );

				/**
				 *    update leader status
				 */
				this.#updateLeaderStatus( {
					isLeader : true,
					leaderPeerId : this.getPeerId()
				} );

				/**
				 *    @type { P2pElectionMessage }
				 */
				const message = P2pElectionMessageBuilder.builder()
					.setElectionMessageType( P2pElectionMessageType.VICTORY )
					.setElectionMessageVersion( this.electionMessageVersion )
					.setElectionPeerId( this.getPeerId() )
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
	 *    @returns {Promise<boolean>}
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
				this.log.debug( `${ this.constructor.name }.#calcElectionResult > resultTimer :: will calc result` );
				this.log.debug( `${ this.constructor.name }.#calcElectionResult > resultTimer :: this.peerId : ${ this.getPeerId() }` );

				const connectedPeerIds = await this.#candidatePeer.queryConnectedPeersFromPeerStore();
				this.log.debug( `${ this.constructor.name }.#calcElectionResult > resultTimer :: 🐳🐳🐳 connectedPeerIds :`, connectedPeerIds );

				const intercommunicablePeers = this.#candidatePeer.getIntercommunicablePeers();
				this.log.debug( `${ this.constructor.name }.#calcElectionResult > resultTimer :: 🐡🐡🐡 intercommunicablePeers :`, { peers : intercommunicablePeers } );

				/**
				 *    Calculate the peers whose hash values are greater than the hash value of mine
				 */
				const thisPeerHash = this.electionDigest.calcHash( this.getPeerId() );
				let higherPeers = [];
				for ( const peerStr of intercommunicablePeers )
				{
					if ( ! _.isString( peerStr ) || _.isEmpty( peerStr ) )
					{
						continue;
					}

					//	...
					const peerHash = this.electionDigest.calcHash( peerStr );
					if ( peerHash > thisPeerHash )
					{
						higherPeers.push( peerStr );
					}
				}
				this.log.silly( `${ this.constructor.name }.#calcElectionResult > resultTimer :: higherPeers :`, { higherPeers } );
				if ( 0 === higherPeers.length )
				{
					this.log.silly( `${ this.constructor.name }.#calcElectionResult > resultTimer :: will announce victory` );
					await this.#announceVictory(); // No higher node, become master
				}
				else
				{
					this.log.silly( `${ this.constructor.name }.#calcElectionResult > resultTimer :: i am not the victory` );
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
	 *    #broadcast
	 *    @param message    { P2pElectionMessage }
	 *    @returns { Promise< PublishResult > }
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
					return reject( `${ this.constructor.name }.#broadcast :: invalid this.peerId(${ this.getPeerId() })` );
				}
				if ( ! this.#pClsRelayService )
				{
					return reject( `${ this.constructor.name }.#broadcast :: invalid this.pClsRelayService(${ this.#pClsRelayService })` );
				}

				/**
				 *    encrypt message
				 */
				const messageBody = { message : this.electionCrypto.encryptMessage( message, this.#groupKey ) };
				if ( ! _.isString( messageBody.message ) || _.isEmpty( messageBody.message ) )
				{
					return reject( `${ this.constructor.name }.#broadcast :: failed to encryptMessage` );
				}

				//	...
				const broadcastResult = await this.#pClsRelayService.publish( this.getElectionTopic(), messageBody );
				this.log.silly( `${ this.constructor.name }.#broadcast :: ///***///***/// broadcastResult :`, broadcastResult );

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
	 *    update leader status
	 *    @param isLeader        {boolean}
	 *    @param leaderPeerId    { string | null | undefined }
	 */
	#updateLeaderStatus( {
				     isLeader = false,
				     leaderPeerId = undefined
			     } )
	{
		/**
		 *    update leader status
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
		 *    update leader peerId
		 */
		//	update leader peerId
		this.#leaderPeerId = _.isString( leaderPeerId ) ? leaderPeerId : undefined;
		if ( ProcessUtil.isNodeEnvironment() )
		{
			process.env.P2P_RELAY_LEADER_PEER_ID = _.isString( leaderPeerId ) ? leaderPeerId : undefined;
		}

		//	...
		this.log.silly( `${ this.constructor.name }.#updateLeaderStatus :: isLeader=${ this.isLeader() }, leaderPeerId=${ String( this.getLeaderPeerId() ) }` );
	}
}
