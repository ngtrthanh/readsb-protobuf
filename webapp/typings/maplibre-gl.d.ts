// TypeScript definitions for MapLibre GL JS
// Project: https://github.com/maplibre/maplibre-gl-js

declare namespace maplibregl {
    export interface MapOptions {
        container: string | HTMLElement;
        style?: string | StyleSpecification;
        center?: LngLatLike;
        zoom?: number;
        bearing?: number;
        pitch?: number;
        minZoom?: number;
        maxZoom?: number;
        interactive?: boolean;
        hash?: boolean;
        antialias?: boolean;
        optimizeForTerrain?: boolean;
        bounds?: LngLatBoundsLike;
        fitBoundsOptions?: FitBoundsOptions;
        renderWorldCopies?: boolean;
        transformRequest?: TransformRequestFunction;
        fadeDuration?: number;
        crossSourceCollisions?: boolean;
    }

    export interface StyleSpecification {
        version: number;
        name?: string;
        metadata?: any;
        sources: { [key: string]: SourceSpecification };
        sprite?: string;
        glyphs?: string;
        transition?: TransitionSpecification;
        layers: LayerSpecification[];
    }

    export interface SourceSpecification {
        type: string;
        data?: any;
        url?: string;
        tiles?: string[];
        bounds?: number[];
        scheme?: string;
        minzoom?: number;
        maxzoom?: number;
        attribution?: string;
        promoteId?: string | { [key: string]: string };
        cluster?: boolean;
        clusterRadius?: number;
        clusterMaxZoom?: number;
        clusterProperties?: { [key: string]: any };
    }

    export interface LayerSpecification {
        id: string;
        type: string;
        source?: string;
        'source-layer'?: string;
        minzoom?: number;
        maxzoom?: number;
        filter?: any[];
        layout?: any;
        paint?: any;
    }

    export interface TransitionSpecification {
        duration?: number;
        delay?: number;
    }

    export type LngLatLike = [number, number] | LngLat | { lng: number; lat: number } | { lon: number; lat: number };
    export type LngLatBoundsLike = [LngLatLike, LngLatLike] | [number, number, number, number] | LngLatBounds;

    export interface FitBoundsOptions {
        padding?: number | PaddingOptions;
        linear?: boolean;
        easing?: (t: number) => number;
        offset?: PointLike;
        maxZoom?: number;
        duration?: number;
    }

    export interface PaddingOptions {
        top: number;
        bottom: number;
        left: number;
        right: number;
    }

    export type PointLike = [number, number] | Point;

    export interface TransformRequestFunction {
        (url: string, resourceType: ResourceType): RequestParameters | undefined;
    }

    export type ResourceType = 'Source' | 'Tile' | 'Glyphs' | 'SpriteImage' | 'SpriteJSON' | 'Style' | 'Image';

    export interface RequestParameters {
        url: string;
        headers?: { [key: string]: string };
        method?: 'GET' | 'POST' | 'PUT';
        body?: string;
        type?: 'string' | 'json' | 'arrayBuffer';
        credentials?: 'same-origin' | 'include';
        collectResourceTiming?: boolean;
    }

    export class Map extends Evented {
        constructor(options: MapOptions);
        
        addControl(control: IControl, position?: ControlPosition): this;
        removeControl(control: IControl): this;
        
        addSource(id: string, source: SourceSpecification): this;
        removeSource(id: string): this;
        getSource(id: string): Source;
        
        addLayer(layer: LayerSpecification, beforeId?: string): this;
        removeLayer(id: string): this;
        getLayer(id: string): Layer;
        
        setStyle(style: string | StyleSpecification, options?: { diff?: boolean; localIdeographFontFamily?: string }): this;
        getStyle(): StyleSpecification;
        
        setCenter(center: LngLatLike): this;
        getCenter(): LngLat;
        
        setZoom(zoom: number): this;
        getZoom(): number;
        
