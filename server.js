const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const NodeCache = require('node-cache');
const { Worker } = require('worker_threads');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

const cache = new NodeCache({ stdTTL: 3600 });

const axiosInstance = axios.create({
  maxSockets: 100,
  timeout: 10000
});

async function checkLink(link) {
  if (link.startsWith('#')) {
    return { url: link, status: true, statusCode: 'Fragment', metaProperties: [], finalUrl: link };
  }

  const cachedResult = cache.get(link);
  if (cachedResult) {
    return cachedResult;
  }

  try {
    const response = await axiosInstance.get(link, {
      maxRedirects: 5,
      validateStatus: function (status) {
        return true;
      },
      timeout: 10000
    });

    const result = {
      url: link,
      status: response.status >= 200 && response.status < 400,
      statusCode: response.status,
      metaProperties: [],
      finalUrl: response.request.res.responseUrl || link
    };

    console.log(`Checked link: ${link}, Status: ${result.statusCode}, Is broken: ${!result.status}`);
    cache.set(link, result);
    return result;
  } catch (error) {
    console.error(`Error checking link ${link}:`, error.message);
    const errorResult = {
      url: link,
      status: false,
      statusCode: error.response ? error.response.status : 'Network Error',
      metaProperties: [],
      finalUrl: link,
      error: error.message
    };
    cache.set(link, errorResult);
    return errorResult;
  }
}

function processLinksWorker(links) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./linkWorker.js', { workerData: links });
    worker.on('message', resolve);
    worker.on('error', (error) => {
      console.error('Worker error:', error);
      reject(error);
    });
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

function checkRegionSpecific(url, $) {
  const localLanguages = [
    'en-us', 'en-au', 'en-ca', 'en-gb', 'en-hk', 'en-ie', 'en-in', 'en-my', 'en-nz', 'en-ph', 'en-sg', 'en-za', 'es-es',
    'es-mx', 'fr-be', 'fr-ca', 'fr-fr', 'it-it', 'ko-kr', 'pt-br', 'de-de', 'ar-sa', 'da-dk', 'fi-fi', 'ja-jp', 'nb-no',
    'nl-be', 'nl-nl', 'zh-cn'
  ];

  const foundLanguages = new Set();

  localLanguages.forEach(lang => {
    if (url.includes(`/${lang}/`) || url.endsWith(`/${lang}`)) {
      foundLanguages.add(lang);
    }
  });

  $('a[href*="/"]').each((index, element) => {
    const href = $(element).attr('href');
    localLanguages.forEach(lang => {
      if (href.includes(`/${lang}/`) || href.endsWith(`/${lang}`)) {
        foundLanguages.add(lang);
      }
    });
  });

  $('[lang]').each((index, element) => {
    const lang = $(element).attr('lang').toLowerCase();
    if (localLanguages.includes(lang)) {
      foundLanguages.add(lang);
    }
  });

  return Array.from(foundLanguages);
}

app.post('/check-links', async (req, res) => {
  const { urls, filterChecked, hierarchyChecked, ariaLabelChecked, imageChecked, metaChecked, regionSpecificChecked } = req.body;
  console.log('Received request to check links:', { urls, filterChecked, hierarchyChecked, ariaLabelChecked, imageChecked, metaChecked, regionSpecificChecked });

  try {
    const results = await Promise.all(urls.map(async (url) => {
      try {
        console.log(`Fetching URL: ${url}`);
        const response = await axiosInstance.get(url);
        const html = response.data;
        const $ = cheerio.load(html);
        const links = [];
        const hierarchy = [];
        const ariaLinks = [];
        const images = [];
        const metaProperties = [];

        function filterHeaderFooter(elements) {
          return elements.filter((index, element) => {
            return $(element).closest('header').length === 0 && $(element).closest('footer').length === 0;
          });
        }

        if (hierarchyChecked) {
          let elements = $('h1, h2, h3, h4, h5, h6');
          if (filterChecked) {
            elements = filterHeaderFooter(elements);
          }
          elements.each((index, element) => {
            hierarchy.push({
              tag: $(element).prop('tagName'),
              text: $(element).text().replace(/[\t\n]/g, '').trim()
            });
          });
        }
        
        if (ariaLabelChecked) {
          let elements = $('a[aria-label]');
          if (filterChecked) {
            elements = filterHeaderFooter(elements);
          }
          elements.each((index, element) => {
            ariaLinks.push({
              url: $(element).attr('href'),
              ariaLabel: $(element).attr('aria-label').replace(/[\t\n]/g, '').trim(),
              target: $(element).attr('target') || '_self'
            });
          });
        }

        if (imageChecked) {
          let elements = $('img');
          if (filterChecked) {
            elements = filterHeaderFooter(elements);
          }
          elements.each((index, element) => {
            images.push({
              src: $(element).attr('src'),
              alt: $(element).attr('alt') ? $(element).attr('alt').replace(/[\t\n]/g, '').trim() : null
            });
          });
        }

        if (metaChecked) {
          $('meta').each((index, element) => {
            const metaTag = {};
            if ($(element).attr('property')) {
              metaTag.property = $(element).attr('property');
              metaTag.content = $(element).attr('content') ? $(element).attr('content').replace(/[\t\n]/g, '').trim() : null;
            } else if ($(element).attr('name')) {
              metaTag.name = $(element).attr('name');
              metaTag.content = $(element).attr('content') ? $(element).attr('content').replace(/[\t\n]/g, '').trim() : null;
            } else {
              metaTag.attribute = $(element).attr('attribute');
              metaTag.content = $(element).attr('content') ? $(element).attr('content').replace(/[\t\n]/g, '').trim() : null;
            }
            if (Object.keys(metaTag).length > 0) {
              metaProperties.push(metaTag);
            }
          });
        }

        if (!hierarchyChecked && !ariaLabelChecked && !imageChecked) {
          let elements = $('a');
          if (filterChecked) {
            elements = filterHeaderFooter(elements);
          }
          elements.each((index, element) => {
            const href = $(element).attr('href');
            if (href && (href.startsWith('http') || href.startsWith('#'))) {
              links.push(href);
            }
          });
        }

        const pageResults = await processLinksWorker(links);
        console.log(`Processed ${pageResults.length} links for ${url}`);

        let regionSpecificLanguages = [];
        if (regionSpecificChecked) {
          regionSpecificLanguages = checkRegionSpecific(url, $);
        }

        return { pageUrl: url, links: pageResults, hierarchy, ariaLinks, images, metaProperties, regionSpecificLanguages };
      } catch (error) {
        console.error(`Error processing URL ${url}:`, error.message);
        return { pageUrl: url, error: `Error processing URL: ${error.message}` };
      }
    }));

    console.log('Sending response with results');
    res.json(results);
  } catch (error) {
    console.error('Error in /check-links route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/fetch-text-content', async (req, res) => {
  const { url } = req.body;

  try {
    const response = await axiosInstance.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    const textContent = [];

    $('h1, h2, h3, h4, h5, h6, p, a, span').each((index, element) => {
      const text = $(element).text().trim();
      if (text) {
        textContent.push({
          text: text
        });
      }
    });

    res.json(textContent);
  } catch (error) {
    console.error(`Error fetching text content from ${url}:`, error);
    res.status(500).json({ error: 'Error fetching text content' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}).on('error', (error) => {
  console.error('Error starting server:', error);
});
              