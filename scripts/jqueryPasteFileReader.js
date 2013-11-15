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
            blobImage: /^image\//i,
            text:      /^text\/plain/i,
            path:      /((https?|ftp|file):\/\/)?([\\\/][^\\\/])*[\\\/][^\\\/].[a-z0-9]+/i,
            image:     /\.(png|gif|jpe?g|tiff)$/i,
            fileName:  /([^\\\/]+)$/i
        };

    /**
     * Get file name with exhibition from path
     * @param path {string}
     * @returns {string}
     */
    function getFileName (path) {
        var matchedName = path.match(patterns.fileName);
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
     * @param file {Object}
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
            options.success(evt.target.result, getFileName(file.name || ''));
        };
        reader.onerror =     options.error;
        reader.onloadstart = options.loadStart;
        reader.onloadend =   options.loadEnd;
        reader.onprogress =  options.progress;
        reader[options.asBinary ? 'readAsBinaryString' : 'readAsDataURL'](file);
    }


    /**
     * Read binary file (pasted raw data or from input)
     * @param file {Object}
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

            var element = this;
            $(this).bind('paste', function (event) {

                var clipboardData = event.originalEvent.clipboardData;
                Array.prototype.forEach.call(clipboardData.items, function (item) {

                    // blob image
                    if (patterns.blobImage.test(item.type)) {
                        readFile(item.getAsFile(), options);
                    }

                    // path
                    if (patterns.text.test(item.type)) {
                        item.getAsString(function (text) {

                            // paths from file manager is splitted by \n
                            text.replace(/[\r\t]/g, '').split('\n').forEach(function (path) {
                                if (patterns.path.test(path) && patterns.image.test(path)) {

                                    // return URL for viewing only
                                    if (!options.asBinary) {
                                        options.success(path, getFileName(path));
                                        return;
                                    }
                                    loadImageFile(path, options);
                                }
                            });
                        });
                    }
                });
            });
        });
    }

})(jQuery);