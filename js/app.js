document.addEventListener('DOMContentLoaded', () => {
  const map = FlightMap.init();
  const sidebar = document.getElementById('sidebar');
  const closeSidebar = document.getElementById('close-sidebar');
  let moveTimeout = null;

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
    document.getElementById('callsign').textContent = flight.callsign;
    document.getElementById('country').textContent = flight.originCountry;
    document.getElementById('icao24').textContent = flight.icao24;
    document.getElementById('altitude').textContent =
      flight.altitude ? `${Math.round(flight.altitude)} m` : 'En tierra';
    document.getElementById('velocity').textContent =
      flight.velocity ? `${Math.round(flight.velocity * 3.6)} km/h` : '---';
    document.getElementById('heading').textContent =
      flight.heading !== null ? `${Math.round(flight.heading)}°` : '---';
    document.getElementById('vertical-rate').textContent =
      flight.verticalRate !== null ? `${flight.verticalRate.toFixed(1)} m/s` : '---';
    document.getElementById('squawk').textContent = flight.squawk || '---';
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

  map.on('click', (e) => {
    if (e.originalEvent.target.closest('.aircraft-marker')) return;
    sidebar.classList.remove('visible');
    sidebar.classList.add('hidden');
    AircraftManager.clearSelection();
  });

  async function refreshFlights() {
    const bounds = getBounds();
    const flights = await FlightAPI.getFlights(bounds);

    AircraftManager.updateFromApi(flights, map, onAircraftSelect);

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

  refreshFlights();
  AircraftManager.startAnimation();
  setInterval(updateClock, 1000);
  setInterval(refreshFlights, 15000);
  updateClock();
});
