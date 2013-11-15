images-to-sites-previews
========================

> Example application for loading files by ctrl-v and showing sites previews with uploaded images

> as presentation for my jqueryPasteFileReader plugin

Download project and open **index.html** at your browser to wiev this demo


## jqueryPasteFileReader
> jQuery plugin for readings files pasted to browser by ctrl-v

<a href="https://github.com/el-fuego/images-to-sites-previews/blob/master/scripts/jqueryPasteFileReader.js">
  scripts/jqueryPasteFileReader.js
</a>

Supports images only for a now



#### Usage
```js
$(window).pasteFileReader({

      // call .success() with binary data or URL
      asBinary: false,
      
      /**
      * @param url {string|*}
      * @param name {string}
      */
      success: function (url, name) {},
      
      /**
      * @param [event] {object} FileReader event error
      */
      error:   function (event) {}
});
```



#### More
```js
$('.my-paste-catcher').pasteFileReader({
      asBinary:   false,
      success:    function (url, name) {},
      error:      function (event) {},
      loadStart:  function (event) {},
      loadEnd:    function (event) {},
      progress:   function (event) {}
});
```
See **FileReader** documentation for event description

**Note:** .focus() DOM element first if you need to paste not to the window
