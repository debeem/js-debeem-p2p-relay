import _ from "lodash";

/**
 *        @typedef  DiagnosticLogElement {object}
 *        @property timestamp {number}
 *        @property value {string}
 */

/**
 *      check if the input value is a valid DiagnosticLogElement
 *
 *      @param element          {any}
 *      @returns {boolean}
 */
export function isValidDiagnosticLogElement( element )
{
        return _.isObject( element ) &&
                _.isNumber( element.timestamp ) && element.timestamp > 0 &&
                ( _.isObject( element.value ) || _.isString( element.value ) ) &&
                ! _.isEmpty( element.value );
}


/**
 *      @class
 */
export class AbstractLogRecorder
{
        /**
         *      @param element             {DiagnosticLogElement}
         *      @returns { Promise< number > }
         */
        enqueue( element )
        {
                throw new Error( "Method not implemented." );
        }

        /**
         *      @returns { Promise< DiagnosticLogElement | null > }
         */
        dequeue()
        {
                throw new Error( "Method not implemented." );
        }

        /**
         *      @returns { Promise< DiagnosticLogElement | null > }
         */
        front()
        {
                throw new Error( "Method not implemented." );
        }

        /**
         *      @param [timestamp]      {number}
         *      @returns { Promise< DiagnosticLogElement | null > }
         */
        peek( timestamp= 0 )
        {
                throw new Error( "Method not implemented." );
        }

        /**
         *      @returns { Promise< number > }
         */
        size()
        {
                throw new Error( "Method not implemented." );
        }

        /**
         *      @param timestamp
         *      @returns { Promise<number> }
         */
        delete( timestamp )
        {
                throw new Error( "Method not implemented." );
        }

        /**
         *      @returns { Promise<number> }
         */
        clear()
        {
                throw new Error( "Method not implemented." );
        }
}
