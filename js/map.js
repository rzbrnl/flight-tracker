const FlightMap = {
  map: null,

  init() {
    this.map = L.map('map', {
      center: [40.4168, -3.7038],
      zoom: 6,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);

    return this.map;
  },

  getMap() {
    return this.map;
  }
};
