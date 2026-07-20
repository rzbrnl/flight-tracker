<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$ADB_KEY = "896aeb64d2msh83d83c02ad03cc2p1e8b85jsn57a50db40b14";
$OS_CLIENT_ID = "rzbrnl-api-client";
$OS_CLIENT_SECRET = "Z6GWmsmoQ1gM2TxEgaVUshxLLA88IskR";
$AIRLABS_KEY = "f2e970e5-7284-4e0d-b05a-e4faaecd7962";

function getOpenSkyToken() {
    global $OS_CLIENT_ID, $OS_CLIENT_SECRET;
    $ch = curl_init("https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        "grant_type" => "client_credentials",
        "client_id" => $OS_CLIENT_ID,
        "client_secret" => $OS_CLIENT_SECRET
    ]));
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $data = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    if ($err) return null;
    $json = json_decode($data, true);
    return $json["access_token"] ?? null;
}

function fetchWithAuth($url) {
    $token = getOpenSkyToken();
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 25);
    $headers = ["Accept: application/json"];
    if ($token) {
        $headers[] = "Authorization: Bearer " . $token;
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $data = curl_exec($ch);
    curl_close($ch);
    return $data;
}

function fetchUrl($url, $headers = []) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }
    $data = curl_exec($ch);
    curl_close($ch);
    return $data;
}

if (isset($_GET["flight_routes"])) {
    $routes = [];

    // 1. Get OpenSky routes (last 4 hours)
    $end = time();
    $begin = $end - 14400;
    $osData = fetchWithAuth("https://opensky-network.org/api/flights/all?begin={$begin}&end={$end}");
    $osFlights = json_decode($osData, true);
    if (is_array($osFlights)) {
        foreach ($osFlights as $f) {
            $cs = trim($f['callsign'] ?? '');
            if ($cs && isset($f['estDepartureAirport'])) {
                $routes[$cs] = [
                    'callsign' => $cs,
                    'departure' => $f['estDepartureAirport'],
                    'arrival' => $f['estArrivalAirport'] ?? null,
                    'source' => 'opensky'
                ];
            }
        }
    }

    // 2. Get AirLabs flights and merge (fills gaps)
    $alData = fetchUrl("https://airlabs.co/api/v9/flights?api_key={$AIRLABS_KEY}&_view=array&_fields=hex,flight_iata,dep_iata,arr_iata,airline_iata,aircraft_icao,status");
    $alFlights = json_decode($alData, true);
    if (is_array($alFlights)) {
        foreach ($alFlights as $f) {
            $cs = trim($f[1] ?? '');
            if ($cs && !isset($routes[$cs])) {
                $routes[$cs] = [
                    'callsign' => $cs,
                    'departure' => $f[2] ?? null,
                    'arrival' => $f[3] ?? null,
                    'airline' => $f[4] ?? null,
                    'aircraft' => $f[5] ?? null,
                    'status' => $f[6] ?? null,
                    'source' => 'airlabs'
                ];
            } elseif ($cs && isset($routes[$cs]) && !$routes[$cs]['airline'] && isset($f[4])) {
                $routes[$cs]['airline'] = $f[4];
                $routes[$cs]['aircraft'] = $f[5] ?? null;
                $routes[$cs]['status'] = $f[6] ?? null;
            }
        }
    }

    echo json_encode($routes);

} elseif (isset($_GET["airports"])) {
    $lat = $_GET["lat"] ?? "0";
    $lon = $_GET["lon"] ?? "0";
    $radius = $_GET["radius"] ?? "200";
    $limit = $_GET["limit"] ?? "30";
    $url = "https://aerodatabox.p.rapidapi.com/airports/search/location?lat={$lat}&lon={$lon}&radiusKm={$radius}&limit={$limit}&withFlightInfoOnly=true";
    $data = fetchUrl($url, [
        "X-RapidAPI-Key: " . $ADB_KEY,
        "X-RapidAPI-Host: aerodatabox.p.rapidapi.com",
        "Accept: application/json"
    ]);
    echo $data;

} elseif (isset($_GET["track"])) {
    $icao24 = $_GET["track"];
    $url = "https://opensky-network.org/api/tracks/all?icao24=" . $icao24 . "&time=0";
    echo fetchWithAuth($url);

} else {
    $url = "https://opensky-network.org/api/states/all";
    if (isset($_GET["lamin"]) && isset($_GET["lomin"]) && isset($_GET["lamax"]) && isset($_GET["lomax"])) {
        $url .= "?lamin=" . $_GET["lamin"] . "&lomin=" . $_GET["lomin"] . "&lamax=" . $_GET["lamax"] . "&lomax=" . $_GET["lomax"];
    }
    echo fetchWithAuth($url);
}
