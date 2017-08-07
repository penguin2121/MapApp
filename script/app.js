var map;
var infoWindow;
var viewmodel;
var bounds;

// This is a Pin constructor.
var Pin = function (title, location, content) {
    var self = this;

    self.title = ko.observable(title);
    self.lat = ko.observable(location.lat);
    self.lng = ko.observable(location.lng);
    self.content = ko.observable(content);
    self.nearestRestaurant = {name: '', address: '', url: ''};

    self.marker = new google.maps.Marker({
        position: location,
        title: self.title(),
        map: map,
        animation: google.maps.Animation.DROP
    });
    bounds.extend(self.marker.position);

    self.marker.addListener('click', function () {
        populateInfoWindow(this, infoWindow);
    });

    // Add animations to marker
    self.marker.addListener('click', function () {
        self.marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function () { self.marker.setAnimation(null); }, 1400);
    });

    // The code describing "is visible" allows markers to be switched on or off.
    self.isVisible = ko.observable(false);

    self.isVisible.subscribe(function (currentState) {
        if (currentState) {
            self.marker.setVisible(true);
        } else {
            self.marker.setVisible(false);
        }
    });
    self.isVisible(true);

    // This function will populate the infowindow when clicked.
    function populateInfoWindow(marker, infoWindow) {
        // Check to make sure the infowindow is not already opened on this marker.
        if (infoWindow.marker != marker) {
            infoWindow.marker = marker;
            // Fill in infowindow information.
            infoWindow.setContent('<div>' + marker.title + '</div>');
            // Grab nearest restaurant information.  AJAX call only used if first time to request info.
            if (self.nearestRestaurant.name != '') {
                fillInfoWindow();
            } else {
                var foursquare_url =  "https://api.foursquare.com/v2/venues/explore?" +
                    "client_id=0WJFTOOAZT02YAGKUXMKK250D5HZZXB4MWP5GW1PECQFUOSY" +
                    "&client_secret=YD4DXJOGYLKRCZSXZE2VYYKMNXCDGFUNYSFKJ4JMEIPYBL1V" +
                    "&v=20170806&ll=" + marker.position.lat().toString() + ',' + marker.position.lng().toString() +
                    "&query=food&limit=1&openNow=0&sortByDistance=1";
                $.ajax({url: foursquare_url, success: function (result) {
                    self.nearestRestaurant.name = result.response.groups[0].items[0].venue.name;
                    self.nearestRestaurant.address = result.response.groups[0].items[0].venue.location.address +
                        ", " +  result.response.groups[0].items[0].venue.location.city + ", " +
                        result.response.groups[0].items[0].venue.location.state;
                    self.nearestRestaurant.url = result.response.groups[0].items[0].venue.url;
                    fillInfoWindow();
                }});
            }

            function fillInfoWindow() {
                infoWindow.setContent('<div><strong>' + marker.title + '</strong><br>' + '<span>Nearby Restaurant: </span>' +
                    self.nearestRestaurant.name + '<br>' + self.nearestRestaurant.address + '<br><a href="' +
                    self.nearestRestaurant.url + '">Visit Restaurant Webpage</a></div>');
            }
            infoWindow.open(map, marker);
            // Make sure the marker property is cleared if the infowindow is closed.
            infoWindow.addListener('closeclick', function () {
                infoWindow.marker = null;
            });
        }
    }
};


// Overall ViewModel for the application
function MapViewModel() {
    var self = this;
    // Observable that stores the value of the filter text.
    self.filterText = ko.observable();

    // Create locations array
    self.locations = ko.observableArray([
        new Pin("Bay Meadows Park", {lat: 37.545770, lng: -122.297737}, "test1"),
        new Pin("Laurelwood Park", {lat: 37.525023, lng: -122.323973}, "test2"),
        new Pin("Edgewood Park", {lat: 37.473498, lng: -122.278592}, "test3"),
        new Pin("Seal Point Park", {lat: 37.571633, lng: -122.297371}, "test4"),
        new Pin("Sawyer Camp Trail", {lat: 37.530868, lng: -122.364362}, "test5")
    ]);

    // Observable that stores the current location.
    self.currentLocation = ko.observable(self.locations()[0]);

    // This function is called when a location link is clicked.  It receives the location as an argument and
    // simulates a click on the corresponding marker to open the info window.
    setLocation = function (clickedLocation) {
        self.currentLocation(clickedLocation);
        google.maps.event.trigger(clickedLocation.marker, 'click');
    };

    // Computed array to show filtered elements
    self.filteredLocations = ko.computed(function () {
        if (!self.filterText()) {
            // This loops through all markers and makes them visible
            // if there is no filter applied.
            for (var i = 0; i < self.locations().length; i++) {
                self.locations()[i].isVisible(self.locations()[i]);
            }
            return self.locations();
        } else {
            // If a filter is applied, this filters the list automatically and sets
            // the map visibility to true for only the filtered elements.
            var filter = self.filterText().toLowerCase();
            return ko.utils.arrayFilter(self.locations(), function (location) {
                var doesMatch = location.title().toLowerCase().includes(filter);
                location.isVisible(doesMatch);
                return doesMatch;
            });
        }
    }, this);
}


function initMap() {
    // Constructor creates a new map with center and zoom in Sam Mateo.
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 37.531268, lng: -122.299298},
        zoom: 13
    });


    infoWindow = new google.maps.InfoWindow();
    bounds = new google.maps.LatLngBounds();

    viewmodel = new MapViewModel();
    ko.applyBindings(viewmodel);
    // This will fit the map so that all markers are within the bounds.
    // The bounds are adjusted for each marker when it is added.
    map.fitBounds(bounds);
    // The following resizes/centers the map when the window size changes.
    google.maps.event.addDomListener(window, 'resize', function() {
        google.maps.event.trigger(map, "resize");
        map.fitBounds(bounds);
    });
}
