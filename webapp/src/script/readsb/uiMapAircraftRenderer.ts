// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// uiMapAircraftRenderer.ts: High-performance aircraft rendering for MapLibre GL JS.
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
    export class AircraftRenderer {
        private static map: maplibregl.Map;
        private static aircraftData: Map<string, IAircraft> = new Map();
        private static lastUpdate: number = 0;
        private static updateThrottle: number = 100; // Update every 100ms
        private static viewportBounds: maplibregl.LngLatBounds;
        private static visibleAircraft: Set<string> = new Set();
        
        // Performance optimizations
        private static frameRequestId: number = 0;
        private static isDirty: boolean = false;
        private static batchSize: number = 500; // Process aircraft in batches
        private static lastFrameTime: number = 0;
        private static targetFPS: number = 30;
        private static frameInterval: number = 1000 / this.targetFPS;

        public static Init(map: maplibregl.Map) {
            this.map = map;
            this.InitializeAircraftLayers();
            this.SetupEventHandlers();
            this.StartRenderLoop();
        }

        private static InitializeAircraftLayers() {
            // Add aircraft source with clustering enabled for performance
            this.map.addSource('aircraft-points', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
                cluster: true,
                clusterMaxZoom: 14, // Max zoom to cluster points on
                clusterRadius: 50, // Radius of each cluster
                clusterProperties: {
                    // Count aircraft types within clusters
                    'commercial': ['+', ['case', ['==', ['get', 'category'], 'commercial'], 1, 0]],
                    'military': ['+', ['case', ['==', ['get', 'category'], 'military'], 1, 0]],
                    'private': ['+', ['case', ['==', ['get', 'category'], 'private'], 1, 0]]
                }
            });

            // Cluster circles
            this.map.addLayer({
                id: 'aircraft-clusters',
                type: 'circle',
                source: 'aircraft-points',
                filter: ['has', 'point_count'],
                paint: {
                    'circle-color': [
                        'step',
                        ['get', 'point_count'],
                        '#51bbd6', // Light blue for small clusters
                        10, '#f1f075', // Yellow for medium clusters
                        50, '#f28cb1' // Pink for large clusters
                    ],
                    'circle-radius': [
                        'step',
                        ['get', 'point_count'],
                        15, // Small radius for small clusters
                        10, 20, // Medium radius for medium clusters
                        50, 30 // Large radius for large clusters
                    ],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                }
            });

            // Cluster count labels
            this.map.addLayer({
                id: 'aircraft-cluster-count',
                type: 'symbol',
                source: 'aircraft-points',
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                    'text-size': 12
                },
                paint: {
                    'text-color': '#ffffff'
                }
            });

            // Individual aircraft points
            this.map.addLayer({
                id: 'aircraft-points',
                type: 'symbol',
                source: 'aircraft-points',
                filter: ['!', ['has', 'point_count']],
                layout: {
                    'icon-image': ['get', 'icon'],
                    'icon-size': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        8, 0.5,
                        16, 1.0
                    ],
                    'icon-rotate': ['get', 'rotation'],
                    'icon-rotation-alignment': 'map',
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                    'text-field': [
                        'case',
                        ['>', ['zoom'], 12],
                        ['get', 'callsign'],
                        ''
                    ],
                    'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                    'text-offset': [0, 2],
                    'text-anchor': 'top',
                    'text-size': 10
                },
                paint: {
                    'icon-color': ['get', 'color'],
                    'text-color': '#000000',
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 1
                }
            });

            // Aircraft trails
            this.map.addSource('aircraft-trails', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });

            this.map.addLayer({
                id: 'aircraft-trails',
                type: 'line',
                source: 'aircraft-trails',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': ['get', 'color'],
                    'line-width': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        8, 1,
                        16, 3
                    ],
                    'line-opacity': 0.6
                }
            });
        }

        private static SetupEventHandlers() {
            // Handle cluster clicks
            this.map.on('click', 'aircraft-clusters', (e) => {
                const features = this.map.queryRenderedFeatures(e.point, {
                    layers: ['aircraft-clusters']
                });
                
                if (features.length > 0) {
                    const clusterId = features[0].properties!.cluster_id;
                    const source = this.map.getSource('aircraft-points') as maplibregl.GeoJSONSource;
                    
                    source.getClusterExpansionZoom(clusterId, (err, zoom) => {
                        if (err) return;
                        
                        this.map.easeTo({
                            center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
                            zoom: zoom
                        });
                    });
                }
            });

            // Handle aircraft point clicks
            this.map.on('click', 'aircraft-points', (e) => {
                if (e.features && e.features.length > 0) {
                    const icao = e.features[0].properties!.icao;
                    this.SelectAircraft(icao);
                }
            });

            // Update viewport bounds on map move
            this.map.on('moveend', () => {
                this.UpdateViewportBounds();
                this.MarkDirty();
            });

            // Change cursor on hover
            this.map.on('mouseenter', 'aircraft-clusters', () => {
                this.map.getCanvas().style.cursor = 'pointer';
            });

            this.map.on('mouseleave', 'aircraft-clusters', () => {
                this.map.getCanvas().style.cursor = '';
            });

            this.map.on('mouseenter', 'aircraft-points', () => {
                this.map.getCanvas().style.cursor = 'pointer';
            });

            this.map.on('mouseleave', 'aircraft-points', () => {
                this.map.getCanvas().style.cursor = '';
            });
        }

        private static StartRenderLoop() {
            const renderFrame = (currentTime: number) => {
                if (currentTime - this.lastFrameTime >= this.frameInterval) {
                    if (this.isDirty) {
                        this.ProcessAircraftUpdates();
                        this.isDirty = false;
                    }
                    this.lastFrameTime = currentTime;
                }
                
                this.frameRequestId = requestAnimationFrame(renderFrame);
            };
            
            this.frameRequestId = requestAnimationFrame(renderFrame);
        }

        public static UpdateAircraft(aircraftList: IAircraft[]) {
            const now = Date.now();
            
            // Throttle updates to prevent overwhelming the renderer
            if (now - this.lastUpdate < this.updateThrottle) {
                return;
            }
            
            this.lastUpdate = now;
            
            // Update aircraft data in batches
            this.ProcessAircraftBatch(aircraftList);
            this.MarkDirty();
        }

        private static ProcessAircraftBatch(aircraftList: IAircraft[]) {
            // Process aircraft in chunks to avoid blocking the UI
            const chunks = this.ChunkArray(aircraftList, this.batchSize);
            
            chunks.forEach((chunk, index) => {
                setTimeout(() => {
                    chunk.forEach(aircraft => {
                        if (aircraft.Position && aircraft.Position.lat !== null && aircraft.Position.lon !== null) {
                            this.aircraftData.set(aircraft.Icao, aircraft);
                            
                            // Only track visible aircraft for performance
                            if (this.IsAircraftInViewport(aircraft)) {
                                this.visibleAircraft.add(aircraft.Icao);
                            } else {
                                this.visibleAircraft.delete(aircraft.Icao);
                            }
                        }
                    });
                    
                    // Mark dirty after each batch
                    if (index === chunks.length - 1) {
                        this.MarkDirty();
                    }
                }, index * 10); // Small delay between batches
            });
        }

        private static ProcessAircraftUpdates() {
            const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
            const trailFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];
            
            // Only process visible aircraft for performance
            for (const icao of this.visibleAircraft) {
                const aircraft = this.aircraftData.get(icao);
                if (!aircraft || !aircraft.Position) continue;
                
                // Create point feature
                const pointFeature: GeoJSON.Feature<GeoJSON.Point> = {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [aircraft.Position.lon, aircraft.Position.lat]
                    },
                    properties: {
                        icao: aircraft.Icao,
                        callsign: aircraft.Flight || aircraft.Icao,
                        altitude: aircraft.Altitude,
                        speed: aircraft.Speed,
                        track: aircraft.Track,
                        category: this.GetAircraftCategory(aircraft),
                        icon: this.GetAircraftIcon(aircraft),
                        color: this.GetAircraftColor(aircraft),
                        rotation: aircraft.Track || 0
                    }
                };
                
                features.push(pointFeature);
                
                // Create trail feature if available
                if (aircraft.Trail && aircraft.Trail.length > 1) {
                    const trailCoordinates = aircraft.Trail
                        .filter(point => point.lat !== null && point.lon !== null)
                        .map(point => [point.lon, point.lat]);
                    
                    if (trailCoordinates.length > 1) {
                        const trailFeature: GeoJSON.Feature<GeoJSON.LineString> = {
                            type: 'Feature',
                            geometry: {
                                type: 'LineString',
                                coordinates: trailCoordinates
                            },
                            properties: {
                                icao: aircraft.Icao,
                                color: this.GetAircraftColor(aircraft)
                            }
                        };
                        
                        trailFeatures.push(trailFeature);
                    }
                }
            }
            
            // Update map sources
            this.UpdateMapSource('aircraft-points', { type: 'FeatureCollection', features });
            this.UpdateMapSource('aircraft-trails', { type: 'FeatureCollection', features: trailFeatures });
        }

        private static UpdateMapSource(sourceId: string, data: GeoJSON.FeatureCollection) {
            const source = this.map.getSource(sourceId) as maplibregl.GeoJSONSource;
            if (source) {
                source.setData(data);
            }
        }

        private static UpdateViewportBounds() {
            this.viewportBounds = this.map.getBounds();
        }

        private static IsAircraftInViewport(aircraft: IAircraft): boolean {
            if (!aircraft.Position || !this.viewportBounds) return false;
            
            return this.viewportBounds.contains([aircraft.Position.lon, aircraft.Position.lat]);
        }

        private static GetAircraftCategory(aircraft: IAircraft): string {
            // Categorize aircraft based on various criteria
            if (aircraft.CivilMil === "M") return "military";
            if (aircraft.Interesting) return "interesting";
            return "commercial";
        }

        private static GetAircraftIcon(aircraft: IAircraft): string {
            // Return appropriate icon based on aircraft type/category
            // Icons should be pre-loaded into the map style
            if (aircraft.CivilMil === "M") return "military-aircraft";
            if (aircraft.Category === "A7") return "heavy-aircraft";
            return "default-aircraft";
        }

        private static GetAircraftColor(aircraft: IAircraft): string {
            // Color coding based on altitude, speed, or other criteria
            if (aircraft.Emergency && aircraft.Emergency !== eEmergency.None) return "#ff0000";
            if (aircraft.CivilMil === "M") return "#ff6600";
            if (aircraft.Interesting) return "#ffff00";
            
            // Color by altitude
            const altitude = aircraft.Altitude || 0;
            if (altitude > 40000) return "#ff00ff";
            if (altitude > 20000) return "#0000ff";
            if (altitude > 10000) return "#00ff00";
            return "#808080";
        }

        private static SelectAircraft(icao: string) {
            const aircraft = this.aircraftData.get(icao);
            if (aircraft) {
                // Trigger aircraft selection in the main application
                if (typeof Body !== 'undefined' && Body.SelectAircraftByIcao) {
                    Body.SelectAircraftByIcao(icao, false);
                }
            }
        }

        private static ChunkArray<T>(array: T[], chunkSize: number): T[][] {
            const chunks: T[][] = [];
            for (let i = 0; i < array.length; i += chunkSize) {
                chunks.push(array.slice(i, i + chunkSize));
            }
            return chunks;
        }

        private static MarkDirty() {
            this.isDirty = true;
        }

        public static Cleanup() {
            if (this.frameRequestId) {
                cancelAnimationFrame(this.frameRequestId);
            }
        }

        // Performance monitoring
        public static GetPerformanceStats() {
            return {
                totalAircraft: this.aircraftData.size,
                visibleAircraft: this.visibleAircraft.size,
                lastUpdateTime: this.lastUpdate,
                targetFPS: this.targetFPS,
                batchSize: this.batchSize
            };
        }
    }
}
