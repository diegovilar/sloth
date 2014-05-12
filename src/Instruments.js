var Instruments;

(function() {
    "use strict";

    /**
     *
     * @returns {string}
     */
    function getNewId() {

        return String(Math.round(Math.random() * (999999 - 100000) + 100000));

    }

    /**
     *
     * @param msg
     */
    function defaultLogFunction(msg) {

        if (console && console.log) {
            console.log(msg);
        }

    }



    /**
     *
     * @param {string} message
     * @param {Date} [date]
     * @constructor
     */
    function HistoryEntry(message, date) {

        this._message = message != null ? String(message) : '';
        this._date = date instanceof Date ? date : new Date();

    }

    HistoryEntry.prototype.toString = function() {

        return '[' + this._date.toUTCString() + '] Loader: ' + this._message;

    };



    /**
     *
     * @param config
     * @constructor
     */
    Instruments = function(config) {

        this._pending = {};

        this._history = !config || config['history'] ? [] : null;

        this._logger = !config || !config['logger'] ? null :
            (typeof config['logger'] == 'function') ? config['logger'] : defaultLogFunction;

    };

    /**
     *
     */
    Instruments.prototype.log = function() {

        // We only proceed if something was passed and we have a logger set or at least are keeping a history
        if (!arguments.length || (!this._logger && !this._history)) {
            return;
        }

        var msg = Array.prototype.join.call(arguments, ', '),
            entry = new HistoryEntry(msg);

        if (this._history) {
            this._history.push(entry);
        }

        if (this._logger) {
            this._logger(String(entry));
        }

    };

    /**
     *
     * @param {string} target
     * @returns {Request}
     */
    Instruments.prototype.registerRequest = function(target) {

        var request;

        if (this._pending.hasOwnProperty(target)) {
            return this._pending[target];
        }

        request = new Request(this, target);
        this._pending[target] = request;

        return request;

    };

    /**
     *
     * @returns {Array.<Request>}
     */
    Instruments.prototype.getPendingRequests = function() {

        var result = [],
            file;

        for (file in this._pending) {
            if (this._pending.hasOwnProperty(file)) {
                result.push(this._pending[file]);
            }
        }

        return result;

    };



    /**
     *
     * @param instruments
     * @param target
     * @constructor
     */
    function Request(instruments, target) {

        this._instruments = instruments;

        this.id = getNewId();
        this.target = target;
        this.done = false;

    }

    Request.prototype.setDone = function() {

        if (!this.done) {
            this.done = true;
            delete this._instruments._pending[this.target];
        }

    };

})();
