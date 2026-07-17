const DEMO_FLIGHTS = [
  {
    icao24: "a1b2c3", callsign: "VOI3256", originCountry: "Mexico",
    longitude: -109.85, latitude: 28.5, altitude: 10500, onGround: false,
    velocity: 245, heading: 165, verticalRate: -2.1, squawk: "4521", category: 4,
    airline: "Volaris", flightNumber: "VOI3256", aircraft: "Airbus A320-271N",
    registration: "N518VL", origin: { iata: "TIJ", name: "Tijuana" },
    destination: { iata: "LMM", name: "Los Mochis" },
    scheduledDep: "10:50", scheduledArr: "12:40",
    actualDep: "10:55", estimatedArr: "12:45",
    status: "En vuelo"
  },
  {
    icao24: "d4e5f6", callsign: "AMX214", originCountry: "Mexico",
    longitude: -100.5, latitude: 24.8, altitude: 11200, onGround: false,
    velocity: 260, heading: 340, verticalRate: 0, squawk: "1234", category: 4,
    airline: "Aeroméxico", flightNumber: "AMX214", aircraft: "Boeing 737-800",
    registration: "XA-AMX", origin: { iata: "MTY", name: "Monterrey" },
    destination: { iata: "MEX", name: "Ciudad de México" },
    scheduledDep: "09:00", scheduledArr: "10:30",
    actualDep: "09:02", estimatedArr: "10:28",
    status: "En vuelo"
  },
  {
    icao24: "g7h8i9", callsign: "VY4521", originCountry: "Mexico",
    longitude: -103.5, latitude: 21.5, altitude: 8900, onGround: false,
    velocity: 220, heading: 45, verticalRate: 3.2, squawk: "5678", category: 3,
    airline: "VivaAerobus", flightNumber: "VY4521", aircraft: "Airbus A320-200",
    registration: "XA-VIB", origin: { iata: "GDL", name: "Guadalajara" },
    destination: { iata: "CJS", name: "Ciudad Juárez" },
    scheduledDep: "11:15", scheduledArr: "13:45",
    actualDep: "11:20", estimatedArr: "13:50",
    status: "En vuelo"
  },
  {
    icao24: "j1k2l3", callsign: "DLH542", originCountry: "Germany",
    longitude: -112.5, latitude: 34.2, altitude: 12100, onGround: false,
    velocity: 280, heading: 250, verticalRate: -1.5, squawk: "2345", category: 4,
    airline: "Deutsche Lufthansa", flightNumber: "DLH542", aircraft: "Airbus A350-900",
    registration: "D-AIXA", origin: { iata: "FRA", name: "Frankfurt" },
    destination: { iata: "LAX", name: "Los Ángeles" },
    scheduledDep: "14:00", scheduledArr: "16:30",
    actualDep: "14:05", estimatedArr: "16:35",
    status: "En vuelo"
  },
  {
    icao24: "m4n5o6", callsign: "AMX678", originCountry: "Mexico",
    longitude: -99.5, latitude: 19.8, altitude: 7500, onGround: false,
    velocity: 195, heading: 90, verticalRate: 4.5, squawk: "6789", category: 3,
    airline: "Aeroméxico", flightNumber: "AMX678", aircraft: "Boeing 787-9",
    registration: "XA-ADN", origin: { iata: "MEX", name: "Ciudad de México" },
    destination: { iata: "JFK", name: "Nueva York JFK" },
    scheduledDep: "08:00", scheduledArr: "14:30",
    actualDep: "08:03", estimatedArr: "14:35",
    status: "En vuelo"
  },
  {
    icao24: "p7q8r9", callsign: "NKS452", originCountry: "United States",
    longitude: -116.5, latitude: 33.0, altitude: 9200, onGround: false,
    velocity: 235, heading: 130, verticalRate: -3.0, squawk: "3456", category: 4,
    airline: "Spirit Airlines", flightNumber: "NKS452", aircraft: "Airbus A320neo",
    registration: "N919NK", origin: { iata: "LAS", name: "Las Vegas" },
    destination: { iata: "TIJ", name: "Tijuana" },
    scheduledDep: "12:00", scheduledArr: "14:15",
    actualDep: "12:05", estimatedArr: "14:20",
    status: "En vuelo"
  },
  {
    icao24: "s1t2u3", callsign: "VOI1234", originCountry: "Mexico",
    longitude: -110.2, latitude: 26.5, altitude: 6800, onGround: false,
    velocity: 210, heading: 200, verticalRate: 1.8, squawk: "7890", category: 3,
    airline: "Volaris", flightNumber: "VOI1234", aircraft: "Airbus A319-100",
    registration: "N421VL", origin: { iata: "HMO", name: "Hermosillo" },
    destination: { iata: "SJD", name: "San José del Cabo" },
    scheduledDep: "13:30", scheduledArr: "15:00",
    actualDep: "13:32", estimatedArr: "15:05",
    status: "En vuelo"
  },
  {
    icao24: "v4w5x6", callsign: "UAL892", originCountry: "United States",
    longitude: -115.0, latitude: 35.5, altitude: 11800, onGround: false,
    velocity: 275, heading: 220, verticalRate: 0, squawk: "4321", category: 4,
    airline: "United Airlines", flightNumber: "UAL892", aircraft: "Boeing 777-300ER",
    registration: "N2330U", origin: { iata: "SFO", name: "San Francisco" },
    destination: { iata: "MEX", name: "Ciudad de México" },
    scheduledDep: "07:00", scheduledArr: "13:45",
    actualDep: "07:02", estimatedArr: "13:50",
    status: "En vuelo"
  },
  {
    icao24: "y7z8a1", callsign: "AMX345", originCountry: "Mexico",
    longitude: -106.5, latitude: 23.0, altitude: 10200, onGround: false,
    velocity: 255, heading: 310, verticalRate: -1.2, squawk: "8765", category: 4,
    airline: "Aeroméxico", flightNumber: "AMX345", aircraft: "Boeing 737 MAX 8",
    registration: "XA-MAX", origin: { iata: "CEN", name: "Ciudad Obregón" },
    destination: { iata: "MEX", name: "Ciudad de México" },
    scheduledDep: "14:00", scheduledArr: "15:30",
    actualDep: "14:02", estimatedArr: "15:32",
    status: "En vuelo"
  },
  {
    icao24: "b2c3d4", callsign: "DAL567", originCountry: "United States",
    longitude: -111.0, latitude: 32.0, altitude: 9800, onGround: false,
    velocity: 240, heading: 175, verticalRate: -2.8, squawk: "1111", category: 4,
    airline: "Delta Air Lines", flightNumber: "DAL567", aircraft: "Airbus A321",
    registration: "N101DZ", origin: { iata: "PHX", name: "Phoenix" },
    destination: { iata: "MEX", name: "Ciudad de México" },
    scheduledDep: "11:00", scheduledArr: "15:30",
    actualDep: "11:03", estimatedArr: "15:35",
    status: "En vuelo"
  }
];

