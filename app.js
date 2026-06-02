let map;
let userMarker;
let watchId;
let lastPosition = null;

// Default center (San Francisco)
const defaultCenter = { lat: 37.7749, lng: -122.4194 };

/**
 * Initialize Google Map
 */
function initMap() {
    console.log("Initializing Map...");
    
    // Create map with custom light theme
    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultCenter,
        zoom: 15,
        disableDefaultUI: true,
        styles: lightMapStyle, // Defined below
        gestureHandling: "greedy"
    });

    // Initialize user marker (hidden until position found)
    userMarker = new google.maps.Marker({
        position: defaultCenter,
        map: map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: "#6366f1",
            fillOpacity: 1,
            strokeWeight: 4,
            strokeColor: "#ffffff",
        },
        title: "Your Location",
        visible: false,
        optimized: false // Allows for smoother animation
    });

    // Start tracking location
    startTracking();

    // UI Controls
    document.getElementById('center-me').addEventListener('click', () => {
        if (lastPosition) {
            map.panTo(lastPosition);
            map.setZoom(17);
        }
    });

    // Search Box Implementation
    const input = document.getElementById("search-input");
    const searchBox = new google.maps.places.SearchBox(input);

    searchBox.addListener("places_changed", () => {
        const places = searchBox.getPlaces();
        if (places.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        places.forEach((place) => {
            if (!place.geometry || !place.geometry.location) return;
            if (place.geometry.viewport) {
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
        });
        map.fitBounds(bounds);
    });
}

/**
 * Start Real-Time Geolocation Tracking
 */
function startTracking() {
    if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const newPos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                updateUI(position.coords);
                
                if (!lastPosition) {
                    // First time: center map and show marker
                    map.setCenter(newPos);
                    userMarker.setPosition(newPos);
                    userMarker.setVisible(true);
                    lastPosition = newPos;
                } else {
                    // Smooth move marker
                    animateMarker(userMarker, newPos, 1000);
                    lastPosition = newPos;
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                document.getElementById('status-text').innerText = "Location Error";
                document.querySelector('.pulse').style.backgroundColor = "#ef4444";
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
            }
        );
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

/**
 * Update UI Info Panel
 */
function updateUI(coords) {
    document.getElementById('lat-val').innerText = coords.latitude.toFixed(4);
    document.getElementById('lng-val').innerText = coords.longitude.toFixed(4);
    document.getElementById('acc-val').innerText = `${Math.round(coords.accuracy)}m`;
    
    // Calculate speed (convert m/s to km/h)
    const speed = coords.speed ? (coords.speed * 3.6).toFixed(1) : "0.0";
    document.getElementById('speed-val').innerText = `${speed} km/h`;
    
    // Dynamically update status color based on accuracy
    const pulse = document.querySelector('.pulse');
    if (coords.accuracy < 20) {
        pulse.style.backgroundColor = "#10b981"; // High accuracy (green)
        pulse.style.boxShadow = "0 0 12px #10b981";
    } else {
        pulse.style.backgroundColor = "#f59e0b"; // Low accuracy (orange)
        pulse.style.boxShadow = "0 0 12px #f59e0b";
    }
}

/**
 * Smoothly Animate Marker Movement
 */
function animateMarker(marker, newPosition, duration) {
    const startPosition = marker.getPosition();
    const startTime = performance.now();

    function frame(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Linear interpolation
        const lat = startPosition.lat() + (newPosition.lat - startPosition.lat()) * progress;
        const lng = startPosition.lng() + (newPosition.lng - startPosition.lng()) * progress;

        marker.setPosition({ lat, lng });

        if (progress < 1) {
            requestAnimationFrame(frame);
        }
    }

    requestAnimationFrame(frame);
}

// Premium Light Map Style Configuration
const lightMapStyle = [
    { "elementType": "geometry", "stylers": [{ "color": "#f1f5f9" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#64748b" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f1f5f9" }] },
    { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#e2e8f0" }] },
    { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#e2e8f0" }] },
    { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#ffffff" }] },
    { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#cbd5e1" }] }
];
