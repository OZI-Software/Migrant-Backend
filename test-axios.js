const axios = require('axios');
const cheerio = require('cheerio');

async function getArticleUrl(googleRssUrl) {
    const response = await axios.get(googleRssUrl);
    const $ = cheerio.load(response.data);
    const data = $('c-wiz[data-p]').attr('data-p');
    const obj = JSON.parse(data.replace('%.@.', '["garturlreq",'));

    const payload = {
      'f.req': JSON.stringify([[['Fbv4je', JSON.stringify([...obj.slice(0, -6), ...obj.slice(-2)]), 'null', 'generic']]])
    };

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
    };

    
    const postResponse = await axios.post('https://news.google.com/_/DotsSplashUi/data/batchexecute', payload, { headers });
    const arrayString = JSON.parse(postResponse.data.replace(")]}'", ""))[0][2];
    const articleUrl = JSON.parse(arrayString)[1];

    return articleUrl;
}


const rss = 'https://news.google.com/rss/articles/CBMikgFBVV95cUxOby1KdC1jeTF5NGo4T2tLeUlGdzJhTE0wdzE4NXlxNnRrWFRFcmNaV0ZnS0xPTHN5Z3RiTlZtMEZBZk5OUFpxY2p0ZDNoMlJMSUFGYzZRWUJNZGxHOHZ5MHJTaUx5MGdYSzhxQ1VqNE1hODUxZlIxMnlWaEs3VnJxdVM3azBhdVE3NjR3UVVRcExUQQ?oc=5'
getArticleUrl(rss).then(url => console.log(url));