const FlightAPI = {
  isUsingDemo: false,
  lastSuccess: 0,
  retryCount: 0,
  ADB_KEY: '896aeb64d2msh83d83c02ad03cc2p1e8b85jsn57a50db40b14',

  async getFlights(bounds) {
    try {
      let url = '/api.php';
      if (bounds) {
        const b = bounds;
        url += `?lamin=${b.south}&lomin=${b.west}&lamax=${b.north}&lomax=${b.east}`;
      }

      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000)
      });

      const text = await response.text();

      if (!response.ok || text.includes('Too many') || text.includes('rate limit')) {
        throw new Error('Rate limited');
      }

      const data = JSON.parse(text);

      if (!data || !data.states) {
        throw new Error('Invalid response');
      }

      this.isUsingDemo = false;
      this.lastSuccess = Date.now();
      this.retryCount = 0;
      return this.parseFlights(data.states);
    } catch (error) {
      this.retryCount++;

      if (this.retryCount > 3) {
        this.isUsingDemo = true;
      }

      return this.isUsingDemo ? DEMO_FLIGHTS : [];
    }
  },

  async getFlightDetails(callsign) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(
        `/api.php?flight=${encodeURIComponent(callsign)}&date=${today}`,
        { signal: AbortSignal.timeout(8000) }
      );

      if (!response.ok) return null;

      const data = await response.json();
      if (data && data.length > 0) {
        return data[0];
      }
      return null;
    } catch (e) {
      return null;
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
