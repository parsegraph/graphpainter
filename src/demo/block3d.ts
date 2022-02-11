import BlockArtist3D from "./BlockArtist3D";
import diagonalBlockDemo from "./diagonalBlockDemo";

document.addEventListener("DOMContentLoaded", () => {
  diagonalBlockDemo(() => BlockArtist3D.instance());
});
