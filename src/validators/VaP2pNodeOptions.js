import _ from "lodash";
import { PeerUtil } from "../utils/PeerUtil.js";
import { isValidP2pNodeTransports } from "../models/P2pNodeOptionsBuilder.js";


export class VaP2pNodeOptions
{
        /**
         *    @param p2pNodeOptions    {any}
         *    @returns {string | null}
         */
        static validateP2pNodeOptions( /** @type {any} */
                                       p2pNodeOptions )
        {
                if ( ! p2pNodeOptions || ! _.isObject( p2pNodeOptions ) || _.isEmpty( p2pNodeOptions ) )
                {
                        return `invalid p2pNodeOptions`;
                }
                if ( ! PeerUtil.isValidPeerId( p2pNodeOptions.peerId ) )
                {
                        return `invalid p2pNodeOptions.peerId`;
                }

                /**
                 *    @type {Uint8Array}
                 */
                if ( ! p2pNodeOptions.swarmKey )
                {
                        return `invalid p2pNodeOptions.swarmKey`;
                }

                if ( ! Array.isArray( p2pNodeOptions.listenAddresses ) )
                {
                        return `invalid p2pNodeOptions.listenAddresses`;
                }
                if ( ! Array.isArray( p2pNodeOptions.announceAddresses ) )
                {
                        return `invalid p2pNodeOptions.announceAddresses`;
                }
                if ( ! Array.isArray( p2pNodeOptions.bootstrapperAddresses ) )
                {
                        return `invalid p2pNodeOptions.bootstrapperAddresses`;
                }
                if ( ! Array.isArray( p2pNodeOptions.pubsubPeerDiscoveryTopics ) )
                {
                        return `invalid p2pNodeOptions.pubsubPeerDiscoveryTopics`;
                }
                if ( p2pNodeOptions.callbackPeerEvent &&
                        ! _.isFunction( p2pNodeOptions.callbackPeerEvent ) )
                {
                        return `invalid p2pNodeOptions.callbackPeerEvent`;
                }
                if ( ! _.isFunction( p2pNodeOptions.callbackMessage ) )
                {
                        return `invalid p2pNodeOptions.callbackMessage`;
                }
                if ( ! isValidP2pNodeTransports( p2pNodeOptions.transports ) )
                {
                        return `invalid p2pNodeOptions.transports`;
                }

                return null;
        }
}
