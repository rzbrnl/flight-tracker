const AIRPORTS = [
  { iata: "CEN", icao: "MMCN", name: "Ciudad Obregón", lat: 27.3926, lng: -109.8329, elevation: "62 m" },
  { iata: "HMO", icao: "MMHO", name: "Hermosillo", lat: 29.0959, lng: -111.0479, elevation: "191 m" },
  { iata: "GYM", icao: "MMGM", name: "Guaymas", lat: 27.9689, lng: -110.9255, elevation: "28 m" },
  { iata: "CJS", icao: "MMJC", name: "Ciudad Juárez", lat: 31.6361, lng: -106.4286, elevation: "1,187 m" },
  { iata: "TIJ", icao: "MMTJ", name: "Tijuana", lat: 32.5411, lng: -116.9700, elevation: "149 m" },
  { iata: "SJD", icao: "MMSD", name: "San José del Cabo", lat: 23.1518, lng: -109.7215, elevation: "37 m" },
  { iata: "LMM", icao: "MMLM", name: "Los Mochis", lat: 25.6852, lng: -109.0811, elevation: "3 m" },
  { iata: "MTY", icao: "MMMY", name: "Monterrey", lat: 25.7785, lng: -100.1069, elevation: "390 m" },
  { iata: "GDL", icao: "MMGL", name: "Guadalajara", lat: 20.5218, lng: -103.3106, elevation: "1,529 m" },
  { iata: "MEX", icao: "MMMX", name: "Ciudad de México", lat: 19.4363, lng: -99.0721, elevation: "2,250 m" },
  { iata: "PHX", icao: "KPHX", name: "Phoenix", lat: 33.4373, lng: -112.0078, elevation: "341 m" },
  { iata: "LAX", icao: "KLAX", name: "Los Ángeles", lat: 33.9416, lng: -118.4085, elevation: "38 m" },
  { iata: "LAS", icao: "KLAS", name: "Las Vegas", lat: 36.0840, lng: -115.1537, elevation: "512 m" },
  { iata: "SAN", icao: "KSAN", name: "San Diego", lat: 32.7338, lng: -117.1933, elevation: "5 m" },
  { iata: "JFK", icao: "KJFK", name: "Nueva York JFK", lat: 40.6413, lng: -73.7781, elevation: "4 m" },
  { iata: "MIA", icao: "KMIA", name: "Miami", lat: 25.7959, lng: -80.2870, elevation: "11 m" },
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
  const statusIndicator = document.getElementById('status-indicator');
  let moveTimeout = null;
  let moreInfoExpanded = false;
  let isDark = true;
  let selectedAirport = null;

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

  const airportMarkers = [];
  AIRPORTS.forEach(a => {
    const marker = L.marker([a.lat, a.lng], { icon: airportIcon });
    marker.bindTooltip(`<b>${a.iata}</b> — ${a.name}`, {
      direction: 'top',
      offset: [0, -12],
      className: 'airport-tooltip'
    });

    marker.on('click', () => {
      AircraftManager.clearSelection();
      selectedAirport = a;
      showAirportInfo(a);
    });

    marker.addTo(map);
    airportMarkers.push(marker);
  });

    const COVER_MAP = {
      'SKC': 'Despejado',
      'CLR': 'Despejado',
      'FEW': 'Pocas nubes',
      'SCT': 'Nubes dispersas',
      'BKN': 'Nublado',
      'OVC': 'Cubierto',
      'NSC': 'Sin nubes significativas',
      'NCD': 'Sin nubes detectadas'
    };

    const CAT_MAP = {
      'VFR': 'VFR - Buenas condiciones',
      'MVFR': 'MVFR - Condiciones marginales',
      'IFR': 'IFR - Malas condiciones',
      'LIFR': 'LIFR - Condiciones peligrosas'
    };

    async function showAirportInfo(airport) {
    document.getElementById('sidebar-title').textContent = 'Información del Aeropuerto';
    document.getElementById('flight-route-section').style.display = 'none';
    document.getElementById('flight-details-section').style.display = 'none';
    document.getElementById('airport-info-section').style.display = 'block';

    document.getElementById('airport-name-full').textContent = airport.name;
    document.getElementById('airport-iata').textContent = airport.iata;
    document.getElementById('airport-elevation').textContent = airport.elevation || '---';
    document.getElementById('airport-lat').textContent = airport.lat.toFixed(4) + '°';
    document.getElementById('airport-lng').textContent = airport.lng.toFixed(4) + '°';

    document.getElementById('weather-temp').textContent = '---';
    document.getElementById('weather-wind').textContent = '---';
    document.getElementById('weather-visibility').textContent = '---';
    document.getElementById('weather-condition').textContent = '---';
    document.getElementById('weather-category').textContent = '---';

    sidebar.classList.remove('hidden');
    sidebar.classList.add('visible');

    try {
      const response = await fetch(`/api.php?weather=${airport.icao}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const metar = data[0];
          document.getElementById('weather-temp').textContent = metar.temp !== undefined ? `${metar.temp}°C` : '---';
          document.getElementById('weather-wind').textContent = metar.wdir !== undefined ? `${metar.wdir}° ${metar.wspd} kts` : '---';
          document.getElementById('weather-visibility').textContent = metar.visib || '---';
          document.getElementById('weather-condition').textContent = COVER_MAP[metar.cover] || metar.cover || '---';

          const cat = metar.fltCat || '---';
          const catColors = { VFR: '#22c55e', MVFR: '#3b82f6', IFR: '#ef4444', LIFR: '#dc2626' };
          const catEl = document.getElementById('weather-category');
          catEl.textContent = CAT_MAP[cat] || cat;
          catEl.style.color = catColors[cat] || 'var(--text)';
        }
      }
    } catch (e) {
      console.warn('Weather fetch failed:', e);
    }
  }

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
    document.getElementById('sidebar-title').textContent = 'Detalles del Vuelo';
    document.getElementById('flight-route-section').style.display = 'block';
    document.getElementById('flight-details-section').style.display = 'block';
    document.getElementById('airport-info-section').style.display = 'none';

    document.getElementById('callsign').textContent = flight.callsign || '---';
    document.getElementById('country').textContent = flight.originCountry || '---';

    const fData = data || flight;
    document.getElementById('velocity').textContent =
      fData.velocity ? `${Math.round(fData.velocity * 3.6)} km/h` : '---';
    document.getElementById('altitude').textContent =
      fData.altitude ? `${Math.round(fData.altitude)} m` : 'En tierra';
    document.getElementById('heading').textContent =
      fData.heading !== null ? `${Math.round(fData.heading)}°` : '---';
    document.getElementById('vertical-rate').textContent =
      fData.verticalRate !== null ? `${fData.verticalRate.toFixed(1)} m/s` : '---';
    document.getElementById('squawk').textContent =
      fData.squawk || '---';
    document.getElementById('icao24').textContent = fData.icao24 || '---';

    const extraInfo = document.getElementById('flight-extra-info');
    if (fData.airline) {
      extraInfo.style.display = 'block';
      document.getElementById('flight-airline').textContent = fData.airline;
      document.getElementById('flight-aircraft').textContent = fData.aircraft || '---';
      document.getElementById('flight-registration').textContent = fData.registration || '---';
      document.getElementById('flight-scheduled-dep').textContent = fData.scheduledDep || '---';
      document.getElementById('flight-scheduled-arr').textContent = fData.scheduledArr || '---';
      document.getElementById('flight-actual-dep').textContent = fData.actualDep || '---';
      document.getElementById('flight-estimated-arr').textContent = fData.estimatedArr || '---';
      document.getElementById('flight-status').textContent = fData.status || '---';

      const statusEl = document.getElementById('flight-status');
      if (fData.status === 'En vuelo') {
        statusEl.style.color = '#22c55e';
      } else if (fData.status === 'Retrasado') {
        statusEl.style.color = '#ef4444';
      } else {
        statusEl.style.color = 'var(--accent)';
      }

      if (fData.origin) {
        document.getElementById('origin-code').textContent = fData.origin.iata;
        document.getElementById('origin-name').textContent = fData.origin.name;
      }
      if (fData.destination) {
        document.getElementById('dest-code').textContent = fData.destination.iata;
        document.getElementById('dest-name').textContent = fData.destination.name;
      }
    } else {
      extraInfo.style.display = 'none';
    }
  }

  function onAircraftSelect(flight) {
    selectedAirport = null;
    updateFlightInfo(flight);
    sidebar.classList.remove('hidden');
    sidebar.classList.add('visible');
  }

  closeSidebar.addEventListener('click', () => {
    sidebar.classList.remove('visible');
    sidebar.classList.add('hidden');
    AircraftManager.clearSelection();
    selectedAirport = null;
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
    if (e.originalEvent.target.closest('.airport-marker')) return;
    sidebar.classList.remove('visible');
    sidebar.classList.add('hidden');
    AircraftManager.clearSelection();
    selectedAirport = null;
  });

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (!query) {
      AircraftManager.markers.forEach((marker) => {
        marker.setOpacity(1);
      });
      airportMarkers.forEach(m => m.setOpacity(1));
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

    airportMarkers.forEach((m, i) => {
      const a = AIRPORTS[i];
      const matches = a.iata.toLowerCase().includes(query) ||
                     a.name.toLowerCase().includes(query);
      m.setOpacity(matches ? 1 : 0.1);
    });
  });

  function updateStatus(isDemo) {
    if (isDemo) {
      statusIndicator.classList.remove('live');
      statusIndicator.classList.add('demo');
      document.getElementById('data-source').textContent = 'Demo';
    } else {
      statusIndicator.classList.remove('demo');
      statusIndicator.classList.add('live');
      document.getElementById('data-source').textContent = 'En vivo';
    }
  }

  async function refreshFlights() {
    const bounds = getBounds();
    const flights = await FlightAPI.getFlights(bounds);

    AircraftManager.updateFromApi(flights, map, onAircraftSelect);

    document.getElementById('plane-count').textContent =
      flights.filter(f => !f.onGround).length;

    updateStatus(FlightAPI.isUsingDemo);

    if (selectedAirport) {
      showAirportInfo(selectedAirport);
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
