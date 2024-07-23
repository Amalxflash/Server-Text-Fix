async function fetchTextContent(url) {
  try {
    const response = await fetch(`http://localhost:3000/fetch-text-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching text content from ${url}:`, error);
    return null;
  }
}

document.getElementById('comparisonForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const urls1 = document.getElementById('urls1').value.trim().split('\n').map(url => url.trim()).filter(url => url);
  const urls2 = document.getElementById('urls2').value.trim().split('\n').map(url => url.trim()).filter(url => url);

  if (urls1.length === 0 || urls2.length === 0) {
    alert('Please enter at least one URL in both sets.');
    return;
  }

  document.getElementById('loading').style.display = 'block';

  try {
    const textContent1 = await Promise.all(urls1.map(fetchTextContent));
    const textContent2 = await Promise.all(urls2.map(fetchTextContent));

    const response1 = await fetch('http://localhost:3000/check-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ urls: urls1, filterChecked: false, hierarchyChecked: true, ariaLabelChecked: true, imageChecked: true, textChecked: true })
    });

    const response2 = await fetch('http://localhost:3000/check-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ urls: urls2, filterChecked: false, hierarchyChecked: true, ariaLabelChecked: true, imageChecked: true, textChecked: true })
    });

    if (!response1.ok || !response2.ok) {
      throw new Error('Network response was not ok');
    }

    const results1 = await response1.json();
    const results2 = await response2.json();

    console.log('Results 1:', results1);
    console.log('Results 2:', results2);

    results1.forEach((result, index) => {
      result.textContent = textContent1[index];
    });
    results2.forEach((result, index) => {
      result.textContent = textContent2[index];
    });

    displayComparison(results1, results2);
  } catch (error) {
    console.error('Error fetching or processing the provided URLs:', error);
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
});

document.getElementById('headingRadio').addEventListener('change', showTable);
document.getElementById('ariaRadio').addEventListener('change', showTable);
document.getElementById('imagesRadio').addEventListener('change', showTable);
document.getElementById('textRadio').addEventListener('change', showTable);
document.getElementById('allRadio').addEventListener('change', showTable);

function showTable() {
  const headingTable = document.getElementById('headingTableContainer');
  const ariaTable = document.getElementById('ariaTableContainer');
  const imagesTable = document.getElementById('imagesTableContainer');
  const textTable = document.getElementById('textTableContainer');

  if (document.getElementById('headingRadio').checked) {
    headingTable.style.display = '';
    ariaTable.style.display = 'none';
    imagesTable.style.display = 'none';
    textTable.style.display = 'none';
  } else if (document.getElementById('ariaRadio').checked) {
    headingTable.style.display = 'none';
    ariaTable.style.display = '';
    imagesTable.style.display = 'none';
    textTable.style.display = 'none';
  } else if (document.getElementById('imagesRadio').checked) {
    headingTable.style.display = 'none';
    ariaTable.style.display = 'none';
    imagesTable.style.display = '';
    textTable.style.display = 'none';
  } else if (document.getElementById('textRadio').checked) {
    headingTable.style.display = 'none';
    ariaTable.style.display = 'none';
    imagesTable.style.display = 'none';
    textTable.style.display = '';
    console.log('Showing text content table');
  } else if (document.getElementById('allRadio').checked) {
    headingTable.style.display = '';
    ariaTable.style.display = '';
    imagesTable.style.display = '';
    textTable.style.display = '';
  }
}

function displayComparison(results1, results2) {
  document.getElementById('headingHierarchyTableBody').innerHTML = '';
  document.getElementById('ariaLabelTableBody').innerHTML = '';
  document.getElementById('imagesTableBody').innerHTML = '';
  document.getElementById('textContentTableBody').innerHTML = '';

  const getFeatureList = (results, feature) => {
    return results.map(pageResult => pageResult[feature])
      .flat()
      .filter(item => item !== undefined && item !== null)
      .map(item => {
        if (item && typeof item.text === 'string') {
          item.text = item.text.trim();
        }
        return item;
      });
  };

  const headingHierarchyList1 = getFeatureList(results1, 'hierarchy');
  const headingHierarchyList2 = getFeatureList(results2, 'hierarchy');
  const ariaLabelList1 = getFeatureList(results1, 'ariaLinks');
  const ariaLabelList2 = getFeatureList(results2, 'ariaLinks');
  const imageList1 = getFeatureList(results1, 'images');
  const imageList2 = getFeatureList(results2, 'images');
  const textContentList1 = getFeatureList(results1, 'textContent');
  const textContentList2 = getFeatureList(results2, 'textContent');

  console.log('Text Content List 1:', textContentList1);
  console.log('Text Content List 2:', textContentList2);

  populateTable('headingHierarchyTableBody', headingHierarchyList1, headingHierarchyList2);
  populateTable('ariaLabelTableBody', ariaLabelList1, ariaLabelList2);
  populateTable('imagesTableBody', imageList1, imageList2);
  populateTable('textContentTableBody', textContentList1, textContentList2);

  console.log('Populating text content table with:', textContentList1, textContentList2);
}

