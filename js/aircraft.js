const AircraftManager = {
  markers: new Map(),
  trailLines: new Map(),
  selectedIcao24: null,
  lastApiTime: Date.now(),
  flightData: new Map(),
  onSelect: null,
  mapRef: null,

  AIRPLANE_SVG: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.41712 11.9183L7.73859 9.89656C8.29597 9.55783 8.57467 9.38846 8.76705 9.15616C9.59962 8.15082 8.86644 6.66595 8.99059 5.49686C9.1191 4.28671 10.2731 2.63158 11.4364 2.11845C11.7944 1.96052 12.2051 1.96052 12.5631 2.11845C13.7264 2.63158 14.8804 4.28671 15.0089 5.49686C15.1331 6.66595 14.3999 8.15082 15.2325 9.15616C15.4248 9.38846 15.7035 9.55783 16.2609 9.89656L19.5827 11.9182C20.5993 12.5369 20.9998 13.1973 20.9998 14.4395C20.9998 15.1156 20.7006 15.2968 20.0973 15.1588L14.2725 13.8261L14.0109 16.1149C13.9161 16.9448 13.8687 17.3598 14.0058 17.7398C14.327 18.63 15.4173 19.3591 16.0832 20.0066C16.4513 20.3644 16.8529 21.3934 16.4333 21.8613C16.1742 22.1503 15.7533 21.9157 15.4637 21.803L12.675 20.7184C12.3416 20.5887 12.1748 20.5239 11.9998 20.5239C11.8247 20.5239 11.6579 20.5887 11.3245 20.7184L8.53584 21.803C8.24619 21.9157 7.82534 22.1503 7.56625 21.8613C7.1466 21.3934 7.54825 20.3644 7.91628 20.0066C8.5822 19.3591 9.67255 18.63 9.9937 17.7398C10.1308 17.3598 10.0834 16.9448 9.98857 16.1149L9.72703 13.8261L3.90259 15.1587C3.29902 15.2968 2.99982 15.1155 3.00001 14.4391C3.00034 13.1971 3.4007 12.537 4.41712 11.9183Z"></path></svg>`,

  createIcon(heading, isSelected, isDimmed) {
    const rotation = heading || 0;
    const isLight = document.body.classList.contains('light');
    let color = isLight ? '#1a1a1a' : '#ffffff';
    let size = 20;
    let opacity = 1;

    if (isSelected) {
      color = '#3b82f6';
      size = 26;
    } else if (isDimmed) {
      opacity = 0.15;
    }

    return L.divIcon({
      className: `aircraft-marker ${isSelected ? 'selected' : ''} ${isDimmed ? 'dimmed' : ''}`,
      html: `<div style="transform: rotate(${rotation}deg); color: ${color}; width: ${size}px; height: ${size}px; opacity: ${opacity}; transition: all 200ms ease; filter: drop-shadow(0 0 4px ${color}40);">
        ${this.AIRPLANE_SVG}
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
      const isDimmed = this.selectedIcao24 !== null && !isSelected;
      const existing = this.markers.get(flight.icao24);

      if (existing) {
        existing.setLatLng([flight.latitude, flight.longitude]);
        existing.setIcon(this.createIcon(flight.heading, isSelected, isDimmed));
      } else {
        const marker = L.marker([flight.latitude, flight.longitude], {
          icon: this.createIcon(flight.heading, false, false)
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

    const data = this.flightData.get(icao24);
    const marker = this.markers.get(icao24);

    if (marker && data) {
      marker.setIcon(this.createIcon(data.heading, true, false));

      map.panTo([data.lat, data.lng], { animate: true, duration: 0.5 });
    }

    this.markers.forEach((m, id) => {
      if (id !== icao24) {
        m.setIcon(this.createIcon(this.flightData.get(id)?.heading || 0, false, true));
      }
    });

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
              color: '#3b82f6',
              weight: 2,
              opacity: 0.8,
              dashArray: '6, 8',
              lineCap: 'round'
            }).addTo(map);
            this.trailLines.set(icao24, trailLine);
          }
        }
      }
    } catch (e) {
      console.warn('Track fetch failed:', e);
    }

    if (data && onSelect) {
      onSelect({
        icao24,
        callsign: data.callsign,
        originCountry: data.originCountry,
        altitude: data.altitude,
        squawk: data.squawk,
        verticalRate: data.verticalRate,
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
      this.markers.forEach((m, id) => {
        const data = this.flightData.get(id);
        m.setIcon(this.createIcon(data?.heading || 0, false, false));
      });

      const trail = this.trailLines.get(this.selectedIcao24);
      if (trail && this.mapRef) {
        this.mapRef.removeLayer(trail);
        this.trailLines.delete(this.selectedIcao24);
      }
      this.selectedIcao24 = null;
    }
  }
};
