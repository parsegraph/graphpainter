import BlockArtist2D from "./BlockArtist2D";
import diagonalBlockDemo from "./diagonalBlockDemo";

document.addEventListener("DOMContentLoaded", () => {
  diagonalBlockDemo(() => BlockArtist2D.instance());
});
