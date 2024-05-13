/**
 * 	@typedef {import('@libp2p/interface/peer-id').PeerId} PeerId
 */

/**
 *	@typedef  CallbackMessageParams {object}
 *	@property type			{string}
 *	@property topic			{string}
 *	@property msgId			{string|null}
 *	@property from			{PeerId}
 *	@property sequenceNumber	{bigint}
 *	@property data			{any}
 *	@property body			{any}
 */

/**
 *	@callback CallbackMessage
 *	@param  params		{CallbackMessageParams}
 *	@return {boolean}	- return value
 */
