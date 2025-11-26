const mongoose = require('mongoose');
const Song = require('./src/models/Song');
require('dotenv').config();

// Mapeo de archivos a metadatos completos
const songMetadata = {
  'metallica-battery.mp3': { title: 'Battery', artist: 'Metallica', album: 'Master of Puppets', genre: 'Metal', year: 1986 },
  'metallica-master-of-puppets.mp3': { title: 'Master Of Puppets', artist: 'Metallica', album: 'Master of Puppets', genre: 'Metal', year: 1986 },
  'acdc-back-in-black.mp3': { title: 'Back In Black', artist: 'AC/DC', album: 'Back In Black', genre: 'Rock', year: 1980 },
  'acdc-hells-bells.mp3': { title: 'Hells Bells', artist: 'AC/DC', album: 'Back In Black', genre: 'Rock', year: 1980 },
  'acdc-you-shook-me.mp3': { title: 'You Shook Me All Night Long', artist: 'AC/DC', album: 'Back In Black', genre: 'Rock', year: 1980 },
  'arctic-monkeys-ru-mine.mp3': { title: 'R U Mine?', artist: 'Arctic Monkeys', album: 'AM', genre: 'Indie Rock', year: 2013 },
  'arctic-monkeys-wanna-be-yours.mp3': { title: 'I Wanna Be Yours', artist: 'Arctic Monkeys', album: 'AM', genre: 'Indie Rock', year: 2013 },
  'arctic-monkeys-wanna-know.mp3': { title: 'Do I Wanna Know?', artist: 'Arctic Monkeys', album: 'AM', genre: 'Indie Rock', year: 2013 },
  'beatles-here-comes-sun.mp3': { title: 'Here Comes The Sun', artist: 'The Beatles', album: 'Abbey Road', genre: 'Rock', year: 1969 },
  'beatles-let-it-be.mp3': { title: 'Let It Be', artist: 'The Beatles', album: 'Let It Be', genre: 'Rock', year: 1970 },
  'beatles-long-winding-road.mp3': { title: 'The Long And Winding Road', artist: 'The Beatles', album: 'Let It Be', genre: 'Rock', year: 1970 },
  'beatles-something.mp3': { title: 'Something', artist: 'The Beatles', album: 'Abbey Road', genre: 'Rock', year: 1969 },
  'bowie-starman.mp3': { title: 'Starman', artist: 'David Bowie', album: 'The Rise and Fall of Ziggy Stardust', genre: 'Rock', year: 1972 },
  'bowie-ziggy-stardust.mp3': { title: 'Ziggy Stardust', artist: 'David Bowie', album: 'The Rise and Fall of Ziggy Stardust', genre: 'Rock', year: 1972 },
  'kidd-voodoo-angel-para-un-final.mp3': { title: 'Ángel Para Un Final', artist: 'Kidd Voodoo', album: 'Single', genre: 'Reggaeton', year: 2023 },
  'kidd-voodoo-callao.mp3': { title: 'Callao', artist: 'Kidd Voodoo', album: 'Single', genre: 'Reggaeton', year: 2023 },
  'kidd-voodoo-destello.mp3': { title: 'Destello', artist: 'Kidd Voodoo', album: 'Single', genre: 'Reggaeton', year: 2023 },
  'kidd-voodoo-sol-de-enero.mp3': { title: 'Sol De Enero', artist: 'Kidd Voodoo', album: 'Single', genre: 'Reggaeton', year: 2023 },
  'led-zeppelin-black-dog.mp3': { title: 'Black Dog', artist: 'Led Zeppelin', album: 'Led Zeppelin IV', genre: 'Rock', year: 1971 },
  'led-zeppelin-rock-and-roll.mp3': { title: 'Rock And Roll', artist: 'Led Zeppelin', album: 'Led Zeppelin IV', genre: 'Rock', year: 1971 },
  'led-zeppelin-stairway.mp3': { title: 'Stairway To Heaven', artist: 'Led Zeppelin', album: 'Led Zeppelin IV', genre: 'Rock', year: 1971 },
  'nirvana-come-as-you-are.mp3': { title: 'Come As You Are', artist: 'Nirvana', album: 'Nevermind', genre: 'Grunge', year: 1991 },
  'nirvana-lithium.mp3': { title: 'Lithium', artist: 'Nirvana', album: 'Nevermind', genre: 'Grunge', year: 1991 },
  'nirvana-teen-spirit.mp3': { title: 'Smells Like Teen Spirit', artist: 'Nirvana', album: 'Nevermind', genre: 'Grunge', year: 1991 },
  'pink-floyd-another-brick.mp3': { title: 'Another Brick In The Wall', artist: 'Pink Floyd', album: 'The Wall', genre: 'Progressive Rock', year: 1979 },
  'pink-floyd-comfortably-numb.mp3': { title: 'Comfortably Numb', artist: 'Pink Floyd', album: 'The Wall', genre: 'Progressive Rock', year: 1979 },
  'pink-floyd-time.mp3': { title: 'Time', artist: 'Pink Floyd', album: 'The Dark Side of the Moon', genre: 'Progressive Rock', year: 1973 },
  'pink-floyd-us-and-them.mp3': { title: 'Us And Them', artist: 'Pink Floyd', album: 'The Dark Side of the Moon', genre: 'Progressive Rock', year: 1973 },
  'Queen_Love-Of-My-Life.mp3': { title: 'Love Of My Life', artist: 'Queen', album: 'A Night at the Opera', genre: 'Rock', year: 1975 },
  'radiohead-karma-police.mp3': { title: 'Karma Police', artist: 'Radiohead', album: 'OK Computer', genre: 'Alternative Rock', year: 1997 },
  'radiohead-no-surprises.mp3': { title: 'No Surprises', artist: 'Radiohead', album: 'OK Computer', genre: 'Alternative Rock', year: 1997 },
  'radiohead-paranoid-android.mp3': { title: 'Paranoid Android', artist: 'Radiohead', album: 'OK Computer', genre: 'Alternative Rock', year: 1997 },
  'stones-brown-sugar.mp3': { title: 'Brown Sugar', artist: 'The Rolling Stones', album: 'Sticky Fingers', genre: 'Rock', year: 1971 }
};

async function updateSongsMetadata() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    const songs = await Song.find();
    console.log(`📊 Total canciones: ${songs.length}\n`);

    let updated = 0;
    let notFound = 0;

    for (const song of songs) {
      const metadata = songMetadata[song.fileName];
      
      if (metadata) {
        await Song.updateOne(
          { _id: song._id },
          { 
            $set: {
              title: metadata.title,
              artist: metadata.artist,
              album: metadata.album,
              genre: metadata.genre,
              year: metadata.year
            }
          }
        );
        console.log(`✅ ${song.fileName} → ${metadata.title} (${metadata.genre})`);
        updated++;
      } else {
        console.log(`⚠️  ${song.fileName} - NO HAY METADATOS`);
        notFound++;
      }
    }

    console.log(`\n📊 RESUMEN:`);
    console.log(`   ✅ Actualizadas: ${updated}`);
    console.log(`   ⚠️  Sin metadatos: ${notFound}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateSongsMetadata();
