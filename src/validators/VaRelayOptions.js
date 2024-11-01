import _ from "lodash";
import { ProcessUtil } from "debeem-utils";


export class VaRelayOptions
{
        /**
         *    @param relayOptions    {RelayOptions}
         *    @returns {string | null}
         */
        static validateRelayOptions( relayOptions )
        {
                if ( ! relayOptions || ! _.isObject( relayOptions ) || _.isEmpty( relayOptions ) )
                {
                        return `invalid relayOptions`;
                }

                //
                //	if the user does not specify the correct peerIdFilename,
                //	the default peerIdFilename will be used
                //
                // if ( _.isString( relayOptions.peerIdFilename ) )
                // {
                //         if ( _.isEmpty( relayOptions.peerIdFilename ) )
                //         {
                //                 return `invalid relayOptions.peerIdFilename`;
                //         }
                // }
                // if ( _.isString( relayOptions.swarmKeyFilename ) )
                // {
                //         if ( _.isEmpty( relayOptions.swarmKeyFilename ) )
                //         {
                //                 return `invalid relayOptions.swarmKeyFilename`;
                //         }
                // }

                if ( ! ProcessUtil.isValidPortNumber( relayOptions.port ) )
                {
                        return `invalid relayOptions.port`;
                }

                if ( ! Array.isArray( relayOptions.announceAddresses ) )
                {
                        return `invalid relayOptions.announceAddresses`;
                }
                if ( ! Array.isArray( relayOptions.bootstrapperAddresses ) )
                {
                        return `invalid relayOptions.bootstrapperAddresses`;
                }
                if ( ! Array.isArray( relayOptions.pubsubPeerDiscoveryTopics ) )
                {
                        return `invalid relayOptions.pubsubPeerDiscoveryTopics`;
                }

                return null;
        }
}
