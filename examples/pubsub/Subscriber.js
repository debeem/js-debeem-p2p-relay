import { BasePubSub } from "./BasePubSub.js";
import _ from "lodash";
import { LogUtil } from "debeem-utils";


class Subscriber extends BasePubSub
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
						console.log( `Subscriber ******** bizPing ********` );
						return false;
					}

					//	...
					console.log( `received a new message >>>>>>>>>>>>>>>>>>>>>>>>>>>>>> :` );
					console.log( `- type :`, param.type );
					console.log( `- topic :`, param.topic );
					console.log( `- msgId :`, param.msgId );
					console.log( `- from :`, param.from ? param.from.toString() : null );
					console.log( `- sequenceNumber :`, param.sequenceNumber );
					console.log( `- body :`, param.body );
				});

				//	...
				resolve( true );
			}
			catch ( err )
			{
				reject( err );
			}
		});
	}
}

//	...
new Subscriber().start()
	.then( ( res ) => LogUtil.info( `res :`, res ) )
	.catch( err => { LogUtil.error( err ) } );
