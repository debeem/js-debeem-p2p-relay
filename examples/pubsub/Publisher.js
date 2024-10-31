import { BasePubSub } from "./BasePubSub.js";
import _ from "lodash";


class Publisher extends BasePubSub
{
	constructor()
	{
		super();
		this.subTopic = 'sync-socket-chat';
	}

	async start()
	{
		return new Promise( async ( resolve, reject ) =>
		{
			try
			{
				//process.env.P2P_ANNOUNCES = undefined;
				await super.start( ( param ) =>
				{
					if ( _.isObject( param.body ) &&
					     _.has( param.body, 'bizPing' ) )
					{
						//	ignore heartbeat
						//console.log( `Publisher ******** bizPing ********` );
						this.log.info( `${ this.constructor.name }.start :: Publisher ******** bizPing ********` );
						return false;
					}
				} );

				//	...
				await this.loopPublishData();

				//	...
				resolve( true );
			}
			catch ( err )
			{
				reject( err );
			}
		} );
	}

	getRandomInt( min, max )
	{
		return Math.floor( Math.random() * (
			max - min
		) + min );
	}

	async loopPublishData()
	{
		setInterval( async () =>
		{
			this.log.info( `${ this.constructor.name }.loopPublishData :: ))) will publish data` );
			// const report = this.relayService.checkHealth( this.subTopic );
			// if ( null !== report.errors )
			// {
			// 	console.doctor( `[${ new Date().toLocaleString() }] ${ chalk.bgRed( 'Network error' ) } : `, report );
			// 	return false;
			// }
			//
			// //	...
			// this.printNetworkInfo();
			const datetime = new Date().toISOString();
			const pubObject = {
				peerId : this.relayService.getPeerId() ? this.relayService.getPeerId()
					.toString() : null,
				datetime : datetime,
				message : 'hello world!',
			};
			const publishResult = await this.relayService.publish(
				this.subTopic,
				pubObject
			);
			this.log.info( `${ this.constructor.name }.loopPublishData :: publish data to topic(${ this.subTopic }): `, pubObject );
			this.log.info( `${ this.constructor.name }.loopPublishData :: publishResult: `, publishResult );

		}, 1000 );
	}
}

//	...
new Publisher().start().then( result =>
{
	console.log( `))) final result: `, result );

} ).catch( _err => console.error );
