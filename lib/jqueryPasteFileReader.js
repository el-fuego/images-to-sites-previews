/**
 * Reads files pasted by ctrl-v
 * Type:    jQuery plugin
 * License: MIT
 * Author:  Pulyaev Y.A.
 * Site:    https://github.com/el-fuego/jQueryPasteFileReader
 *
 * Usage:
 *
 * $(window).pasteFileReader({
 *      asBinary: false,
 *      success: function (url, name) {},
 *      error:   function (event) {}
 * });
 */

(function($) {
    var clipboardParsers = {},
        defaults,
        patterns;

    defaults = {
        loadStart: $.noop,
        success: $.noop,
        loadEnd: $.noop,
        progress: $.noop,
        error: $.noop,
        asBinary: false // false will return data as URL
    };

    /**
     * IE
     */
    clipboardParsers.simply = [

        function(clipboardData, options) {

            var data = clipboardData.getData('URL') || clipboardData.getData('Text') || false;
            if (!data) {
                return false;
            }

            if (patterns.content.html.test(data)) {
                return getImagesFromHtml(data, options);
            }
            return getFilesFromText(data, options);
        }
    ];

    /**
     * Best browsers
     */
    clipboardParsers.withItems = [

        // html data
        function(type, item, clipboardData, options) {

            if (patterns.types.html.test(type)) {

                item.getAsString(function(html) {
                    return getImagesFromHtml(
                        html,
                        options
                    );
                });
            }

            return false;
        },

        // binary data
        function(type, item, clipboardData, options) {
            if (patterns.types.binary.test(type)) {
                readFile(item.getAsFile(), options);
                return true;
            }

            return false;
        },

        // path as text or URI
        function(type, item, clipboardData, options) {

            if (patterns.types.text.test(type)) {
                item.getAsString(function(data) {

                    if (!data) {
                        return false;
                    }

                    if (patterns.content.html.test(data)) {
                        getImagesFromHtml(data, options);
                    } else {
                        getFilesFromText(data, options);
                    }
                });
                return true;
            }

            return false;
        }
    ];

    /**
     * FF
     */
    clipboardParsers.withTypes = [

        // html data
        function(type, clipboardData, options) {
            if (patterns.types.html.test(type)) {
                return clipboardParsers.withoutTypes[0](clipboardData, options);
            }
            return false;
        },

        // path as text or URI
        function(type, clipboardData, options) {
            if (patterns.types.text.test(type)) {
                return clipboardParsers.withoutTypes[1](clipboardData, options);
            }
            return false;
        }
    ];

    /**
     * Old browsers
     * used for FF
     */
    clipboardParsers.withoutTypes = [

        function(clipboardData, options) {

            var data = clipboardData.getData('text/html') || false;
            if (!data) {
                return false;
            }

            return getImagesFromHtml(
                data,
                options
            );
        },

        function(clipboardData, options) {

            var data = clipboardData.getData('text/uri-list') || clipboardData.getData('text/plain') || false;
            if (!data) {
                return false;
            }

            if (patterns.content.html.test(data)) {
                return getImagesFromHtml(data, options);
            } else {
                return getFilesFromText(data, options);
            }
        }
    ];

    /**
     * Call each parser with given parameters
     * @param parserType {string}
     * @param args {Array}
     * @returns {boolean}
     */
    function callParsers(parserType, args) {

        var i = 0,
            l = clipboardParsers[parserType].length;
        for (; i < l; i++) {
            if (clipboardParsers[parserType][i].apply(this, args) === true) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get file name with exhibition from path
     * @param path {string}
     * @returns {string}
     */
    function getFileName(path) {
        var matchedName = path.match(patterns.content.fileName);
        return matchedName ? matchedName[0] : '';
    }

    /**
     * Get files patterns
     * @param data {string}
     * @param options {Object}
     * @param options.asBinary {boolean}
     * @param options.success {function}
     * @param options.error {function}
     * @return {boolean} is data found
     */
    function getFilesByPattern(data, pattern, options) {

        var mathedData,
            found = false;

        while (matchedData = pattern.exec(data)) {

            // add protocol
            if (patterns.content.localPath.test(matchedData[1]) && !patterns.content.dataImage.test(matchedData[1])) {
                matchedData[1] = 'file://' + matchedData[1];
            }

            // return URL for viewing only
            if (!options.asBinary) {
                options.success(matchedData[1], getFileName(matchedData[1]));
            } else {
                loadImageFile(matchedData[1], options);
            }
            found = true;
        }

        return found;
    }

    /**
     * Get files by paths, URLs or dataURLs
     * Used for paste files at linux
     * @param data {string}
     * @param options {Object}
     * @param options.asBinary {boolean}
     * @param options.success {function}
     * @param options.error {function}
     * @return {boolean} is data found
     */
    function getFilesFromText(data, options) {

        // global pattern must be announced as local variable
        var pathPattern = /(((https?|ftp|file):\/\/)?([a-z]:|~|([a-z0-9_\-]+\.)+[a-z0-9_\-]+)?([\\\/][^\\\/\n]+)*[\\\/][^\\\/\n]*\.(png|jpe?g|gif|tiff))/gi,
            dataImagePattern = /(data:image[^\s\n]+)/gi,
            found = false;

        found = getFilesByPattern(data, pathPattern, options) || found;
        found = getFilesByPattern(data, dataImagePattern, options) || found;

        return found;
    }

    /**
     * Get files from <img> tags
     * some image binary is copied thus
     * @param html {string}
     * @param options {Object}
     * @param options.asBinary {boolean}
     * @param options.success {function}
     * @param options.error {function}
     * @return {boolean} is data found
     */
    function getImagesFromHtml(html, options) {

        // global pattern must be announced as local variable
        var pattern = /<img[^>]+?src=(["'])([^>]+?)\1/ig,
            urlMatch,
            found = false;

        while (urlMatch = pattern.exec(html)) {
            found = getFilesFromText(urlMatch[2], options) || found;
        }

        return found;
    }

    /**
     * Create $('DIV') if global object
     * Return $(el) otherwise
     * @param el {DOM element}
     * @returns {$}
     */
    function getPasteCatcher(el) {

        var catcher = $('#pasteCatcher');

        // not a global catching
        if (['body', 'window', 'document', window, document].indexOf(el) < 0) {
            return $(el);
        }

        // cather exists
        if (catcher.length) {
            return catcher;
        }

        return $('<div>')
            .attr('id', 'pasteCatcher')
            .css({
                position: 'absolute',
                left: '100%',
                top: '100%',
                opacity: 0,
                overflow: 'hidden'
            })
            .appendTo('body');
    }

    var sortedTypes = [
        'binary',
        'html',
        'text'
    ];

    /**
     * Sort indexes by mime types
     * @param types {Array}
     * @returns {Array}
     */
    function getSortedIndexes(types) {

        var i = 0,
            l = sortedTypes.length,
            j,
            typesIndexes = [];

        for (; i < l; i++) {

            j = types.length;

            while (j--) {
                if (patterns.types[sortedTypes[i]].test(types[j])) {
                    typesIndexes.push(j);
                    break;
                }
            }
        }

        return typesIndexes;
    }

    /**
     * Read binary file (pasted raw data or from input)
     * @param options {Object}
     * @param options.success {function}
     * @param options.error {function}
     * @param options.loadStart {function}
     * @param options.loadEnd {function}
     * @param options.progress {function}
     * @param options.asBinary {boolean} call .success() with binary data or URL
     */
    $.fn.pasteFileReader = function(options) {
        options = $.extend({}, defaults, options || {});

        // bind to each element
        this.each(function() {

            var $el = getPasteCatcher(this);

            // setup paste event
            $el.attr('contentEditable', 'true');

            // need to be focused
            $(window).off('keydown.paste').on('keydown.paste', function(event) {
                // ctrl + v || cmd + v
                if ((event.ctrlKey || event.metaKey) && (event.keyCode || event.which) === 86) {
                    $el.focus();
                }
            });


            $el.bind('paste', function(event) {

                var clipboardData = event.originalEvent.clipboardData,
                    found = false,
                    i,
                    l,
                    typesIndexes,
                    file;

                if (!clipboardData) {
                    return readImagesFromCatchersHtml(options);
                }

                // IE
                // data types: URL, Text
                if (window.clipboardData) {
                    callParsers('simply', [window.clipboardData, options]);
                    return;
                }

                // FF
                // data types: binary
                // *Note: clipboardData.files[i] access is blocked at browser console, but not at code
                if (clipboardData.files && clipboardData.files.length) {
                    l = clipboardData.files.length;
                    for (i = 0; i < l && !found; i++) {
                        try {
                            readFile(clipboardData.files[i], options);
                        } catch (e) {
                            options.error(e);
                            return;
                        }
                    }
                    return;
                }

                // Some dino browser
                // data types: html, uri-list, plain
                if (!clipboardData.types) {
                    callParsers('withoutTypes', [clipboardData, options]);
                    return;
                }

                // New browser
                // Check type not at items[].type for FF capability
                // data types: binary, html, uri-list, plain
                // sort by priority for using more complex object
                typesIndexes = getSortedIndexes(clipboardData.types);
                l = typesIndexes.length;
                for (i = 0; i < l && !found; i++) {

                    // FF
                    if (!clipboardData.items) {
                        found = callParsers('withTypes', [
                            clipboardData.types[typesIndexes[i]],
                            clipboardData,
                            options
                        ]);
                    } else {
                        // Best browsers
                        found = callParsers('withItems', [
                            clipboardData.types[typesIndexes[i]],
                            clipboardData.items[typesIndexes[i]],
                            clipboardData,
                            options
                        ]);
                    }
                }
                if (found) {
                    event.stopPropagation();
                    event.preventDefault();
                } else {
                    readImagesFromCatchersHtml(options);
                }
            });
        });
    }

    /**
     * Try to load image by path or URL
     * local images is unreadable
     * @param path {string}
     * @param options {Object}
     * @param options.success {function}
     * @param options.error {function}
     */
    function loadImageFile(path, options) {

        var img = new Image();
        img.src = path;
        img.onload = function() {

            // Create an empty canvas element
            var canvas = document.createElement("canvas"),
                ctx;
            canvas.width = this.width;
            canvas.height = this.height;

            // Copy the image contents to the canvas
            ctx = canvas.getContext("2d");
            ctx.drawImage(this, 0, 0);

            try {
                // crossDomain is blocked
                options.success(
                    ctx.getImageData(0, 0, canvas.width, canvas.height),
                    getFileName(this.src)
                );
            } catch (e) {
                options.error();
                return;
            }
        }
        img.onerror = options.error;
    }

    patterns = {
        types: {
            binary: /^image\/|file/i,
            html: /^text\/html/i,
            text: /^text\/(plain|uri)/i
        },

        content: {
            path: /((https?|ftp|file):\/\/)?([a-z]:|~|([a-z0-9_\-]+\.)+[a-z0-9_\-]+)?([\\\/][^\\\/]+)*[\\\/][^\\\/]*\.[a-z0-9]+/i,
            dataImage: /^data:image/i,
            fileName: /([^\\\/]+)$/i,
            html: /<img+[^>]*>/i,
            localPath: /^([\/~]|\\[^\\]|[a-z]:)/i
        }
    }

    /**
     * Read binary file (pasted raw data or from input)
     * @param file {File}
     * @param options {Object}
     * @param options.success {function}
     * @param options.error {function}
     * @param options.loadStart {function}
     * @param options.loadEnd {function}
     * @param options.progress {function}
     * @param options.asBinary {boolean} call .success() with binary data or URL
     */
    function readFile(file, options) {

        var reader = new FileReader();
        reader.onload = function(e) {
            options.success(this.result || e.target.result, getFileName(file.name || ''));
        };
        reader.onerror = options.error;
        reader.onloadstart = options.loadStart;
        reader.onloadend = options.loadEnd;
        reader.onprogress = options.progress;
        try {
            reader[options.asBinary ? 'readAsBinaryString' : 'readAsDataURL'](file);
        } catch (e) {
            options.error(e);
        }
    }

    /**
     * Read html of pasteCatcher and get images
     * @param options {Object}
     * @param options.success {function}
     * @param options.error {function}
     * @param options.loadStart {function}
     * @param options.loadEnd {function}
     * @param options.progress {function}
     * @param options.asBinary {boolean} call .success() with binary data or URL
     */
    function readImagesFromCatchersHtml(options) {

        setTimeout(function() {
            var html = $('#pasteCatcher').html();

            if (!html) {
                return;
            }

            if (patterns.content.html.test(html)) {
                getImagesFromHtml(html, options);
            } else {
                getFilesFromText(html, options);
            }

            $('#pasteCatcher').html('');
        }, 100);
    }
})(jQuery);
