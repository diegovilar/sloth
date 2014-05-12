(function() {
    "use strict";

    var $script = window.$script,
        reJsUrl = /.+\.js($|\?.*$)/i,
        reCssUrl = /.+\.css($|\?.*$)/i,
        reAbsoluteUrl = /^[a-z]*:\/\/.+/i;
    //doc = document;


    // region << Helpers >>
    /*function noop() {
     }*/

    function isArray(value) {
        return value instanceof Array;
    }

    /*function toArray(args) {
     return [].slice.call(args, 0);
     }*/

    function isJsUrl(path) {
        return reJsUrl.test(path);
    }

    function isCssUrl(path) {
        return reCssUrl.test(path);
    }

    // TODO
    function absolutePath(path) {

        /*if (!reAbsoluteUrl.test(path)) {

         }*/

        return path;
    }

    function getNewId() {
        return String(Math.round(Math.random() * (999999 - 100000) + 100000));
    }
    // endregion << Helpers >>



    // Loader //////////////////////////////////////////////////////////////////////////////////////////////////////////
    var State = {
        REGISTERED: 'REGISTERED',
        LOADING: 'LOADING',
        LOADED: 'LOADED',
        CHECKED: 'CHECKED'
    };

    var TargetType = {
        SCRIPT: 'SCRIPT',
        STYLESHEET : 'STYLESHEET',
        ALIAS : 'ALIAS',
        CHECKPOINT : 'CHECKPOINT'
    };

    /**
     *
     * @param [config]
     * @constructor
     */
    var Loader = function(config) {

        this.paths = {};

        this._scripts = {};
        this._stylesheets = {};
        this._aliases = {};
        this._checkpoints = {};
        this._history = [];

        this.instruments = new Instruments(config);

    };

    Loader.prototype = {

        _translatePath : function(path) {

            var paths = this.paths || {};

            if (paths) {
                var aliasPath;
                for (aliasPath in paths) {
                    if (paths.hasOwnProperty(aliasPath)) {
                        if (path.indexOf(aliasPath) == 0) {
                            path = path.replace(aliasPath, paths[aliasPath]);
                            break;
                        }
                    }
                }
            }

            return path;

        },

        /**
         * @param {String} target
         * @return {Target}
         */
        _resolveTarget : function(targetName) {

            var target = null,
                aux;

            // alias
            if (aux = this._getAlias(targetName)) {
                target = {
                    type : TargetType.ALIAS,
                    value : aux
                };
            }

            // checkpoint
            else if (aux = this._getCheckpoint(targetName)) {
                target = {
                    type : TargetType.CHECKPOINT,
                    value : aux
                };
            }

            // script
            else if ((aux = this._getScript(targetName) || (isJsUrl(targetName) && (aux = this._getScript(absolutePath(targetName)))))) {
                target = {
                    type : TargetType.SCRIPT,
                    value : aux
                };
            }

            // stylesheet
            else if ((aux = this._getStylesheet(targetName) || (isCssUrl(targetName) && (aux = this._getStylesheet(absolutePath(targetName)))))) {
                target = {
                    type : TargetType.STYLESHEET,
                    value : aux
                };
            }

            return target;
        },

        check : function (name) {

            var checkpoint = this._getCheckpoint(name);

            if (!checkpoint) {
                throw new Error('There is no checkpoint named "' + name + '".');
            }

            this._check(checkpoint);

            return this;

        },

        _check : function (checkpoint, callback) {

            var _callback;

            // Já foi carregado? Chama o callback, se for o caso
            if (checkpoint.state === State.CHECKED) {
                callback && setTimeout(callback, 0);
            }
            else {
                checkpoint.state = State.CHECKED;

                this.instruments.log('  Checkpoint ' + checkpoint.name + ' checked');

                // Registra o callback, se for o caso
                callback && checkpoint.callbacks.push(callback);

                while (_callback = checkpoint.callbacks.shift()) {
                    setTimeout(_callback, 0);
                }
            }

        },

        /**
         * @param {String} path
         * @return {Script}
         */
        _registerScript : function(path) {

            path = absolutePath(path);

            var script = this._getScript(path);

            if (!script) {
                script = this._scripts[path] = {
                    path : path,
                    state : State.REGISTERED,
                    callbacks : []
                };
            }

            return script;

        },

        /**
         * @param {String} path
         * @return {Stylesheet}
         */
        _registerStylesheet : function(path) {

            path = absolutePath(path);

            var stylesheet = this._getStylesheet(path);

            if (!stylesheet) {
                stylesheet = this._stylesheets[path] = {
                    path : path,
                    state : State.REGISTERED,
                    callbacks : []
                };
            }

            return stylesheet;

        },

        /**
         * @param {String} name
         * @param {ResolvedTargets} targets
         * @return {Alias}
         */
        _registerAlias : function(name, targets) {

            var _alias = this._getAlias(name);

            if (!_alias) {
                _alias = this._aliases[name] = {
                    name : name,
                    targets : targets
                };
            }

            return _alias;

        },

        _getScript : function(path) {

            path = absolutePath(path);
            return this._scripts.hasOwnProperty(path) ? this._scripts[path] : null;

        },

        _getStylesheet : function(path) {

            path = absolutePath(path);
            return this._stylesheets.hasOwnProperty(path) ? this._stylesheets[path] : null;

        },

        _getAlias : function(alias) {

            return this._aliases.hasOwnProperty(alias) ? this._aliases[alias] : null;

        },

        _getCheckpoint : function(checkpoint) {

            return this._checkpoints.hasOwnProperty(checkpoint) ? this._checkpoints[checkpoint] : null;

        },

        /**
         * @param {String|Array<String>} targets
         * @param {String} alias
         */
        createAlias : function(targets, name) {

            if (this._getCheckpoint(name)) {
                throw new Error('Could not register "' + name + '" as an alias because there is already a checkpoint with that name.');
            }

            if (this._getAlias(name)) {
                throw new Error('There is already an alias named "' + name + '".');
            }

            this._registerTargets(targets, name);

            return this;

        },

        createCheckpoint : function(name) {

            if (this._getAlias(name)) {
                throw new Error('Could not register "' + name + '" as a checkpoint because there is already an alias with that name.');
            }

            if (this._getCheckpoint(name)) {
                throw new Error('There is already an alias named "' + name + '".');
            }

            this._checkpoints[name] = {
                name : name,
                state : State.REGISTERED,
                callbacks : []
            };

            return this;

        },

        /**
         * @param {String|Array<String>} targets
         * @param {String} [alias]
         * @return {Array<Script>}
         */
        _registerTargets : function(targets, alias) {

            var i,
                k,
                aux,
                target,
                resolvedTarget,
                result = null;

            // TODO validar/normalizar argumentos
            targets = isArray(targets) ? targets : [targets];

            for (i = 0; i < targets.length; i++) {
                target = targets[i];
                resolvedTarget = this._resolveTarget(target);

                // Alias ou checkpoints tem que ser registrados previamente.
                // Se não resolveu, tem que ser um script ou stylesheet, e ai o registramos.
                if (!resolvedTarget) {
                    if (isJsUrl(target)) {
                        resolvedTarget = {
                            type : TargetType.SCRIPT,
                            value : this._registerScript(this._translatePath(target))
                        };
                    }
                    else if (isCssUrl(target)) {
                        resolvedTarget = {
                            type : TargetType.STYLESHEET,
                            value : this._registerStylesheet(this._translatePath(target))
                        };
                    }
                    else {
                        // TODO Permitir uso de checkpoints e aliases ainda não registrados
                        throw new Error('Loader: The name "' + target + '" is not a registered alias or checkpoint and is not a valid script or stylesheet URL.');
                    }
                }

                if (!result) {
                    result = {
                        scripts : [],
                        stylesheets : [],
                        checkpoints : []
                    };
                }

                switch (resolvedTarget.type) {
                    case TargetType.SCRIPT:
                        result.scripts.push(resolvedTarget.value);
                        break;
                    case TargetType.STYLESHEET:
                        result.stylesheets.push(resolvedTarget.value);
                        break;
                    case TargetType.CHECKPOINT:
                        result.checkpoints.push(resolvedTarget.value);
                        break;
                    case TargetType.ALIAS:
                        aux = resolvedTarget.value;

                        for (k = 0; k < aux.targets.scripts.length; k++) {
                            result.scripts.push(aux.targets.scripts[k]);
                        }

                        for (k = 0; k < aux.targets.stylesheets.length; k++) {
                            result.stylesheets.push(aux.targets.stylesheets[k]);
                        }

                        for (k = 0; k < aux.targets.checkpoints.length; k++) {
                            result.checkpoints.push(aux.targets.checkpoints[k]);
                        }
                        break;
                }
            }

            // Se estiver registrando alias
            if (alias) {
                this._registerAlias(alias, result);
            }

            return result;
        },

        /**
         * @param {String|Array<String>} targets
         * @param {String|Function} [aliasOrCallback]
         * @param {Function} [callback]
         */
        load : function(targets, aliasOrCallback, callback) {

            var alias,
                resolvedTargets,
                waiting,
                i,
                checkpoint;

            // 1 ou 2 argumentos
            if (callback == null) {
                if (typeof(aliasOrCallback) == 'function') {
                    callback = aliasOrCallback;
                }
                else if (aliasOrCallback != null) {
                    alias = aliasOrCallback;
                }
            }
            // 3 argumentos
            else {
                alias = aliasOrCallback;
            }

            resolvedTargets = this._registerTargets(targets, alias);

            var id = getNewId();
            this.instruments.log('[' + id + '] Loading targets: ' + targets + '...');

            waiting = resolvedTargets.scripts.length + resolvedTargets.stylesheets.length + resolvedTargets.checkpoints.length;

            var self = this;
            function _callback() {
                if (!--waiting) {
                    self.instruments.log('[' + id + '] Loaded');
                    callback();
                }
            }

            if (callback) {
                for (i = 0; i < resolvedTargets.checkpoints.length; i++) {
                    this._waitCheckpoint(resolvedTargets.checkpoints[i], callback ? _callback : null);
                }
            }

            for (i = 0; i < resolvedTargets.scripts.length; i++) {
                this._loadScript(resolvedTargets.scripts[i], callback ? _callback : null);
            }

            for (i = 0; i < resolvedTargets.stylesheets.length; i++) {
                this._loadStylesheet(resolvedTargets.stylesheets[i], callback ? _callback : null);
            }

            return this;

        },

        _waitCheckpoint : function(checkpoint, callback) {

            var requestInstrument;

            if (checkpoint.state === State.CHECKED) {
                this.instruments.log('  Checkpoint ' + checkpoint.name + ' already checked');
                callback && setTimeout(callback, 0);
            }
            else {
                requestInstrument = this.instruments.registerRequest(checkpoint.name);

                checkpoint.callbacks.push(function() {
                    requestInstrument.setDone();
                    setTimeout(callback, 0);
                });
            }

        },

        /**
         * @param {Script} script
         * @param {Function} [callback]
         */
        _loadScript : function(script, callback) {

            var self = this,
                requestInstrument;

            // Já foi carregado? Chama o callback, se for o caso
            if (script.state === State.LOADED) {
                //self.instruments.log('  Script ' + script.path + ' already loaded');
                callback && setTimeout(callback, 0);
            }
            else {
                // Registra o callback, se for o caso
                callback && script.callbacks.push(callback);

                // Se não tiver em processo de carregamento, passa a estar
                if (script.state === State.REGISTERED) {
                    script.state = State.LOADING;

                    //self.instruments.log('  Loading script ' + script.path + '...');
                    requestInstrument = self.instruments.registerRequest(script.path);

                    $script.get(script.path, function() {
                        var _callback;

                        //self.instruments.log('  Script ' + script.path + ' loaded');
                        requestInstrument.setDone();

                        script.state = State.LOADED;
                        while (_callback = script.callbacks.shift()) {
                            setTimeout(_callback, 0);
                        }
                    });
                }
            }

        },

        /**
         * @param {Stylesheet} stylesheet
         * @param {Function} [callback]
         */
        _loadStylesheet : function(stylesheet, callback) {

            var self = this,
                requestInstrument;

            // Já foi carregado? Chama o callback, se for o caso
            if (stylesheet.state === State.LOADED) {
                //self.instruments.log('  Stylesheet ' + stylesheet.path + ' already loaded');
                callback && setTimeout(callback, 0);
            }
            else {
                // Registra o callback, se for o caso
                callback && stylesheet.callbacks.push(callback);

                // Se não tiver em processo de carregamento, passa a estar
                if (stylesheet.state === State.REGISTERED) {
                    stylesheet.state = State.LOADING;

                    //self.instruments.log('  Loading stylesheet ' + stylesheet.path + '...');
                    requestInstrument = self.instruments.registerRequest(stylesheet.path);

                    $stylesheet.get(stylesheet.path, function() {
                        var _callback;

                        //self.instruments.log('  Stylesheet ' + stylesheet.path + ' loaded');
                        requestInstrument.setDone();

                        stylesheet.state = State.LOADED;
                        while (_callback = stylesheet.callbacks.shift()) {
                            setTimeout(_callback, 0);
                        }
                    });
                }
            }

        }

    };


    var $stylesheet = {

        /**
         *
         * @param {string} stylesheetUrl
         * @param {function} [callback]
         */
        get : function(stylesheetUrl, callback) {

            var head = document.getElementsByTagName('head')[0],
                link = document.createElement('link');

            link.type = "text/css";
            link.rel = "stylesheet";
            link.href = stylesheetUrl;

            // Android Browser 2.3.3 não notifica, então optamos por checar manualmente
            var docStyles = document.styleSheets;
            var cssnum = docStyles.length;
            var ti = setInterval(function() {
                //if (!loaded) {
                for (var i = cssnum; i < docStyles.length; i++) {
                    if (!docStyles[i] || !docStyles[i].href || docStyles[i].href.indexOf(stylesheetUrl) == -1) {
                        continue;
                    }
                    clearInterval(ti);
                    //loaded = true;
                    callback();
                    break;
                }
                /*}
                 else {
                 clearInterval(ti);
                 }*/
            }, 10);

            /*var loaded = false;
             link.onload = function() {
             if (!loaded) {
             console.log('1');
             loaded = true;
             callback();
             }
             };*/

            /*link.addEventListener('load', function() {
             if (!loaded) {
             loaded = true;
             callback();
             }
             }, false);*/

            /*link.onreadystatechange = function() {
             var state = link.readyState;
             if (state === 'loaded' || state === 'complete') {
             link.onreadystatechange = null;
             callback();
             }
             };*/

            head.appendChild(link);

        }
    };

    global.Sloth = new Loader();

})();