function populateTable(tableBodyId, list1, list2) {
  const tableBody = document.getElementById(tableBodyId);
  const maxLength = Math.max(list1.length, list2.length);

  for (let i = 0; i < maxLength; i++) {
    const tr = document.createElement('tr');
    const set1Cell = document.createElement('td');
    const set2Cell = document.createElement('td');
    const diffCell = document.createElement('td');

    const item1 = list1[i] ? formatItem(list1[i]) : '';
    const item2 = list2[i] ? formatItem(list2[i]) : '';

    set1Cell.innerHTML = item1;
    set2Cell.innerHTML = item2;
    diffCell.innerHTML = getDifference(item1, item2);

    highlightDifferences(set1Cell, set2Cell, item1, item2);

    tr.appendChild(set1Cell);
    tr.appendChild(set2Cell);
    tr.appendChild(diffCell);
    tableBody.appendChild(tr);
  }
}

function formatItem(item) {
  if (typeof item !== 'object' || item === null) {
    return String(item);
  }

  let formattedString = '';
  
  // Special handling for heading hierarchy
  if ('tag' in item && 'text' in item) {
    return `<strong>${item.tag}:</strong> ${item.text}`;
  }
  
  // Special handling for aria links
  if ('url' in item && 'ariaLabel' in item) {
    formattedString += `<strong>URL:</strong> ${item.url}<br><br>`;
    formattedString += `<strong>Aria Label:</strong> ${item.ariaLabel}<br><br>`;
    if (item.target) {
      formattedString += `<strong>Target:</strong> ${item.target}`;
    }
    return formattedString;
  }
  
  // Special handling for images
  if ('src' in item && 'alt' in item) {
    formattedString += `<strong>Source:</strong> ${item.src}<br><br>`;
    formattedString += `<strong>Alt Text:</strong> ${item.alt || '(No alt text)'}`;
    return formattedString;
  }
  
  // For text content or any other object
  for (const [key, value] of Object.entries(item)) {
    formattedString += `<strong>${key}:</strong> ${value}<br>`;
  }
  
  return formattedString.trim();
}

function highlightDifferences(set1Cell, set2Cell, item1, item2) {
  const lines1 = item1.split('<br>');
  const lines2 = item2.split('<br>');

  const allKeys = new Set([
    ...lines1.map(line => line.split(':')[0]),
    ...lines2.map(line => line.split(':')[0])
  ]);

  allKeys.forEach(key => {
    const value1 = lines1.find(line => line.startsWith(key))?.split(':')[1]?.trim();
    const value2 = lines2.find(line => line.startsWith(key))?.split(':')[1]?.trim();

    if (value1 !== value2) {
      highlightCell(set1Cell, `${key}: ${value1}`, 'highlightSet1');
      highlightCell(set2Cell, `${key}: ${value2}`, 'highlightSet2');
    }
  });
}

function highlightCell(cell, value, highlightClass) {
  if (!cell.innerHTML.includes(value)) return;

  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedValue, 'g');
  cell.innerHTML = cell.innerHTML.replace(regex, `<span class="${highlightClass}">${value}</span>`);
}

function getDifference(item1, item2) {
  if (item1 === item2) {
    return 'No difference';
  }

  if (!item1 || !item2) return 'Difference: One item is missing';

  const dmp = new diff_match_patch();
  const diff = dmp.diff_main(item1, item2);
  dmp.diff_cleanupSemantic(diff);

  let diffHtml = '';
  let hasDifference = false;
  diff.forEach(([operation, text]) => {
    switch (operation) {
      case 1: // Insertion
        diffHtml += `<ins style="background-color: #aaffaa;">${text}</ins>`;
        hasDifference = true;
        break;
      case -1: // Deletion
        diffHtml += `<del style="background-color: #ffaaaa;">${text}</del>`;
        hasDifference = true;
        break;
      case 0: // No change
        diffHtml += text;
        break;
    }
  });

  return hasDifference ? diffHtml : 'No difference';
}