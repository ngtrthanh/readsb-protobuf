// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// uiMapControls.ts: Map controls for MapLibre GL JS.
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
    export class MapControls {
        private static map: maplibregl.Map;

        public static Init(map: maplibregl.Map) {
            this.map = map;
            this.AddCustomControls();
        }

        private static AddCustomControls() {
            // Add navigation control
            this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
            
            // Add fullscreen control
            this.map.addControl(new maplibregl.FullscreenControl(), 'top-right');
            
            // Add custom controls
            this.AddLayerSwitcher();
            this.AddPerformanceMonitor();
            this.AddAircraftCounter();
        }

        private static AddLayerSwitcher() {
            const layerSwitcher = new LayerSwitcherControl();
            this.map.addControl(layerSwitcher, 'top-left');
        }

        private static AddPerformanceMonitor() {
            if (AppSettings.ShowPerformanceMonitor) {
                const performanceMonitor = new PerformanceMonitorControl();
                this.map.addControl(performanceMonitor, 'bottom-left');
            }
        }

        private static AddAircraftCounter() {
            const aircraftCounter = new AircraftCounterControl();
            this.map.addControl(aircraftCounter, 'top-left');
        }
    }

    // Custom control for layer switching
    class LayerSwitcherControl {
        private map: maplibregl.Map;
        private container: HTMLDivElement;

        onAdd(map: maplibregl.Map) {
            this.map = map;
            this.container = document.createElement('div');
            this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
            
            const button = document.createElement('button');
            button.className = 'maplibregl-ctrl-icon';
            button.innerHTML = '🗺️';
            button.title = 'Switch Base Layer';
            
            const dropdown = this.CreateLayerDropdown();
            this.container.appendChild(button);
            this.container.appendChild(dropdown);
            
            button.addEventListener('click', () => {
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            });
            
            return this.container;
        }

        onRemove() {
            this.container.parentNode?.removeChild(this.container);
        }

        private CreateLayerDropdown(): HTMLDivElement {
            const dropdown = document.createElement('div');
            dropdown.className = 'layer-dropdown';
            dropdown.style.display = 'none';
            dropdown.style.position = 'absolute';
            dropdown.style.top = '100%';
            dropdown.style.left = '0';
            dropdown.style.backgroundColor = 'white';
            dropdown.style.border = '1px solid #ccc';
            dropdown.style.borderRadius = '4px';
            dropdown.style.padding = '8px';
            dropdown.style.minWidth = '150px';
            dropdown.style.zIndex = '1000';

            const styles = MapLayers.GetAvailableStyles();
            styles.forEach(style => {
                const option = document.createElement('div');
                option.textContent = style.name;
                option.style.padding = '4px 8px';
                option.style.cursor = 'pointer';
                option.addEventListener('click', () => {
                    MapLayers.AddBaseLayer(style.url);
                    dropdown.style.display = 'none';
                });
                dropdown.appendChild(option);
            });

            return dropdown;
        }
    }

    // Custom control for performance monitoring
    class PerformanceMonitorControl {
        private map: maplibregl.Map;
        private container: HTMLDivElement;
        private updateInterval: number;

        onAdd(map: maplibregl.Map) {
            this.map = map;
            this.container = document.createElement('div');
            this.container.className = 'maplibregl-ctrl performance-monitor';
            this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            this.container.style.color = 'white';
            this.container.style.padding = '8px';
            this.container.style.fontSize = '12px';
            this.container.style.fontFamily = 'monospace';
            this.container.style.borderRadius = '4px';
            this.container.style.minWidth = '200px';

            this.StartMonitoring();
            return this.container;
        }

        onRemove() {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
            }
            this.container.parentNode?.removeChild(this.container);
        }

        private StartMonitoring() {
            this.updateInterval = setInterval(() => {
                const stats = AircraftRenderer.GetPerformanceStats();
                this.container.innerHTML = `
                    <div>Total Aircraft: ${stats.totalAircraft}</div>
                    <div>Visible Aircraft: ${stats.visibleAircraft}</div>
                    <div>Target FPS: ${stats.targetFPS}</div>
                    <div>Batch Size: ${stats.batchSize}</div>
                    <div>Memory: ${this.GetMemoryUsage()}MB</div>
                `;
            }, 1000);
        }

        private GetMemoryUsage(): string {
            if ('memory' in performance) {
                const memory = (performance as any).memory;
                return (memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
            }
            return 'N/A';
        }
    }

    // Custom control for aircraft counter
    class AircraftCounterControl {
        private map: maplibregl.Map;
        private container: HTMLDivElement;

        onAdd(map: maplibregl.Map) {
            this.map = map;
            this.container = document.createElement('div');
            this.container.className = 'maplibregl-ctrl aircraft-counter';
            this.container.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            this.container.style.padding = '6px 12px';
            this.container.style.fontSize = '14px';
            this.container.style.fontWeight = 'bold';
            this.container.style.borderRadius = '4px';
            this.container.textContent = 'Aircraft: 0';

            return this.container;
        }

        onRemove() {
            this.container.parentNode?.removeChild(this.container);
        }

        public UpdateCount(count: number) {
            this.container.textContent = `Aircraft: ${count}`;
        }
    }
}
