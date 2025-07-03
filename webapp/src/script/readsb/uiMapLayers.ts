// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// uiMapLayers.ts: Map layers management for MapLibre GL JS.
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
    export class MapLayers {
        private static map: maplibregl.Map;
        
        public static Init(map: maplibregl.Map) {
            this.map = map;
            this.LoadAircraftIcons();
        }

        private static LoadAircraftIcons() {
            // Load aircraft icons for different types
            const icons = [
                { name: 'default-aircraft', url: 'images/icons/aircraft-default.svg' },
                { name: 'military-aircraft', url: 'images/icons/aircraft-military.svg' },
                { name: 'heavy-aircraft', url: 'images/icons/aircraft-heavy.svg' },
                { name: 'helicopter', url: 'images/icons/helicopter.svg' },
                { name: 'glider', url: 'images/icons/glider.svg' }
            ];

            icons.forEach(icon => {
                this.map.loadImage(icon.url, (error, image) => {
                    if (error) {
                        console.warn(`Failed to load icon ${icon.name}:`, error);
                        // Fallback to a simple circle
                        this.CreateFallbackIcon(icon.name);
                    } else if (image) {
                        this.map.addImage(icon.name, image);
                    }
                });
            });
        }

        private static CreateFallbackIcon(name: string) {
            // Create a simple colored circle as fallback
            const size = 32;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                ctx.fillStyle = '#3388ff';
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, size / 4, 0, 2 * Math.PI);
                ctx.fill();
                
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, size / 8, 0, 2 * Math.PI);
                ctx.fill();
                
                this.map.addImage(name, canvas as any);
            }
        }

        public static AddBaseLayer(style: string) {
            // Switch base map style
            this.map.setStyle(style);
        }

        public static AddSiteCircles(lat: number, lon: number, distances: number[]) {
            // Add site marker
            this.map.addSource('site-marker', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [lon, lat]
                        },
                        properties: {
                            title: 'Receiver Site'
                        }
                    }]
                }
            });

            this.map.addLayer({
                id: 'site-marker',
                type: 'circle',
                source: 'site-marker',
                paint: {
                    'circle-radius': 8,
                    'circle-color': '#ff0000',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                }
            });

            // Add range circles
            const circleFeatures = distances.map(distance => {
                const radiusInKm = distance * 1.852; // Convert NM to km
                const circle = this.CreateCircle([lon, lat], radiusInKm);
                
                return {
                    type: 'Feature' as const,
                    geometry: circle,
                    properties: {
                        distance: distance
                    }
                };
            });

            this.map.addSource('range-circles', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: circleFeatures
                }
            });

            this.map.addLayer({
                id: 'range-circles',
                type: 'line',
                source: 'range-circles',
                paint: {
                    'line-color': '#000080',
                    'line-width': 1,
                    'line-opacity': 0.5
                }
            });
        }

        private static CreateCircle(center: [number, number], radiusInKm: number): GeoJSON.Polygon {
            const points = 64;
            const coords = [];
            const distanceX = radiusInKm / (111.32 * Math.cos(center[1] * Math.PI / 180));
            const distanceY = radiusInKm / 110.54;

            for (let i = 0; i < points; i++) {
                const theta = (i / points) * (2 * Math.PI);
                const x = distanceX * Math.cos(theta);
                const y = distanceY * Math.sin(theta);
                coords.push([center[0] + x, center[1] + y]);
            }
            coords.push(coords[0]);

            return {
                type: 'Polygon',
                coordinates: [coords]
            };
        }

        public static ToggleLayer(layerId: string, visible: boolean) {
            if (this.map.getLayer(layerId)) {
                this.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
            }
        }

        public static GetAvailableStyles() {
            return [
                {
                    id: 'osm',
                    name: 'OpenStreetMap',
                    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
                },
                {
                    id: 'satellite',
                    name: 'Satellite',
                    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
                },
                {
                    id: 'dark',
                    name: 'Dark',
                    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
                }
            ];
        }
    }
}
