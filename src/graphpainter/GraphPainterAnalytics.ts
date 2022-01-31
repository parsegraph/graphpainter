import PaintGroup from "./PaintGroup";
import { INTERVAL } from "parsegraph-timingbelt";
import { elapsed } from "parsegraph-timing";

const renderTimes: number[] = [];

export default class GraphPainterAnalytics {
  _dirtyRenders: number;

  _mostRenders: number;
  _groupsRendered: number;
  _start: Date;

  constructor() {
    this.recordStart();
  }

  recordDirtyRender() {
    ++this._dirtyRenders;
    ++this._groupsRendered;
  }

  recordConsecutiveRender(pg: PaintGroup) {
    ++this._groupsRendered;
    this._mostRenders = Math.max(pg.consecutiveRenders(), this._mostRenders);
  }

  recordStart() {
    this._start = new Date();
    this._mostRenders = 0;
    this._dirtyRenders = 0;
    this._groupsRendered = 0;
  }

  recordCompletion() {
    // log(nodesRendered +
    //   " paint groups rendered " +
    //   (dirtyRenders > 0 ? "(" +
    //   dirtyRenders +
    //   " dirty)" : ""));
    const renderTime: number = elapsed(this._start);
    if (renderTimes.length === 11) {
      renderTimes.splice(Math.floor(Math.random() * 11), 1);
    }
    if (this._mostRenders > 1) {
      renderTimes.push(renderTime);
      renderTimes.sort(function (a, b) {
        return a - b;
      });
      const meanRenderTime = renderTimes[Math.floor(renderTimes.length / 2)];
      if (meanRenderTime > INTERVAL / 2) {
        /* console.log("Freezing heaviest node " +
         *   heaviestPaintGroup + " (weight=" +
         *   heaviestPaintGroup.painter(window).weight() + ") because
         *   rendering took " + meanRenderTime +
         *   "ms (most renders = " + mostRenders + ")");
                let str:string = "[";
                for(var i = 0; i < renderTimes.length; ++i) {
                    if(i > 0) {
                        str += ", ";
                    }
                    str += renderTimes[i];
                }
                str += "]";
                console.log(str);*/
      }
    }
    // log("Dirty renders: ", this._dirtyRenders);
  }

  isDirty() {
    return this._dirtyRenders > 0;
  }
}
