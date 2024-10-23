import _ from "lodash";
import { ProcessUtil } from "debeem-utils";


export class VaP2pRelayOptions
{
        /**
         *    @param p2pRelayOptions    {P2pRelayOptions}
         *    @returns {string | null}
         */
        static validateP2pRelayOptions( /** @type {P2pRelayOptions} */
                                       p2pRelayOptions )
        {
                if ( ! p2pRelayOptions || ! _.isObject( p2pRelayOptions ) || _.isEmpty( p2pRelayOptions ) )
                {
                        return `invalid p2pRelayOptions`;
                }

                //
                //	if the user does not specify the correct peerIdFilename,
                //	the default peerIdFilename will be used
                //
                // if ( _.isString( p2pRelayOptions.peerIdFilename ) )
                // {
                //         if ( _.isEmpty( p2pRelayOptions.peerIdFilename ) )
                //         {
                //                 return `invalid p2pRelayOptions.peerIdFilename`;
                //         }
                // }
                // if ( _.isString( p2pRelayOptions.swarmKeyFilename ) )
                // {
                //         if ( _.isEmpty( p2pRelayOptions.swarmKeyFilename ) )
                //         {
                //                 return `invalid p2pRelayOptions.swarmKeyFilename`;
                //         }
                // }

                if ( ! ProcessUtil.isValidPortNumber( p2pRelayOptions.port ) )
                {
                        return `invalid p2pRelayOptions.port`;
                }

                if ( ! Array.isArray( p2pRelayOptions.announceAddresses ) )
                {
                        return `invalid p2pRelayOptions.announceAddresses`;
                }
                if ( ! Array.isArray( p2pRelayOptions.bootstrapperAddresses ) )
                {
                        return `invalid p2pRelayOptions.bootstrapperAddresses`;
                }
                if ( ! Array.isArray( p2pRelayOptions.pubsubPeerDiscoveryTopics ) )
                {
                        return `invalid p2pRelayOptions.pubsubPeerDiscoveryTopics`;
                }

                return null;
        }
}
