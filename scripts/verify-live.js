const https = require('https');

https.get('https://gutterbears.vercel.app', (res) => {
  console.log('HTTP Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Content length:', data.length);
    console.log('Has SMM bar:', data.includes('fb.me/2dQlXufp1cr05g6'));
    console.log('Has Ads Library:', data.includes('1733728674591526'));
    const items = data.split('<li class="v-item"');
    console.log('Tiles rendered in live HTML:', items.length - 1);
  });
}).on('error', (err) => console.error(err.message));
