const AircraftManager = {
  markers: new Map(),
  trailLines: new Map(),
  selectedIcao24: null,
  lastApiTime: Date.now(),
  flightData: new Map(),
  onSelect: null,
  mapRef: null,

  createIcon(heading, isSelected) {
    const rotation = heading || 0;
    const color = isSelected ? '#00d4ff' : '#ffffff';
    const size = isSelected ? 32 : 24;

    return L.divIcon({
      className: `aircraft-marker ${isSelected ? 'selected' : ''}`,
      html: `<div style="transform: rotate(${rotation}deg); color: ${color}; font-size: ${size}px; filter: drop-shadow(0 0 4px ${color}40); display: flex; align-items: center; justify-content: center;">
        <i class="hgi-stroke hgi-airplane"></i>
      </div>`,
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
    this.mapRef = map;
    this.onSelect = onSelect;
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
        callsign: flight.callsign,
        originCountry: flight.originCountry,
        altitude: flight.altitude,
        squawk: flight.squawk,
        verticalRate: flight.verticalRate,
        time: now
      });

      const isSelected = flight.icao24 === this.selectedIcao24;
      const existing = this.markers.get(flight.icao24);

      if (existing) {
        existing.setLatLng([flight.latitude, flight.longitude]);
        existing.setIcon(this.createIcon(flight.heading, isSelected));
      } else {
        const marker = L.marker([flight.latitude, flight.longitude], {
          icon: this.createIcon(flight.heading, false)
        });

        const self = this;
        marker.on('click', function(e) {
          L.DomEvent.stopPropagation(e);
          self.selectAircraft(flight.icao24, map, onSelect);
        });

        marker.addTo(map);
        this.markers.set(flight.icao24, marker);
      }
    });
  },

  async selectAircraft(icao24, map, onSelect) {
    if (this.selectedIcao24 === icao24) {
      this.clearSelection();
      return;
    }

    this.clearSelection();
    this.selectedIcao24 = icao24;

    const marker = this.markers.get(icao24);
    if (marker) {
      marker.setIcon(this.createIcon(this.flightData.get(icao24)?.heading || 0, true));
    }

    try {
      const response = await fetch(`/api.php?track=${icao24}`);
      if (response.ok) {
        const text = await response.text();
        const track = JSON.parse(text);
        if (track.path && track.path.length > 0) {
          const path = track.path
            .filter(p => p[1] !== null && p[2] !== null)
            .map(p => [p[1], p[2]]);

          if (path.length > 1) {
            const trailLine = L.polyline(path, {
              color: '#00d4ff',
              weight: 2,
              opacity: 0.6,
              dashArray: '5, 10'
            }).addTo(map);
            this.trailLines.set(icao24, trailLine);
          }
        }
      }
    } catch (e) {
      console.warn('Track fetch failed:', e);
    }

    const data = this.flightData.get(icao24);
    if (data && onSelect) {
      onSelect({
        icao24,
        callsign: data.callsign,
        originCountry: data.originCountry,
        altitude: data.altitude,
        squawk: data.squawk,
        verticalRate: data.verticalRate
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
      if (trail && this.mapRef) {
        this.mapRef.removeLayer(trail);
        this.trailLines.delete(this.selectedIcao24);
      }
      this.selectedIcao24 = null;
    }
  }
};
