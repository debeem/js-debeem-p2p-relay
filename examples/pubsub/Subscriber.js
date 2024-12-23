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
						this.log.info( `${ this.constructor.name }.start :: Subscriber ******** bizPing ********` );
						return false;
					}

					//	...
					this.log.info( `${ this.constructor.name }.start :: received a new message >>>>>>>>>>>>>>>>>>>>>>>>>>>>>> :` );
					this.log.info( `${ this.constructor.name }.start :: - type :`, param.type );
					this.log.info( `${ this.constructor.name }.start :: - topic :`, param.topic );
					this.log.info( `${ this.constructor.name }.start :: - msgId :`, param.msgId );
					this.log.info( `${ this.constructor.name }.start :: - from :`, param.from ? param.from.toString() : null );
					this.log.info( `${ this.constructor.name }.start :: - sequenceNumber :`, param.sequenceNumber );
					this.log.info( `${ this.constructor.name }.start :: - body :`, param.body );
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
