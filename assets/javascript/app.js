/* global $ */
/* global google */

$(document).ready(function() {
  var place = "";
  var destination = "";
  var destinationDate = 0;
  var latitude = 0;
  var longitude = 0;

  var authUID;
  var loc;
  var cityKey;
  var packListArr = [];

  //Initailize Firebase
  var config = {
    apiKey: "AIzaSyCK6_akMjy07IekkbM6Mvq7nX9n1bMJIpY",
    authDomain: "vacayproject-c7e75.firebaseapp.com",
    databaseURL: "https://vacayproject-c7e75.firebaseio.com",
    projectId: "vacayproject-c7e75",
    storageBucket: "vacayproject-c7e75.appspot.com",
    messagingSenderId: "127370399579"
  };

  firebase.initializeApp(config);

  var database = firebase.database();

  // on auth function so users can't access before logging in
  firebase.auth().onAuthStateChanged(user => {
    if (!user) {
      window.location = 'login.html'; //If User is not logged in, redirect to login page
    }
  });

  // hide the results page and hide nav item
  $("#part-2").hide()
  $("#AddTripNav").hide()

  // function to pull the search area up and show the results area
  function showResults() {
    $("#showSearch").removeClass("show")
    $("#part-2").slideDown("slow")
  }


  // Create reference for firebase's node "users"
  var usersRef = firebase.database().ref("users");
  getFirebaseAuthUID();

  //function to render rows
  function renderRows(place, childSnapshot) {
    // $(".tableRow").empty()
    // // console.log("render rows works")
    // // console.log("render rows: " + place.formatted_address)
    // // console.log(place.formatted_address);
    // var tBody = $("tbody");
    // var tRow = $("<tr>");
    //
    // var destinationTD = $("<td>").text(place.formatted_address);
    // destinationTD.attr("class", "citySelect").attr("data-city", place.formatted_address).attr("data-lat", place.geometry.location.lat).attr("data-lng", place.geometry.location.lng).attr("data-id", place.place_id).attr("data-date", destinationDate);
    // var destinationDateTD = $("<td>").text(destinationDate).attr("data-city", place.formatted_address).attr("data-date", destinationDate);
    // var trashTD = $("<td>").attr("class", "showTrash");
    // var trashSpan = $("<span>").attr("class", "fa fa-trash-o trash-hide");
    //
    // trashTD.append(trashSpan);
    // tRow.append(destinationTD, destinationDateTD, trashTD);
    // tBody.prepend(tRow);

    var data = childSnapshot.val();

    if (childSnapshot.key !== "credential") {
      $(".tableRow").empty();
      var tBody = $("tbody");
      var tRow = $("<tr>").attr("class", "cityRow");

      var destinationTD = $("<td>").text(data.city).attr("class", "citySelect").attr("data-city", data.city).attr("data-lat", data.lat).attr("data-lng", data.lng).attr("data-date", data.startdate);

      var destinationDateTD = $("<td>").text(data.startdate).attr("data-city", data.city).attr("data-date", data.startdate);

      var trashTD = $("<td>").attr("class", "showTrash");
      var trashSpan = $("<span>").attr("class", "fa fa-trash-o");

      trashTD.append(trashSpan);
      tRow.append(destinationTD, destinationDateTD, trashTD);
      tBody.prepend(tRow);
    }
  }

  // Today
  function renderPackingList(itemValueArr) {
    $("#packingListView").empty();

    if (Array.isArray(itemValueArr)) {
      for (var i = 0; i < itemValueArr.length; i++) {
        var listRow = $("<div>").addClass("row listRow");
        var itemColumn = $("<div>").addClass("col-auto listColumn");
        var trashColumn = $("<div>").addClass("col-2 trashColumn");
        var itemText = $("<p>").addClass("list-p");
        itemText.text(itemValueArr[i]);
        itemColumn.append(itemText);
        var trashItem = $("<span>").addClass("fa fa-trash-o trash-hide");
        trashColumn.append(trashItem);
        trashColumn.attr("value", itemValueArr[i]);
        listRow.append(itemColumn, trashColumn);

        $("#packingListView").append(listRow);
      }
    }
    return;
  }

  //function to store values from input fields
  function storeInputValues(place) {
    console.log("storeInputValues works")
    destination = place.formatted_address;
    var rawDestinationDate = $("#dateInput").val().trim();
    destinationDate = moment(rawDestinationDate).format('MM/DD/YYYY');
  }

  //click function on table data
  $(document).on("click", ".citySelect", function(event) {
    destination = $(this).attr("data-city")
    destinationDate = $(this).attr("data-date")
    var userLatitude = parseFloat($(this).attr("data-lat"));
    var userLongitude = parseFloat($(this).attr("data-lng"));
    console.log(userLatitude);
    console.log(userLongitude);
    showResults()
    $("#AddTripNav").show()
    retrieveGoogleApi(userLatitude, userLongitude);
    countDownDisplay(destinationDate, destination);
    showCurrentWeather(destination)
    showForecastedWeather(destination);

    //Today
    var childKey = formatFirebaseCityKey(destination, destinationDate);
    var packingPath = authUID + "/" + childKey;
    var packingRef = usersRef.child(packingPath);
    cityKey = childKey; //Assign key to global for packing list and blog

    $("#packingListView").empty();

    packingRef.child("packinglist").once("value", function(childSnapshot) {
      var packList = childSnapshot.val();
      packListArr = packList; //Assign a list from firebase to the array

      console.log("After push new array", packListArr);
      console.log("After push new array", packListArr.length);
      renderPackingList(packList);
    });
  });


  //on click function when user clicks the add button
  $(document).on("click", "#addTrip", function(event) {
    event.preventDefault();
    var place = retrieveLocation();
    storeInputValues(place);
    console.log("button works");
    //renderRows(place);
    showCurrentWeather(destination)
    showForecastedWeather(destination);
    initMap(place);
    showResults()
    $("#AddTripNav").show()
    countDownDisplay(destinationDate, destination);
    createTripsObj(destination, destinationDate);
    $("#cityInput").val("");
    $("#dateInput").val("");

    //Today
    $("#packingListView").empty();
    //Pop old data out upon adding new city
    clearArray(packListArr);
  })

  // function to delete packing list item
  $(document.body).on("click", ".showTrash", function() {
    var listRow = $(this).parent();
    var city = $(this).prev().attr("data-city");
    var date = $(this).prev().attr("data-date");

    // Select and Remove the specific <p> element that previously held the to do item number.
    listRow.remove();

    //Remove from Firebase
    var childKey = formatFirebaseCityKey(city, date);
    console.log("authUID", authUID);
    console.log("childKey", childKey);
    var uidRef = usersRef.child(authUID);
    uidRef.child(childKey).remove();
  });

  document.getElementById("cityInput").onkeypress = function(e) {
    var key = e.charCode || e.keyCode || 0;
    if (key == 13) {
      e.preventDefault();
    }
  }

  /// this sets the current date for the date selector
  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth() + 1; //January is 0!
  var yyyy = today.getFullYear();

  if (dd < 10) {
    dd = '0' + dd;
  }
  if (mm < 10) {
    mm = '0' + mm
  }

  today = yyyy + '-' + mm + '-' + dd;
  $(".calendar").attr("min", today);


  //function to autofill city name and retreive google data
  var input = document.getElementById('cityInput');
  var autocomplete = new google.maps.places.Autocomplete(input, {
    types: ['(cities)']
  });
  google.maps.event.addListener(autocomplete, 'place_changed', retrieveLocation)

  //function to retrieve destination from Google
  function retrieveLocation() {
    var place = autocomplete.getPlace();
    console.log(place);
    //assign global variable for firebase function
    loc = place;
    return place;
  }

  // function to generate and initiate clock countdown flip
  function countDownDisplay(destinationDate, destination) {
    // print the clicked or entered city in the message area
    $(".countdownMessage").text("Count down to your trip to " + destination)
    var clock;
    // Grab the current date
    var currentDate = moment();
    console.log("currentdateformat", currentDate)
    // Grabbing the date from the city
    var futureDate = moment(destinationDate);
    console.log("future date format", futureDate)
    // Calculate the difference in seconds between the future and current date
    var diff = futureDate.diff(currentDate, 'seconds');
    console.log(diff)
    // Instantiate a countdown FlipClock
    clock = $('.clock').FlipClock(diff, {
      clockFace: 'DailyCounter',
      countdown: true
    });
  };

  function initMap(place) {

    var userLatitude = place.geometry.location.lat();
    var userLongitude = place.geometry.location.lng();

    console.log(userLatitude);
    console.log(userLongitude);

    var userCoordinate = {
      lat: userLatitude,
      lng: userLongitude
    };

    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 13,
      center: userCoordinate
    });

    var marker = new google.maps.Marker({
      position: userCoordinate,
      map: map
    });
  }

  function showCurrentWeather(destination) {
    /*
      Shows the main weather component-- current weather
    */
    $("#currentweatherdestination").empty();
    $("#currentWeather").empty();


    var userCity = destination;
    userCity = userCity.split(",");
    userCity[0] = userCity[0].replace(/\s/g, '+');
    userCity = userCity.join(",");
    userCity = userCity.split(",");
    var userCityLength = userCity.length;

    $("#currentweatherdestination").text(destination)

    for (var i = 0; i < userCityLength; i++) {
      userCity[i] = userCity[i].replace(/\s/g, '');
    }

    userCity = userCity.join();

    var weatherAPIKey = "ef097988a11b755c604a7aad621cf60d";

    var queryURL = "https://api.openweathermap.org/data/2.5/weather?q=" + userCity + "&units=imperial&appid=" + weatherAPIKey;

    $.ajax({
        url: queryURL,
        method: "GET"
      })
      // We store all of the retrieved data inside of an object called "response"
      .done(function(response) {
        var newImage = $("<img src='http://openweathermap.org/img/w/" + response.weather[0].icon + ".png'>");
        $("#currentWeather").text(Math.floor(response.main.temp) + "°" + "F");
        $("#currentWeather").prepend(newImage)

      });
  }

  function showForecastedWeather(destination) {
    /*
      Grabs a 5 day forecast and projects temperature and icon into HTML
    */

    $("#forecastedWeather").empty();

    var userCity = destination;
    userCity = userCity.split(",");
    userCity[0] = userCity[0].replace(/\s/g, '+');
    userCity = userCity.join(",");
    userCity = userCity.split(",");
    var userCityLength = userCity.length;

    for (var i = 0; i < userCityLength; i++) {
      userCity[i] = userCity[i].replace(/\s/g, '');
    }

    userCity = userCity.join();

    var newForecastImage, date;
    var weatherAPIKey = "ef097988a11b755c604a7aad621cf60d";

    var queryURL = "https://api.openweathermap.org/data/2.5/forecast?q=" + userCity + "&units=imperial&appid=" + weatherAPIKey;

    console.log(queryURL);

    $.ajax({
        url: queryURL,
        method: "GET"
      })
      // We store all of the retrieved data inside of an object called "response"
      .done(function(response) {

        console.log(response);

        var allPredictions = response.list.length

        for (var i = 6; i < allPredictions; i+= 8) {
          newForecastImage = ("<img src='http://openweathermap.org/img/w/" + response.list[i].weather[0].icon + ".png'>");
          // $("#forecastedWeather").append(newForecastImage);

          date = (response.list[i].dt_txt).slice(0, 11);
          formattedDate = moment(date).format("MM/DD/YY");
          var dayOfWeek = moment(date).format("dddd");
          var temp = Math.floor(response.list[i].main.temp)
          var forecastDateText = ("<div class='col'>") + ("<div>") + dayOfWeek  + ("</div>") + ("<div>") + newForecastImage + temp + "°" + "F" + ("</div>") + ("</div>")
          $("#forecastedWeather").append(forecastDateText);
          // formattedDate + "  | " + Math.floor(response.list[i].main.temp) + "F"
        }
      });
  }

  // function to add items to packing list
  $("#addPackingItem").on("click", function(event) {
    event.preventDefault();

    //Today
    var itemValue = $("#packingListItem").val().trim();
    if(!Array.isArray(packListArr)){
      packListArr = [];
    }

    packListArr.push(" " + itemValue);

    $("#packingListItem").val("");
    createPackingListObj(packListArr);
  });

    // var itemValue = $("#packingListItem").val().trim();
    // if (itemValue === "") {} else {
    //   var listRow = $("<div>").addClass("row listRow")
    //   var itemColumn = $("<div>").addClass("col-auto listColumn")
    //   var trashColumn = $("<div>").addClass("col-2 trashColumn")
    //   var itemText = $("<p>").addClass("list-p")
    //   itemText.text(itemValue)
    //   itemColumn.append(itemText)
    //   var trashItem = $("<span>").addClass("fa fa-trash-o trash-hide")
    //   trashColumn.append(trashItem)
    //   trashColumn.attr("value", itemValue)
    //   listRow.append(itemColumn, trashColumn)
    //   $("#packingListView").append(listRow)
    //   packListArr.push(" " + itemValue)
    //   $("#packingListItem").val("");



  // Add a "checked" symbol when clicking on a list item
  $(document.body).on("click", ".listColumn", function() {
    var listItem = $(this).parent();
    listItem.toggleClass("col-checked");
  })

  // function to delete packing list item
  $(document.body).on("click", ".trashColumn", function() {
    var listRow = $(this).parent();
    var deletedArrItem = (" " + $(this).attr("value"))
    var deletedArrItem = packListArr.indexOf(deletedArrItem)
    packListArr.splice(deletedArrItem, 1)
    listRow.remove();

    //Today
    //Remove from Firebase
    //var childKey = formatFirebaseCityKey(destination, destinationDate);
    //var uidRef = usersRef.child(authUID + "/" + formattedKey + "/packinglist");
    //console.log("cityKey",cityKey);

    //uidRef.child(childKey).remove();
    // uidRef.on("child_added", function(shot){
    //   console.log("line 425!!!@!!!!!", shot.val());
    // });

  });

  // function to initiate tooltip once copy is successful
  $(".copyButton").tooltip({
    trigger: 'click',
  });

  function setTooltip(btn, message) {
    $(".copyButton").tooltip('enable')
      .attr('data-original-title', message)
      .tooltip('show')
      .tooltip('disable')
  }

  function hideTooltip(btn) {
    setTimeout(function() {
      $(".copyButton").tooltip('hide')
    }, 1000)
  }

  // beginning of function for clipboard
  var clipboard = new Clipboard(".copyButton", {
    text: function(trigger) {
      return packListArr;
    }
  });

  // checks if items have been copied
  clipboard.on('success', function(e) {
    console.info('Action:', e.action)
    console.info('Text:', e.text)
    console.info('Trigger:', e.trigger)
    setTooltip(e.trigger, 'Copied!');
    hideTooltip(e.trigger);
    e.clearSelection()
  })
  clipboard.on('error', function(e) {
    console.error('Action:', e.action)
    console.error('Trigger:', e.trigger)
    setTooltip(e.trigger, 'Failed!');
    hideTooltip(e.trigger);
  })

  // function to add blog posts on save click
  $(document.body).on("click", "#blogSaveBtn", function() {
    var savedTime = moment().format('MMMM Do YYYY, h:mm:ss a')
    var blogTitle = $("#blogPostTitle").val().trim()
    var blogPost = $("#blogPostEntry").val().trim()
    var trashAndEdit = ("<div class='col-1'>") + ("<span class='fa fa-trash-o trash-blog-button'>") + ("</span>") + (" ") + ("<span class='fa fa-pencil-square-o edit-blog-button' data-toggle='modal' data-target='#myModal'>") + ("</span>") + ("</div>")
    var blogEntry = ("<div class='blogEntryContainer my-2'>")  + ("<div class='row'>") + ("<div class='col'>") + ("<div class='blogTitleView'>") + blogTitle + ("</div>") + ("<div class='blogTimeStampView'>") + "Posted on: " + savedTime + ("</div>") + ("<div class='blogEntryView'>") + blogPost + ("</div>") + ("</div>") +  trashAndEdit + ("</div>") + ("</div>")
    if ($("#blogPostArea") === "") {
    } else {
    $("#blogPostArea").prepend(blogEntry)
    createBlogObj(savedTime);                                                                                                                                                             
    $("#blogPostTitle").val("")
    $("#blogPostEntry").val("")
    }
  })

  // function to delete blog post
  // $(".fa-trash-o").on("click", function() {
  //   console.log("test trash blog button")
  //   var blogPostItem = $(this).parent();
  //   blogPostItem.remove();
  // })

  // function to delete blog post
  $(document.body).on("click", ".trash-blog-button", function() {
    console.log("test trash blog")
    var blogPostTrash = $(this).parent();
    var div = blogPostTrash.parent()
    var div2 = div.parent()
    div2.remove();
    // Get unique Firebase ID from button (added on button creation)
    // var trainKey = $(this).attr("data-key");
    // Remove object from Firebase
    // db.ref(trainKey).remove();
  })

  $(document.body).on("click", ".edit-blog-button", function() {
    console.log("test edit blog");

    var editCol = $(this).parent();
    var wholeRow = editCol.parent()
    var targetCol = wholeRow[0].childNodes[0];
    var entryInfo = [targetCol.childNodes[0].innerText, targetCol.childNodes[2].innerText];

    console.log(targetCol);
    console.log(entryInfo[0]);
    console.log(entryInfo[1]);

    $("#myModal #blogPostTitle").val(entryInfo[0]);
    $("#myModal #blogPostEntry").val(entryInfo[1]);
  });

  // add signout button and log the user out once clicked
  $("#logoutbtn").on("click", function() {
    firebase.auth().signOut()
    firebase.auth().signOut().then(function() {
      window.location.replace("login.html")
    }).catch(function(error) {
      console.log("test log out error")
    });
  })


  // ************ Firebase Section ************ //
  function getFirebaseAuthUID() {
    firebase.auth().onAuthStateChanged(function(user) {
      console.log('Get Users');
      var user = firebase.auth().currentUser;
      var uid, name, email;


    if (user !== null) {
      // User is signed in.
      uid = user.uid;
      name = user.displayName;
      email = user.email;
      displayUserName(name)


        //Assign uid to global variable
        authUID = uid;

        checkFirebaseUser(uid, name, email);
      }
    });
  }

  function checkFirebaseUser(uid, name, email) {
    usersRef.on("child_added", function(snapshot) {
      var userKey = snapshot.key;
      console.log("userKey", userKey);

      if (uid === userKey) {
        // update
        console.log("found");
        getUserInfo();
      } else {
        // create
        console.log("not found");
        createUserObj(uid, name, email);
      }
    }, function(errorObject) {
      console.log("Errors handled: " + errorObject.code);
    });
  }

  function getUserInfo() {
    var uidRef = usersRef.child(authUID);
    var usernameRef = usersRef.child(authUID + "/credential");
    var place = retrieveLocation();

    usernameRef.once("value", function(cred){
      var username = cred.val();
      console.log(username);
    });

    uidRef.on("child_added", function(childSnapshot) {
      //Display City Section upon loading
      renderRows(place, childSnapshot);
    });
  }

  function createUserObj(uid, name, email) {
    var keyRef = usersRef.child(uid);
    // Create user's folder
    keyRef.child("credential").set({
      "name": name,
      "email": email
    });
  }

  function createTripsObj(city, trip_date) {
    cityKey = formatFirebaseCityKey(city, trip_date);
    var tripsKey;
    var lat = loc.geometry.location.lat();
    var lng = loc.geometry.location.lng();
    var uidRef = usersRef.child(authUID);

    uidRef.on("child_added", function(childSnapshot) {
      tripsKey = childSnapshot.key;
    });

    if (tripsKey !== cityKey) {
      uidRef.child(cityKey).set({
        "city": city,
        "startdate": trip_date,
        "lat": lat,
        "lng": lng,
        "packinglist": "",
        "blog": ""
      });
    }
  }

  //Today
  function createPackingListObj(arr) {
    //Retrieve firebase
    var path = authUID + "/" + cityKey;
    console.log(path);
    var packRef = usersRef.child(path);
    var childKey;

    //Check if the packinglist is created?
    packRef.update({
      "packinglist": arr
    }, function(err) {
      if (err) {
        console.log(err);
      } else {
        renderPackingList(packListArr);
      }
    });
  }

