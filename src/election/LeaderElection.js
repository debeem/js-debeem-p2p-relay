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

/**
 *	@typedef {import('@libp2p/interface-pubsub/src')} PublishResult
 */

/**
 * 	@typedef {import('@libp2p/interface')} Peer
 */


/**
 * 	@class
 *
 * 	Notice:
 *
 * 	BULLY ALGORITHM
 * 	When using the Bully Algorithm as the election algorithm,
 * 	to prevent spoofing attacks on peer IDs, we compare the hash values of the peer IDs instead of the IDs themselves.
 */
export class LeaderElection
{
	/**
	 *	@type {Map<string, string>}
	 */
	#hashCache = new Map();

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
	#groupKey = undefined;

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
	 * 	final Gossip topic with hash value of #groupKey
	 *	@type {string}
	 */
	#finalElectionTopic = undefined;

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
	#heartbeatIntervalValue = 3 * 1000;

	/**
	 * 	Timer for re-start Election
	 * 	@type { NodeJS.Timeout | null }
	 */
	#leaderWatchDogTimer = null;

	/**
	 * 	timeout for leader heartbeat response
	 *	@type {number}
	 */
	#leaderWatchDogTimerValue = 10 * 1000;


	/**
	 * 	Timer for re-start Election
	 * 	@type { NodeJS.Timeout | null }
	 */
	#allHandsWatchDogTimer = null;

	/**
	 * 	timeout for all hands heartbeat response
	 *	@type {number}
	 */
	#allHandsWatchDogTimerValue = 10 * 1000;



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
	 *	@param props	{P2pElectionOptions}
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
		this.log.debug( `${ this.constructor.name }.constructor :: 🎂🎂🎂 props.peerId=${ props.peerId }` );
		this.#peerId = props.peerId;
		this.#pClsRelayService = props.pClsRelayService;
		this.#groupKey = props.groupKey;

