import BlockArtistDOM from "./BlockArtistDOM";
import diagonalBlockDemo from "./diagonalBlockDemo";

document.addEventListener("DOMContentLoaded", () => {
  diagonalBlockDemo(() => BlockArtistDOM.instance());
});
