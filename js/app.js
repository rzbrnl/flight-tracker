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

const LIGHT_TILE = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const DARK_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

let currentTile = null;

document.addEventListener('DOMContentLoaded', () => {
  const map = FlightMap.init();
  const sidebar = document.getElementById('sidebar');
  const closeSidebar = document.getElementById('close-sidebar');
  const btnMoreInfo = document.getElementById('btn-more-info');
  const advancedInfo = document.getElementById('advanced-info');
  const searchInput = document.getElementById('search');
  const btnTheme = document.getElementById('btn-theme');
  let moveTimeout = null;
  let moreInfoExpanded = false;
  let isDark = true;

  const AIRPORT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.1228 6H3.87715C3.39271 6 3 6.39271 3 6.87715C3 6.95865 3.01136 7.03976 3.03375 7.11812L4.17111 11.0989C4.57006 12.4952 4.76954 13.1934 5.30421 13.5967C5.83888 14 6.56499 14 8.01721 14H15.9828C17.435 14 18.1611 14 18.6958 13.5967C19.2305 13.1934 19.4299 12.4952 19.8289 11.0989L20.9663 7.11812C20.9886 7.03976 21 6.95865 21 6.87715C21 6.39271 20.6073 6 20.1228 6Z"></path><path d="M16 6L15 14M9 14L8 6"></path><path d="M15 14V22M9 14V22"></path><path d="M10 2H14"></path><path d="M12 2V6"></path></svg>`;

  const isLight = document.body.classList.contains('light');
  const airportIcon = L.divIcon({
    className: 'airport-marker',
    html: `<div style="color: ${isLight ? '#2563eb' : '#3b82f6'}; width: 18px; height: 18px; opacity: 0.7; transition: all 200ms ease;">
      ${AIRPORT_SVG}
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

  function toggleTheme() {
    isDark = !isDark;
    document.body.classList.toggle('light', !isDark);

    const iconSun = btnTheme.querySelector('.icon-sun');
    const iconMoon = btnTheme.querySelector('.icon-moon');
    iconSun.style.display = isDark ? 'block' : 'none';
    iconMoon.style.display = isDark ? 'none' : 'block';

    if (currentTile) {
      map.removeLayer(currentTile);
    }
    currentTile = L.tileLayer(isDark ? DARK_TILE : LIGHT_TILE, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);
  }

  btnTheme.addEventListener('click', toggleTheme);

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
      ? '<svg class="icon" width="14" height="14"><use href="#icon-info"></use></svg> Menos información'
      : '<svg class="icon" width="14" height="14"><use href="#icon-info"></use></svg> Más información';
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

    if (FlightAPI.isUsingDemo) {
      document.getElementById('data-source').textContent = 'Demo';
      document.querySelector('.bottom-stat.live').classList.remove('live');
    } else {
      document.getElementById('data-source').textContent = 'En vivo';
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
