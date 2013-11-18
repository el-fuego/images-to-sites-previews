module.exports = (grunt) ->

  lessSrc = [
    '{**/,}*.less',
    '!node_modules/{**/,}*'
  ]

  grunt.initConfig
    less:
      app:
        options:
          paths: ["templates", 'lib']
        files:
          # get all less files as
          # 'some.css': 'some.less'
          (->
            files = {}
            grunt.file.expand(lessSrc).forEach (path)->
              files['build/' + path.replace /(\.css)?\.less$/i, '.css'] = [path]
            files
          )()

    coffee:
      app:
        join:    true
        flatten: true
        src: [
          'scripts/app.coffee',
          '{**/,}*.coffee',
          '!Gruntfile*',
          '!node_modules/{**/,}*'
        ]
        dest: 'build/coffee.tmp.js'

    concat:
      js:
        src: [
          'lib/*.js',
          'scripts/*.js',
          'build/*.tmp.js',
          '!Gruntfile*',
          '!node_modules/{**/,}*'
        ]
        dest: 'build/app.js'
    clean:
      app:
        src: [
          'build/{**/,}*.tmp.*'
        ]

    connect:
      server:
        options:
          keepalive: true
          port: 9000,
          base: './'

    watch:
      less:
        files: [
          '{**/,}*.less'
        ]
        tasks: ['less']
      scripts:
        files: [
          '{**/,}*.{js,coffee}',
          '!Gruntfile*',
          '!{node_modules,build}/{**/,}*'
        ]
        tasks: ['js']

  grunt.loadNpmTasks 'grunt-contrib-less'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-concat'
  grunt.loadNpmTasks 'grunt-contrib-connect'
  grunt.loadNpmTasks 'grunt-contrib-clean'

  grunt.registerTask 'js', ['coffee', 'concat', 'clean']
  grunt.registerTask 'default', ['less', 'js', 'watch']