// Main Application File for GraphDB Query Frontend

class GraphDBApp {
    constructor() {
        this.initialized = false;
        this.config = {
            endpoint: 'http://localhost:7200',
            repository: 'kgsde-proj',
            username: '',
            password: ''
        };
        
        // Initialize SPARQL client
        this.sparqlClient = new SPARQLClient(this.config);
        
        // Results and pagination state
        this.currentResults = null;
        this.currentPage = 1;
        this.pageSize = 50;
        
        // Query history
        this.queryHistory = Storage.get('query-history', []);
        
        // CodeMirror editor instance
        this.editor = null;
        
        this.init();
    }
    
    init() {
        domReady(() => {
            this.initializeUI();
            this.loadSampleQueries();
            this.loadConfig();
            this.bindEvents();
            this.initialized = true;
            console.log('GraphDB Query Frontend initialized');
            showNotification('Application loaded successfully!', 'success', 3000);
        });
    }
    
    initializeUI() {
        // Update connection status
        this.updateConnectionStatus(false);
        
        // Initialize CodeMirror editor
        this.initializeCodeMirror();
    }
    
    initializeCodeMirror() {
        const queryEditor = document.getElementById('queryEditor');
        if (queryEditor && typeof CodeMirror !== 'undefined') {
            // Initialize CodeMirror with SPARQL syntax highlighting
            this.editor = CodeMirror.fromTextArea(queryEditor, {
                mode: 'sparql',
                theme: 'default',
                lineNumbers: true,
                lineWrapping: true,
                autoCloseBrackets: true,
                matchBrackets: true,
                indentUnit: 2,
                tabSize: 2,
                indentWithTabs: false,
                extraKeys: {
                    'Ctrl-Enter': () => this.executeQuery(),
                    'Cmd-Enter': () => this.executeQuery(),
                    'Tab': 'indentMore',
                    'Shift-Tab': 'indentLess'
                },
                placeholder: 'Enter your SPARQL query here...'
            });
            
            // Set initial content
            const defaultQuery = `# Welcome to GraphDB Query Frontend!
# Enter your SPARQL query here
# Try one of the sample queries from the dropdown above
# Keyboard shortcuts: Ctrl+Enter (execute)

SELECT ?subject ?predicate ?object
WHERE {
    ?subject ?predicate ?object
}
LIMIT 10`;
            
            this.editor.setValue(defaultQuery);
            
            // Set up event listeners for CodeMirror
            this.editor.on('change', debounce(() => {
                this.updateQueryStats();
                this.validateQuerySyntax();
            }, 300));
            
            // Focus the editor
            this.editor.focus();
            
        } else {
            // Fallback to textarea if CodeMirror is not available
            console.warn('CodeMirror not available, using fallback textarea');
            this.initializeFallbackEditor();
        }
    }
    
    initializeFallbackEditor() {
        const queryEditor = document.getElementById('queryEditor');
        if (queryEditor) {
            queryEditor.value = `# Welcome to GraphDB Query Frontend!
# Enter your SPARQL query here
# Try one of the sample queries from the dropdown above
# Keyboard shortcuts: Ctrl+Enter (execute)

SELECT ?subject ?predicate ?object
WHERE {
    ?subject ?predicate ?object
}
LIMIT 10`;
            this.updateQueryStats();
        }
    }
    
    loadSampleQueries() {
        fetch('/static/examples/sample-queries.json')
            .then(response => response.json())
            .then(queries => {
                this.populateQueryDropdown(queries);
            })
            .catch(error => {
                console.error('Failed to load sample queries:', error);
            });
    }
    
