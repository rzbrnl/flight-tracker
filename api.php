<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$ADB_KEY = "896aeb64d2msh83d83c02ad03cc2p1e8b85jsn57a50db40b14";

if (isset($_GET["flight"])) {
    $callsign = $_GET["flight"];
    $date = $_GET["date"] ?? date("Y-m-d");
    $url = "https://aerodatabox.p.rapidapi.com/flights/callsign/{$callsign}/{$date}";
    $headers = [
        "X-RapidAPI-Key: " . $ADB_KEY,
        "X-RapidAPI-Host: aerodatabox.p.rapidapi.com"
    ];
} elseif (isset($_GET["track"])) {
    $icao24 = $_GET["track"];
    $url = "https://opensky-network.org/api/tracks/all?icao24=" . $icao24 . "&time=0";
    $headers = [];
} elseif (isset($_GET["weather"])) {
    $airport = $_GET["weather"];
    $url = "https://aviationweather.gov/api/data/metar?ids=" . $airport . "&format=json";
    $headers = [];
} else {
    $url = "https://opensky-network.org/api/states/all";
    if (isset($_GET["lamin"]) && isset($_GET["lomin"]) && isset($_GET["lamax"]) && isset($_GET["lomax"])) {
        $url .= "?lamin=" . $_GET["lamin"] . "&lomin=" . $_GET["lomin"] . "&lamax=" . $_GET["lamax"] . "&lomax=" . $_GET["lomax"];
    }
    $headers = [];
}

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
if (!empty($headers)) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
}
$data = curl_exec($ch);
curl_close($ch);
echo $data;
