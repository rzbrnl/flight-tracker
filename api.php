<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$ADB_KEY = "896aeb64d2msh83d83c02ad03cc2p1e8b85jsn57a50db40b14";
$OS_CLIENT_ID = "rzbrnl-api-client";
$OS_CLIENT_SECRET = "Z6GWmsmoQ1gM2TxEgaVUshxLLA88IskR";

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

function adbRequest($url) {
    global $ADB_KEY;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "X-RapidAPI-Key: " . $ADB_KEY,
        "X-RapidAPI-Host: aerodatabox.p.rapidapi.com",
        "Accept: application/json"
    ]);
    $data = curl_exec($ch);
    curl_close($ch);
    return $data;
}

if (isset($_GET["airlabs"])) {
    $url = "https://airlabs.co/api/v9/flights?api_key=f2e970e5-7284-4e0d-b05a-e4faaecd7962&_view=array&_fields=hex,flight_iata,dep_iata,arr_iata,airline_iata,aircraft_icao,status,lat,lng,alt,dir,speed,v_speed,squawk";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    $data = curl_exec($ch);
    curl_close($ch);
    echo $data;

} elseif (isset($_GET["flight_routes"])) {
    $end = time();
    $begin = $end - 14400;
    $url = "https://opensky-network.org/api/flights/all?begin={$begin}&end={$end}";
    $data = fetchWithAuth($url);
    $flights = json_decode($data, true);
    $routes = [];
    if (is_array($flights)) {
        foreach ($flights as $f) {
            $cs = trim($f['callsign'] ?? '');
            if ($cs && isset($f['estDepartureAirport'])) {
                $routes[$cs] = [
                    'callsign' => $cs,
                    'departure' => $f['estDepartureAirport'],
                    'arrival' => $f['estArrivalAirport'] ?? null
                ];
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
    echo adbRequest($url);

} elseif (isset($_GET["flight"])) {
    $callsign = $_GET["flight"];
    $date = $_GET["date"] ?? date("Y-m-d");
    $url = "https://aerodatabox.p.rapidapi.com/flights/callsign/{$callsign}/{$date}";
    echo adbRequest($url);

} elseif (isset($_GET["track"])) {
    $icao24 = $_GET["track"];
    $url = "https://opensky-network.org/api/tracks/all?icao24=" . $icao24 . "&time=0";
    echo fetchWithAuth($url);

} elseif (isset($_GET["weather"])) {
    $airport = $_GET["weather"];
    $url = "https://aviationweather.gov/api/data/metar?ids=" . $airport . "&format=json";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $data = curl_exec($ch);
    curl_close($ch);
    echo $data;

} else {
    $url = "https://opensky-network.org/api/states/all";
    if (isset($_GET["lamin"]) && isset($_GET["lomin"]) && isset($_GET["lamax"]) && isset($_GET["lomax"])) {
        $url .= "?lamin=" . $_GET["lamin"] . "&lomin=" . $_GET["lomin"] . "&lamax=" . $_GET["lamax"] . "&lomax=" . $_GET["lomax"];
    }
    echo fetchWithAuth($url);
}