        setBearing(bearing: number): this;
        getBearing(): number;
        
        setPitch(pitch: number): this;
        getPitch(): number;
        
        fitBounds(bounds: LngLatBoundsLike, options?: FitBoundsOptions): this;
        getBounds(): LngLatBounds;
        
        easeTo(options: EaseToOptions): this;
        flyTo(options: FlyToOptions): this;
        
        queryRenderedFeatures(pointOrBox?: PointLike | [PointLike, PointLike], options?: QueryRenderedFeaturesOptions): MapboxGeoJSONFeature[];
        
        setLayoutProperty(layerId: string, name: string, value: any): this;
        setPaintProperty(layerId: string, name: string, value: any): this;
        
        loadImage(url: string, callback: (error?: Error, image?: HTMLImageElement | ImageBitmap) => void): void;
        addImage(id: string, image: HTMLImageElement | ImageBitmap | ImageData | { width: number; height: number; data: Uint8Array | Uint8ClampedArray }, options?: { pixelRatio?: number; sdf?: boolean; stretchX?: Array<[number, number]>; stretchY?: Array<[number, number]>; content?: [number, number, number, number] }): this;
        
        resize(): this;
        remove(): void;
        
        getCanvas(): HTMLCanvasElement;
        getContainer(): HTMLElement;
        
        project(lnglat: LngLatLike): Point;
        unproject(point: PointLike): LngLat;
    }

    export interface EaseToOptions {
        center?: LngLatLike;
        zoom?: number;
        bearing?: number;
        pitch?: number;
        around?: LngLatLike;
        duration?: number;
        easing?: (t: number) => number;
        padding?: PaddingOptions;
        offset?: PointLike;
    }

    export interface FlyToOptions extends EaseToOptions {
        curve?: number;
        minZoom?: number;
        speed?: number;
        screenSpeed?: number;
        maxDuration?: number;
    }

    export interface QueryRenderedFeaturesOptions {
        layers?: string[];
        filter?: any[];
        validate?: boolean;
    }

    export interface MapboxGeoJSONFeature extends GeoJSON.Feature {
        layer: {
            id: string;
            type: string;
            source?: string;
            'source-layer'?: string;
            layout?: any;
            paint?: any;
        };
        source: string;
        sourceLayer?: string;
        state: { [key: string]: any };
    }

    export class LngLat {
        lng: number;
        lat: number;
        constructor(lng: number, lat: number);
        static convert(input: LngLatLike): LngLat;
        wrap(): LngLat;
        toArray(): [number, number];
        toString(): string;
        distanceTo(lngLat: LngLat): number;
    }

    export class LngLatBounds {
        constructor(sw?: LngLatLike, ne?: LngLatLike);
        setNorthEast(ne: LngLatLike): this;
        setSouthWest(sw: LngLatLike): this;
        extend(obj: LngLatLike | LngLatBoundsLike): this;
        getCenter(): LngLat;
        getSouthWest(): LngLat;
        getNorthEast(): LngLat;
        getNorthWest(): LngLat;
        getSouthEast(): LngLat;
        getWest(): number;
        getSouth(): number;
        getEast(): number;
        getNorth(): number;
        toArray(): [[number, number], [number, number]];
        toString(): string;
        isEmpty(): boolean;
        contains(lnglat: LngLatLike): boolean;
    }

    export class Point {
        x: number;
        y: number;
        constructor(x: number, y: number);
        clone(): Point;
        add(p: Point): Point;
        sub(p: Point): Point;
        mult(k: number): Point;
        div(k: number): Point;
        rotate(a: number): Point;
        matMult(m: number[]): Point;
        unit(): Point;
        perp(): Point;
        round(): Point;
        mag(): number;
        equals(p: Point): boolean;
        dist(p: Point): number;
        distSqr(p: Point): number;
        angle(): number;
        angleTo(p: Point): number;
        angleWith(p: Point): number;
        angleWithSep(x: number, y: number): number;
        static convert(a: PointLike): Point;
    }

