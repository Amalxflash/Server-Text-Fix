const { parentPort, workerData } = require('worker_threads');
const axios = require('axios');

const axiosInstance = axios.create({
  maxSockets: 100,
  timeout: 10000 // 10 seconds timeout
});

async function checkLink(link) {
  if (link.startsWith('#')) {
    return { url: link, status: true, statusCode: 'Fragment', metaProperties: [], finalUrl: link };
  }

  try {
    const response = await axiosInstance.get(link, {
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 600; // Accept all status codes to handle them manually
      }
    });

    const result = {
      url: link,
      status: response.status < 400,
      statusCode: response.status,
      metaProperties: [],
      finalUrl: response.request.res.responseUrl || link
    };

    console.log(`Worker: Checked link ${link}, Status: ${result.statusCode}`);
    return result;
  } catch (error) {
    console.error(`Worker: Error checking link ${link}:`, error.message);
    return {
      url: link,
      status: false,
      statusCode: error.response ? error.response.status : 'Network Error',
      metaProperties: [],
      finalUrl: link,
      error: error.message
    };
  }
}

async function processLinks(links) {
  console.log(`Worker: Processing ${links.length} links`);
  const results = await Promise.all(links.map(checkLink));
  console.log(`Worker: Finished processing ${links.length} links`);
  return results;
}

processLinks(workerData)
  .then(result => {
    parentPort.postMessage(result);
  })
  .catch(error => {
    console.error('Worker: Error in processLinks:', error);
    parentPort.postMessage({ error: 'Error processing links in worker' });
  });

// Handle any uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Worker: Unhandled Rejection at:', promise, 'reason:', reason);
});