// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// uiMap.ts: User interface map generation using MapLibre GL JS.
//
// Copyright (c) 2020 Michael Wolf <michael@mictronics.de>
//
// This file is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// any later version.
//
// This file is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

namespace READSB {
    /**
     * Main Map class using MapLibre GL JS for high-performance aircraft rendering
     */
    export class LMap {
        private static map: maplibregl.Map;
        private static initialized: boolean = false;
        private static aircraftRenderer: AircraftRenderer;
        private static mapLayers: MapLayers;
        private static mapControls: MapControls;
        
        // Legacy compatibility for existing code
        public static AircraftPositions: any;
        public static AircraftTraces: any;
        public static Initialized: boolean = false;

        public static Init() {
            try {
                // Initialize MapLibre GL JS map
                this.map = new maplibregl.Map({
                    container: 'lMapCanvas',
                    style: this.GetDefaultMapStyle(),
                    center: [AppSettings.CenterLon, AppSettings.CenterLat],
                    zoom: AppSettings.ZoomLevel,
                    pitch: 0,
                    bearing: 0,
                    antialias: true, // Enable anti-aliasing for better performance
                    optimizeForTerrain: false,
                    maxZoom: 18,
                    minZoom: 2
                });

                // Set up event handlers
                this.SetupEventHandlers();

                // Initialize components when map is loaded
                this.map.on('load', () => {
                    this.OnMapLoad();
                });

                // Handle map errors
                this.map.on('error', (e) => {
                    console.error('MapLibre GL JS error:', e);
                });

            } catch (error) {
                console.error('Failed to initialize MapLibre GL JS:', error);
                throw error;
            }
        }

        private static OnMapLoad() {
            try {
                // Initialize all map components
                MapLayers.Init(this.map);
                MapControls.Init(this.map);
                AircraftRenderer.Init(this.map);

                // Add site circles if configured
                if (AppSettings.ShowSite || AppSettings.ShowSiteCircles) {
                    this.CreateSiteCircles();
                }

                this.initialized = true;
                this.Initialized = true;

                console.log('MapLibre GL JS initialized successfully');
            } catch (error) {
                console.error('Error during map load:', error);
            }
        }

        private static SetupEventHandlers() {
            // Handle map move events for performance optimization
            this.map.on('movestart', () => {
                // Optionally pause updates during movement
            });

            this.map.on('moveend', () => {
                // Save map position
                const center = this.map.getCenter();
                const zoom = this.map.getZoom();
                
                AppSettings.CenterLat = center.lat;
                AppSettings.CenterLon = center.lng;
                AppSettings.ZoomLevel = zoom;
            });

            // Handle zoom events
            this.map.on('zoomend', () => {
                AppSettings.ZoomLevel = this.map.getZoom();
            });

            // Handle resize events
            this.map.on('resize', () => {
                this.map.resize();
            });
        }

        private static GetDefaultMapStyle(): string {
            // Return default map style based on settings
            if (AppSettings.UseDarkTheme) {
                return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
            }
            return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
        }

        /**
         * Update aircraft on the map - main entry point for aircraft data
         */
        public static UpdateAircraft(aircraftList: IAircraft[]) {
            if (!this.initialized) {
                return;
            }

            try {
                AircraftRenderer.UpdateAircraft(aircraftList);
            } catch (error) {
                console.error('Error updating aircraft:', error);
            }
        }

        /**
         * Create site marker and range circles
         */
        public static CreateSiteCircles(ranges?: number[]) {
            if (!this.initialized) {
                return;
            }

            const distances = ranges || AppSettings.SiteCirclesDistances || [100, 150, 200];
            
            try {
                MapLayers.AddSiteCircles(
                    AppSettings.SiteLat,
                    AppSettings.SiteLon,
                    distances
                );
            } catch (error) {
                console.error('Error creating site circles:', error);
            }
        }

        /**
         * Get distance between two points (legacy compatibility)
         */
        public static GetDistance(p1: {lat: number, lng: number}, p2: {lat: number, lng: number}): number {
            if (!this.map || !p1 || !p2) {
                return 0;
            }

            // Use Haversine formula for distance calculation
            const R = 6371000; // Earth's radius in meters
            const dLat = (p2.lat - p1.lat) * Math.PI / 180;
            const dLng = (p2.lng - p1.lng) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                     Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
                     Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        }

        /**
         * Center map on coordinates
         */
        public static CenterMap(lat: number, lon: number, zoom?: number) {
            if (!this.initialized) {
                return;
            }

            this.map.easeTo({
                center: [lon, lat],
                zoom: zoom || this.map.getZoom(),
                duration: 1000
            });
        }

        /**
         * Fit map to bounds
         */
        public static FitBounds(bounds: [[number, number], [number, number]]) {
            if (!this.initialized) {
                return;
            }

            this.map.fitBounds(bounds, {
                padding: 50,
                duration: 1000
            });
        }

        /**
         * Toggle layer visibility
         */
        public static ToggleLayer(layerId: string, visible: boolean) {
            if (!this.initialized) {
                return;
            }

            MapLayers.ToggleLayer(layerId, visible);
        }

        /**
         * Get current map instance (for advanced usage)
         */
        public static GetMapInstance(): maplibregl.Map | null {
            return this.map || null;
        }

        /**
         * Cleanup resources
         */
        public static Cleanup() {
            if (AircraftRenderer) {
                AircraftRenderer.Cleanup();
            }

            if (this.map) {
                this.map.remove();
            }

            this.initialized = false;
            this.Initialized = false;
        }

        /**
         * Get performance statistics
         */
        public static GetPerformanceStats() {
            if (!AircraftRenderer) {
                return null;
            }
            return AircraftRenderer.GetPerformanceStats();
        }

        // Legacy compatibility methods for existing code
        public static OnHideSidebarButtonClick() {
            // Implementation for hiding sidebar
            const sidebar = document.getElementById('sidebarContainer');
            if (sidebar) {
                sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
            }
        }

        public static OnExpandSidebarButtonClick() {
            // Implementation for expanding sidebar
            const sidebar = document.getElementById('sidebarContainer');
            if (sidebar) {
                sidebar.classList.toggle('expanded');
            }
        }

        public static OnSelectAllButtonClick() {
            // Implementation for selecting all aircraft
            if (typeof Body !== 'undefined' && Body.SelectAll) {
                Body.SelectAll();
            }
        }

        public static OnDeSelectAllButtonClick() {
            // Implementation for deselecting all aircraft
            if (typeof Body !== 'undefined' && Body.DeselectAll) {
                Body.DeselectAll();
            }
        }

        public static OnResetButtonClick() {
            // Reset map to default view
            this.CenterMap(AppSettings.SiteLat, AppSettings.SiteLon, 7);
        }
    }

    // Legacy alias for backwards compatibility
    export const Map = LMap;
}

