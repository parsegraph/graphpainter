export default interface Repaintable {
  scheduleRepaint(): void;
  scheduleRender(): void;
}
