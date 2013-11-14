ctrl = ($scope)->

  $scope.addUserImage = (data, name)->
    $scope.userImages.push data
    $scope.$apply()

  $scope.userImages = []

  $scope.templates = [
    {
      name:      'bla-bla'
      className: 'one'
      imageUrl:  'templates/1.png'
      stylesUrl: 'build/templates/1.css'
    }
    {
      name:      'bla-bla'
      className: 'two'
      imageUrl:  'templates/2.png'
      stylesUrl: 'build/templates/2.css'
    }
    {
      name:      'bla-bla'
      className: 'three'
      imageUrl:  'templates/3.png'
      stylesUrl: 'build/templates/3.css'
    }
    {
      name:      'bla-bla'
      className: 'four'
      imageUrl:  'templates/4.png'
      stylesUrl: 'build/templates/4.css'
    }
    {
      name:      'bla-bla'
      className: 'five'
      imageUrl:  'templates/5.png'
      stylesUrl: 'build/templates/5.css'
    }
  ]

window.App.controller 'Ctrl', ['$scope', ctrl]