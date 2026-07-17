const AIRPORTS = [
  { iata: "CEN", name: "Ciudad Obregón", lat: 27.3926, lng: -109.8329 },
  { iata: "HMO", name: "Hermosillo", lat: 29.0959, lng: -111.0479 },
  { iata: "GYM", name: "Guaymas", lat: 27.9689, lng: -110.9255 },
  { iata: "CJS", name: "Ciudad Juárez", lat: 31.6361, lng: -106.4286 },
  { iata: "TIJ", name: "Tijuana", lat: 32.5411, lng: -116.9700 },
  { iata: "SJD", name: "San José del Cabo", lat: 23.1518, lng: -109.7215 },
  { iata: "LMM", name: "Los Mochis", lat: 25.6852, lng: -109.0811 },
  { iata: "ZCL", name: "Zacatecas", lat: 22.8974, lng: -102.6826 },
  { iata: "MTY", name: "Monterrey", lat: 25.7785, lng: -100.1069 },
  { iata: "GDL", name: "Guadalajara", lat: 20.5218, lng: -103.3106 },
  { iata: "MEX", name: "Ciudad de México", lat: 19.4363, lng: -99.0721 },
  { iata: "PHX", name: "Phoenix", lat: 33.4373, lng: -112.0078 },
  { iata: "LAX", name: "Los Ángeles", lat: 33.9416, lng: -118.4085 },
  { iata: "LAS", name: "Las Vegas", lat: 36.0840, lng: -115.1537 },
  { iata: "SAN", name: "San Diego", lat: 32.7338, lng: -117.1933 },
  { iata: "NRT", name: "Tokio Narita", lat: 35.7647, lng: 140.3864 },
  { iata: "CDG", name: "París CDG", lat: 49.0097, lng: 2.5479 },
  { iata: "LHR", name: "Londres Heathrow", lat: 51.4700, lng: -0.4543 },
  { iata: "JFK", name: "Nueva York JFK", lat: 40.6413, lng: -73.7781 },
  { iata: "MIA", name: "Miami", lat: 25.7959, lng: -80.2870 },
];

document.addEventListener('DOMContentLoaded', () => {
  const map = FlightMap.init();
  const sidebar = document.getElementById('sidebar');
  const closeSidebar = document.getElementById('close-sidebar');
  let moveTimeout = null;

  const airportIcon = L.divIcon({
    className: 'airport-marker',
    html: `<svg width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="4" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
      <circle cx="8" cy="8" r="1.5" fill="#f59e0b"/>
    </svg>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  AIRPORTS.forEach(a => {
    const marker = L.marker([a.lat, a.lng], { icon: airportIcon });
    marker.bindTooltip(`<b>${a.iata}</b> - ${a.name}`, {
      permanent: false,
      direction: 'top',
      offset: [0, -10]
    });
    marker.addTo(map);
  });

  function getBounds() {
    const b = map.getBounds();
    return {
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest()
    };
  }

  function updateFlightInfo(flight) {
    const data = AircraftManager.flightData.get(flight.icao24);
    document.getElementById('callsign').textContent = flight.callsign || '---';
    document.getElementById('country').textContent = flight.originCountry || '---';
    document.getElementById('icao24').textContent = flight.icao24;
    document.getElementById('altitude').textContent =
      data && data.altitude ? `${Math.round(data.altitude)} m` : 'En tierra';
    document.getElementById('velocity').textContent =
      data && data.velocity ? `${Math.round(data.velocity * 3.6)} km/h` : '---';
    document.getElementById('heading').textContent =
      data && data.heading !== null ? `${Math.round(data.heading)}°` : '---';
    document.getElementById('vertical-rate').textContent =
      data && data.verticalRate !== null ? `${data.verticalRate.toFixed(1)} m/s` : '---';
    document.getElementById('squawk').textContent =
      data && data.squawk ? data.squawk : '---';
  }

  function onAircraftSelect(flight) {
    const data = AircraftManager.flightData.get(flight.icao24);
    if (data) {
      flight.callsign = flight.callsign || '---';
      flight.originCountry = flight.originCountry || '---';
    }
    updateFlightInfo(flight);
    sidebar.classList.remove('hidden');
    sidebar.classList.add('visible');
  }

  closeSidebar.addEventListener('click', () => {
    sidebar.classList.remove('visible');
    sidebar.classList.add('hidden');
    AircraftManager.clearSelection();
  });

  map.on('click', (e) => {
    if (e.originalEvent.target.closest('.aircraft-marker')) return;
    sidebar.classList.remove('visible');
    sidebar.classList.add('hidden');
    AircraftManager.clearSelection();
  });

  map.eachLayer(layer => {
    if (layer instanceof L.Marker && !layer.options?.icon?.options?.className?.includes('airport')) {
      layer.on('click', () => {
        const icao24 = Object.keys(AircraftManager.markers).find(
          k => AircraftManager.markers.get(k) === layer
        );
        if (icao24) {
          AircraftManager.selectAircraft(icao24, map, onAircraftSelect);
        }
      });
    }
  });

  async function refreshFlights() {
    const bounds = getBounds();
    const flights = await FlightAPI.getFlights(bounds);

    AircraftManager.updateFromApi(flights, map);

    document.getElementById('plane-count').textContent =
      flights.filter(f => !f.onGround).length;

    if (FlightAPI.isUsingDemo) {
      document.getElementById('data-source').textContent = 'Demo';
    } else {
      document.getElementById('data-source').textContent = 'Live';
    }

    if (AircraftManager.selectedIcao24) {
      const selected = flights.find(f => f.icao24 === AircraftManager.selectedIcao24);
      if (selected) updateFlightInfo(selected);
    }
  }

  function updateClock() {
    const now = new Date();
    document.getElementById('last-update').textContent =
      now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  map.on('moveend', () => {
    clearTimeout(moveTimeout);
    moveTimeout = setTimeout(refreshFlights, 500);
  });

  AircraftManager.markers.forEach((marker, icao24) => {
    marker.on('click', () => {
      AircraftManager.selectAircraft(icao24, map, onAircraftSelect);
    });
  });

  refreshFlights();
  AircraftManager.startAnimation();
  setInterval(updateClock, 1000);
  setInterval(refreshFlights, 15000);
  updateClock();
});