    populateQueryDropdown(sampleQueries = []) {
        const select = document.getElementById('sampleQueries');
        if (!select) return;
        
        // Clear existing options except the first one
        select.innerHTML = '<option value="">Load Sample Query...</option>';
        
        // Add recent queries section
        if (this.queryHistory.length > 0) {
            const recentGroup = document.createElement('optgroup');
            recentGroup.label = 'Recent Queries';
            
            this.queryHistory.slice(0, 5).forEach((entry, index) => {
                const option = document.createElement('option');
                option.value = entry.query;
                const status = entry.success ? '✅' : '❌';
                const date = new Date(entry.timestamp).toLocaleTimeString();
                const preview = entry.query.length > 40 
                    ? entry.query.substring(0, 40) + '...' 
                    : entry.query;
                
                option.textContent = `${status} ${date} - ${preview}`;
                option.title = `${entry.type?.toUpperCase() || 'QUERY'} - ${entry.success ? 'Success' : 'Failed'}\n${entry.query}`;
                recentGroup.appendChild(option);
            });
            
            select.appendChild(recentGroup);
        }
        
        // Add sample queries section
        if (sampleQueries.length > 0) {
            const sampleGroup = document.createElement('optgroup');
            sampleGroup.label = 'Sample Queries';
            
            sampleQueries.forEach(query => {
                const option = document.createElement('option');
                option.value = query.sparql;
                option.textContent = query.name;
                option.title = query.description;
                sampleGroup.appendChild(option);
            });
            
            select.appendChild(sampleGroup);
        }
    }
    
    loadConfig() {
        const savedConfig = Storage.get('graphdb-config');
        if (savedConfig) {
            this.config = { ...this.config, ...savedConfig };
            this.updateConfigUI();
        }
    }
    
    updateConfigUI() {
        document.getElementById('endpoint').value = this.config.endpoint;
        document.getElementById('repository').value = this.config.repository;
        document.getElementById('username').value = this.config.username;
        document.getElementById('password').value = this.config.password;
    }
    
