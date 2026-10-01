$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  Get-ChildItem -Recurse -Filter *.js | ForEach-Object {
    & node --check $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Syntax check failed: $($_.FullName)" }
  }

  & node tests\encounter-contract.test.js
  if ($LASTEXITCODE -ne 0) { throw "Encounter contract test failed" }
  & node tests\attack-simulation.test.js
  if ($LASTEXITCODE -ne 0) { throw "Attack simulation failed" }
  & node tests\player-runtime.test.js
  if ($LASTEXITCODE -ne 0) { throw "Player runtime test failed" }
  & node tests\flow.test.js
  if ($LASTEXITCODE -ne 0) { throw "Flow runtime test failed" }
  & node tests\defense.test.js
  if ($LASTEXITCODE -ne 0) { throw "Defense runtime test failed" }
  & node tests\registry-ownership.test.js
  if ($LASTEXITCODE -ne 0) { throw "Registry/ownership test failed" }

  & node tests\browser-turn-suite.js
  if ($LASTEXITCODE -ne 0) { throw "Integrated browser turn suite failed" }

  $chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
  if (Test-Path $chrome) {
    foreach ($fight in @("sable", "zach", "dandelion")) {
      $url = "file:///" + (($root -replace "\\", "/") + "/tests/$fight-smoke.html?fight=$fight")
      $html = & $chrome --headless=new --disable-gpu --no-first-run --disable-default-apps `
        --virtual-time-budget=1600 --dump-dom $url 2>&1 | Out-String
      if ($html -notmatch 'data-smoke="pass"') { throw "$fight browser smoke test failed" }
    }
    $performingHudUrl = "file:///" + (($root -replace "\\", "/") + "/tests/performing-hud-smoke.html?fight=dandelion")
    $performingHudHtml = & $chrome --headless=new --disable-gpu --no-first-run --disable-default-apps `
      --virtual-time-budget=1700 --dump-dom $performingHudUrl 2>&1 | Out-String
    if ($performingHudHtml -notmatch 'data-smoke="pass"') { throw "performing HUD browser smoke test failed" }
    $selectorUrl = "file:///" + (($root -replace "\\", "/") + "/tests/selector-smoke.html")
    $selectorHtml = & $chrome --headless=new --disable-gpu --no-first-run --disable-default-apps `
      --virtual-time-budget=800 --dump-dom $selectorUrl 2>&1 | Out-String
    if ($selectorHtml -notmatch 'data-smoke="pass"') { throw "encounter selector browser smoke test failed" }
    $mobileControlsUrl = "file:///" + (($root -replace "\\", "/") + "/tests/mobile-controls-smoke.html")
    $mobileControlsHtml = & $chrome --headless=new --disable-gpu --no-first-run --disable-default-apps `
      --virtual-time-budget=800 --dump-dom $mobileControlsUrl 2>&1 | Out-String
    if ($mobileControlsHtml -notmatch 'data-smoke="pass"') { throw "mobile controls browser smoke test failed" }
    $audioUrl = "file:///" + (($root -replace "\\", "/") + "/tests/audio-smoke.html")
    $audioHtml = & $chrome --headless=new --disable-gpu --no-first-run --disable-default-apps `
      --virtual-time-budget=800 --dump-dom $audioUrl 2>&1 | Out-String
    if ($audioHtml -notmatch 'data-smoke="pass"') { throw "audio browser smoke test failed" }
    $navigationUrl = "file:///" + (($root -replace "\\", "/") + "/tests/selection-navigation-smoke.html")
    $navigationHtml = & $chrome --headless=new --disable-gpu --no-first-run --disable-default-apps --allow-file-access-from-files `
      --virtual-time-budget=1800 --dump-dom $navigationUrl 2>&1 | Out-String
    if ($navigationHtml -notmatch 'data-smoke="pass"') { throw "selector navigation browser smoke test failed" }
    $defeatUrl = "file:///" + (($root -replace "\\", "/") + "/tests/dandelion-defeat-smoke.html?fight=dandelion")
    $defeatHtml = & $chrome --headless=new --disable-gpu --no-first-run --disable-default-apps --allow-file-access-from-files `
      --virtual-time-budget=6000 --dump-dom $defeatUrl 2>&1 | Out-String
    if ($defeatHtml -notmatch 'data-smoke="pass"') { throw "Dandelion defeat sequence browser smoke test failed" }
  }

  Write-Output "FULL_TEST_SUITE_PASS"
}
finally {
  Pop-Location
}
