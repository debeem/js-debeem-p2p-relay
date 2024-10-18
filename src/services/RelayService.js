import { pEvent } from "p-event";
import { LogUtil, ProcessUtil, TypeUtil } from 'debeem-utils';
import { P2pService } from "./P2pService.js";
import { PeerUtil } from "../utils/PeerUtil.js";
import { PrepareUtil } from "../utils/PrepareUtil.js";
import { logger } from "@libp2p/logger";
import _ from 'lodash';
import { P2pNodeOptionsBuilder, P2pNodeTransports } from "../models/P2pNodeOptionsBuilder.js";
import { LocalParamUtil } from "../utils/LocalParamUtil.js";
import { VaP2pRelayOptions } from "../validators/VaP2pRelayOptions.js";

const log = logger( 'debeem:RelayService' )

//enable( 'debeem:RelayService' );

/**
 *      load config from .yml
 */
import "deyml/config";
import { RelayDoctor } from "../doctor/RelayDoctor.js";

/**
 *      whether to diagnose the publishing result; log publishData
 *      @type {boolean}
 */
export const diagnosePublishingResult = ProcessUtil.getParamBooleanValue( `DIAGNOSE_PUBLISHING_RESULT`, false );



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
         *    @type {P2pService}
         */
        p2pService = null;

        /**
         *    @type {Libp2p|null}
         */
        p2pNode = null;

        /**
         *    @typedef { Object.<string, CallbackMessage> }    Subscribes
         *    @type {Subscribes}
         */
        subscribes = {};

        /**
         *    @type {number}
         *    @description timer handler
         */
        businessPingTimer = 0;

        /**
         *    @type {number}
         *    @description interval of timer
         */
        businessPingInterval = 5000;

        //	network
        networkPrinterHandler = null;
        lastAllPeers = undefined;
        lastAllSubscribers = undefined;
        lastAllTopics = undefined;

        /**
         *      @type {RelayDoctor}
         */
        relayDoctor = new RelayDoctor();


        constructor()
        {
                if ( this.p2pNode || this.p2pService )
                {
                        throw new Error( `${ this.constructor.name } :: already created` );
                }

                //	...
                this.p2pService = new P2pService();
        }

        /**
         *    @public
         *    @param p2pRelayOptions {P2pRelayOptions}
         *    @returns {Promise<Libp2p>}
         */
        async createRelay( p2pRelayOptions )
        {
                return new Promise( async (
                        resolve,
                        reject
                ) =>
                {
                        try
                        {
                                const errorP2pRelayOptions = VaP2pRelayOptions.validateP2pRelayOptions( p2pRelayOptions );
                                if ( null !== errorP2pRelayOptions )
                                {
                                        return reject( `${ this.constructor.name }.createRelay :: ${ errorP2pRelayOptions }` );
                                }

                                if ( ! ProcessUtil.isValidPortNumber( p2pRelayOptions.port ) )
                                {
                                        p2pRelayOptions.port = LocalParamUtil.getDefaultPort();
                                }

                                //	...
                                const peerIdObject = await PrepareUtil.preparePeerId( p2pRelayOptions.peerIdFilename );
                                if ( null === peerIdObject )
                                {
                                        return reject( `${ this.constructor.name }.createRelay :: failed to create/load peerId. Create a new peerId using [debeem-utils]` );
                                }

                                //	...
                                const swarmKey = await PrepareUtil.prepareSwarmKey( p2pRelayOptions.swarmKeyFilename );
                                if ( null === swarmKey )
                                {
                                        return reject( `${ this.constructor.name }.createRelay :: invalid swarm key. Create a new swarm key using [debeem-utils]` );
                                }

                                //	multiaddrs
                                console.log( `p2pRelayOptions :`, p2pRelayOptions );
                                const listenAddresses = PeerUtil.getListenAddresses( p2pRelayOptions.port );
                                LogUtil.say( `listenAddresses: ${ listenAddresses.map( ( a ) => a ) }` )

                                //	announce Addresses
                                if ( Array.isArray( p2pRelayOptions.announceAddresses ) && p2pRelayOptions.announceAddresses.length > 0 )
                                {
                                        LogUtil.say( `announceAddresses: ${ p2pRelayOptions.announceAddresses.map( ( a ) => a ) }` );
                                }

                                //	Create Relay
                                const createP2pOptions = P2pNodeOptionsBuilder.builder()
                                        .setPeerId( peerIdObject )
                                        .setSwarmKey( swarmKey )
                                        .setListenAddresses( listenAddresses )
                                        .setAnnounceAddresses( p2pRelayOptions.announceAddresses )
                                        .setBootstrapperAddresses( p2pRelayOptions.bootstrapperAddresses )
                                        .setPubsubPeerDiscoveryTopics( p2pRelayOptions.pubsubPeerDiscoveryTopics )
                                        .setCallbackMessage( ( param ) =>
                                        {
                                                this.onReceivedMessage( param );
                                        } )
                                        .setTransports( P2pNodeTransports.CIRCUIT_RELAY | P2pNodeTransports.TCP )
                                        .build();
                                LogUtil.say( `pubsubPeerDiscoveryTopics: ${ p2pRelayOptions.pubsubPeerDiscoveryTopics.map( t => t ) }` );
                                this.p2pNode = await this.p2pService.createP2pNode( createP2pOptions );
                                await this.p2pNode.start();
                                await this.startPubSub();

                                //	...
                                LogUtil.say( 'Relay Server listening on:' );
                                const multiaddrs = this.p2pNode.getMultiaddrs();
                                multiaddrs.forEach( ( ma ) =>
                                {
                                        LogUtil.say( `${ ma.toString() }` );
                                } );

                                //	begin heartbeat
                                this._beginBusinessPing();

                                //      begin doctor
                                this.relayDoctor.start();

                                //	setup stop
                                process.on( 'SIGTERM', this.stop );
                                process.on( 'SIGINT', this.stop );

                                //	...
                                resolve( this.p2pNode );
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
                LogUtil.say( 'Stopping...' )
                if ( this.p2pNode )
                {
                        this._endBusinessPing();
                        await this.p2pNode.stop();
                }

                //metricsServer && await metricsServer.close()
                process.exit( 0 );
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
                                console.error( `${ this.constructor.name } :: null param` );
                                return;
                        }
                        if ( ! ( param.topic in this.subscribes ) )
                        {
                                console.error( `${ this.constructor.name } :: topic(${ param.topic }) has no subscribers` );
                                return;
                        }
                        if ( ! _.isFunction( this.subscribes[ param.topic ] ) )
                        {
                                console.error( `${ this.constructor.name } :: handler for topic(${ param.topic }) is invalid` );
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
                        this.subscribes[ param.topic ]( param );
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
                                if ( ! this.p2pNode )
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
                                        await this.p2pNode.services.pubsub.unsubscribe( topic );
                                        await this.p2pNode.services.pubsub.subscribe( topic );
                                        this.subscribes[ topic ] = callback;
                                }
                                catch ( errSubscribe )
                                {
                                        log( `${ this.constructor.name }.subscribe :: exception : %O`, errSubscribe );
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
                                if ( ! this.p2pNode )
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
                                        await this.p2pNode.services.pubsub.unsubscribe( topic );
                                        if ( _.isObject( this.subscribes ) )
                                        {
                                                if ( this.subscribes.hasOwnProperty( topic ) )
                                                {
                                                        delete this.subscribes[ topic ];
                                                }
                                        }
                                }
                                catch ( errUnsubscribe )
                                {
                                        log( `${ this.constructor.name }.unsubscribe :: exception : %O`, errUnsubscribe );
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
                                if ( ! this.p2pNode )
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
                                        publishResult = await this.p2pNode.services.pubsub.publish( topic, pubData );

                                        //
                                        //	copy from js-libp2p-gossipsub
                                        //	gossip happens during the heartbeat
                                        //
                                        await pEvent( this.p2pNode.services.pubsub, 'gossipsub:heartbeat' );

                                        /**
                                         *      whether to diagnose the publishing result, log publishData
                                         */
                                        if ( diagnosePublishingResult )
                                        {
                                                const publishData = {
                                                        topic : topic,
                                                        pubString : pubString,
                                                };
                                                this.relayDoctor.setPublishFunction( this.p2pNode.services.pubsub.publish );
                                                this.relayDoctor.diagnosePublishResult( publishResult, publishData ).then( _res =>{} ).catch( _err => {} );
                                        }
                                }
                                catch ( errPublishing )
                                {
                                        log( `${ this.constructor.name }.publish :: exception: %O`, errPublishing );
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
                if ( ! this.p2pNode )
                {
                        throw new Error( `${ this.constructor.name }.getPeerId :: p2pNode was not created` );
                }
                return this.p2pNode.peerId;
        }

        /**
         *    @returns { PeerId[] | null }
         */
        getPeers()
        {
                if ( ! this.p2pNode )
                {
                        throw new Error( `${ this.constructor.name }.getPeers :: p2pNode was not created` );
                }

                try
                {
                        return this.p2pNode.services.pubsub.getPeers();
                }
                catch ( err )
                {
                        log( `${ this.constructor.name }.getPeers :: exception: %O`, err );
                }

                return null;
        }

        /**
         *    @param topic    { string }
         *    @returns { PeerId[] | null }
         */
        getSubscribers( topic )
        {
                if ( ! this.p2pNode )
                {
                        throw new Error( `${ this.constructor.name }.getSubscribers :: p2pNode was not created` );
                }

                try
                {
                        return this.p2pNode.services.pubsub.getSubscribers( topic );
                }
                catch ( err )
                {
                        log( `${ this.constructor.name }.getSubscribers :: exception: %O`, err );
                }

                return null;
        }

        /**
         *    Gets a list of topics the node is subscribed to.
         *    @returns { string[] }
         */
        getTopics()
        {
                if ( ! this.p2pNode )
                {
                        throw new Error( `${ this.constructor.name }.getTopics :: p2pNode was not created` );
                }

                try
                {
                        return this.p2pNode.services.pubsub.getTopics();
                }
                catch ( err )
                {
                        log( `${ this.constructor.name }.getTopics :: exception: %O`, err );
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
                                if ( ! this.p2pNode.services.pubsub.isStarted() )
                                {
                                        await this.p2pNode.services.pubsub.start();
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
                if ( this.networkPrinterHandler )
                {
                        clearInterval( this.networkPrinterHandler );
                        this.networkPrinterHandler = null;
                }

                this.networkPrinterHandler = setInterval( () =>
                {
                        const allPeers = this.getPeers();
                        const allSubscribers = this.getSubscribers( this.subTopic );
                        const allTopics = this.getTopics();

                        if ( this.compareNetworkChanging( allPeers, allSubscribers, allTopics ) )
                        {
                                this.lastAllPeers = _.cloneDeep( allPeers );
                                this.lastAllSubscribers = _.cloneDeep( allSubscribers );
                                this.lastAllTopics = _.cloneDeep( allTopics );

                                console.log( `]]]]]] ${ new Date().toLocaleString() } ]]]]]]` );
                                console.log( `]]]]]] allPeers :`, allPeers );
                                console.log( `]]]]]] allSubscribers :`, allSubscribers );
                                console.log( `]]]]]] allTopics :`, allTopics );
                        }

                }, 1000 );
        }

        compareNetworkChanging(
                allPeers,
                allSubscribers,
                allTopics
        )
        {
                if ( ! this.lastAllPeers || ! this.lastAllSubscribers || ! this.lastAllTopics )
                {
                        //	changed
                        return true;
                }
                if ( ! _.isEqualWith( this.lastAllPeers, allPeers, (
                        a,
                        b
                ) =>
                {
                        return a.toString().trim().toLowerCase() === b.toString().trim().toLowerCase();
                } ) )
                {
                        return true;
                }
                if ( ! _.isEqualWith( this.lastAllSubscribers, allSubscribers, (
                        a,
                        b
                ) =>
                {
                        return a.toString().trim().toLowerCase() === b.toString().trim().toLowerCase();
                } ) )
                        if ( ! _.isEqual( this.lastAllTopics, allTopics ) )
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
                        this.businessPingTimer = setInterval( async () =>
                        {
                                if ( ! this.p2pNode )
                                {
                                        log( `${ this.constructor.name }._beginBusinessPing :: null this.p2pNode` );
                                        return false;
                                }
                                if ( ! _.isObject( this.subscribes ) )
                                {
                                        log( `${ this.constructor.name }._beginBusinessPing :: notObject this.subscribes` );
                                        return false;
                                }

                                let topics = _.keys( this.subscribes );
                                if ( 0 === topics.length )
                                {
                                        log( `${ this.constructor.name }._beginBusinessPing :: not topic in this.subscribes` );
                                        return false;
                                }

                                for ( const topic of topics )
                                {
                                        log( `${ this.constructor.name }._beginBusinessPing :: publish bizPing to topic : ${ topic }` );
                                        //await this.p2pNode.services.pubsub.subscribe( topic );
                                        await this.publish( topic, { bizPing : new Date().getTime() } );
                                }

                        }, this.businessPingInterval );
                }
                catch ( err )
                {
                        log( `${ this.constructor.name }._beginBusinessPing :: exception: %O`, err );
                        setTimeout( () =>
                        {
                                this._beginBusinessPing();

                        }, this.businessPingInterval );
                }
        }

        /**
         *    @private
         *    @returns {void}
         */
        _endBusinessPing()
        {
                if ( this.businessPingTimer > 0 )
                {
                        clearInterval( this.businessPingTimer );
                        this.businessPingTimer = 0;
                }
        }
}
