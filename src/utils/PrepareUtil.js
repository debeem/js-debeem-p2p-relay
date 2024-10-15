import { PeerIdService, PeerIdStorageService, SwarmKeyService, SwarmKeyStorageService } from "debeem-lib";
import { LogUtil, TestUtil } from "debeem-utils";

/**
 * 	@class
 */
export class PrepareUtil
{
	/**
	 * 	@param peerIdFullFilePath	{string|null} The full path of the file that saves the peerId
	 *	@returns {Promise<PeerId|null>}
	 */
	static async preparePeerId( peerIdFullFilePath = null )
	{
		return new Promise( async ( resolve, reject ) =>
		{
			try
			{
				const peerIdStorageService = new PeerIdStorageService();
				const fullFilePath = peerIdStorageService.getSafeFilename( peerIdFullFilePath );
				let rawPeerIdObject = await PeerIdService.loadPeerId( fullFilePath );
				if ( null === rawPeerIdObject )
				{
					LogUtil.say( `try to generate a new peerId` );
					rawPeerIdObject = await PeerIdService.flushPeerId( fullFilePath );
				}
				if ( null === rawPeerIdObject )
				{
					return reject( `failed to load peerId` );
				}

				//	convert raw peerId to storage peerId
				const storagePeerId = peerIdStorageService.storagePeerIdFromRaw( rawPeerIdObject );
				if ( null === storagePeerId )
				{
					return reject( `failed to load peerId from raw` );
				}

				//	...
				if ( ! TestUtil.isTestEnv() )
				{
					LogUtil.say( `peerId: ${ storagePeerId.id }, from: ${ fullFilePath }` );
				}
				resolve( rawPeerIdObject );
			}
			catch ( err )
			{
				reject( err );
			}
		});
	}

	/**
	 * 	@param	swarmKeyFullFilePath	{string|null}	The full path of the file that saves the swarmKey
	 *	@returns {Promise<Uint8Array|null>}
	 */
	static async prepareSwarmKey( swarmKeyFullFilePath = null )
	{
		return new Promise( async ( resolve, reject ) =>
		{
			try
			{
				const swarmKeyStorageService = new SwarmKeyStorageService();
				const fullFilePath = swarmKeyStorageService.getSafeFilename( swarmKeyFullFilePath );
				let swarmKey;
				let swarmKeyObject;

				swarmKey = await SwarmKeyService.loadSwarmKey( fullFilePath );
				swarmKeyObject = swarmKeyStorageService.swarmKeyToObject( swarmKey );
				if ( null === swarmKeyObject )
				{
					return reject( `failed to load swarmKey` );
				}

				if ( ! TestUtil.isTestEnv() )
				{
					LogUtil.say( `swarm key: ${ swarmKeyObject.key }, from: ${ fullFilePath }` );
				}
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
