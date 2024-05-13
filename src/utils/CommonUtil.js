/**
 * 	@class
 */
export class CommonUtil
{
	static getExtraParams( alias1, alias2 )
	{
		const params = []

		const flagIndex = process.argv.findIndex( ( e ) => e === alias1 || e === alias2 )
		const tmpEndIndex = process.argv.slice( flagIndex + 1 ).findIndex( ( e ) => e.startsWith( '--' ) )
		const endIndex = tmpEndIndex !== -1 ? tmpEndIndex : process.argv.length - flagIndex - 1

		for ( let i = flagIndex + 1; i < flagIndex + endIndex; i++ )
		{
			params.push( process.argv[ i + 1 ] )
		}

		return params
	}
}
