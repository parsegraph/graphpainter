import FreezerCache from "./FreezerCache";

export default interface Freezable {
  getCache(): FreezerCache;
}
