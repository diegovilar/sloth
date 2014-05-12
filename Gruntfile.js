var utils = require('./build-utils');

module.exports = function (grunt) {

	var srcDir = './src',
        buildDir = './build',
        distDir = './dist',
        vendorDir = './bower_components',
        buildTime = new Date(),
        buildTimeString =  buildTime.toISOString();

    var pkg = grunt.file.readJSON('package.json');

    var version = utils.version.parse(pkg.version),
        versionString = utils.version.getCacheKey(version);

    var banner = '/*!\n' +
                 ' * <%= pkg.name %> v<%= version.versionString %> (built on <%= version.buildTime %>)\n' +
                 ' *\n' +
                 ' * <%= pkg.homepage %>\n' +
                 ' * Copyright (c) 2014 Diego Vilar\n' +
                 ' * <%= pkg.license %>\n' +
                 ' */\n';

    grunt.util.linefeed = '\n';

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        pkg: pkg,

        version : {
            version : version.version,
            versionString : versionString,
            buildTime: buildTimeString
        },

        buildDir: buildDir,
        distDir: distDir,
        srcDir: srcDir,
        vendorDir : vendorDir,

        clean: {
            build: [buildDir],
            dist: [distDir]
        },

        // Duplicate source for following building tasks
        copy: {
            build: {
                files: [{
                    expand: true,
                    cwd: '<%= srcDir %>/',
                    src: ['**'],
                    dest: '<%= buildDir %>/'
                },{
                    '<%= buildDir %>/script.js' : ['<%= vendorDir %>/script.js/dist/script.js']
                }]
            }
        },

        // Javascript compresion
        uglify: {
            options: {
                report: 'gzip',
                banner: banner
            },

            dev: {
                options: {
                    wrap: "Sloth",
                    exportAll : false,
                    sourceMap: true,
                    mangle: false,
                    compress: false,
                    beautify: true,
                    preserveComments: 'all'
                },
                files: {
                    '<%= buildDir %>/sloth.js' : [
                        '<%= buildDir %>/Instruments.js',
                        '<%= buildDir %>/Loader.js'
                    ]
                }
            },

            min: {
                options: {
                    wrap: "Sloth",
                    exportAll : false,
                    preserveComments: 'some',
                    sourceMap: true,
                    mangle: true,
                    compress: {
                        drop_console: true
                    }
                },
                files: {
                    '<%= buildDir %>/sloth.min.js' : [
                        '<%= buildDir %>/script.js',
                        '<%= buildDir %>/Instruments.js',
                        '<%= buildDir %>/Loader.js'
                    ]
                }
            }
        },

        compress: {
            dist: {
                options: {
                    archive: '<%= distDir %>/<%= pkg.name %>-<%= version.versionString %>.zip'
                },
                files: [
                    {expand: true, cwd: '<%= buildDir %>/', src: ['**']}
                ]
            }
        }
    });

    grunt.registerTask('build', [
        'clean:build',
        'copy:build',
        'uglify:dev',
        'uglify:min',
    ]);

    grunt.registerTask('dist', [
        'clean:dist',
        'build',
        'compress:dist'
    ]);

    grunt.registerTask('default', 'build');
};
