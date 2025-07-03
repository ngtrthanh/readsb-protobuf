# PowerShell script to install MapLibre GL JS dependencies and build the project
# Run this script from the webapp directory

Write-Host "Installing MapLibre GL JS dependencies..." -ForegroundColor Green

# Check if Node.js and npm are installed
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Yellow
    Write-Host "npm version: $npmVersion" -ForegroundColor Yellow
} catch {
    Write-Host "Error: Node.js and npm are required but not installed." -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Install MapLibre GL JS and dependencies
Write-Host "Installing MapLibre GL JS..." -ForegroundColor Green
npm install maplibre-gl@^4.1.1

Write-Host "Installing additional dependencies..." -ForegroundColor Green
npm install @mapbox/geo-viewport@^0.5.0
npm install @mapbox/supercluster@^8.0.1
npm install @turf/turf@^6.5.0

# Install TypeScript type definitions
Write-Host "Installing TypeScript definitions..." -ForegroundColor Green
npm install --save-dev @types/geojson@^7946.0.10
npm install --save-dev @types/mapbox__supercluster@^7.1.3

# Verify TypeScript is available
try {
    $tscVersion = tsc --version
    Write-Host "TypeScript version: $tscVersion" -ForegroundColor Yellow
} catch {
    Write-Host "Warning: TypeScript compiler not found globally." -ForegroundColor Yellow
    Write-Host "Installing TypeScript locally..." -ForegroundColor Green
    npm install --save-dev typescript
}

# Build the TypeScript files
Write-Host "Building TypeScript files..." -ForegroundColor Green
try {
    if (Test-Path "tsconfig.json") {
        tsc --build
        Write-Host "TypeScript build completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Warning: tsconfig.json not found. Skipping TypeScript build." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error during TypeScript build. Please check for compilation errors." -ForegroundColor Red
}

# Create backup of old Leaflet files
Write-Host "Creating backup of Leaflet files..." -ForegroundColor Green
$backupDir = "backup-leaflet-$(Get-Date -Format 'yyyy-MM-dd-HHmm')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Backup old files if they exist
$leafletFiles = @(
    "src/script/readsb/uiLMap.ts",
    "src/script/readsb/uiLMapAircraftMarker.ts", 
    "src/script/readsb/uiLMapLayers.ts",
    "src/script/readsb/uiLMapControls.ts"
)

foreach ($file in $leafletFiles) {
    if (Test-Path $file) {
        Copy-Item $file -Destination "$backupDir/" -Force
        Write-Host "Backed up: $file" -ForegroundColor Yellow
    }
}

Write-Host "`nMapLibre GL JS installation completed!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Review the migration documentation in MAPLIBRE_MIGRATION.md" -ForegroundColor White
Write-Host "2. Test the new MapLibre implementation" -ForegroundColor White
Write-Host "3. Configure performance settings as needed" -ForegroundColor White
Write-Host "4. Update any custom code that depends on Leaflet APIs" -ForegroundColor White

Write-Host "`nBackup files created in: $backupDir" -ForegroundColor Yellow
Write-Host "`nFor support, refer to the troubleshooting section in MAPLIBRE_MIGRATION.md" -ForegroundColor Gray
