import { pEvent } from "p-event";
import { ProcessUtil, TypeUtil } from 'debeem-utils';
import { P2pNodeService } from "./P2pNodeService.js";
import { PeerUtil } from "../utils/PeerUtil.js";
import { PrepareUtil } from "../utils/PrepareUtil.js";
//import { logger } from "@libp2p/logger";
import _ from 'lodash';
import { P2pNodeOptionsBuilder, P2pNodeTransports } from "../models/P2pNodeOptionsBuilder.js";
import { LocalParamUtil } from "../utils/LocalParamUtil.js";
import { VaRelayOptions } from "../validators/VaRelayOptions.js";

//const log = logger( 'debeem:RelayService' )

//enable( 'debeem:RelayService' );

/**
 *      load config from .yml
 */
import "deyml/config";
import { defaultMaxQueueSize, RelayDoctor } from "../doctor/RelayDoctor.js";
import { LeaderElection } from "../election/LeaderElection.js";
import { peerIdFromString } from "@libp2p/peer-id";
import { LoggerUtil } from "../utils/LoggerUtil.js";

/**
 *      whether to diagnose the publishing result; log publishData
 *      @type {boolean}
 */
export const diagnosePublishingResult = ProcessUtil.getParamBooleanValue( `P2P_RELAY_DIAGNOSE_PUBLISHING_RESULT`, false );



/**
 *    @class
 */
export class RelayService
{
        /**
         * @typedef {import('@libp2p/interface').Libp2p} Libp2p
         *
         * @typedef {import('@libp2p/interface/peer-id').PeerId} PeerId
         * @typedef {import('@libp2p/interface/peer-id').RSAPeerId} RSAPeerId
         * @typedef {import('@libp2p/interface/peer-id').Ed25519PeerId} Ed25519PeerId
         * @typedef {import('@libp2p/interface/peer-id').Secp256k1PeerId} Secp256k1PeerId
         */


        /**
         *    @type {P2pNodeService}
         */
        #p2pNodeService = null;

        /**
         *    @type {Libp2p|null}
         */
        #p2pNode = null;

        /**
         *      @type {RelayService}
         */
        #relayServiceThis = null;

        /**
         *    @typedef { Object.<string, CallbackMessage> }    Subscribes
         *    @type {Subscribes}
         */
        #subscribes = {};

        /**
         *    @type {number}
         *    @description timer handler
         */
        #businessPingTimer = 0;

        /**
         *    @type {number}
         *    @description interval of timer
         */
        #businessPingInterval = 5000;

        //	network
        #networkPrinterHandler = null;
        #lastAllPeers = undefined;
        #lastAllSubscribers = undefined;
        #lastAllTopics = undefined;

        /**
         *      @type {RelayDoctor}
         */
        #relayDoctor = null;

        /**
         *      @type {LeaderElection}
         */
        #leaderElection = null;

        /**
         *	@type {Logger}
         */
        log = new LoggerUtil().logger;



