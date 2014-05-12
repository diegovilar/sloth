var fs = require('fs'),
    grunt = require('grunt'),
    semver = require('semver'),
    SemVer = semver.SemVer;

/**
 *
 * @param {number} from
 * @param {number} to
 * @returns {number}
 */
function randomFromInterval(from, to) {

    return Math.floor(Math.random() * (to - from + 1) + from);

}

exports = module.exports = {

    version : {

        /**
         *
         * @param {string} rawVersionString
         * @returns {SemVer}
         */
        parse : function(rawVersionString) {
            var version = semver.parse(rawVersionString);

            if (!version) {
                grunt.fatal('A versão configrada não está no padrão esperado: ' + rawVersionString);
            }

            return version;
        },

        /**
         *
         * @param {SemVer|*} version
         */
        getCacheKey : function(version) {

            var key;

            version = this.parse(version);
            key = version.toString();

            if (key.toLowerCase().indexOf('snapshot') > -1) {
                key = version.major + '.' + version.minor + '.' + version.patch + '-snapshot.';
                key += randomFromInterval(100000, 999999);
            }

            return key.toLowerCase();

        }
    }

};
