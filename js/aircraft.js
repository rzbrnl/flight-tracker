const AircraftManager = {
  markers: new Map(),
  trailLines: new Map(),
  selectedIcao24: null,
  lastApiTime: Date.now(),
  flightData: new Map(),

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

  calcPosition(lat, lng, heading, velocity, seconds) {
    if (!velocity || !heading || velocity < 1) return null;
    const R = 6371000;
    const d = velocity * seconds;
    const brng = heading * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const lng1 = lng * Math.PI / 180;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d / R) +
      Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng)
    );
    const lng2 = lng1 + Math.atan2(
      Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1),
      Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2)
    );
    return [lat2 * 180 / Math.PI, lng2 * 180 / Math.PI];
  },

  updateFromApi(flights, map) {
    const now = Date.now();
    this.lastApiTime = now;
    const currentIcao24s = new Set(flights.map(f => f.icao24));

    this.markers.forEach((marker, icao24) => {
      if (!currentIcao24s.has(icao24)) {
        map.removeLayer(marker);
        this.markers.delete(icao24);
      }
    });

    flights.forEach(flight => {
      this.flightData.set(flight.icao24, {
        lat: flight.latitude,
        lng: flight.longitude,
        heading: flight.heading,
        velocity: flight.velocity,
        onGround: flight.onGround,
        time: now
      });

      const existing = this.markers.get(flight.icao24);
      if (existing) {
        existing.setLatLng([flight.latitude, flight.longitude]);
        existing.setIcon(this.createIcon(flight.heading, flight.icao24 === this.selectedIcao24));
      } else {
        const marker = L.marker([flight.latitude, flight.longitude], {
          icon: this.createIcon(flight.heading, false)
        });
        marker.addTo(map);
        this.markers.set(flight.icao24, marker);
      }
    });
  },

  async selectAircraft(icao24, map, onSelect) {
    this.clearSelection();

    if (this.selectedIcao24 === icao24) {
      this.selectedIcao24 = null;
      return;
    }

    this.selectedIcao24 = icao24;

    const marker = this.markers.get(icao24);
    if (marker) {
      marker.setIcon(this.createIcon(this.flightData.get(icao24)?.heading || 0, true));
    }

    try {
      const response = await fetch(`/api.php?track=${icao24}`);
      if (response.ok) {
        const track = await response.json();
        if (track.path && track.path.length > 0) {
          const path = track.path
            .filter(p => p[1] !== null && p[2] !== null)
            .map(p => [p[1], p[2]]);

          if (path.length > 1) {
            const trailLine = L.polyline(path, {
              color: '#00d4ff',
              weight: 2,
              opacity: 0.6
            }).addTo(map);
            this.trailLines.set(icao24, trailLine);
          }
        }
      }
    } catch (e) {
      console.warn('Track fetch failed:', e);
    }

    const data = this.flightData.get(icao24);
    if (data) {
      onSelect({
        icao24,
        latitude: data.lat,
        longitude: data.lng,
        heading: data.heading,
        velocity: data.velocity
      });
    }
  },

  animate() {
    const now = Date.now();
    const elapsed = (now - this.lastApiTime) / 1000;

    this.flightData.forEach((data, icao24) => {
      if (data.onGround || !data.velocity || data.velocity < 1) return;

      const newPos = this.calcPosition(
        data.lat, data.lng,
        data.heading, data.velocity, elapsed
      );

      if (newPos) {
        const marker = this.markers.get(icao24);
        if (marker) {
          marker.setLatLng(newPos);
        }
      }
    });

    requestAnimationFrame(() => this.animate());
  },

  startAnimation() {
    this.animate();
  },

  clearSelection() {
    if (this.selectedIcao24) {
      const marker = this.markers.get(this.selectedIcao24);
      if (marker) {
        marker.setIcon(this.createIcon(this.flightData.get(this.selectedIcao24)?.heading || 0, false));
      }
      const trail = this.trailLines.get(this.selectedIcao24);
      if (trail) {
        this.trailLines.get(this.selectedIcao24).map?.removeLayer(trail);
        this.trailLines.delete(this.selectedIcao24);
      }
      this.selectedIcao24 = null;
    }
  }
};
