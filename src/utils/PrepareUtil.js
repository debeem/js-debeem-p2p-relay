import { PeerIdService, PeerIdStorageService, SwarmKeyService, SwarmKeyStorageService } from "debeem-lib";
import { LogUtil } from "debeem-utils";

/**
 * 	@class
 */
export class PrepareUtil
{
	/**
	 * 	@param peerIdFilename	{string|null} The full path of the file that saves the peerId
	 *	@returns {Promise<PeerId|null>}
	 */
	static async preparePeerId( peerIdFilename = null )
	{
		return new Promise( async ( resolve, reject ) =>
		{
			try
			{
				const peerIdStorageService = new PeerIdStorageService();
				const filename = peerIdStorageService.getSafeFilename( peerIdFilename );
				let peerIdObject = await PeerIdService.loadPeerId( filename );
				if ( null === peerIdObject )
				{
					LogUtil.say( `try to generate a new peerId` );
					peerIdObject = await PeerIdService.flushPeerId( filename );
				}
				if ( null === peerIdObject )
				{
					return reject( `failed to load peerId` );
				}

				//	...
				const storagePeerId = peerIdStorageService.storagePeerIdFromRaw( peerIdObject );
				if ( null === storagePeerId )
				{
					return reject( `failed to load peerId from raw` );
				}

				//	...
				LogUtil.say( `peerId: ${ storagePeerId.id }, from: ${ filename }` );
				resolve( peerIdObject );
			}
			catch ( err )
			{
				reject( err );
			}
		});
	}

	/**
	 * 	@param	swarmKeyFilename	{string|null}	The full path of the file that saves the swarmKey
	 *	@returns {Promise<Uint8Array|null>}
	 */
	static async prepareSwarmKey( swarmKeyFilename = null )
	{
		return new Promise( async ( resolve, reject ) =>
		{
			try
			{
				const swarmKeyStorageService = new SwarmKeyStorageService();
				const filename = swarmKeyStorageService.getSafeFilename( swarmKeyFilename );
				let swarmKey;
				let swarmKeyObject;

				swarmKey = await SwarmKeyService.loadSwarmKey( filename );
				swarmKeyObject = swarmKeyStorageService.swarmKeyToObject( swarmKey );
				if ( null === swarmKeyObject )
				{
					return reject( `failed to load swarmKey` );
				}

				LogUtil.say( `swarm key: ${ swarmKeyObject.key }, from: ${ filename }` );
				if ( ! swarmKeyStorageService.isValidSwarmKeyObject( swarmKeyObject ) )
				{
					return reject( `invalid swarmKeyObject` );
				}

				resolve( swarmKey );
			}
			catch ( err )
			{
				reject( err );
			}
		});
	}
}
