const AircraftManager = {
  markers: new Map(),
  trails: new Map(),
  history: new Map(),
  selectedIcao24: null,
  lastUpdate: Date.now(),
  animFrame: null,

  createIcon(heading, isSelected) {
    const rotation = heading || 0;
    const color = isSelected ? '#00d4ff' : '#ffffff';
    const size = isSelected ? 28 : 24;

    return L.divIcon({
      className: `aircraft-marker ${isSelected ? 'selected' : ''}`,
      html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" style="transform: rotate(${rotation}deg)">
        <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  },

  calculateNewPosition(lat, lng, heading, velocity, seconds) {
    if (!velocity || !heading) return { lat, lng };
    const R = 6371000;
    const d = velocity * seconds;
    const bearing = heading * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const lng1 = lng * Math.PI / 180;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d / R) + Math.cos(lat1) * Math.sin(d / R) * Math.cos(bearing));
    const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(d / R) * Math.cos(lat1), Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2));
    return { lat: lat2 * 180 / Math.PI, lng: lng2 * 180 / Math.PI };
  },

  updateMarkers(flights, map, onSelect) {
    const now = Date.now();
    const elapsed = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;

    const currentIcao24s = new Set(flights.map(f => f.icao24));

    this.markers.forEach((marker, icao24) => {
      if (!currentIcao24s.has(icao24)) {
        map.removeLayer(marker);
        this.markers.delete(icao24);
        if (this.trails.has(icao24)) {
          map.removeLayer(this.trails.get(icao24));
          this.trails.delete(icao24);
        }
        this.history.delete(icao24);
      }
    });

    flights.forEach(flight => {
      const isSelected = flight.icao24 === this.selectedIcao24;
      const existing = this.markers.get(flight.icao24);
      const prevData = this.history.get(flight.icao24);

      if (!this.history.has(flight.icao24)) {
        this.history.set(flight.icao24, []);
      }
      const hist = this.history.get(flight.icao24);
      hist.push({ lat: flight.latitude, lng: flight.longitude, time: now });
      if (hist.length > 30) hist.shift();

      if (existing && prevData && !flight.onGround && flight.velocity > 0) {
        const pos = this.calculateNewPosition(
          prevData.lat, prevData.lng,
          flight.heading, flight.velocity, elapsed
        );
        existing.setLatLng([pos.lat, pos.lng]);
        existing.setIcon(this.createIcon(flight.heading, isSelected));

        const trail = this.trails.get(flight.icao24);
        if (trail) {
          const pts = hist.map(h => [h.lat, h.lng]);
          trail.setLatLngs(pts);
        } else if (hist.length > 1) {
          const trailLine = L.polyline(hist.map(h => [h.lat, h.lng]), {
            color: isSelected ? '#00d4ff' : '#ffffff',
            weight: isSelected ? 2 : 1,
            opacity: isSelected ? 0.6 : 0.3
          }).addTo(map);
          this.trails.set(flight.icao24, trailLine);
        }
      } else if (existing) {
        existing.setLatLng([flight.latitude, flight.longitude]);
        existing.setIcon(this.createIcon(flight.heading, isSelected));
      } else {
        const marker = L.marker([flight.latitude, flight.longitude], {
          icon: this.createIcon(flight.heading, isSelected)
        });

        marker.on('click', () => {
          this.selectedIcao24 = flight.icao24;
          onSelect(flight);
        });

        marker.addTo(map);
        this.markers.set(flight.icao24, marker);
      }
    });
  },

  clearSelection(map) {
    if (this.selectedIcao24) {
      const marker = this.markers.get(this.selectedIcao24);
      if (marker) {
        marker.setIcon(this.createIcon(marker.options?.heading || 0, false));
      }
      const trail = this.trails.get(this.selectedIcao24);
      if (trail) {
        trail.setStyle({ color: '#ffffff', weight: 1, opacity: 0.3 });
      }
      this.selectedIcao24 = null;
    }
  }
};
