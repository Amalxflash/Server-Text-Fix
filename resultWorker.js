function createResultHTML(result, filterChecked, hierarchyChecked, ariaLabelChecked, imageChecked, metaChecked) {
    let html = `<h2>Results for ${result.pageUrl}</h2>`;

    if (result.error) {
        return html + `<p class="error">Error: ${result.error}</p>`;
    }

    // Main Links Table
    if (result.links && result.links.length > 0) {
        html += `
        <h3>Main Links</h3>
        <table class="results-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>URL</th>
                    <th>Status Code</th>
                    <th>Status</th>
                    <th>Final URL</th>
                </tr>
            </thead>
            <tbody>
        `;

        result.links.forEach(link => {
            html += `
                <tr>
                    <td>${link.url.split('/').pop() || link.url}</td>
                    <td>${link.url}</td>
                    <td>${link.statusCode}</td>
                    <td>${link.status ? 'OK' : 'Broken'}</td>
                    <td>${link.finalUrl}</td>
                </tr>
            `;
        });

        html += `
            </tbody>
        </table>
        `;
    }

    // Hierarchy Table
    if (hierarchyChecked && result.hierarchy && result.hierarchy.length > 0) {
        html += `
        <h3>Heading Hierarchy</h3>
        <table class="results-table">
            <thead>
                <tr>
                    <th>Text</th>
                    <th>Tag</th>
                </tr>
            </thead>
            <tbody>
        `;

        result.hierarchy.forEach(item => {
            html += `
                <tr>
                    <td>${item.text}</td>
                    <td>${item.tag}</td>
                </tr>
            `;
        });

        html += `
            </tbody>
        </table>
        `;
    }

    // Aria Links Table
    if (ariaLabelChecked && result.ariaLinks && result.ariaLinks.length > 0) {
        html += `
        <h3>Aria Label Links</h3>
        <table class="results-table">
            <thead>
                <tr>
                    <th>Main URL</th>
                    <th>Aria-Label</th>
                    <th>Link</th>
                    <th>Target</th>
                </tr>
            </thead>
            <tbody>
        `;

        result.ariaLinks.forEach(link => {
            html += `
                <tr>
                    <td>${result.pageUrl}</td>
                    <td>${link.ariaLabel}</td>
                    <td>${link.url}</td>
                    <td>${link.target}</td>
                </tr>
            `;
        });

        html += `
            </tbody>
        </table>
        `;
    }

    // Images Table
    if (imageChecked && result.images && result.images.length > 0) {
        html += `
        <h3>Images</h3>
        <table class="results-table">
            <thead>
                <tr>
                    <th>Main URL</th>
                    <th>Source</th>
                    <th>Alt Text</th>
                </tr>
            </thead>
            <tbody>
        `;

        result.images.forEach(image => {
            html += `
                <tr>
                    <td>${result.pageUrl}</td>
                    <td>${image.src}</td>
                    <td>${image.alt || 'N/A'}</td>
                </tr>
            `;
        });

        html += `
            </tbody>
        </table>
        `;
    }

    // Meta Properties Table
    if (metaChecked && result.metaProperties && result.metaProperties.length > 0) {
        html += `
        <h3>Meta Properties</h3>
        <table class="results-table">
            <thead>
                <tr>
                    <th>URL</th>
                    <th>Meta Property</th>
                    <th>Content</th>
                </tr>
            </thead>
            <tbody>
        `;

        result.metaProperties.forEach(meta => {
            html += `
                <tr>
                    <td>${result.pageUrl}</td>
                    <td>${meta.property || meta.name || meta.attribute}</td>
                    <td>${meta.content}</td>
                </tr>
            `;
        });

        html += `
            </tbody>
        </table>
        `;
    }

    return html;
}

self.onmessage = function(e) {
    const { chunk, filterChecked, hierarchyChecked, ariaLabelChecked, imageChecked, metaChecked } = e.data;
    const processedResults = chunk.map(result => {
        return {
            pageUrl: result.pageUrl,
            html: createResultHTML(result, filterChecked, hierarchyChecked, ariaLabelChecked, imageChecked, metaChecked)
        };
    });

    self.postMessage(processedResults);
};