    bindEvents() {
        // History button
        document.getElementById('historyBtn').addEventListener('click', () => {
            this.showQueryHistory();
        });
        
        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showConfigPanel();
        });
        
        // Config panel buttons
        document.getElementById('closeConfigBtn').addEventListener('click', () => {
            this.hideConfigPanel();
        });
        
        document.getElementById('saveConfigBtn').addEventListener('click', () => {
            this.saveConfig();
        });
        
        document.getElementById('testConnectionBtn').addEventListener('click', () => {
            this.testConnection();
        });
        
        // Query editor events (fallback for textarea)
        if (!this.editor) {
            const queryEditor = document.getElementById('queryEditor');
            if (queryEditor) {
                queryEditor.addEventListener('input', debounce(() => {
                    this.updateQueryStats();
                    this.validateQuerySyntax();
                }, 300));
            }
        }
        
        // Sample queries dropdown
        document.getElementById('sampleQueries').addEventListener('change', (e) => {
            if (e.target.value) {
                this.loadSampleQuery(e.target.value);
                e.target.selectedIndex = 0; // Reset dropdown
            }
        });
        
        // Clear query button
        document.getElementById('clearQueryBtn').addEventListener('click', () => {
            this.clearQuery();
        });
        
        // Execute query button
        document.getElementById('executeQueryBtn').addEventListener('click', () => {
            this.executeQuery();
        });
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Export buttons
        document.getElementById('exportCsvBtn').addEventListener('click', () => {
            this.exportResults('csv');
        });
        
        document.getElementById('exportJsonBtn').addEventListener('click', () => {
            this.exportResults('json');
        });
        
        // Close config panel on background click
        document.getElementById('configPanel').addEventListener('click', (e) => {
            if (e.target.id === 'configPanel') {
                this.hideConfigPanel();
            }
        });
        
        // Pagination controls
        document.getElementById('prevPageBtn').addEventListener('click', () => {
            this.goToPage(this.currentPage - 1);
        });
        
        document.getElementById('nextPageBtn').addEventListener('click', () => {
            this.goToPage(this.currentPage + 1);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+Enter or Cmd+Enter to execute query
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.executeQuery();
            }
            
            // Escape to close config panel
            if (e.key === 'Escape') {
                this.hideConfigPanel();
            }
            
            // Ctrl+S or Cmd+S to save config
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (document.getElementById('configPanel').classList.contains('active')) {
                    this.saveConfig();
                }
            }
        });
    }
    
    showConfigPanel() {
        document.getElementById('configPanel').classList.add('active');
    }
    
    hideConfigPanel() {
        document.getElementById('configPanel').classList.remove('active');
    }
    
    saveConfig() {
        this.config.endpoint = document.getElementById('endpoint').value;
        this.config.repository = document.getElementById('repository').value;
        this.config.username = document.getElementById('username').value;
        this.config.password = document.getElementById('password').value;
        
        // Update SPARQL client configuration
        this.sparqlClient.updateConfig(this.config);
        
        Storage.set('graphdb-config', this.config);
        showNotification('Configuration saved!', 'success', 2000);
        this.hideConfigPanel();
    }
    
    async testConnection() {
        setLoading(true);
        
        try {
            // Update client config with current form values
            const tempConfig = {
                endpoint: document.getElementById('endpoint').value,
                repository: document.getElementById('repository').value,
                username: document.getElementById('username').value,
                password: document.getElementById('password').value
            };
            
            this.sparqlClient.updateConfig(tempConfig);
            
            const result = await this.sparqlClient.testConnection();
            
            if (result.success) {
                this.updateConnectionStatus(true);
                showNotification(`Connection successful! (${formatTime(result.testTime)})`, 'success');
                
                // Display some connection info if available
                if (result.testResult && result.testResult.results && result.testResult.results.bindings) {
                    const count = result.testResult.results.bindings[0]?.count?.value || '0';
                    showNotification(`Repository contains ${count} triples`, 'info', 3000);
                }
            } else {
                this.updateConnectionStatus(false);
                showNotification(`Connection failed: ${result.message}`, 'error');
            }
        } catch (error) {
            this.updateConnectionStatus(false);
            showNotification(`Connection test error: ${error.message}`, 'error');
        }
        
        setLoading(false);
    }
    
    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connectionStatus');
        const text = indicator.parentElement.querySelector('.status-text');
        
        if (connected) {
            indicator.classList.add('connected');
            text.textContent = 'Connected';
        } else {
            indicator.classList.remove('connected');
            text.textContent = 'Disconnected';
        }
    }
    
    loadSampleQuery(sparql) {
        this.setCurrentQuery(sparql);
        this.updateQueryStats();
        showNotification('Sample query loaded!', 'success', 2000);
    }
    
    clearQuery() {
        this.setCurrentQuery('');
        this.updateQueryStats();
        this.focusEditor();
    }
    
    updateQueryStats() {
        const queryLength = document.getElementById('queryLength');
        
        if (queryLength) {
            const length = this.getCurrentQuery().length;
            queryLength.textContent = `${length} characters`;
        }
    }
    
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update content panels
        document.querySelectorAll('.results-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}View`).classList.add('active');
    }
    
    async executeQuery() {
        const sparql = this.getCurrentQuery().trim();
        
        if (!sparql) {
            showNotification('Please enter a SPARQL query', 'warning');
            this.focusEditor();
            return;
        }
        
        // Validate query
        const validation = this.sparqlClient.validateQuery(sparql);
        if (!validation.valid) {
            showNotification(`Query validation failed: ${validation.error}`, 'error');
            return;
        }
        
        // Show loading state
        setLoading(true);
        this.setQueryExecuting(true);
        
        try {
            console.log('Executing query:', sparql);
            
            // Execute the query
            const result = await this.sparqlClient.query(sparql);
            
            if (result.success) {
                // Format results for display
                const formattedResults = this.sparqlClient.formatResults(result);
                
                // Store current results and reset pagination
                this.currentResults = formattedResults;
                this.currentPage = 1;
                this.lastExecutedQuery = sparql;
                
                // Display results
                this.displayResults(formattedResults);
                
                // Update stats
                this.updateResultsStats(formattedResults);
                
                // Add to query history
                this.addToQueryHistory(sparql, formattedResults);
                
                // Show success notification
                showNotification(
                    `Query executed successfully in ${formatTime(result.executionTime)}`,
                    'success',
                    3000
                );
                
                // Update connection status (if we got results, we're connected)
                this.updateConnectionStatus(true);
                
            } else {
                this.displayError(result.error, result.executionTime);
                this.addToQueryHistory(sparql, { success: false, error: result.error, executionTime: result.executionTime });
                showNotification(`Query failed: ${result.error}`, 'error');
            }
            
        } catch (error) {
            console.error('Query execution error:', error);
            this.displayError(error.message);
            showNotification(`Query execution error: ${error.message}`, 'error');
        }
        
        // Hide loading state
        setLoading(false);
        this.setQueryExecuting(false);
    }
    
    setQueryExecuting(executing) {
        const executeBtn = document.getElementById('executeQueryBtn');
        
        if (executing) {
            executeBtn.disabled = true;
            executeBtn.textContent = 'Executing...';
            this.setEditorReadOnly(true);
        } else {
            executeBtn.disabled = false;
            executeBtn.textContent = 'Execute';
            this.setEditorReadOnly(false);
        }
    }
    
    displayResults(results) {
        if (!results.success) {
            this.displayError(results.error, results.executionTime);
            return;
        }
        
        // Clear previous results
        this.clearResults();
        
        // Display based on query type
        switch (results.type) {
            case 'select':
                this.displaySelectResults(results);
                break;
            case 'ask':
                this.displayAskResults(results);
                // Hide pagination for ASK queries
                document.getElementById('pagination').style.display = 'none';
                break;
            case 'graph':
                this.displayGraphResults(results);
                // Hide pagination for graph queries for now
                document.getElementById('pagination').style.display = 'none';
                break;
            default:
                this.displayRawResults(results);
                // Hide pagination for other query types
                document.getElementById('pagination').style.display = 'none';
        }
        
        // Always show raw JSON
        this.displayRawJSON(results.raw || results);
        
        // Switch to table view by default
        this.switchTab('table');
    }
    
    displaySelectResults(results) {
        const table = document.getElementById('resultsTable');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        
        // Clear existing content
        thead.innerHTML = '';
        tbody.innerHTML = '';
        
        if (results.count === 0) {
            this.displayEmptyResults();
            return;
        }
        
        // Create header row
        const headerRow = document.createElement('tr');
        results.headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        
        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, results.rows.length);
        const paginatedRows = results.rows.slice(startIndex, endIndex);
        
        // Create data rows for current page
        paginatedRows.forEach(row => {
            const tr = document.createElement('tr');
            results.headers.forEach(header => {
                const td = document.createElement('td');
                const value = row[header];
                
                // Format different types of values
                if (value && typeof value === 'string') {
                    if (value.startsWith('http://') || value.startsWith('https://')) {
                        // Make URLs clickable
                        td.innerHTML = `<a href="${value}" target="_blank" rel="noopener">${value}</a>`;
                    } else {
                        td.textContent = value;
                    }
                } else {
                    td.textContent = value || '';
                }
                
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        
        // Update pagination controls
        this.updatePaginationControls();
    }
    
    displayAskResults(results) {
        const table = document.getElementById('resultsTable');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        
        // Clear existing content
        thead.innerHTML = '';
        tbody.innerHTML = '';
        
        // Create simple result display
        const headerRow = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = 'ASK Result';
        headerRow.appendChild(th);
        thead.appendChild(headerRow);
        
        const dataRow = document.createElement('tr');
        const td = document.createElement('td');
        td.textContent = results.result ? 'true' : 'false';
        td.className = results.result ? 'badge-success' : 'badge-error';
        td.style.fontWeight = 'bold';
        dataRow.appendChild(td);
        tbody.appendChild(dataRow);
    }
    
    displayGraphResults(results) {
        const table = document.getElementById('resultsTable');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        
        // Clear existing content
        thead.innerHTML = '';
        tbody.innerHTML = '';
        
        // Simple display for now - show as JSON in table
        const headerRow = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = 'Graph Results';
        headerRow.appendChild(th);
        thead.appendChild(headerRow);
        
        const dataRow = document.createElement('tr');
        const td = document.createElement('td');
        td.innerHTML = `<pre>${JSON.stringify(results.triples, null, 2)}</pre>`;
        dataRow.appendChild(td);
        tbody.appendChild(dataRow);
    }
    
    displayRawResults(results) {
        const table = document.getElementById('resultsTable');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        
        // Clear existing content
        thead.innerHTML = '';
        tbody.innerHTML = '';
        
        // Display raw data
        const headerRow = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = 'Raw Results';
        headerRow.appendChild(th);
        thead.appendChild(headerRow);
        
        const dataRow = document.createElement('tr');
        const td = document.createElement('td');
        td.innerHTML = `<pre>${JSON.stringify(results, null, 2)}</pre>`;
        dataRow.appendChild(td);
        tbody.appendChild(dataRow);
    }
    
    displayRawJSON(data) {
        const rawResults = document.getElementById('rawResults');
        rawResults.textContent = JSON.stringify(data, null, 2);
    }
    
    displayError(error, executionTime) {
        this.clearResults();
        
        const table = document.getElementById('resultsTable');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        
        // Clear existing content
        thead.innerHTML = '';
        tbody.innerHTML = '';
        
        // Show error
        const headerRow = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = 'Error';
        th.style.color = 'var(--error-color)';
        headerRow.appendChild(th);
        thead.appendChild(headerRow);
        
        const dataRow = document.createElement('tr');
        const td = document.createElement('td');
        td.textContent = error;
        td.style.color = 'var(--error-color)';
        td.style.fontFamily = 'var(--font-mono)';
        dataRow.appendChild(td);
        tbody.appendChild(dataRow);
        
        // Show in raw view too
        const rawResults = document.getElementById('rawResults');
        rawResults.textContent = JSON.stringify({
            error: error,
            executionTime: executionTime
        }, null, 2);
    }
    
    displayEmptyResults() {
        const table = document.getElementById('resultsTable');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        
        // Clear existing content
        thead.innerHTML = '';
        tbody.innerHTML = '';
        
        // Show empty state
        const emptyRow = document.createElement('tr');
        const td = document.createElement('td');
        td.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <h3>No Results</h3>
                <p>Your query executed successfully but returned no results.</p>
            </div>
        `;
        td.style.textAlign = 'center';
        td.style.padding = '2rem';
        emptyRow.appendChild(td);
        tbody.appendChild(emptyRow);
    }
    
    clearResults() {
        const table = document.getElementById('resultsTable');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        const rawResults = document.getElementById('rawResults');
        
        thead.innerHTML = '';
        tbody.innerHTML = '';
        rawResults.textContent = '';
    }
    
    updateResultsStats(results) {
        const resultCount = document.getElementById('resultCount');
        const queryExecutionTime = document.getElementById('queryExecutionTime');
        
        if (results.success) {
            switch (results.type) {
                case 'select':
                    // Show total count, will be updated by pagination if needed
                    resultCount.textContent = `${results.count} row${results.count !== 1 ? 's' : ''}`;
                    break;
                case 'ask':
                    resultCount.textContent = `Result: ${results.result}`;
                    break;
                case 'graph':
                    resultCount.textContent = `${results.count} triple${results.count !== 1 ? 's' : ''}`;
                    break;
                default:
                    resultCount.textContent = 'Query completed';
            }
            
            queryExecutionTime.textContent = `Executed in ${formatTime(results.executionTime)}`;
        } else {
            resultCount.textContent = 'Query failed';
            queryExecutionTime.textContent = results.executionTime ? 
                `Failed after ${formatTime(results.executionTime)}` : '';
        }
    }
    
    exportResults(format) {
        if (!this.currentResults || !this.currentResults.success) {
            showNotification('No results to export', 'warning');
            return;
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const queryType = this.currentResults.type || 'query';
        
        try {
            if (format === 'csv') {
                this.exportToCSV(timestamp, queryType);
            } else if (format === 'json') {
                this.exportToJSON(timestamp, queryType);
            }
            
            showNotification(`Results exported as ${format.toUpperCase()}`, 'success', 2000);
        } catch (error) {
            console.error('Export failed:', error);
            showNotification(`Export failed: ${error.message}`, 'error');
        }
    }
    
    exportToCSV(timestamp, queryType) {
        let data = [];
        let filename = `${queryType}-results-${timestamp}.csv`;
        
        if (this.currentResults.type === 'select' && this.currentResults.rows) {
            data = this.currentResults.rows;
        } else if (this.currentResults.type === 'ask') {
            data = [{ result: this.currentResults.result }];
            filename = `ask-result-${timestamp}.csv`;
        } else if (this.currentResults.type === 'graph' && this.currentResults.triples) {
            // Convert triples to flat structure for CSV
            data = Array.isArray(this.currentResults.triples) 
                ? this.currentResults.triples.map((triple, index) => ({ 
                    index: index + 1, 
                    triple: JSON.stringify(triple) 
                }))
                : [{ data: JSON.stringify(this.currentResults.triples) }];
        } else {
            // Fallback for other result types
            data = [this.currentResults];
        }
        
        if (data.length === 0) {
            showNotification('No data to export', 'warning');
            return;
        }
        
        exportToCSV(data, filename);
    }
    
    exportToJSON(timestamp, queryType) {
        const filename = `${queryType}-results-${timestamp}.json`;
        
        const exportData = {
            exportedAt: new Date().toISOString(),
            queryType: this.currentResults.type,
            executionTime: this.currentResults.executionTime,
            resultCount: this.currentResults.count || 0,
            results: this.currentResults,
            query: this.lastExecutedQuery || 'N/A'
        };
        
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    }
    
    // Pagination methods
    goToPage(page) {
        if (!this.currentResults || !this.currentResults.rows) {
            return;
        }
        
        const totalPages = Math.ceil(this.currentResults.rows.length / this.pageSize);
        
        if (page < 1 || page > totalPages) {
            return;
        }
        
        this.currentPage = page;
        this.displaySelectResults(this.currentResults);
        this.updatePaginationControls();
    }
    
    updatePaginationControls() {
        if (!this.currentResults || !this.currentResults.rows) {
            document.getElementById('pagination').style.display = 'none';
            return;
        }
        
        const totalRows = this.currentResults.rows.length;
        const totalPages = Math.ceil(totalRows / this.pageSize);
        
        // Show/hide pagination based on whether it's needed
        const pagination = document.getElementById('pagination');
        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }
        
        pagination.style.display = 'flex';
        
        // Update pagination controls
        document.getElementById('currentPage').textContent = this.currentPage;
        document.getElementById('totalPages').textContent = totalPages;
        
        // Update button states
        document.getElementById('prevPageBtn').disabled = this.currentPage <= 1;
        document.getElementById('nextPageBtn').disabled = this.currentPage >= totalPages;
        
        // Update page info
        const startRow = (this.currentPage - 1) * this.pageSize + 1;
        const endRow = Math.min(this.currentPage * this.pageSize, totalRows);
        
        // Update result count to show pagination info
        const resultCount = document.getElementById('resultCount');
        resultCount.textContent = `Showing ${startRow}-${endRow} of ${totalRows} row${totalRows !== 1 ? 's' : ''}`;
    }
    
    // Query history methods
    addToQueryHistory(query, results) {
        const historyEntry = {
            query: query,
            timestamp: new Date().toISOString(),
            success: results.success,
            executionTime: results.executionTime,
            type: results.type,
            count: results.count || 0
        };
        
        // Don't add duplicate consecutive queries
        if (this.queryHistory.length > 0 && this.queryHistory[0].query === query) {
            return;
        }
        
        // Add to beginning of history
        this.queryHistory.unshift(historyEntry);
        
        // Keep only last 50 queries
        if (this.queryHistory.length > 50) {
            this.queryHistory = this.queryHistory.slice(0, 50);
        }
        
        // Save to storage
        Storage.set('query-history', this.queryHistory);
        
        // Update dropdown with new history
        this.loadSampleQueries();
        
        console.log('Query added to history:', historyEntry);
    }
    
    showQueryHistory() {
        if (this.queryHistory.length === 0) {
            showNotification('No query history available', 'info');
            return;
        }
        
        // Create a simple history display as a notification
        let historyText = 'Recent Queries:\n\n';
        this.queryHistory.slice(0, 5).forEach((entry, index) => {
            const status = entry.success ? '✅' : '❌';
            const time = formatTime(entry.executionTime);
            const date = new Date(entry.timestamp).toLocaleString();
            const queryPreview = entry.query.length > 50 
                ? entry.query.substring(0, 50) + '...' 
                : entry.query;
            
            historyText += `${index + 1}. ${status} ${entry.type?.toUpperCase() || 'QUERY'} (${time})\n`;
            historyText += `   ${date}\n`;
            historyText += `   ${queryPreview}\n\n`;
        });
        
        // Show in console for now (better UI implementation could be added later)
        console.log('Query History:', this.queryHistory);
        
        // Create a simple alert-like display
        const confirmed = confirm(historyText + '\nWould you like to see the full history in the browser console?');
        if (confirmed) {
                         console.table(this.queryHistory.map(entry => ({
                 Date: new Date(entry.timestamp).toLocaleString(),
                 Type: entry.type?.toUpperCase() || 'UNKNOWN',
                 Success: entry.success ? 'Yes' : 'No',
                 'Execution Time': formatTime(entry.executionTime),
                 'Query Preview': entry.query.length > 100 
                     ? entry.query.substring(0, 100) + '...' 
                     : entry.query
             })));
         }
     }
     
     // CodeMirror helper methods
     getCurrentQuery() {
         if (this.editor) {
             return this.editor.getValue();
         } else {
             const queryEditor = document.getElementById('queryEditor');
             return queryEditor ? queryEditor.value : '';
         }
     }
     
     setCurrentQuery(query) {
         if (this.editor) {
             this.editor.setValue(query);
         } else {
             const queryEditor = document.getElementById('queryEditor');
             if (queryEditor) {
                 queryEditor.value = query;
             }
         }
     }
     
     focusEditor() {
         if (this.editor) {
             this.editor.focus();
         } else {
             const queryEditor = document.getElementById('queryEditor');
             if (queryEditor) {
                 queryEditor.focus();
             }
         }
     }
     
     setEditorReadOnly(readOnly) {
         if (this.editor) {
             this.editor.setOption('readOnly', readOnly);
         } else {
             const queryEditor = document.getElementById('queryEditor');
             if (queryEditor) {
                 queryEditor.disabled = readOnly;
             }
         }
     }
     

     
     // Enhanced query validation
     validateQuerySyntax() {
         const query = this.getCurrentQuery();
         const validation = this.sparqlClient.validateQuery(query);
         
         // Visual feedback for validation
         const editorContainer = this.editor ? 
             this.editor.getWrapperElement() : 
             document.getElementById('queryEditor');
             
         if (editorContainer) {
             if (!validation.valid && query.trim()) {
                 editorContainer.style.borderLeft = '3px solid var(--error-color)';
                 editorContainer.title = validation.error;
             } else {
                 editorContainer.style.borderLeft = '';
                 editorContainer.title = '';
             }
         }
         
         return validation;
     }

}

// Initialize the application
const app = new GraphDBApp(); 