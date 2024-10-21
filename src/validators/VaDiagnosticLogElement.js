import _ from "lodash";

/**
 *      @class
 */
export class VaDiagnosticLogElement
{
	/**
	 *    @param logElement    {DiagnosticLogElement}
	 *    @returns {string | null}
	 */
	static validateLogElement( /** @type {DiagnosticLogElement} */
				   logElement )
	{
		if ( ! logElement || ! _.isObject( logElement ) || _.isEmpty( logElement ) )
		{
			return `invalid logElement`;
		}
		if ( ! _.isObject( logElement.value ) &&
			! _.isString( logElement.value ) )
		{
			return `invalid logElement.value`;
		}
		if ( _.isEmpty( logElement.value ) )
		{
			return `empty logElement.value`;
		}

		return null;
	}

}