        constructor()
        {
                if ( this.#p2pNode || this.#p2pNodeService )
                {
                        throw new Error( `${ this.constructor.name } :: already created` );
                }

                //	...
                this.#relayServiceThis = this;
                this.#p2pNodeService = new P2pNodeService();
        }

        /**
         *      @returns {Libp2p|null}
         */
        getP2pNode()
        {
                return this.#p2pNode;
        }

        /**
         *    @public
         *    @param relayOptions {RelayOptions}
         *    @returns {Promise<Libp2p>}
         */
        async createRelay( relayOptions )
        {
                return new Promise( async (
                        resolve,
                        reject
                ) =>
                {
                        try
                        {
                                if ( this.#p2pNode )
                                {
                                        return reject( `${ this.constructor.name }.createRelay :: already created` );
                                }

                                const errorRelayOptions = VaRelayOptions.validateRelayOptions( relayOptions );
                                if ( null !== errorRelayOptions )
                                {
                                        return reject( `${ this.constructor.name }.createRelay :: ${ errorRelayOptions }` );
                                }

                                if ( ! ProcessUtil.isValidPortNumber( relayOptions.port ) )
                                {
                                        relayOptions.port = LocalParamUtil.getDefaultPort();
                                }

                                //	...
                                const peerIdObject = await PrepareUtil.preparePeerId( relayOptions.peerIdFilename );
                                if ( null === peerIdObject )
                                {
                                        return reject( `${ this.constructor.name }.createRelay :: failed to create/load peerId. Create a new peerId using [debeem-utils]` );
                                }

                                //	...
                                const swarmKey = await PrepareUtil.prepareSwarmKey( relayOptions.swarmKeyFilename );
                                if ( null === swarmKey )
                                {
                                        return reject( `${ this.constructor.name }.createRelay :: invalid swarm key. Create a new swarm key using [debeem-utils]` );
                                }

                                //	multiaddrs
                                this.log.info( `${ this.constructor.name }.createRelay :: relayOptions :`, relayOptions );
                                const listenAddresses = PeerUtil.getListenAddresses( relayOptions.port );
                                //LogUtil.say( `listenAddresses: ${ listenAddresses.map( ( a ) => a ) }` )
                                this.log.info( `${ this.constructor.name }.createRelay :: ))) listenAddresses: ${ listenAddresses.map( ( a ) => a ) }` );

                                //	announce Addresses
                                if ( Array.isArray( relayOptions.announceAddresses ) && relayOptions.announceAddresses.length > 0 )
                                {
                                        //LogUtil.say( `announceAddresses: ${ relayOptions.announceAddresses.map( ( a ) => a ) }` );
                                        this.log.info( `${ this.constructor.name }.createRelay :: ))) announceAddresses: ${ relayOptions.announceAddresses.map( ( a ) => a ) }` );
                                }

                                //	Create Relay
                                const createP2pOptions = P2pNodeOptionsBuilder.builder()
                                        .setPeerId( peerIdObject )
                                        .setSwarmKey( swarmKey )
                                        .setListenAddresses( listenAddresses )
                                        .setAnnounceAddresses( relayOptions.announceAddresses )
                                        .setBootstrapperAddresses( relayOptions.bootstrapperAddresses )
                                        .setPubsubPeerDiscoveryTopics( relayOptions.pubsubPeerDiscoveryTopics )
                                        .setCallbackPeerEvent( ( event, peerId ) =>
                                        {
                                                if ( this.#leaderElection &&
                                                        _.isFunction( this.#leaderElection.handlePeerEvent ) )
                                                {
                                                        this.#leaderElection.handlePeerEvent( event, peerId );
                                                }
                                                if ( relayOptions &&
                                                        _.isFunction( relayOptions.callbackPeerEvent ) )
                                                {
                                                        relayOptions.callbackPeerEvent( event, peerId );
                                                }
                                        })
                                        .setCallbackMessage( ( param ) =>
                                        {
                                                this.onReceivedMessage( param );
                                        } )
                                        .setTransports( P2pNodeTransports.CIRCUIT_RELAY | P2pNodeTransports.TCP )
                                        .build();
                                //LogUtil.say( `pubsubPeerDiscoveryTopics: ${ relayOptions.pubsubPeerDiscoveryTopics.map( t => t ) }` );
                                this.log.info( `${ this.constructor.name }.createRelay :: ))) pubsubPeerDiscoveryTopics: ${ relayOptions.pubsubPeerDiscoveryTopics.map( t => t ) }` );
                                this.#p2pNode = await this.#p2pNodeService.createP2pNode( createP2pOptions );
                                await this.#p2pNode.start();
                                await this.startPubSub();

                                //	...
                                const multiaddrs = this.#p2pNode.getMultiaddrs();
                                const multiaddrsStrArring = multiaddrs.map( ma => ma.toString() );
                                // multiaddrs.forEach( ( ma ) =>
                                // {
                                //         LogUtil.say( `${ ma.toString() }` );
                                // } );
                                //LogUtil.say( 'Relay Server listening on:' );
                                this.log.info( `${ this.constructor.name }.createRelay :: ))) Relay Server listening on:`, multiaddrsStrArring );

                                //
                                //	begin heartbeat
                                //
                                this._beginBusinessPing();

                                //
                                //      begin leader election
                                //
                                const leaderElectionOptions = {
                                        peerId : peerIdObject.toString(),
                                        pClsRelayService : this.#relayServiceThis
                                };
                                this.#leaderElection = new LeaderElection( leaderElectionOptions );
                                await this.subscribe( this.#leaderElection.getElectionTopic(), async ( param ) =>
                                {
                                        try
                                        {
                                                await this.#leaderElection.handleElectionMessage( param );
                                        }
                                        catch ( err )
                                        {
                                                //console.error( `${ this.constructor.name }.createRelay subscribe callback :: err`, err );
                                                this.log.error( `${ this.constructor.name }.createRelay :: leaderElection.subscribe callback :: err:`, err );
                                        }
                                });
                                setTimeout( async () =>
                                {
                                        await this.#leaderElection.start();

                                }, 1000 );

                                //
                                //      begin doctor
                                //
                                const relayDoctorOptions = {
                                        maxQueueSize : defaultMaxQueueSize,
                                        peerId : peerIdObject.toString(),
                                        pClsRelayService : this.#relayServiceThis,
                                };
                                this.#relayDoctor = new RelayDoctor( relayDoctorOptions );
                                setTimeout( () =>
                                {
                                        this.#relayDoctor.start();
                                }, 1000 );


                                //
                                //	setup stop
                                //
                                process.on( 'SIGTERM', () =>
                                {
                                        this.stop();
                                });
                                process.on( 'SIGINT', () =>
                                {
                                        this.stop();
                                });

                                //	...
                                resolve( this.#p2pNode );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }

        /**
         *    @return {Promise<void>}
         */
        async stop()
        {
                //LogUtil.say( 'Stopping...' )
                this.log.info( `${ this.constructor.name }.createRelay :: ))) Stopping...` );
                if ( this.#p2pNode )
                {
                        this._endBusinessPing();
                        await this.#p2pNode.stop();
                }

                //metricsServer && await metricsServer.close()
                process.exit( 0 );
        }

        /**
         *	@returns {boolean}
         */
        isLeader()
        {
                return this.#leaderElection && this.#leaderElection.isLeader();
        }

        /**
         *	@returns { PeerId | null }
         */
        getLeaderPeerId()
        {
                try
                {
                        if ( this.#leaderElection )
                        {
                                const peerIdStr = this.#leaderElection.getLeaderPeerId();
                                return peerIdFromString( peerIdStr );
                        }
                }
                catch ( err )
                {
                }

                return null;
        }

        /**
         *    @param param    {CallbackMessageParams}
         */
        onReceivedMessage( param )
        {
                try
                {
                        if ( ! param )
                        {
                                //console.error( `${ this.constructor.name } :: null param` );
                                this.log.error( `${ this.constructor.name }.onReceivedMessage :: null param` );
                                return;
                        }
                        if ( ! ( param.topic in this.#subscribes ) )
                        {
                                //console.error( `${ this.constructor.name } :: topic(${ param.topic }) has no subscribers` );
                                this.log.error( `${ this.constructor.name }.onReceivedMessage :: topic(${ param.topic }) has no subscribers` );
                                return;
                        }
                        if ( ! _.isFunction( this.#subscribes[ param.topic ] ) )
                        {
                                //console.error( `${ this.constructor.name } :: handler for topic(${ param.topic }) is invalid` );
                                this.log.error( `${ this.constructor.name }.onReceivedMessage :: handler for topic(${ param.topic }) is invalid` );
                                return;
                        }

                        // console.doctor( `>>>>>>>>>>>>>>>>>>>> Received a message: >>>>>>>>>>>>>>>>>>>>` );
                        // console.doctor( `- type :`, param.type );
                        // console.doctor( `- topic :`, param.topic );
                        // console.doctor( `- msgId :`, param.msgId );
                        // console.doctor( `- from :`, param.from ? param.from.toString() : null );
                        // console.doctor( `- sequenceNumber :`, param.sequenceNumber );
                        // console.doctor( `- body :`, param.body );

                        //	callback
                        this.#subscribes[ param.topic ]( param );
                }
                catch ( err )
                {
                        console.error( err );
                }
        }

        /**
         *    @param topic    {string}
         *    @param callback    {CallbackMessage}
         *    @returns {Promise<boolean>}
         */
        async subscribe(
                topic,
                callback
        )
        {
                return new Promise( async (
                        resolve,
                        reject
                ) =>
                {
                        try
                        {
                                if ( ! this.#p2pNode )
                                {
                                        return reject( `${ this.constructor.name }.subscribe :: p2pNode was not created` );
                                }
                                if ( ! TypeUtil.isNotEmptyString( topic ) )
                                {
                                        return reject( `${ this.constructor.name }.subscribe :: invalid topic` );
                                }
                                if ( ! TypeUtil.isFunction( callback ) )
                                {
                                        return reject( `${ this.constructor.name }.subscribe :: invalid callback` );
                                }

                                //	...
                                try
                                {
                                        await this.startPubSub();
                                        await this.#p2pNode.services.pubsub.unsubscribe( topic );
                                        await this.#p2pNode.services.pubsub.subscribe( topic );
                                        this.#subscribes[ topic ] = callback;
                                }
                                catch ( errSubscribe )
                                {
                                        //log( `${ this.constructor.name }.subscribe :: exception : %O`, errSubscribe );
                                        this.log.error( `${ this.constructor.name }.subscribe :: exception : `, errSubscribe );
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
         *    @param topic    {string}
         *    @return {Promise<boolean>}
         */
        async unsubscribe( topic )
        {
                return new Promise( async (
                        resolve,
                        reject
                ) =>
                {
                        try
                        {
                                if ( ! this.#p2pNode )
                                {
                                        return reject( `${ this.constructor.name } :: p2pNode was not created` );
                                }
                                if ( ! TypeUtil.isNotEmptyString( topic ) )
                                {
                                        return reject( `${ this.constructor.name } :: invalid topic` );
                                }

                                try
                                {
                                        await this.startPubSub();
                                        await this.#p2pNode.services.pubsub.unsubscribe( topic );
                                        if ( _.isObject( this.#subscribes ) )
                                        {
                                                if ( this.#subscribes.hasOwnProperty( topic ) )
                                                {
                                                        delete this.#subscribes[ topic ];
                                                }
                                        }
                                }
                                catch ( errUnsubscribe )
                                {
                                        //log( `${ this.constructor.name }.unsubscribe :: exception : %O`, errUnsubscribe );
                                        this.log.error( `${ this.constructor.name }.unsubscribe :: exception : `, errUnsubscribe );
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
         *    @typedef {import('@libp2p/interface-pubsub/src')} PublishResult
         */
        /**
         *    @param topic    {string}
         *    @param data    {object|string}
         *    @returns {Promise< PublishResult | undefined >}
         */
        async publish(
                topic,
                data
        )
        {
                return new Promise( async (
                        resolve,
                        reject
                ) =>
                {
                        try
                        {
                                if ( ! this.#p2pNode )
                                {
                                        return reject( `${ this.constructor.name }.publish :: p2pNode was not created` );
                                }
                                if ( ! TypeUtil.isNotEmptyString( topic ) )
                                {
                                        return reject( `${ this.constructor.name }.publish :: invalid topic` );
                                }

                                let pubString = '';
                                if ( TypeUtil.isObject( data ) )
                                {
                                        pubString = JSON.stringify( data );
                                }
                                else if ( TypeUtil.isString( data ) )
                                {
                                        pubString = String( data );
                                }
                                else
                                {
                                        return reject( `${ this.constructor.name }.publish :: invalid data` );
                                }

                                let publishResult;
                                try
                                {
                                        await this.startPubSub();
                                        const pubData = new TextEncoder().encode( pubString );

                                        /**
                                         *      async publish (topic: TopicStr, data: Uint8Array, opts?: PublishOpts): Promise<PublishResult>
                                         *      {
                                         *              ... ...
                                         *              return {
                                         *                      recipients: Array.from(tosend.values()).map((str) => peerIdFromString(str))
                                         *              }
                                         *      }
                                         *
                                         *      @typedef {import('@libp2p/interface').PublishResult} PublishResult
                                         *      @type {Promise<PublishResult>}
                                         */
                                        publishResult = await this.#p2pNode.services.pubsub.publish( topic, pubData );

                                        //
                                        //	copy from js-libp2p-gossipsub
                                        //	gossip happens during the heartbeat
                                        //
                                        await pEvent( this.#p2pNode.services.pubsub, 'gossipsub:heartbeat' );

                                        /**
                                         *      whether to diagnose the publishing result, log publishData
                                         */
                                        if ( diagnosePublishingResult )
                                        {
                                                const publishData = {
                                                        topic : topic,
                                                        data : data,
                                                };
                                                this.#relayDoctor.diagnosePublishResult( publishResult, publishData ).then( _res =>{} ).catch( _err => {} );
                                        }
                                }
                                catch ( errPublishing )
                                {
                                        //log( `${ this.constructor.name }.publish :: exception: %O`, errPublishing );
                                        this.log.error( `${ this.constructor.name }.publish :: exception : `, errPublishing );
                                }

                                //	...
                                resolve( publishResult );
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }

        /**
         *    @returns { PeerId | undefined }
         */
        getPeerId()
        {
                if ( ! this.#p2pNode )
                {
                        throw new Error( `${ this.constructor.name }.getPeerId :: p2pNode was not created` );
                }
                return this.#p2pNode.peerId;
        }

        /**
         *    @returns { PeerId[] | null }
         */
        getPeers()
        {
                if ( ! this.#p2pNode )
                {
                        throw new Error( `${ this.constructor.name }.getPeers :: p2pNode was not created` );
                }

                try
                {
                        return this.#p2pNode.services.pubsub.getPeers();
                }
                catch ( err )
                {
                        //log( `${ this.constructor.name }.getPeers :: exception: %O`, err );
                        this.log.error( `${ this.constructor.name }.getPeers :: exception : `, err );
                }

                return null;
        }

        /**
         *    @param topic    { string }
         *    @returns { PeerId[] | null }
         */
        getSubscribers( topic )
        {
                if ( ! this.#p2pNode )
                {
                        throw new Error( `${ this.constructor.name }.getSubscribers :: p2pNode was not created` );
                }

                try
                {
                        return this.#p2pNode.services.pubsub.getSubscribers( topic );
                }
                catch ( err )
                {
                        //log( `${ this.constructor.name }.getSubscribers :: exception: %O`, err );
                        this.log.error( `${ this.constructor.name }.getSubscribers :: exception : `, err );
                }

                return null;
        }

        /**
         *    Gets a list of topics the node is subscribed to.
         *    @returns { string[] }
         */
        getTopics()
        {
                if ( ! this.#p2pNode )
                {
                        throw new Error( `${ this.constructor.name }.getTopics :: p2pNode was not created` );
                }

                try
                {
                        return this.#p2pNode.services.pubsub.getTopics();
                }
                catch ( err )
                {
                        //log( `${ this.constructor.name }.getTopics :: exception: %O`, err );
                        this.log.error( `${ this.constructor.name }.getTopics :: exception : `, err );
                }

                return null;
        }

        /**
         *    @returns {Promise<void>}
         */
        startPubSub()
        {
                return new Promise( async (
                        resolve,
                        reject
                ) =>
                {
                        try
                        {
                                if ( ! this.#p2pNode.services.pubsub.isStarted() )
                                {
                                        await this.#p2pNode.services.pubsub.start();
                                }
                                resolve();
                        }
                        catch ( err )
                        {
                                reject( err );
                        }
                } );
        }

        /**
         *    @param topic
         *    @return {{peerCount: (number), subscriberCount: (number), topicCount: (number), errors: *[]}}
         */
        checkHealth( topic )
        {
                if ( ! _.isString( topic ) || _.isEmpty( topic ) )
                {
                        throw Error( `${ this.constructor.name }.checkHealth :: invalid topic` );
                }

                const allPeers = this.getPeers();
                const peerCount = Array.isArray( allPeers ) ? allPeers.length : 0;

                const allTopics = this.getTopics();
                const topicCount = Array.isArray( allTopics ) ? allTopics.length : 0;

                const allSubscribers = this.getSubscribers( topic );
                const subscriberCount = Array.isArray( allSubscribers ) ? allSubscribers.length : 0;

                let errors = [];
                if ( 0 === peerCount )
                {
                        errors.push( `no connected peer` );
                }
                if ( 0 === topicCount )
                {
                        errors.push( `no subscribed topics` );
                }
                if ( 0 === subscriberCount )
                {
                        errors.push( `no connected subscribers` );
                }

                return {
                        peerCount : peerCount,
                        topicCount : topicCount,
                        subscriberCount : subscriberCount,
                        errors : errors.length > 0 ? errors : null,
                };
        }

        printNetworkInfo()
        {
                if ( this.#networkPrinterHandler )
                {
                        clearInterval( this.#networkPrinterHandler );
                        this.#networkPrinterHandler = null;
                }

                this.#networkPrinterHandler = setInterval( () =>
                {
                        const allPeers = this.getPeers();
                        const allSubscribers = this.getSubscribers( this.subTopic );
                        const allTopics = this.getTopics();

                        if ( this.compareNetworkChanging( allPeers, allSubscribers, allTopics ) )
                        {
                                this.#lastAllPeers = _.cloneDeep( allPeers );
                                this.#lastAllSubscribers = _.cloneDeep( allSubscribers );
                                this.#lastAllTopics = _.cloneDeep( allTopics );

                                // console.log( `]]]]]] ${ new Date().toLocaleString() } ]]]]]]` );
                                // console.log( `]]]]]] allPeers :`, allPeers );
                                // console.log( `]]]]]] allSubscribers :`, allSubscribers );
                                // console.log( `]]]]]] allTopics :`, allTopics );
                                this.log.info( `${ this.constructor.name }.printNetworkInfo :: ]]]]]] allPeers :`, allPeers );
                                this.log.info( `${ this.constructor.name }.printNetworkInfo :: ]]]]]] allSubscribers :`, allSubscribers );
                                this.log.info( `${ this.constructor.name }.printNetworkInfo :: ]]]]]] allTopics :`, allTopics );
                        }

                }, 1000 );
        }

        compareNetworkChanging(
                allPeers,
                allSubscribers,
                allTopics
        )
        {
                if ( ! this.#lastAllPeers || ! this.#lastAllSubscribers || ! this.#lastAllTopics )
                {
                        //	changed
                        return true;
                }
                if ( ! _.isEqualWith( this.#lastAllPeers, allPeers, (
                        a,
                        b
                ) =>
                {
                        return a.toString().trim().toLowerCase() === b.toString().trim().toLowerCase();
                } ) )
                {
                        return true;
                }
                if ( ! _.isEqualWith( this.#lastAllSubscribers, allSubscribers, (
                        a,
                        b
                ) =>
                {
                        return a.toString().trim().toLowerCase() === b.toString().trim().toLowerCase();
                } ) )
                        if ( ! _.isEqual( this.#lastAllTopics, allTopics ) )
                        {
                                return true;
                        }

                return false;
        }

        /**
         *    @private
         *    @returns {void}
         */
        _beginBusinessPing()
        {
                try
                {
                        this._endBusinessPing();
                        this.#businessPingTimer = setInterval( async () =>
                        {
                                if ( ! this.#p2pNode )
                                {
                                        //log( `${ this.constructor.name }._beginBusinessPing :: null this.p2pNode` );
                                        this.log.info( `${ this.constructor.name }._beginBusinessPing :: null this.p2pNode` );
                                        return false;
                                }
                                if ( ! _.isObject( this.#subscribes ) )
                                {
                                        //log( `${ this.constructor.name }._beginBusinessPing :: notObject this.subscribes` );
                                        this.log.info( `${ this.constructor.name }._beginBusinessPing :: notObject this.subscribes` );
                                        return false;
                                }

                                let topics = _.keys( this.#subscribes );
                                if ( 0 === topics.length )
                                {
                                        //log( `${ this.constructor.name }._beginBusinessPing :: not topic in this.subscribes` );
                                        this.log.info( `${ this.constructor.name }._beginBusinessPing :: not topic in this.subscribes` );
                                        return false;
                                }

                                for ( const topic of topics )
                                {
                                        //log( `${ this.constructor.name }._beginBusinessPing :: publish bizPing to topic : ${ topic }` );
                                        this.log.info( `${ this.constructor.name }._beginBusinessPing :: publish bizPing to topic : ${ topic }` );
                                        //await this.p2pNode.services.pubsub.subscribe( topic );
                                        await this.publish( topic, { bizPing : new Date().getTime() } );
                                }

                        }, this.#businessPingInterval );
                }
                catch ( err )
                {
                        //log( `${ this.constructor.name }._beginBusinessPing :: exception: %O`, err );
                        this.log.error( `${ this.constructor.name }._beginBusinessPing :: exception :`, err );
                        setTimeout( () =>
                        {
                                this._beginBusinessPing();

                        }, this.#businessPingInterval );
                }
        }

        /**
         *    @private
         *    @returns {void}
         */
        _endBusinessPing()
        {
                if ( this.#businessPingTimer > 0 )
                {
                        clearInterval( this.#businessPingTimer );
                        this.#businessPingTimer = 0;
                }
        }
}
