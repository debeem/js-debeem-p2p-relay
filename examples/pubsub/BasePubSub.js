import { TimerUtil } from "debeem-utils";
import _ from "lodash";
import { RelayService } from "../../src/index.js";
import { RelayOptionsBuilder } from "../../src/index.js";
import { bootstrappers } from "../bootstrappers.js";
import { PeerUtil } from "../../src/index.js";
import { ProcessUtil } from "debeem-utils";

import "deyml/config";
import { LoggerUtil } from "../../src/utils/LoggerUtil.js";

/**
 * 	@class
 */
export class BasePubSub
{
	/**
	 *	@type {string}
	 */
	subTopic = 'sync-topic';

	/**
	 *	@type {RelayService}
	 */
	relayService = new RelayService();

	/**
	 *	@type {Libp2p}
	 */
	relayNode = null;

	/**
	 *	@type {Logger}
	 */
	log = new LoggerUtil().logger;



	async start( callback )
	{
		return new Promise( async ( resolve, reject ) =>
		{
			try
			{
				const port = ProcessUtil.getParamIntValue( `p2p_port`, undefined );
				const announceAddresses = PeerUtil.getAnnounceAddresses();
				const peerIdFilename = ProcessUtil.getParamStringValue( `peer_id`, undefined );
				const swarmKeyFilename = ProcessUtil.getParamStringValue( `swarm_key`, undefined );
				const createRelayOptions = RelayOptionsBuilder.builder()
					.setPeerIdFilename( peerIdFilename )
					.setSwarmKeyFilename( swarmKeyFilename )
					.setPort( port )
					.setAnnounceAddresses( announceAddresses )
					.setBootstrapperAddresses( bootstrappers )
					.setPubsubPeerDiscoveryTopics( [] )
					.build();
				this.log.info( `${ this.constructor.name }.start :: will createRelay with options: `, createRelayOptions );
				this.relayNode = await this.relayService.createRelay( createRelayOptions );
				await this.relayService.subscribe( this.subTopic, ( param ) =>
				{
					if ( _.isFunction( callback ) )
					{
						callback( param );
					}
				} );

				//	...
				await TimerUtil.waitForDelay( 1000 );
				//console.doctor( `${ chalk.cyan( 'Waiting for network connection to be ready ...' ) } ` );
				this.relayService.printNetworkInfo();
				// await TimerUtil.waitUntilCondition( () =>
				// {
				// 	const report = this.relayService.checkHealth( this.subTopic );
				// 	if ( report.errors )
				// 	{
				// 		//console.doctor( `[${ new Date().toLocaleString() }] ${ chalk.bgYellow( 'WAITING : ' ) }`, report );
				// 		return false;
				// 	}
				//
				// 	return true;
				// }, 1000 );
				// console.doctor( `${ chalk.bgGreen( 'Network connection is ready :)' ) } ` );

				//	...
				resolve();
			}
			catch ( err )
			{
				reject( err );
			}
		});
	}
}