function createBlogObj(savedTime) {
  var postDate = savedTime;
  var blogPath = authUID + "/" + cityKey + "/blogs";
  var blogRef = usersRef.child(blogPath);
  var newBlogRef = blogRef.push();

  var blogTitle = $("#blogPostTitle").val();
  var blogText = $("#blogPostEntry").val();
  
  // we can also chain the two calls together
  blogRef.push().set({
    title: blogTitle,
    postTime: postDate,
    contents: blogText
  });
  
  // var blogContents = {title:blogTitle, postTime:"moment", contents:blogText};
  
  console.log("works");
  
  // newBlogRef.set({
  //   blog: blogContents
  // });
}

  function formatFirebaseCityKey(city, trip_date) {
    var formattedKey = city.toLowerCase() + "_" + trip_date;
    // Replace non-word character with single "_"
    formattedKey = formattedKey.replace(/\W+/g, "_");
    cityKey = formattedKey;
    console.log("formattedKey", formattedKey);
    return formattedKey;
  }

  //function to display username
  function displayUserName(name){
    var firstname = name.split(" ");
    $("#nameSpan").text(firstname[0])

  }

  //************ End Google API Images Section ************ //

  // ************ End Firebase Section ************ //

  function retrieveGoogleApi(userLatitude, userLongitude) {

    var userCoordinate = {
      lat: userLatitude,
      lng: userLongitude
    };
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 13,
      center: userCoordinate
    });
    var marker = new google.maps.Marker({
      position: userCoordinate,
      map: map
    });
  }
  //Today
  function clearArray(array) {
    while (array.length) {
      array.pop();
    }
  }
});
// End document
