loader = ()->

  restrict: 'AE'
  scope:
    addImage: '&'
  link: (scope, element, attributes)->

    # catch pasting an image blob from clipboard
    $(window).pasteFileReader
      asBinary: false
      success: (url, name) ->

        scope.addImage
          data: url
          name: name

      error: ->
        alert 'Your browser blocked the loading of images ;('



window.App.directive 'imagesLoader', loader
