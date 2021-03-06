/* global $ */
/* global google */
/* global moment */
/* global firebase */

$(document).ready(function() {

  var destination = "";
  var destinationDate = 0;
  
  var authUID;
  var loc;
  var cityKey;
  var packListArr = [];
  var packListClip = [];
  var blogsArr = [];

  var userBlogTitle = "";
  var userBlogContents = "";
  var userTimeStamp = "";

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

  // on auth function so users can't access before logging in
  firebase.auth().onAuthStateChanged(user => {
    if (!user) {
      window.location = 'login.html'; //If User is not logged in, redirect to login page
    }
  });

  // hide the results page and hide nav item
  $("#part-2").hide();
  $("#AddTripNav").hide();

  // function to pull the search area up and show the results area
  function showResults() {
    $("#showSearch").removeClass("show");
    $("#part-2").slideDown("slow");
  }

  // Create reference for firebase's node "users"
  var usersRef = firebase.database().ref("users");
  getFirebaseAuthUID();

  //function to render rows
  function renderRows(place, childSnapshot) {
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

  function renderPackingList(itemValueArr) {
    $("#packingListView").empty();

    if (Array.isArray(itemValueArr)) {
      for (var i = 0; i < itemValueArr.length; i++) {
        $("#packingListView").prepend(itemValueArr[i]);
      }
    }
    
    return;
  }

  function renderBlogs(arr) {
    $("#blogPostArea").empty();

    if (Array.isArray(arr)) {

      for (var i = 0; i < arr.length; i++) {
        $("#blogPostArea").prepend(arr[i]);
      }
    }
    return;
  }

  //function to store values from input fields
  function storeInputValues(place) {
    destination = place.formatted_address;
    var rawDestinationDate = $("#dateInput").val().trim();
    destinationDate = moment(rawDestinationDate).format('MM/DD/YYYY');
  }

  //click function on table data
  $(document).on("click", ".citySelect", function(event) {
    
    destination = $(this).attr("data-city");
    destinationDate = $(this).attr("data-date");
    var userLatitude = parseFloat($(this).attr("data-lat"));
    var userLongitude = parseFloat($(this).attr("data-lng"));
    showResults();
    $("#AddTripNav").show();
    
    retrieveGoogleApi(userLatitude, userLongitude);
    countDownDisplay(destinationDate, destination);
    showCurrentWeather(destination);
    showForecastedWeather(destination);

    var childKey = formatFirebaseCityKey(destination, destinationDate);
    var infoPath = authUID + "/" + childKey;
    var infoRef = usersRef.child(infoPath);
    cityKey = childKey; //Assign key to global for packing list and blog

    $("#packingListView").empty();
    $("#blogPostArea").empty();

    infoRef.child("packinglist").once("value", function(childSnapshot) {
      var packList = childSnapshot.val();
      packListArr = packList; //Assign a list from firebase to the array
      renderPackingList(packList);
    });

    infoRef.child("list4clipboard").once("value", function(childSnapshot) {
      var clipboardList = childSnapshot.val();
      packListClip = clipboardList; //Assign a list from firebase to the array
    });

    infoRef.child("blogs").once("value", function(childSnapshot) {
      var userBlog = childSnapshot.val();
      blogsArr = userBlog; //Assign a list from firebase to the array
      renderBlogs(userBlog);
    });
  });


  //on click function when user clicks the add button
  $(document).on("click", "#addTrip", function(event) {
    
    event.preventDefault();
    var place = retrieveLocation();
    storeInputValues(place);
 
    showCurrentWeather(destination);
    showForecastedWeather(destination);
    initMap(place);
    showResults();
    
    $("#AddTripNav").show();
    countDownDisplay(destinationDate, destination);
    createTripsObj(destination, destinationDate);
    $("#cityInput").val("");
    $("#dateInput").val("");

    $("#packingListView").empty();
    $("#blogPostArea").empty();
    
    //Pop old data out upon adding new city
    
    var areasToClean = [packListArr, packListClip, blogsArr];
    var areasArrayLength = areasToClean.length;
    
    for (var i = 0; i < areasArrayLength; i++) {
      clearArray(areasToClean[i]);
      console.log(areasToClean[i]);
    }
  });

  // function to delete packing list item
  $(document.body).on("click", ".showTrash", function() {
    var listRow = $(this).parent();
    var city = $(this).prev().attr("data-city");
    var date = $(this).prev().attr("data-date");

    // Select and Remove the specific <p> element that previously held the to do item number.
    listRow.remove();

    //Remove from Firebase
    var childKey = formatFirebaseCityKey(city, date);
    var uidRef = usersRef.child(authUID);
    uidRef.child(childKey).remove();
  });

  document.getElementById("cityInput").onkeypress = function(e) {
    var key = e.charCode || e.keyCode || 0;
    if (key == 13) {
      e.preventDefault();
    }
  };

  /// this sets the current date for the date selector
  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth() + 1; //January is 0!
  var yyyy = today.getFullYear();

  if (dd < 10) {
    dd = '0' + dd;
  }
  if (mm < 10) {
    mm = '0' + mm;
  }

  today = yyyy + '-' + mm + '-' + dd;
  $(".calendar").attr("min", today);


  //function to autofill city name and retreive google data
  var input = document.getElementById('cityInput');
  var autocomplete = new google.maps.places.Autocomplete(input, {
    types: ['(cities)']
  });
  google.maps.event.addListener(autocomplete, 'place_changed', retrieveLocation);

  //function to retrieve destination from Google
  function retrieveLocation() {
    
    var place = autocomplete.getPlace();
    
    //assign global variable for firebase function
    loc = place;
    return place;
  }

  // function to generate and initiate clock countdown flip
  function countDownDisplay(destinationDate, destination) {
    
    // print the clicked or entered city in the message area
    $(".countdownMessage").text("Count down to your trip to " + destination);
    var clock;
    
    // Grab the current date
    var currentDate = moment();

    // Grabbing the date from the city
    var futureDate = moment(destinationDate);

    // Calculate the difference in seconds between the future and current date
    var diff = futureDate.diff(currentDate, 'seconds');

    // Instantiate a countdown FlipClock
    clock = $('.clock').FlipClock(diff, {
      clockFace: 'DailyCounter',
      countdown: true
    });
  }

  function initMap(place) {

    var userLatitude = place.geometry.location.lat();
    var userLongitude = place.geometry.location.lng();

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

    var userCity = createUserCity(destination);
    
    var userCityLength = userCity.length;

    $("#currentweatherdestination").text(destination);

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
      .done(function(response) {
        var newImage = $("<img src='http://openweathermap.org/img/w/" + response.weather[0].icon + ".png'>");
        $("#currentWeather").text(Math.floor(response.main.temp) + "°" + "F");
        $("#currentWeather").prepend(newImage);

      });
  }

  function showForecastedWeather(destination) {
    /*
      Grabs a 5 day forecast and projects temperature and icon into HTML
    */
    $("#forecastedWeather").empty();

    // var userCity = destination;
    // userCity = userCity.split(",");
    // userCity[0] = userCity[0].replace(/\s/g, '+');
    // userCity = userCity.join(",");
    // userCity = userCity.split(",");
    var userCity = createUserCity(destination);
    
    var userCityLength = userCity.length;

    for (var i = 0; i < userCityLength; i++) {
      userCity[i] = userCity[i].replace(/\s/g, '');
    }

    userCity = userCity.join();

    var newForecastImage, date;
    var weatherAPIKey = "ef097988a11b755c604a7aad621cf60d";

    var queryURL = "https://api.openweathermap.org/data/2.5/forecast?q=" + userCity + "&units=imperial&appid=" + weatherAPIKey;

    $.ajax({
        url: queryURL,
        method: "GET"
      })
      .done(function(response) {

        var allPredictions = response.list.length;

        for (var i = 6; i < allPredictions; i += 8) {
          newForecastImage = ("<img src='http://openweathermap.org/img/w/" + response.list[i].weather[0].icon + ".png'>");

          date = (response.list[i].dt_txt).slice(0, 11);
          
          var dayOfWeek = moment(date).format("dddd");
          var temp = Math.floor(response.list[i].main.temp);
          var forecastDateText = ("<div class='col'>") + ("<div class='weather-day'>") + dayOfWeek + ("</div>") + ("<div>") + newForecastImage + temp + "°" + "F" + ("</div>") + ("</div>");
          $("#forecastedWeather").append(forecastDateText);

        }
      });
  }
  
  function createUserCity (destination) {
    
    var userCity = destination;
    userCity = userCity.split(",");
    userCity[0] = userCity[0].replace(/\s/g, '+');
    userCity = userCity.join(",");
    userCity = userCity.split(",");
    
    return userCity;
  }

  // function to add items to packing list
  $("#addPackingItem").on("click", function(event) {
  
    event.preventDefault();

    var itemValue = $("#packingListItem").val().trim();
    var listRow = $("<div>").addClass("row listRow");
    var itemColumn = $("<div>").addClass("col-auto listColumn");
    var trashColumn = $("<div>").addClass("col-2 trashColumn");
    var itemText = $("<p>").addClass("list-p");
    
    itemText.text(itemValue);
    itemColumn.append(itemText);
    
    var trashItem = $("<span>").addClass("fa fa-trash-o trash-hide");
    trashColumn.append(trashItem);
    trashColumn.attr("value", itemValue);
    listRow.append(itemColumn, trashColumn);

    var packinglistDiv = '<div class="row listRow"><div class="col-auto listColumn"><p class="list-p">' + itemValue + '</p></div><div class="col-2 trashColumn" value="' + itemValue + '"><span class="fa fa-trash-o trash-hide"></span></div></div>';

    if (!Array.isArray(packListArr)) {
      packListArr = [];
    }

    if (!Array.isArray(packListClip)) {
      packListClip = [];
    }

    $("#packingListItem").val("");

    if (itemValue !== "") {

      packListArr.push(packinglistDiv);
      packListClip.push(" " + itemValue);
      createPackingListObj(packListArr, packListClip);
    }
  });

  // Add a "checked" symbol when clicking on a list item
  $(document.body).on("click", ".listColumn", function() {
    
    var listItem = $(this).parent();
    var itemValue = $(this).children().html();
    listItem.toggleClass("col-checked");

    for (var i = 0; i < packListArr.length; i++) {
      if (packListArr[i].includes(itemValue)) {
        packListArr[i] = '<div class="' + listItem.attr("class") + '"><div class="col-auto listColumn"><p class="list-p">' + itemValue + '</p></div><div class="col-2 trashColumn" value="' + itemValue + '"><span class="fa fa-trash-o trash-hide"></span></div></div>';
        break;
      } else {
        console.log("nothing!!");
      }
    }

    createPackingListObj(packListArr, packListClip);
  });

  // function to delete packing list item
  $(document.body).on("click", ".trashColumn", function() {
    var listRow = $(this).parent();

    var deletedArrItem = listRow.find("div:last").attr("value");
    var deletedArrPos = packListArr.indexOf(deletedArrItem);

    packListArr.splice(deletedArrPos, 1);
    packListClip.splice(deletedArrPos, 1);

    listRow.remove();

    //Update Firebase with new array
    var uidRef = usersRef.child(authUID + "/" + cityKey);
    uidRef.update({
      "packinglist": packListArr,
      "list4clipboard": packListClip
    });

  });

  // function to initiate tooltip once copy is successful
  $(".copyButton").tooltip({
    trigger: 'click',
  });

  function setTooltip(btn, message) {
    $(".copyButton").tooltip('enable')
      .attr('data-original-title', message)
      .tooltip('show')
      .tooltip('disable');
  }

  function hideTooltip(btn) {
    setTimeout(function() {
      $(".copyButton").tooltip('hide');
    }, 1000);
  }

  // beginning of function for clipboard
  var clipboard = new Clipboard(".copyButton", {
    text: function(trigger) {
      return packListClip;
    }
  });

  // checks if items have been copied
  clipboard.on('success', function(e) {
    setTooltip(e.trigger, 'Copied!');
    hideTooltip(e.trigger);
    e.clearSelection();
  });
  
  clipboard.on('error', function(e) {
    console.error('Action:', e.action);
    console.error('Trigger:', e.trigger);
    setTooltip(e.trigger, 'Failed!');
    hideTooltip(e.trigger);
  });

  // function to add blog posts on save click
  $(document.body).on("click", "#blogSaveBtn", function() {

    var savedTime = moment().format('MMMM Do YYYY, h:mm:ss a');
    var blogTitle = $("#blogPostTitle").val().trim();
    var blogPost = $("#blogPostEntry").val().trim();

    if (blogTitle === "" && blogPost === "") {
      return;
    }

    var trashAndEdit = ("<div class='col-1'>") + ("<span class='fa fa-trash-o trash-blog-button'>") + ("</span>") + (" ") + ("<span class='fa fa-pencil-square-o edit-blog-button' data-toggle='modal' data-target='#myModal'>") + ("</span>") + ("</div>");

    var blogEntry = ("<div class='blogEntryContainer my-2'>") + ("<div class='row'>") + ("<div class='col'>") + ("<div class='blogTitleView'>") + blogTitle + ("</div>") + ("<div class='blogTimeStampView'>") + "Posted on: " + savedTime + ("</div>") + ("<div class='blogEntryView'>") + blogPost + ("</div>") + ("</div>") + trashAndEdit + ("</div>") + ("</div>");

    $("#blogPostTitle").val("");
    $("#blogPostEntry").val("");

    if (!Array.isArray(blogsArr)) {
      blogsArr = [];
    }

    if ((blogTitle !== "") && (blogPost !== "")) {
      blogsArr.push(blogEntry);
      createBlogObj(blogsArr);
    }
  });

  // function to delete blog post
  $(document.body).on("click", ".trash-blog-button", function() {

    var blogPostTrash = $(this).parent();
    var div = blogPostTrash.parent();
    var div2 = div.parent();
    var column = blogPostTrash.prev();
    var timeStamp = column.find("div:last").prev().html();

    for (var i = 0; i < blogsArr.length; i++) {
      if (blogsArr[i].includes(timeStamp)) {
        blogsArr.splice(i, 1);
        break;
      }
    }

    div2.remove();

    //Update Firebase with new array
    var uidRef = usersRef.child(authUID + "/" + cityKey);
    uidRef.update({
      "blogs": blogsArr
    });
  });

  $(document.body).on("click", ".edit-blog-button", function() {

    var editCol = $(this).parent();
    var wholeRow = editCol.parent();
    var targetCol = wholeRow[0].childNodes[0];
    var entryInfo = [targetCol.childNodes[0].innerText, targetCol.childNodes[2].innerText];

    userBlogTitle = entryInfo[0];
    userBlogContents = entryInfo[1];

    $("#myModal #blogPostTitle").val(entryInfo[0]);
    $("#myModal #blogPostEntry").val(entryInfo[1]);

    var blogPostTrash = $(this).parent();
    var column = blogPostTrash.prev();
    userTimeStamp = column.find("div:last").prev().html();

  });

  $(document.body).on("click", "#myModal #blogEditSave", function() {

    var newTitle = $("#myModal #blogPostTitle").val();
    var newEntry = $("#myModal #blogPostEntry").val();

    for (var i = 0; i < blogsArr.length; i++) {
      if (blogsArr[i].includes(userTimeStamp)) {
        blogsArr[i] = blogsArr[i].replace(userBlogContents, newEntry);
        blogsArr[i] = blogsArr[i].replace(userBlogTitle, newTitle);
        break;
      }
    }

    createBlogObj(blogsArr);

    $('#myModal').modal('toggle');

  });

  // add signout button and log the user out once clicked
  $("#logoutbtn").on("click", function() {
    firebase.auth().signOut();
    
    firebase.auth().signOut().then(function() {
      window.location.replace("login.html");
    }).catch(function(error) {
      console.log("test log out error");
    });
  });

  function getFirebaseAuthUID() {
    firebase.auth().onAuthStateChanged(function(user) {

      var user = firebase.auth().currentUser;
      var uid, name, email;


      if (user !== null) {
        
        // User is signed in.
        uid = user.uid;
        name = user.displayName;
        email = user.email;
        displayUserName(name);

        //Assign uid to global variable
        authUID = uid;

        checkFirebaseUser(uid, name, email);
      }
    });
  }

  function checkFirebaseUser(uid, name, email) {
    usersRef.on("child_added", function(snapshot) {
      var userKey = snapshot.key;

      if (uid === userKey) {
        getUserInfo(); // update
      } else {
        createUserObj(uid, name, email); // create
      }
    }, function(errorObject) {
      console.log("Errors handled: " + errorObject.code);
    });
  }

  function getUserInfo() {
    var uidRef = usersRef.child(authUID);
    var usernameRef = usersRef.child(authUID + "/credential");
    var place = retrieveLocation();

    usernameRef.once("value", function(cred) {
      var username = cred.val();
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
        "blogs": "",
        "list4clipboard": ""
      });
    }
  }

  function createPackingListObj(divArr, cbArr) {
    
    //Retrieve firebase
    var path = authUID + "/" + cityKey;
    var packRef = usersRef.child(path);
    var childKey;

    //Check if the packinglist is created?
    packRef.update({
      "packinglist": divArr,
      "list4clipboard": cbArr
    }, function(err) {
      if (err) {
        console.log(err);
      } else {
        renderPackingList(packListArr);
      }
    });
  }

  function createBlogObj(blogEntry) {
    var blogPath = authUID + "/" + cityKey;
    var blogRef = usersRef.child(blogPath);

    blogRef.update({
      "blogs": blogEntry
    }, function(err) {
      if (err) {
        console.log(err);
      } else {
        renderBlogs(blogsArr);
      }
    });
  }

  function formatFirebaseCityKey(city, trip_date) {
    var formattedKey = city.toLowerCase() + "_" + trip_date;
    
    // Replace non-word character with single "_"
    formattedKey = formattedKey.replace(/\W+/g, "_");
    cityKey = formattedKey;

    return formattedKey;
  }

  //function to display username
  function displayUserName(name) {
    var firstname = name.split(" ");
    $("#nameSpan").text(firstname[0]);
  }

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

  function clearArray(array) {
    while (array.length) {
      array.pop();
    }
  }
});
// End document