		if ( _.isString( props.electionMessageVersion ) &&
			! _.isEmpty( props.electionMessageVersion ) )
		{
			this.electionMessageVersion = props.electionMessageVersion;
		}
	}

	/**
	 *	@returns {string|null}
	 */
	getPeerId()
	{
		return this.#peerId;
	}

	/**
	 *	@returns {string}
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
	 *	@returns {Array<string>}
	 */
	getIntercommunicablePeers()
	{
		return Array.from( this.#intercommunicablePeers );
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
					if ( this.#intercommunicablePeers.has( peerIdStr ) )
					{
						this.log.silly( `${ this.constructor.name }.handlePeerEvent :: 🍄 will remove peer[${ peerIdStr }] from intercommunicablePeers` );
						this.#intercommunicablePeers.delete( peerIdStr );
					}

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
				this.log.silly( `${ this.constructor.name }.handleElectionMessage :: messageBody`, messageBody );
				if ( ! isValidP2pElectionMessage( messageBody ) )
				{
					//return reject( `${ this.constructor.name }.handleElectionMessage :: invalid param.body` );
					this.log.silly( `${ this.constructor.name }.handleElectionMessage :: invalid param.body` );
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
						this.log.silly( `${ this.constructor.name }.handleElectionMessage :: 💫 a new peer[${ electionPeerId }] join` );
					}
				}

				//	...
				this.log.silly( `${ this.constructor.name }.handleElectionMessage :: ❄️ this.#intercommunicablePeers: `, { peers : this.getIntercommunicablePeers() } );

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

				/**
				 * 	check if there is an opportunity to become the leader
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
				this.log.silly( `${ this.constructor.name }.#startElection :: 🌼 Starting election...` );

				if ( this.#isElectionInProgress )
				{
					this.log.silly( `${ this.constructor.name }.#startElection :: 🐸 quit while election is in progress.` );
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
					.setElectionMessageType( P2pElectionMessageType.ELECTION )
					.setElectionMessageVersion( this.electionMessageVersion )
					.setElectionPeerId( this.getPeerId() )
					.build();
				await this.#broadcast( message );

				/**
				 * 	wait for the election result
				 *	- compare with other nodes
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
				this.log.info( `${ this.constructor.name }.#startHeartbeat :: 💜 Leader ${ this.getPeerId() } broadcast heartbeat` );
				this.log.info( `${ this.constructor.name }.#startHeartbeat :: 💜 intercommunicablePeers :`, { peers : this.getIntercommunicablePeers() } );
				const message = P2pElectionMessageBuilder.builder()
					.setElectionMessageType( P2pElectionMessageType.HEARTBEAT )
					.setElectionMessageVersion( this.electionMessageVersion )
					.setElectionPeerId( this.getPeerId() )
					.build();
				await this.#broadcast( message );
			}

		}, this.#heartbeatIntervalValue );
	}

	/**
	 * 	reset leader watch dog
	 */
	#resetLeaderWatchDog()
	{
		if ( this.#leaderWatchDogTimer )
		{
			clearTimeout( this.#leaderWatchDogTimer );
			this.#leaderWatchDogTimer = null;
		}
		this.#leaderWatchDogTimer = setTimeout( async () =>
		{
			this.log.silly( `${ this.constructor.name }.#resetRestartElectionTimer :: 💔💔💔 Leader ${ this.getLeaderPeerId() } is unreachable, starting a new election...` );
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

		}, this.#leaderWatchDogTimerValue );
	}

	/**
	 * 	reset all hands watch dog
	 */
	#resetAllHandsWatchDog()
	{
		if ( this.#allHandsWatchDogTimer )
		{
			clearTimeout( this.#allHandsWatchDogTimer );
			this.#allHandsWatchDogTimer = null;
		}
		this.#allHandsWatchDogTimer = setTimeout( async () =>
		{
			this.log.silly( `${ this.constructor.name }.#resetAllHandsWatchDog :: 💋💋💋 no one is unreachable, set myself as the leader` );
			this.#intercommunicablePeers.clear();

			/**
			 * 	update leader status
			 */
			this.#updateLeaderStatus( {
				isLeader : true,
				leaderPeerId : this.getPeerId(),
			} );

		}, this.#allHandsWatchDogTimerValue );
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
				if ( ! _.isString( this.getPeerId() ) || _.isEmpty( this.getPeerId() ) )
				{
					return reject( `${ this.constructor.name }.#handleElection :: invalid this.#peerId` );
				}

				//	...
				this.log.silly( `${ this.constructor.name }.#handleElection :: 📣 messageBody: [${ JSON.stringify( messageBody ) }]` );

				/**
				 * 	@type {string}
				 */
				const proposerPeerId = messageBody.electionPeerId;

				/**
				 *	compare them by their hash values
				 */
				const proposerPeerIdHash = this.#calcPeerIdHash( proposerPeerId );
				const leaderPeerIdHash = this.#calcPeerIdHash( this.getLeaderPeerId() );
				const thisPeerIdHash = this.#calcPeerIdHash( this.getPeerId() );
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
					this.log.silly( `${ this.constructor.name }.#handleElection :: peer [${ proposerPeerId }] has higher priority, yielding...` );
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

				this.log.silly( `${ this.constructor.name }.#handleVictory :: messageBody: `, messageBody );

				/**
				 * 	@type {string}
				 */
				const proposerPeerId = messageBody.electionPeerId;

				const proposerPeerIdHash = this.#calcPeerIdHash( proposerPeerId );
				const leaderPeerIdHash = this.#calcPeerIdHash( this.getLeaderPeerId() );
				const thisPeerIdHash = this.#calcPeerIdHash( this.getPeerId() );
				if ( ( this.hasLeader() && proposerPeerIdHash < leaderPeerIdHash ) ||
					( proposerPeerIdHash < thisPeerIdHash ) )
				{
					this.log.silly( `${ this.constructor.name }.#handleVictory :: invalid proposerPeerId, proposerPeerId: ${ proposerPeerId }` );
					this.log.silly( `${ this.constructor.name }.#handleVictory :: invalid proposerPeerId, leaderPeerId: ${ this.getLeaderPeerId() }` );
					this.log.silly( `${ this.constructor.name }.#handleVictory :: invalid proposerPeerId, thisPeerId: ${ this.getPeerId() }` );
					this.log.silly( `${ this.constructor.name }.#handleVictory :: invalid proposerPeerId, ||| proposerPeerIdHash=${ proposerPeerIdHash }` );
					this.log.silly( `${ this.constructor.name }.#handleVictory :: invalid proposerPeerId, ||| leaderPeerIdHash=${ leaderPeerIdHash }` );
					this.log.silly( `${ this.constructor.name }.#handleVictory :: invalid proposerPeerId, ||| thisPeerIdHash=${ thisPeerIdHash }` );
					return reject( `${ this.constructor.name }.#handleVictory :: invalid proposerPeerId, less then mine` );
				}

				/**
				 * 	update leader status
				 */
				this.#updateLeaderStatus( {
					isLeader : ( proposerPeerId === this.getPeerId() ),
					leaderPeerId : proposerPeerId
				} );

				//	...
				this.log.debug( `${ this.constructor.name }.#handleVictory :: 🚦🚦🚦 yielding, this peer[${ this.getPeerId() }] is leader=${ this.isLeader() }` );
				this.log.debug( `${ this.constructor.name }.#handleVictory :: 🚦🚦🚦 yielding, ${ proposerPeerId } has been elected as leader` );
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
				// if ( this.hasLeader() && this.isLeader() )
				// {
				// 	this.log.warn( `${ this.constructor.name }.#handleHeartbeat :: i am leader, give up my own heartbeat processing` );
				// 	return resolve( true );
				// }

				//	...
				this.log.silly( `${ this.constructor.name }.#handleHeartbeat :: messageBody: `, messageBody );
				this.log.silly( `${ this.constructor.name }.#handleHeartbeat :: this.#peerId=${ this.getPeerId() }` );
				this.log.silly( `${ this.constructor.name }.#handleHeartbeat :: this.#isLeader=${ this.isLeader() }` );
				this.log.silly( `${ this.constructor.name }.#handleHeartbeat :: this.#leaderPeerId=${ this.getLeaderPeerId() }` );

				/**
				 * 	@type {string}
				 */
				const proposerPeerId = messageBody.electionPeerId;

				const proposerPeerIdHash = this.#calcPeerIdHash( proposerPeerId );
				const leaderPeerIdHash = this.#calcPeerIdHash( this.getLeaderPeerId() );
				const thisPeerIdHash = this.#calcPeerIdHash( this.getPeerId() );

				this.log.silly( `${ this.constructor.name }.#handleHeartbeat :: ||| proposerPeerIdHash=${ proposerPeerIdHash }` );
				this.log.silly( `${ this.constructor.name }.#handleHeartbeat :: ||| leaderPeerIdHash=${ leaderPeerIdHash }` );
				this.log.silly( `${ this.constructor.name }.#handleHeartbeat :: ||| thisPeerIdHash=${ thisPeerIdHash }` );

				const fromMyself = ( this.getPeerId() === proposerPeerId );
				let fromLeader = false;
				if ( this.hasLeader() )
				{
					if ( proposerPeerIdHash === leaderPeerIdHash )
					{
						this.log.info( `${ this.constructor.name }.#handleHeartbeat :: 🩵 received heartbeat from leader: [${ proposerPeerId }]` );
						fromLeader = true;
					}
					else if ( proposerPeerIdHash > leaderPeerIdHash )
					{
						//
						//	the peer sending the heartbeat has an ID larger than the leader peer's ID;
						//	it is simple and straightforward to accept this proposer peer as the new leader
						//
						this.log.info( `${ this.constructor.name }.#handleHeartbeat :: 🩵🏓 replace the original leader [${ this.getLeaderPeerId() }] with new peer [${ proposerPeerId }]` );
						this.#updateLeaderStatus({
							isLeader : ( proposerPeerId === this.getPeerId() ),
							leaderPeerId : proposerPeerId,
						});
						fromLeader = true;
					}
				}
				else
				{
					//
					//	there is no leader
					//	If the ID of the peer sending the heartbeat is greater than my peer's ID.
					//	just accept this peer as the new leader
					//
					if ( proposerPeerIdHash >= thisPeerIdHash )
					{
						this.log.debug( `${ this.constructor.name }.#handleHeartbeat :: ⛱️ no leader now, accept this proposer peer as the new leader` );
						this.#updateLeaderStatus({
							isLeader : ( proposerPeerId === this.getPeerId() ),
							leaderPeerId : proposerPeerId,
						});
						fromLeader = true;
					}
					// else
					// {
					// 	//
					// 	//	Since the current node believes it is qualified to become the leader (because its ID is equal to or higher),
					// 	//	it needs to initiate a new election to ensure that it can be elected as the leader.
					// 	//
					// 	this.log.debug( `${ this.constructor.name }.#handleHeartbeat :: 👠 no leader now, proposer peer does not have a higher peer ID than mine.` );
					// 	this.log.debug( `${ this.constructor.name }.#handleHeartbeat :: 👠 i believe i have the potential to become the new leader.` );
					// 	this.log.debug( `${ this.constructor.name }.#handleHeartbeat :: 👠 try to initiate a new election` );
					// 	await this.#startElection();
					// }
				}

				if ( fromLeader &&
					! fromMyself )
				{
					/**
					 * 	Reset leader watch dog if heartbeat is received from our leader
					 */
					this.log.silly( `${ this.constructor.name }.#handleHeartbeat :: 🦋 will reset leader watch dog` );
					this.#resetLeaderWatchDog();
				}

				/**
				 * 	reset all hands watch dog
				 */
				this.#resetAllHandsWatchDog();

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
	#checkOpportunityToBecomeLeader( messageBody )
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
					return reject( `${ this.constructor.name }.#checkOpportunityToBecomeLeader :: invalid messageBody` );
				}

				//	...
				this.log.silly( `${ this.constructor.name }.#checkOpportunityToBecomeLeader :: messageBody: `, messageBody );
				this.log.silly( `${ this.constructor.name }.#checkOpportunityToBecomeLeader :: this.#isLeader=${ this.isLeader() }` );
				this.log.silly( `${ this.constructor.name }.#checkOpportunityToBecomeLeader :: this.#leaderPeerId=${ this.getLeaderPeerId() }` );

				/**
				 * 	@type {string}
				 */
				const proposerPeerId = messageBody.electionPeerId;

				const proposerPeerIdHash = this.#calcPeerIdHash( proposerPeerId );
				const leaderPeerIdHash = this.#calcPeerIdHash( this.getLeaderPeerId() );
				const thisPeerIdHash = this.#calcPeerIdHash( this.getPeerId() );
				let hasOpportunity = false;
				if ( this.hasLeader() )
				{
					if ( thisPeerIdHash > leaderPeerIdHash )
					{
						//
						//	the peer sending the heartbeat has an ID larger than the leader peer's ID;
						//	it is simple and straightforward to accept this proposer peer as the new leader
						//
						this.log.silly( `${ this.constructor.name }.#checkOpportunityToBecomeLeader :: 🍠 my peerId[${ this.getPeerId() }] great then leader's peerId[${ this.getLeaderPeerId() }]` );
						hasOpportunity = true;
					}
				}
				else
				{
					//
					//	there is no leader
					//	If my peer's ID is greater than the ID of the peer sending the message.
					//
					if ( thisPeerIdHash > proposerPeerIdHash )
					{
						this.log.silly( `${ this.constructor.name }.#checkOpportunityToBecomeLeader :: ⛱️ no leader now, my peerId[${ this.getPeerId() }] great then proposer's peerId[${ proposerPeerId }]` );
						hasOpportunity = true;
					}
				}

				if ( hasOpportunity )
				{
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
				if ( ! _.isString( this.getPeerId() ) ||
					_.isEmpty( this.getPeerId() ) )
				{
					return reject( `${ this.constructor.name }.#announceVictory :: invalid this.peerId(${ this.getPeerId() })` );
				}

				//	...
				this.log.info( `${ this.constructor.name }.#announceVictory :: 💚💚🦄🦄🐥🐥 announce I/this peer[${ this.getPeerId() }] am/is the new leader` );

				/**
				 * 	update leader status
				 */
				this.#updateLeaderStatus( {
					isLeader : true,
					leaderPeerId : this.getPeerId()
				} );

				/**
				 *	@type { P2pElectionMessage }
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
				this.log.silly( `${ this.constructor.name }.#calcElectionResult > resultTimer :: will calc result` );
				this.log.silly( `${ this.constructor.name }.#calcElectionResult > resultTimer :: this.peerId : ${ this.getPeerId() }` );

				const connectedPeerIds = await this.#queryConnectedPeersFromPeerStore();
				this.log.silly( `${ this.constructor.name }.#calcElectionResult > resultTimer :: 🐳🐳🐳 connectedPeerIds :`, connectedPeerIds );
				this.log.silly( `${ this.constructor.name }.#calcElectionResult > resultTimer :: 🐡🐡🐡 intercommunicablePeers :`, { peers : this.getIntercommunicablePeers() } );

				/**
				 * 	Calculate the peers whose hash values are greater than the hash value of mine
				 */
				const thisPeerHash = this.#calcPeerIdHash( this.getPeerId() );
				let higherPeers = [];
				for ( const peerStr of this.#intercommunicablePeers )
				{
					if ( ! _.isString( peerStr ) || _.isEmpty( peerStr ) )
					{
						continue;
					}

					//	...
					const peerHash = this.#calcPeerIdHash( peerStr );
					if ( peerHash > thisPeerHash )
					{
						higherPeers.push( peerStr );
					}
				}
				this.log.silly( `${ this.constructor.name }.#calcElectionResult > resultTimer :: higherPeers :`, higherPeers );
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
					return reject( `${ this.constructor.name }.#broadcast :: invalid this.peerId(${ this.getPeerId() })` );
				}
				if ( ! this.#pClsRelayService )
				{
					return reject( `${ this.constructor.name }.#broadcast :: invalid this.pClsRelayService(${ this.#pClsRelayService })` );
				}

				const broadcastResult = await this.#pClsRelayService.publish( this.getElectionTopic(), message );
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
		this.log.silly( `${ this.constructor.name }.#updateLeaderStatus :: isLeader=${ this.isLeader() }, leaderPeerId=${ String( this.getLeaderPeerId() ) }` );
	}

	/**
	 *	@param peerIdStrA	{string}
	 *	@param peerIdStrB	{string}
	 *	@returns {number}
	 */
	#peerIdCompare( peerIdStrA, peerIdStrB )
	{
		const peerIdStrAHash = this.#calcPeerIdHash( peerIdStrA );
		const peerIdStrBHash = this.#calcPeerIdHash( peerIdStrB );
		if ( null === peerIdStrAHash )
		{
			return -1;
		}

		/**
		 * 	1	A > B
		 * 	0	A = B
		 * 	-1	A < B
		 */
		return peerIdStrAHash.localeCompare( peerIdStrBHash );
	}

	/**
	 *
	 *	@param peerIdString	{string}
	 *	@returns {string|null}
	 */
	#calcPeerIdHash( peerIdString )
	{
		if ( ! _.isString( peerIdString ) || _.isEmpty( peerIdString ) )
		{
			return null;
		}

		if ( this.#hashCache.has( peerIdString ) )
		{
			return this.#hashCache.get( peerIdString );
		}

		const hashValue = keccak256( new TextEncoder().encode( peerIdString ) );
		this.#hashCache.set( peerIdString, hashValue );
		return hashValue;
	}
}