    export abstract class Evented {
        on(type: string, listener: Function): this;
        off(type?: string, listener?: Function): this;
        once(type: string, listener: Function): this;
        fire(type: string, properties?: any): this;
    }

    export interface IControl {
        onAdd(map: Map): HTMLElement;
        onRemove(map: Map): void;
        getDefaultPosition?(): ControlPosition;
    }

    export type ControlPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

    export class NavigationControl implements IControl {
        constructor(options?: { showCompass?: boolean; showZoom?: boolean; visualizePitch?: boolean });
        onAdd(map: Map): HTMLElement;
        onRemove(map: Map): void;
    }

    export class FullscreenControl implements IControl {
        constructor(options?: { container?: HTMLElement });
        onAdd(map: Map): HTMLElement;
        onRemove(map: Map): void;
    }

    export class GeolocateControl implements IControl {
        constructor(options?: {
            positionOptions?: PositionOptions;
            fitBoundsOptions?: FitBoundsOptions;
            trackUserLocation?: boolean;
            showAccuracyCircle?: boolean;
            showUserHeading?: boolean;
        });
        onAdd(map: Map): HTMLElement;
        onRemove(map: Map): void;
        trigger(): boolean;
    }

    export class ScaleControl implements IControl {
        constructor(options?: { maxWidth?: number; unit?: 'imperial' | 'metric' | 'nautical' });
        onAdd(map: Map): HTMLElement;
        onRemove(map: Map): void;
        setUnit(unit: 'imperial' | 'metric' | 'nautical'): void;
    }

    export abstract class Source {
        type: string;
    }

    export class GeoJSONSource extends Source {
        type: 'geojson';
        setData(data: GeoJSON.GeoJSON | string): this;
        getClusterExpansionZoom(clusterId: number, callback: (error: any, zoom: number) => void): this;
        getClusterChildren(clusterId: number, callback: (error: any, features: GeoJSON.Feature[]) => void): this;
        getClusterLeaves(clusterId: number, limit: number, offset: number, callback: (error: any, features: GeoJSON.Feature[]) => void): this;
    }

    export class ImageSource extends Source {
        type: 'image';
        updateImage(options: { url?: string; coordinates?: [[number, number], [number, number], [number, number], [number, number]] }): this;
    }

    export class VideoSource extends Source {
        type: 'video';
        getVideo(): HTMLVideoElement;
        setCoordinates(coordinates: [[number, number], [number, number], [number, number], [number, number]]): this;
    }

    export abstract class Layer {
        id: string;
        type: string;
        source: string;
        minzoom?: number;
        maxzoom?: number;
        filter?: any[];
        layout?: any;
        paint?: any;
    }

    export interface MapMouseEvent {
        type: string;
        target: Map;
        originalEvent: MouseEvent;
        point: Point;
        lngLat: LngLat;
        preventDefault(): void;
        defaultPrevented: boolean;
    }

    export interface MapTouchEvent {
        type: string;
        target: Map;
        originalEvent: TouchEvent;
        point: Point;
        lngLat: LngLat;
        points: Point[];
        lngLats: LngLat[];
        preventDefault(): void;
        defaultPrevented: boolean;
    }

    export interface MapBoxZoomEvent {
        type: string;
        target: Map;
        originalEvent: MouseEvent;
    }

    export interface MapDataEvent {
        type: string;
        target: Map;
        dataType: 'source' | 'style';
        isSourceLoaded?: boolean;
        source?: Source;
        sourceId?: string;
        sourceDataType?: 'metadata' | 'content' | 'visibility' | 'idle';
        tile?: any;
        coord?: any;
    }

    export interface MapContextEvent {
        type: string;
        target: Map;
    }

    export interface ErrorEvent {
        type: string;
        target: Map;
        error: Error;
    }
}

declare global {
    const maplibregl: typeof maplibregl;
}
