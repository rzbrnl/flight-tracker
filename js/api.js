const DEMO_FLIGHTS = [
  { icao24: "3c6444", callsign: "DLH456", originCountry: "Germany", longitude: -3.7038, latitude: 40.4168, altitude: 11000, onGround: false, velocity: 250, heading: 45.2, verticalRate: 0, squawk: "2000", category: 4 },
  { icao24: "a12345", callsign: "IBE3210", originCountry: "Spain", longitude: -4.5, latitude: 40.8, altitude: 9500, onGround: false, velocity: 230, heading: 120.5, verticalRate: -2.5, squawk: "3456", category: 3 },
  { icao24: "abc123", callsign: "VY1234", originCountry: "Spain", longitude: -2.5, latitude: 41.2, altitude: 7800, onGround: false, velocity: 200, heading: 270.3, verticalRate: 1.2, squawk: "1234", category: 3 },
  { icao24: "def456", callsign: "RYR4567", originCountry: "Ireland", longitude: -5.2, latitude: 39.8, altitude: 12000, onGround: false, velocity: 280, heading: 90.1, verticalRate: 0, squawk: "5678", category: 4 },
  { icao24: "ghi789", callsign: "TAP789", originCountry: "Portugal", longitude: -6.8, latitude: 40.1, altitude: 10500, onGround: false, velocity: 260, heading: 180.7, verticalRate: -1.8, squawk: "9012", category: 4 },
  { icao24: "jkl012", callsign: "AFR1234", originCountry: "France", longitude: -1.5, latitude: 42.5, altitude: 8200, onGround: false, velocity: 220, heading: 315.4, verticalRate: 2.1, squawk: "3456", category: 3 },
  { icao24: "mno345", callsign: "BAW5678", originCountry: "United Kingdom", longitude: -7.5, latitude: 41.5, altitude: 11500, onGround: false, velocity: 270, heading: 60.8, verticalRate: -0.5, squawk: "7890", category: 4 },
  { icao24: "pqr678", callsign: "KLM9012", originCountry: "Netherlands", longitude: -2.0, latitude: 43.0, altitude: 9800, onGround: false, velocity: 240, heading: 225.2, verticalRate: 1.5, squawk: "2345", category: 4 },
];

const FlightAPI = {
  isUsingDemo: false,

  async getFlights(bounds) {
    try {
      let url = '/api.php';
      if (bounds) {
        const b = bounds;
        url += `?lamin=${b.south}&lomin=${b.west}&lamax=${b.north}&lomax=${b.east}`;
      }

      const response = await fetch(url);

      if (!response.ok) throw new Error('API error');

      const data = await response.json();
      this.isUsingDemo = false;
      return this.parseFlights(data.states || []);
    } catch (error) {
      console.warn('OpenSky API unavailable, using demo data:', error.message);
      this.isUsingDemo = true;
      return DEMO_FLIGHTS;
    }
  },

  parseFlights(states) {
    return states
      .filter(s => s[5] !== null && s[6] !== null)
      .map(s => ({
        icao24: s[0],
        callsign: (s[1] || '---').trim(),
        originCountry: s[2],
        longitude: s[5],
        latitude: s[6],
        altitude: s[7],
        onGround: s[8],
        velocity: s[9],
        heading: s[10],
        verticalRate: s[11],
        squawk: s[14],
        category: s[17]
      }));
  }
};
