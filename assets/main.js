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
let flightRoutes = {};
let airportCache = {};

let airportDb = null;

async function loadAirportDb() {
  if (airportDb) return;
  try {
    const resp = await fetch('/assets/airports.json');
    airportDb = await resp.json();
  } catch (e) {
    airportDb = {};
  }
}

function resolveAirport(code) {
  if (!airportDb || !code) return null;
  const info = airportDb[code.toUpperCase()] || airportDb[code];
  return info ? { iata: info.iata, name: info.name } : null;
}

function findNearestAirport(lat, lng) {
  if (!airportDb) return null;
  let best = null, bestDist = Infinity;
  for (const [icao, info] of Object.entries(airportDb)) {
    if (!info.lat || !info.lng) continue;
    const dlat = info.lat - lat, dlng = info.lng - lng;
    const dist = dlat * dlat + dlng * dlng;
    if (dist < bestDist) { bestDist = dist; best = { iata: info.iata, name: info.name, icao }; }
  }
  return best;
}

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

  const LocationControl = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd: function(map) {
      const btn = L.DomUtil.create('div');
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>';
      btn.style.cssText = 'background:rgba(15,15,26,0.85);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.06);border-radius:10px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#a1a1aa;transition:all 200ms ease;';
      btn.onmouseover = function() { this.style.color = '#fff'; this.style.background = 'rgba(255,255,255,0.08)'; };
      btn.onmouseout = function() { this.style.color = '#a1a1aa'; this.style.background = 'rgba(15,15,26,0.85)'; };
      L.DomEvent.disableClickPropagation(btn);
      btn.onclick = function() {
        map.locate({ setView: true, maxZoom: 10 });
      };
      return btn;
    }
  });
  new LocationControl().addTo(map);

  map.on('locationfound', function(e) {
    L.circle(e.latlng, { radius: e.accuracy / 2, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }).addTo(map);
  });

    async function loadAirports() {
    const center = map.getCenter();
    const zoom = map.getZoom();
    const radius = zoom < 6 ? 500 : zoom < 8 ? 300 : 150;
    const limit = zoom < 6 ? 20 : zoom < 8 ? 25 : 30;

    try {
      const response = await fetch(`/api.php?airports=1&lat=${center.lat}&lon=${center.lng}&radius=${radius}&limit=${limit}`);
      if (!response.ok) return;
      const data = await response.json();
      if (!data || !data.items) return;

      airportMarkers.forEach(m => map.removeLayer(m));
      airportMarkers.length = 0;

      data.items.forEach(a => {
        if (!a.location) return;
        const marker = L.marker([a.location.lat, a.location.lon], { icon: airportIcon });
        marker.bindTooltip(`<b>${a.iata || a.icao}</b> — ${a.name || a.shortName || ''}`, {
          direction: 'top',
          offset: [0, -12],
          className: 'airport-tooltip'
        });
        marker.on('click', () => {
          AircraftManager.clearSelection();
          selectedAirport = { iata: a.iata || a.icao, name: a.name || a.shortName, icao: a.icao, lat: a.location.lat, lng: a.location.lon, elevation: a.elevation ? a.elevation + ' ft' : '---' };
          showAirportInfo(selectedAirport);
        });
        marker.addTo(map);
        airportMarkers.push(marker);
      });
    } catch (e) {
      // Airport search failed, keep static airports
    }
  }

  const WEATHER_CODES = {
    0: 'Despejado', 1: 'Principalmente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
    45: 'Niebla', 48: 'Niebla con escarcha',
    51: 'Llovizna ligera', 53: 'Llovizna moderada', 55: 'Llovizna intensa',
    61: 'Lluvia ligera', 63: 'Lluvia moderada', 65: 'Lluvia intensa',
    71: 'Nevada ligera', 73: 'Nevada moderada', 75: 'Nevada intensa',
    80: 'Chubascos ligeros', 81: 'Chubascos moderados', 82: 'Chubascos intensos',
    95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta con granizo fuerte'
  };

  function calcFlightCategory(vis, cloudCover) {
    if (vis < 1600 || cloudCover > 89) return { code: 'LIFR', label: 'LIFR - Condiciones peligrosas', color: '#dc2626' };
    if (vis < 5000 || cloudCover > 69) return { code: 'IFR', label: 'IFR - Malas condiciones', color: '#ef4444' };
    if (vis < 8000 || cloudCover > 49) return { code: 'MVFR', label: 'MVFR - Condiciones marginales', color: '#3b82f6' };
    return { code: 'VFR', label: 'VFR - Buenas condiciones', color: '#22c55e' };
  }

  async function showAirportInfo(airport) {
    document.getElementById('sidebar-title').textContent = 'Información del Aeropuerto';
    document.getElementById('flight-route-section').style.display = 'none';
    document.getElementById('flight-details-section').style.display = 'none';
    document.getElementById('airport-info-section').style.display = 'block';

    document.getElementById('airport-name-full').textContent = airport.name;
    document.getElementById('airport-iata').textContent = airport.iata;
    document.getElementById('airport-lat').textContent = airport.lat.toFixed(4) + '°';
    document.getElementById('airport-lng').textContent = airport.lng.toFixed(4) + '°';

    try {
      const elevResp = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${airport.lat}&longitude=${airport.lng}`);
      const elevData = await elevResp.json();
      const elevMeters = elevData.elevation?.[0];
      if (elevMeters !== undefined && elevMeters !== null) {
        const elevFt = Math.round(elevMeters * 3.28084);
        document.getElementById('airport-elevation').textContent = `${elevFt} ft (${Math.round(elevMeters)} m)`;
        document.getElementById('airport-elevation').parentElement.style.display = '';
      } else {
        document.getElementById('airport-elevation').parentElement.style.display = 'none';
      }
    } catch (e) {
      document.getElementById('airport-elevation').parentElement.style.display = 'none';
    }

    document.getElementById('weather-temp').textContent = '---';
    document.getElementById('weather-wind').textContent = '---';
    document.getElementById('weather-visibility').textContent = '---';
    document.getElementById('weather-condition').textContent = '---';
    document.getElementById('weather-category').textContent = '---';

    sidebar.classList.remove('hidden');
    sidebar.classList.add('visible');

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${airport.lat}&longitude=${airport.lng}` +
        `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,weather_code,surface_pressure` +
        `&wind_speed_unit=kn&timezone=auto`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const c = data.current;
        if (c) {
          document.getElementById('weather-temp').textContent = c.temperature_2m !== undefined ? `${Math.round(c.temperature_2m)}°C` : '---';
          document.getElementById('weather-wind').textContent = c.wind_direction_10m !== undefined ? `${Math.round(c.wind_direction_10m)}° ${Math.round(c.wind_speed_10m)} kts` : '---';
          document.getElementById('weather-gusts').textContent = c.wind_gusts_10m !== undefined ? `${Math.round(c.wind_gusts_10m)} kts` : '---';
          const visMeters = c.visibility;
          document.getElementById('weather-visibility').textContent = visMeters !== undefined ? (visMeters >= 10000 ? '10+ km' : `${(visMeters / 1000).toFixed(1)} km`) : '---';
          document.getElementById('weather-condition').textContent = WEATHER_CODES[c.weather_code] || `Código ${c.weather_code}`;
          document.getElementById('weather-cloud-low').textContent = c.cloud_cover_low !== undefined ? `${c.cloud_cover_low}%` : '---';
          document.getElementById('weather-cloud-mid').textContent = c.cloud_cover_mid !== undefined ? `${c.cloud_cover_mid}%` : '---';
          document.getElementById('weather-cloud-high').textContent = c.cloud_cover_high !== undefined ? `${c.cloud_cover_high}%` : '---';
          document.getElementById('weather-humidity').textContent = c.relative_humidity_2m !== undefined ? `${c.relative_humidity_2m}%` : '---';
          document.getElementById('weather-pressure').textContent = c.surface_pressure !== undefined ? `${Math.round(c.surface_pressure)} hPa` : '---';

          const cloud = c.cloud_cover || 0;
          const cat = calcFlightCategory(visMeters || 10000, cloud);
          const catEl = document.getElementById('weather-category');
          catEl.textContent = cat.label;
          catEl.style.color = cat.color;

          try {
            const elevResp = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${airport.lat}&longitude=${airport.lng}`);
            const elevData = await elevResp.json();
            const elevMeters = elevData.elevation?.[0];
            if (elevMeters !== undefined && c.temperature_2m !== undefined) {
              const freezingAlt = elevMeters + (c.temperature_2m / -6.5 * 1000);
              document.getElementById('weather-freezing').textContent = freezingAlt > 0 ? `${Math.round(freezingAlt)} m` : 'A nivel del suelo';
            } else {
              document.getElementById('weather-freezing').textContent = '---';
            }
          } catch (e) {
            document.getElementById('weather-freezing').textContent = '---';
          }
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
      if (fData.status && fData.status !== '---') {
        statusEl.style.display = 'inline-block';
        statusEl.style.color = '#fff';
        if (fData.status === 'En vuelo' || fData.status === 'Despegado') {
          statusEl.style.background = '#22c55e';
        } else if (fData.status === 'Retrasado') {
          statusEl.style.background = '#ef4444';
        } else if (fData.status === 'Programado' || fData.status === 'Esperado') {
          statusEl.style.background = '#3b82f6';
        } else if (fData.status === 'Aterrizado' || fData.status === 'Llegado') {
          statusEl.style.background = '#6b7280';
        } else {
          statusEl.style.background = '#6b7280';
        }
      } else {
        statusEl.style.display = 'none';
      }

      if (fData.airline) {
        data.airline = fData.airline;
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

  async function onAircraftSelect(flight) {
    selectedAirport = null;
    sidebar.classList.remove('hidden');
    sidebar.classList.add('visible');

    document.getElementById('sidebar-title').textContent = 'Detalles del Vuelo';
    document.getElementById('flight-route-section').style.display = 'block';
    document.getElementById('flight-details-section').style.display = 'block';
    document.getElementById('airport-info-section').style.display = 'none';
    document.getElementById('flight-extra-info').style.display = 'none';

    const data = AircraftManager.flightData.get(flight.icao24) || {};
    document.getElementById('callsign').textContent = flight.callsign || '---';
    document.getElementById('country').textContent = flight.originCountry || '---';
    document.getElementById('velocity').textContent = data.velocity ? `${Math.round(data.velocity * 3.6)} km/h` : '---';
    document.getElementById('altitude').textContent = data.altitude ? `${Math.round(data.altitude)} m` : '---';
    document.getElementById('heading').textContent = data.heading !== null ? `${Math.round(data.heading)}°` : '---';
    document.getElementById('vertical-rate').textContent = data.verticalRate !== null ? `${data.verticalRate.toFixed(1)} m/s` : '---';
    document.getElementById('squawk').textContent = data.squawk || '---';
    document.getElementById('icao24').textContent = data.icao24 || flight.icao24 || '---';

    const cs = (flight.callsign || '').trim();
    if (!cs || cs === '---') {
      document.getElementById('origin-code').textContent = '---';
      document.getElementById('origin-name').textContent = 'Sin callsign';
      document.getElementById('dest-code').textContent = '---';
      document.getElementById('dest-name').textContent = '';
      return;
    }

    // Use AeroDataBox for flight details
    try {
      const now = new Date();
      const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
      const dateStr = localDate.toISOString().split('T')[0];
      const resp = await fetch(`/api.php?flight=${encodeURIComponent(cs)}&date=${dateStr}&t=${Date.now()}`, { signal: AbortSignal.timeout(8000) });
      const txt = await resp.text();
      if (txt && txt.trim() !== '' && txt.trim() !== '[]') {
        const arr = JSON.parse(txt);
        if (Array.isArray(arr) && arr.length > 0) {
          const d = arr[0];
          if (d.departure?.airport?.iata || d.arrival?.airport?.iata) {
            document.getElementById('origin-code').textContent = d.departure?.airport?.iata || '---';
            document.getElementById('origin-name').textContent = d.departure?.airport?.name || d.departure?.airport?.iata || 'Sin datos';
            document.getElementById('dest-code').textContent = d.arrival?.airport?.iata || '---';
            document.getElementById('dest-name').textContent = d.arrival?.airport?.name || d.arrival?.airport?.iata || 'Sin datos';
            if (d.airline?.name) {
              document.getElementById('flight-extra-info').style.display = 'block';
              document.getElementById('flight-airline').textContent = d.airline.name;
              document.getElementById('flight-aircraft').textContent = d.aircraft?.model || '---';
            }
            return;
          }
        }
      }
    } catch (e) {}

    document.getElementById('origin-code').textContent = '---';
    document.getElementById('origin-name').textContent = 'Sin datos';
    document.getElementById('dest-code').textContent = '---';
    document.getElementById('dest-name').textContent = '';
  }

  function formatTime(timeStr) {
    if (!timeStr) return '---';
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return timeStr.substring(11, 16) || '---';
      return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '---';
    }
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

  async function loadFlightRoutes() {
    try {
      const resp = await fetch('/api.php?flight_routes=1', { signal: AbortSignal.timeout(30000) });
      const data = await resp.json();
      if (data && typeof data === 'object') {
        flightRoutes = data;
      }
    } catch (e) {
      // Routes fetch failed
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
    moveTimeout = setTimeout(() => {
      refreshFlights();
      loadAirports();
    }, 500);
  });

  refreshFlights();
  loadFlightRoutes();
  loadAirports();
  AircraftManager.startAnimation();
  setInterval(refreshFlights, 30000);
  setInterval(loadFlightRoutes, 60000);
});
