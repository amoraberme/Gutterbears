const http = require('http');

http.get('http://localhost:3000', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('HTML length:', data.length);
    console.log('Includes SMM bar:', data.includes('fb.me/2dQlXufp1cr05g6'));
    console.log('Includes Ads Library ID:', data.includes('1733728674591526'));
    const matches = data.split('<li class="v-item"');
    console.log('Tile count in HTML:', matches.length - 1);
    const videoMatches = data.split('<video class="v-media"');
    console.log('Video count in HTML:', videoMatches.length - 1);
    const imgMatches = data.split('<img class="v-media"');
    console.log('Image count in HTML:', imgMatches.length - 1);
  });
}).on('error', (err) => console.error('Fetch error:', err.message));
