const AircraftManager = {
  markers: new Map(),
  trails: new Map(),
  lastPositions: new Map(),
  flightData: new Map(),
  selectedIcao24: null,
  lastApiTime: Date.now(),
  map: null,

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

  updateFromApi(flights, map, onSelect) {
    this.map = map;
    const now = Date.now();
    this.lastApiTime = now;
    const currentIcao24s = new Set(flights.map(f => f.icao24));

    this.markers.forEach((marker, icao24) => {
      if (!currentIcao24s.has(icao24)) {
        map.removeLayer(marker);
        this.markers.delete(icao24);
        if (this.trails.has(icao24)) {
          map.removeLayer(this.trails.get(icao24));
          this.trails.delete(icao24);
        }
      }
    });

    flights.forEach(flight => {
      const isSelected = flight.icao24 === this.selectedIcao24;

      this.flightData.set(flight.icao24, {
        lat: flight.latitude,
        lng: flight.longitude,
        heading: flight.heading,
        velocity: flight.velocity,
        onGround: flight.onGround,
        time: now
      });

      if (!this.lastPositions.has(flight.icao24)) {
        this.lastPositions.set(flight.icao24, []);
      }
      const hist = this.lastPositions.get(flight.icao24);
      hist.push([flight.latitude, flight.longitude]);
      if (hist.length > 30) hist.shift();

      if (!this.trails.has(flight.icao24) && hist.length > 1) {
        const trailLine = L.polyline(hist, {
          color: '#ffffff',
          weight: 1,
          opacity: 0.3
        }).addTo(map);
        this.trails.set(flight.icao24, trailLine);
      } else if (this.trails.has(flight.icao24)) {
        this.trails.get(flight.icao24).setLatLngs(hist);
      }

      const existing = this.markers.get(flight.icao24);
      if (existing) {
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

  animate() {
    if (!this.map) return;
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
        const trail = this.trails.get(icao24);
        if (trail) {
          const pts = trail.getLatLngs();
          if (pts.length > 0) {
            const lastPt = pts[pts.length - 1];
            const lastLat = lastPt.lat || lastPt[0];
            const lastLng = lastPt.lng || lastPt[1];
            if (Math.abs(newPos[0] - lastLat) > 0.0001 || Math.abs(newPos[1] - lastLng) > 0.0001) {
              trail.addLatLng(newPos);
              const pts2 = trail.getLatLngs();
              if (pts2.length > 30) {
                trail.setLatLngs(pts2.slice(-30));
              }
            }
          }
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
