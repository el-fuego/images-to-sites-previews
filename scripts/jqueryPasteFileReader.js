/**
 * Reads files pasted by ctrl-v
 * Supports images only for a now
 * Type:    jQuery plugin
 * License: MIT
 * Author:  Pulyaev Y.A.
 * Site:    https://github.com/el-fuego/images-to-sites-previews
 *
 * Usage:
 *
 * $(window).pasteFileReader({
 *      asBinary: false,
 *      success: function (url, name) {},
 *      error:   function (event) {}
 * });
 */
(function ($) {

    var defaults = {
            loadStart: $.noop,
            success:   $.noop,
            loadEnd:   $.noop,
            progress:  $.noop,
            error:     $.noop,
            asBinary:  false // false will return data as URL
        },

        patterns = {
            types: {
                binary: /^image\//i,
                html:   /^text\/html/i,
                text:   /^text\/(plain|uri)/i
            },
            content: {
                path:      /((https?|ftp|file):\/\/)?([\\\/][^\\\/])*[\\\/][^\\\/].[a-z0-9]+/i,
                image:     /\.(png|gif|jpe?g|tiff)$/i,
                fileName:  /([^\\\/]+)$/i,
                html:      /<[a-z]+[^>]*>/i,
                localPath: /^([\/~]|\\[^\\]|[a-z]:)/i
            }
        },

        // firefox supports contentEditable elements only
        needContentEditable = !(/chrome/i).test(navigator.userAgent),

        clipboardParsers = {

            /**
             * IE
             */
            simply: [
                function (clipboardData, options) {

                    var data = clipboardData.getData('URL') || clipboardData.getData('Text') || false;
                    if (!data) {return false;}

                    if (patterns.content.html.test(data)) {
                        getImagesFromHtml(data, options);
                    } else {
                        getFilesByPaths(data, options);
                    }
                    return true;
                }
            ],

            /**
             * Old browsers
             * used for FF
             */
            withoutTypes: [
                function (clipboardData, options) {

                    var data = clipboardData.getData('text/html') || false;
                    if (!data) {return false;}

                    getImagesFromHtml(
                        data,
                        options
                    );
                    return true;
                },
                function (clipboardData, options) {

                    var data =clipboardData.getData('text/uri-list') || clipboardData.getData('text/plain') || false;
                    if (!data) {return false;}

                    if (patterns.content.html.test(data)) {
                        getImagesFromHtml(data, options);
                    } else {
                        getFilesByPaths(data, options);
                    }
                    return true;
                }
            ],

            /**
             * FF
             */
            withTypes: [

                // html data
                function (type, clipboardData, options) {
                    if (patterns.types.html.test(type)) {
                        return clipboardParsers.withoutTypes[0](clipboardData, options);
                    }
                    return false;
                },

                // path as text or URI
                function (type, clipboardData, options) {
                    if (patterns.types.text.test(type)) {
                        return clipboardParsers.withoutTypes[1](clipboardData, options);
                    }

                    return false;
                }
            ],

            /**
             * Best browsers
             */
            withItem: [
                // html data
                function (type, item, clipboardData, options) {

                    if (patterns.types.html.test(type)) {

                        item.getAsString(function (html) {
                            getImagesFromHtml(
                                html,
                                options
                            );
                        });
                        return true;
                    }

                    return false;
                },

                // binary data
                function (type, item, clipboardData, options) {
                    if (patterns.types.binary.test(type)) {
                        readFile(item.getAsFile(), options);
                        return true;
                    }

                    return false;
                },

                // path as text or URI
                function (type, item, clipboardData, options) {

                    if (patterns.types.text.test(type)) {
                        item.getAsString(function (data) {

                            if (!data) {return false;}

                            if (patterns.content.html.test(data)) {
                                getImagesFromHtml(data, options);
                            } else {
                                getFilesByPaths(data, options);
                            }
                        });
                        return true;
                    }

                    return false;
                }
            ]
        };

    /**
     * Get file name with exhibition from path
     * @param path {string}
     * @returns {string}
     */
    function getFileName (path) {
        var matchedName = path.match(patterns.content.fileName);
        return matchedName ? matchedName[0] : '';
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
        img.onload = function () {

            // Create an empty canvas element
            var canvas = document.createElement("canvas"),
                ctx;
            canvas.width =  this.width;
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
            } catch (e){
                options.error();
                return;
            }
        }
        img.onerror = options.error;
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
        reader.onload = function (evt) {
            options.success(evt.result, getFileName(file.name || ''));
        };
        reader.onerror =     options.error;
        reader.onloadstart = options.loadStart;
        reader.onloadend =   options.loadEnd;
        reader.onprogress =  options.progress;
        reader[options.asBinary ? 'readAsBinaryString' : 'readAsDataURL'](file);
    }


    /**
     * Get files by paths at string
     * Used for paste files at linux
     * @param paths {string}
     * @param options {Object}
     * @param options.asBinary {boolean}
     * @param options.success {function}
     * @param options.error {function}
     */
    function getFilesByPaths(paths, options) {

        paths
            .replace(/[\r\t]/g, '')
            .split('\n').forEach(function (path) {

                if (patterns.content.path.test(path) && patterns.content.image.test(path)) {

                    // add protocol
                    if (patterns.content.localPath.test(path)) {
                        path = 'file://' + path;
                    }

                    // return URL for viewing only
                    if (!options.asBinary) {
                        options.success(path, getFileName(path));
                        return;
                    }
                    loadImageFile(path, options);
                }
            });
    }


    /**
     * Get files from <img> tags
     * some image binary is copied thus
     * @param html {string}
     * @param options {Object}
     * @param options.asBinary {boolean}
     * @param options.success {function}
     * @param options.error {function}
     */
    function getImagesFromHtml(html, options) {

        // global pattern must be announced as local variable
        var pattern = /<img[^>]+?src=(["'])([^>]+?)\1/ig,
            urlMatch;

        while (urlMatch = pattern.exec(html)) {
            getFilesByPaths(urlMatch[2], options);
        }
    }


    /**
     * Create $('DIV') if global object at CE mode
     * Return $(el) otherwise
     * @param el {DOM element}
     * @returns {$}
     */
    function getPasteCatcher (el) {

        // create DIV if global object at CE mode

        var catcher = $('#pasteCatcher');

        // not at CE mode or not a global catching
        if (!needContentEditable || ['body', 'window', 'document', window, document].indexOf(el) < 0) {
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
                left:    '100%',
                top:     '100%',
                opacity: 0
            })
            .appendTo('body')
    }

    /**
     * Call each parsers with given parameters
     * @param parserType {string}
     * @param args {Array}
     * @returns {boolean}
     */
    function callParsers (parserType, args) {

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
     * Read binary file (pasted raw data or from input)
     * @param options {Object}
     * @param options.success {function}
     * @param options.error {function}
     * @param options.loadStart {function}
     * @param options.loadEnd {function}
     * @param options.progress {function}
     * @param options.asBinary {boolean} call .success() with binary data or URL
     */
    $.fn.pasteFileReader = function (options) {
        options = $.extend({}, defaults, options || {});

        // bind to each element
        this.each(function () {

            var $el = getPasteCatcher(this)

            // setup paste event
            if (needContentEditable) {
               $el.attr('contentEditable', 'true');

                // need to be focused
                $(window).off('keydown.paste').on('keydown.paste', function (event) {
                    if (event.ctrlKey && (event.keyCode || event.which) == 86) {
                        $el.focus();
                    }
                });
            }


            $el.bind('paste', function (event) {

                var clipboardData = event.originalEvent.clipboardData,
                    found = false;
                event.stopPropagation();
                event.preventDefault();

                // IE
                // data types: URL, Text
                if (window.clipboardData) {
                    callParsers('simply', [window.clipboardData, options]);
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
                // data types: rew image, html, uri-list, plain
                Array.prototype.forEach.call(clipboardData.types, function (type, i) {

                    // first matched item is complex object - try to use it
                    if (found) {
                        return;
                    }

                    // FF
                    if (!clipboardData.items) {
                        found = callParsers('withTypes', [type, clipboardData, options]);
                        return;
                    }

                    // Best browser
                    found = callParsers('withItem', [type, clipboardData.items[i], clipboardData, options]);
                });
            });
        });
    }

})(jQuery);