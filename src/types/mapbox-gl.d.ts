declare module 'mapbox-gl' {
  export default any;
  export class Map {
    constructor(options: any);
    remove(): void;
    addControl(control: any, position?: string): void;
    fitBounds(bounds: any, options?: any): void;
  }
  export class Marker {
    constructor(element?: any);
    setLngLat(position: any): this;
    setPopup(popup: any): this;
    addTo(map: any): this;
    remove(): void;
  }
  export class Popup {
    constructor(options?: any);
    setHTML(html: string): this;
  }
  export class NavigationControl {
    constructor();
  }
  export class LngLatBounds {
    constructor();
    extend(point: any): this;
  }
}
