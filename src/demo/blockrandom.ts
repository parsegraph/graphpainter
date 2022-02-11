import BlockArtist2D from "./BlockArtist2D";
import BlockArtist3D from "./BlockArtist3D";
import BlockArtistDOM from "./BlockArtistDOM";
import diagonalBlockDemo from "./diagonalBlockDemo";

document.addEventListener("DOMContentLoaded", () => {
  const artists = [
    BlockArtist2D.instance(),
    BlockArtist3D.instance(),
    BlockArtistDOM.instance(),
  ];
  diagonalBlockDemo(() => {
    const artist = artists[Math.floor(artists.length * Math.random())];
    console.log("Using ", artist);
    return artist;
  });
});
