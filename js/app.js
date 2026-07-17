const AIRPORTS = [
  { iata: "CEN", name: "Ciudad Obregón", lat: 27.3926, lng: -109.8329 },
  { iata: "HMO", name: "Hermosillo", lat: 29.0959, lng: -111.0479 },
  { iata: "GYM", name: "Guaymas", lat: 27.9689, lng: -110.9255 },
  { iata: "CJS", name: "Ciudad Juárez", lat: 31.6361, lng: -106.4286 },
  { iata: "TIJ", name: "Tijuana", lat: 32.5411, lng: -116.9700 },
  { iata: "SJD", name: "San José del Cabo", lat: 23.1518, lng: -109.7215 },
  { iata: "LMM", name: "Los Mochis", lat: 25.6852, lng: -109.0811 },
  { iata: "MTY", name: "Monterrey", lat: 25.7785, lng: -100.1069 },
  { iata: "GDL", name: "Guadalajara", lat: 20.5218, lng: -103.3106 },
  { iata: "MEX", name: "Ciudad de México", lat: 19.4363, lng: -99.0721 },
  { iata: "PHX", name: "Phoenix", lat: 33.4373, lng: -112.0078 },
  { iata: "LAX", name: "Los Ángeles", lat: 33.9416, lng: -118.4085 },
  { iata: "LAS", name: "Las Vegas", lat: 36.0840, lng: -115.1537 },
  { iata: "SAN", name: "San Diego", lat: 32.7338, lng: -117.1933 },
  { iata: "JFK", name: "Nueva York JFK", lat: 40.6413, lng: -73.7781 },
  { iata: "MIA", name: "Miami", lat: 25.7959, lng: -80.2870 },
];

document.addEventListener('DOMContentLoaded', () => {
  const map = FlightMap.init();
  const sidebar = document.getElementById('sidebar');
  const closeSidebar = document.getElementById('close-sidebar');
  const btnMoreInfo = document.getElementById('btn-more-info');
  const advancedInfo = document.getElementById('advanced-info');
  const searchInput = document.getElementById('search');
  let moveTimeout = null;
  let moreInfoExpanded = false;

  const airportIcon = L.divIcon({
    className: 'airport-marker',
    html: `<div style="color: #3b82f6; font-size: 18px; opacity: 0.7; transition: all 200ms ease; display: flex; align-items: center; justify-content: center;">
      <i class="hgi-stroke hgi-airplane-02"></i>
    </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

  AIRPORTS.forEach(a => {
    const marker = L.marker([a.lat, a.lng], { icon: airportIcon });
    marker.bindTooltip(`<b>${a.iata}</b> — ${a.name}`, {
      direction: 'top',
      offset: [0, -12],
      className: 'airport-tooltip'
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
    document.getElementById('velocity').textContent =
      data && data.velocity ? `${Math.round(data.velocity * 3.6)} km/h` : '---';
    document.getElementById('altitude').textContent =
      data && data.altitude ? `${Math.round(data.altitude)} m` : 'En tierra';
    document.getElementById('heading').textContent =
      data && data.heading !== null ? `${Math.round(data.heading)}°` : '---';
    document.getElementById('vertical-rate').textContent =
      data && data.verticalRate !== null ? `${data.verticalRate.toFixed(1)} m/s` : '---';
    document.getElementById('squawk').textContent =
      data && data.squawk ? data.squawk : '---';
  }

  function onAircraftSelect(flight) {
    updateFlightInfo(flight);
    sidebar.classList.remove('hidden');
    sidebar.classList.add('visible');
  }

  closeSidebar.addEventListener('click', () => {
    sidebar.classList.remove('visible');
    sidebar.classList.add('hidden');
    AircraftManager.clearSelection();
  });

  btnMoreInfo.addEventListener('click', () => {
    moreInfoExpanded = !moreInfoExpanded;
    advancedInfo.style.display = moreInfoExpanded ? 'block' : 'none';
    btnMoreInfo.innerHTML = moreInfoExpanded
      ? '<i class="hgi-stroke hgi-information-circle"></i> Less information'
      : '<i class="hgi-stroke hgi-information-circle"></i> More information';
  });

  map.on('click', (e) => {
    if (e.originalEvent.target.closest('.aircraft-marker')) return;
    sidebar.classList.remove('visible');
    sidebar.classList.add('hidden');
    AircraftManager.clearSelection();
  });

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (!query) {
      AircraftManager.markers.forEach((marker, icao24) => {
        const data = AircraftManager.flightData.get(icao24);
        if (data) {
          marker.setOpacity(1);
        }
      });
      return;
    }

    AircraftManager.markers.forEach((marker, icao24) => {
      const data = AircraftManager.flightData.get(icao24);
      if (data) {
        const matches = data.callsign.toLowerCase().includes(query) ||
                       icao24.toLowerCase().includes(query) ||
                       data.originCountry.toLowerCase().includes(query);
        marker.setOpacity(matches ? 1 : 0.1);
      }
    });
  });

  async function refreshFlights() {
    const bounds = getBounds();
    const flights = await FlightAPI.getFlights(bounds);

    AircraftManager.updateFromApi(flights, map, onAircraftSelect);

    document.getElementById('plane-count').textContent =
      flights.filter(f => !f.onGround).length;

    const countries = new Set(flights.map(f => f.originCountry));
    document.getElementById('country-count').textContent = countries.size;

    if (FlightAPI.isUsingDemo) {
      document.getElementById('data-source').textContent = 'Demo';
      document.querySelector('.bottom-stat.live').classList.remove('live');
    } else {
      document.getElementById('data-source').textContent = 'Live';
      document.querySelector('.bottom-stat.live').classList.add('live');
    }
  }

  map.on('moveend', () => {
    clearTimeout(moveTimeout);
    moveTimeout = setTimeout(refreshFlights, 500);
  });

  refreshFlights();
  AircraftManager.startAnimation();
  setInterval(refreshFlights, 30000);
});
