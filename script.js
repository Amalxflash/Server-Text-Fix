document.getElementById('urlForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const urls = document.getElementById('urls').value.trim().split('\n').map(url => url.trim()).filter(url => url);
    const filterChecked = document.getElementById('filter').checked;
    const hierarchyChecked = document.getElementById('hierarchy').checked;
    const ariaLabelChecked = document.getElementById('ariaLabel').checked;
    const imageChecked = document.getElementById('image').checked;
    const metaChecked = document.getElementById('meta').checked;
    const regionSpecificChecked = document.getElementById('regionSpecific').checked;
  
    if (urls.length === 0) {
      alert('Please enter at least one URL.');
      return;
    }
  
    // Show the loading image
    document.getElementById('loading').style.display = 'block';
  
    try {
      const response = await fetch('http://localhost:3000/check-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ urls, filterChecked, hierarchyChecked, ariaLabelChecked, imageChecked, metaChecked, regionSpecificChecked })
      });
  
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
  
      const results = await response.json();
  
      populateResultsTable(results);
      populateOtherTables(results);
  
      // Display tables based on checkbox states
      updateTableVisibility();
  
    } catch (error) {
      console.error('Error fetching the provided URL:', error.message);
      alert('Error fetching the provided URL.');
    } finally {
      // Hide the loading image
      document.getElementById('loading').style.display = 'none';
    }
  });
  
  document.getElementById('all').addEventListener('change', () => filterLinks('all'));
  document.getElementById('broken').addEventListener('change', () => filterLinks('broken'));
  document.getElementById('redirects').addEventListener('change', () => filterLinks('redirects'));
  document.getElementById('akams').addEventListener('change', () => filterLinks('akams'));
  document.getElementById('fragments').addEventListener('change', () => filterLinks('fragments'));
  
  function filterLinks(status) {
    const rows = document.querySelectorAll('#resultsTableBody tr');
    rows.forEach(row => {
      const statusCodeCell = row.querySelector('td:nth-child(3)');
      const statusCell = row.querySelector('td:nth-child(4)');
      const urlCell = row.querySelector('td:nth-child(2)');
      if (status === 'all' || 
          (status === 'broken' && statusCell.textContent.toLowerCase().includes('broken')) ||
          (status === 'redirects' && (statusCodeCell.textContent === '301' || statusCodeCell.textContent === '302')) ||
          (status === 'akams' && urlCell.textContent.includes('aka.ms')) ||
          (status === 'fragments' && (urlCell.textContent.match(/^https?:\/\/.*#.*$/) || urlCell.textContent.startsWith('#')))) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }
  
  
  function getStatusText(statusCode) {
    if (!statusCode) {
      return 'Unknown (No status code)';
    }
    if (statusCode >= 200 && statusCode < 300) {
      return 'Working';
    } else if (statusCode >= 300 && statusCode < 400) {
      return 'Redirect';
    } else if (statusCode >= 400 && statusCode < 500) {
      return 'Broken (Client Error)';
    } else if (statusCode >= 500 && statusCode < 600) {
      return 'Broken (Server Error)';
    } else {
      return `Unknown Status (${statusCode})`;
    }
  }

  function getColorForURL(url) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = url.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = Math.floor(Math.abs(Math.sin(hash) * 16777215) % 16777215).toString(16);
    return '#' + '0'.repeat(6 - color.length) + color;
  }
  
  function populateResultsTable(results) {
    const resultsTableBody = document.getElementById('resultsTableBody');
    resultsTableBody.innerHTML = '';
  
    results.forEach(pageResult => {
      if (pageResult.error) {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.textContent = pageResult.pageUrl;
        nameCell.colSpan = 5;
        row.appendChild(nameCell);
        resultsTableBody.appendChild(row);
  
        const errorRow = document.createElement('tr');
        const errorCell = document.createElement('td');
        errorCell.textContent = pageResult.error;
        errorCell.colSpan = 5;
        errorRow.appendChild(errorCell);
        resultsTableBody.appendChild(errorRow);
      } else {
        const urlColor = getColorForURL(pageResult.pageUrl);
        pageResult.links.forEach(result => {
          const row = document.createElement('tr');
  
          const nameCell = document.createElement('td');
          nameCell.textContent = pageResult.pageUrl;
          nameCell.style.backgroundColor = urlColor;
          nameCell.style.color = '#ffffff';
  
          const urlCell = document.createElement('td');
          urlCell.textContent = result.url;
          if (result.url.includes('%20')) {
            urlCell.classList.add('red');
          } else if (result.url.includes('aka.ms')) {
            urlCell.classList.add('green');
          } else if (result.url.match(/^https?:\/\/.*#.*$/)) {
            urlCell.classList.add('blue');
          } else if (result.url.startsWith('#')) {
            urlCell.classList.add('color-03AED2');
          }
  
          const statusCodeCell = document.createElement('td');
          statusCodeCell.textContent = result.statusCode || '-';
  
          const statusCell = document.createElement('td');
          statusCell.textContent = getStatusText(result.statusCode);
  
          const finalUrlCell = document.createElement('td');
          finalUrlCell.textContent = result.finalUrl || '-';
  
          row.appendChild(nameCell);
          row.appendChild(urlCell);
          row.appendChild(statusCodeCell);
          row.appendChild(statusCell);
          row.appendChild(finalUrlCell);
          resultsTableBody.appendChild(row);
        });
      }
    });
  }
  
  function populateOtherTables(results) {
    // Populate hierarchy table
    const hierarchyTableBody = document.getElementById('hierarchyTableBody');
    hierarchyTableBody.innerHTML = '';
    results.forEach(pageResult => {
        const urlColor = getColorForURL(pageResult.pageUrl);
        pageResult.hierarchy.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="background-color: ${urlColor}; color: #ffffff;">${pageResult.pageUrl}</td>
                <td>${item.text}</td>
                <td>${item.tag}</td>
            `;
            hierarchyTableBody.appendChild(row);
        });
    });
  
    // Populate aria-label table
    const ariaLabelTableBody = document.getElementById('ariaLabelTableBody');
    ariaLabelTableBody.innerHTML = '';
    results.forEach(pageResult => {
        const urlColor = getColorForURL(pageResult.pageUrl);
        pageResult.ariaLinks.forEach(link => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="background-color: ${urlColor}; color: #ffffff;">${pageResult.pageUrl}</td>
                <td>${link.ariaLabel}</td>
                <td>${link.url}</td>
                <td>${link.target}</td>
            `;
            ariaLabelTableBody.appendChild(row);
        });
    });
  
    // Populate image table
    const imageTableBody = document.getElementById('imageTableBody');
    imageTableBody.innerHTML = '';
    results.forEach(pageResult => {
        const urlColor = getColorForURL(pageResult.pageUrl);
        pageResult.images.forEach(image => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="background-color: ${urlColor}; color: #ffffff;">${pageResult.pageUrl}</td>
                <td>${image.src}</td>
                <td>${image.alt || ''}</td>
            `;
            imageTableBody.appendChild(row);
        });
    });

  
    // Populate meta table
    const metaTableBody = document.getElementById('metaTableBody');
    metaTableBody.innerHTML = '';
    results.forEach(pageResult => {
        const urlColor = getColorForURL(pageResult.pageUrl);
        pageResult.metaProperties.forEach(meta => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="background-color: ${urlColor}; color: #ffffff;">${pageResult.pageUrl}</td>
                <td>${meta.property || meta.name || meta.charset || meta['http-equiv'] || 'N/A'}</td>
                <td>${meta.content || meta.charset || 'N/A'}</td>
            `;
            metaTableBody.appendChild(row);
        });
    });
  
    // Populate region-specific table
    const regionSpecificTableBody = document.getElementById('regionSpecificTableBody');
    regionSpecificTableBody.innerHTML = '';
    results.forEach(pageResult => {
        const urlColor = getColorForURL(pageResult.pageUrl);
        if (pageResult.regionSpecificLanguages && pageResult.regionSpecificLanguages.length > 0) {
            const row = document.createElement('tr');
            const mainUrl = new URL(pageResult.pageUrl);
            
            row.innerHTML = `
                <td style="background-color: ${urlColor}; color: #ffffff;">${pageResult.pageUrl}</td>
                <td>${pageResult.regionSpecificLanguages.join(', ')}</td>
                <td>${pageResult.regionSpecificLanguages.map(lang => {
                    const regionSpecificUrl = new URL(pageResult.pageUrl);
                    regionSpecificUrl.pathname = `/${lang}${mainUrl.pathname}`;
                    return `<a href="${regionSpecificUrl.href}" target="_blank">${lang}</a>`;
                }).join(', ')}</td>
            `;
            regionSpecificTableBody.appendChild(row);
        }
    });
}
  
  function updateTableVisibility() {
    const hierarchyChecked = document.getElementById('hierarchy').checked;
    const ariaLabelChecked = document.getElementById('ariaLabel').checked;
    const imageChecked = document.getElementById('image').checked;
    const metaChecked = document.getElementById('meta').checked;
    const regionSpecificChecked = document.getElementById('regionSpecific').checked;
  
    document.getElementById('resultsTable').style.display = 
      !hierarchyChecked && !ariaLabelChecked && !imageChecked && !metaChecked && !regionSpecificChecked ? '' : 'none';
    document.getElementById('hierarchyTable').style.display = hierarchyChecked ? '' : 'none';
    document.getElementById('ariaLabelTable').style.display = ariaLabelChecked ? '' : 'none';
    document.getElementById('imageTable').style.display = imageChecked ? '' : 'none';
    document.getElementById('metaTable').style.display = metaChecked ? '' : 'none';
    document.getElementById('regionSpecificTable').style.display = regionSpecificChecked ? '' : 'none';
  }
  
  function downloadAsExcel() {
    const wb = XLSX.utils.book_new();
  
    if (document.getElementById('resultsTable').style.display !== 'none') {
      const ws = XLSX.utils.table_to_sheet(document.getElementById('resultsTable'));
      XLSX.utils.book_append_sheet(wb, ws, 'Links');
    }
  
    if (document.getElementById('hierarchyTable').style.display !== 'none') {
      const ws = XLSX.utils.table_to_sheet(document.getElementById('hierarchyTable'));
      XLSX.utils.book_append_sheet(wb, ws, 'Hierarchy');
    }
  
    if (document.getElementById('ariaLabelTable').style.display !== 'none') {
      const ws = XLSX.utils.table_to_sheet(document.getElementById('ariaLabelTable'));
      XLSX.utils.book_append_sheet(wb, ws, 'Aria-Label');
    }
  
    if (document.getElementById('imageTable').style.display !== 'none') {
      const ws = XLSX.utils.table_to_sheet(document.getElementById('imageTable'));
      XLSX.utils.book_append_sheet(wb, ws, 'Images');
    }
  
    if (document.getElementById('metaTable').style.display !== 'none') {
      const ws = XLSX.utils.table_to_sheet(document.getElementById('metaTable'));
      XLSX.utils.book_append_sheet(wb, ws, 'Meta Properties');
    }
  
    if (document.getElementById('regionSpecificTable').style.display !== 'none') {
      const ws = XLSX.utils.table_to_sheet(document.getElementById('regionSpecificTable'));
      XLSX.utils.book_append_sheet(wb, ws, 'Region Specific');
    }
  
    XLSX.writeFile(wb, 'results.xlsx');
  }
  
  document.getElementById('downloadButton').addEventListener('click', downloadAsExcel);
  
  function sortTable(n) {
    const table = document.getElementById('resultsTable');
    const rows = Array.from(table.rows).slice(1);
    const isAscending = table.rows[0].cells[n].classList.toggle('asc');
    const dirModifier = isAscending ? 1 : -1;
  
    const sortedRows = rows.sort((a, b) => {
      const aText = a.cells[n].textContent.trim();
      const bText = b.cells[n].textContent.trim();
  
      if (!isNaN(aText) && !isNaN(bText)) {
        return dirModifier * (aText - bText);
      } else {
        return dirModifier * aText.localeCompare(bText);
      }
    });
  
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    sortedRows.forEach(row => tbody.appendChild(row));
  }
  
  // Add event listeners for checkboxes
  document.getElementById('hierarchy').addEventListener('change', updateTableVisibility);
  document.getElementById('ariaLabel').addEventListener('change', updateTableVisibility);
  document.getElementById('image').addEventListener('change', updateTableVisibility);
  document.getElementById('meta').addEventListener('change', updateTableVisibility);
  document.getElementById('regionSpecific').addEventListener('change', updateTableVisibility);