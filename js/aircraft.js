const AircraftManager = {
  markers: new Map(),
  selectedIcao24: null,

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

  updateMarkers(flights, map, onSelect) {
    const currentIcao24s = new Set(flights.map(f => f.icao24));

    this.markers.forEach((marker, icao24) => {
      if (!currentIcao24s.has(icao24)) {
        map.removeLayer(marker);
        this.markers.delete(icao24);
      }
    });

    flights.forEach(flight => {
      const isSelected = flight.icao24 === this.selectedIcao24;
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

  clearSelection(map) {
    if (this.selectedIcao24) {
      const marker = this.markers.get(this.selectedIcao24);
      if (marker) {
        marker.setIcon(this.createIcon(marker.options?.heading || 0, false));
      }
      this.selectedIcao24 = null;
    }
  }
};
