import { Projector } from "parsegraph-projector";
import Artist from "./Artist";

export default class PaintContext {
  _artist: Artist;
  _context: { [key: string]: any };
  _projector: Projector;

  constructor(projector: Projector, artist: Artist) {
    this._projector = projector;
    this._artist = artist;
    this._context = {};
  }

  artist() {
    return this._artist;
  }

  contextChanged(isLost: boolean): void {
    this._artist.contextChanged(this, isLost);
  }

  unmount(): void {
    this._artist.unmount(this);
  }

  projector() {
    return this._projector;
  }

  gl() {
    return this.projector().glProvider().gl();
  }

  get(key: string): any {
    return this._context[key];
  }

  set(key: string, val: any) {
    this._context[key] = val;
  }
}
