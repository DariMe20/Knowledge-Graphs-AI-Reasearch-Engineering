// SPARQL Client for GraphDB Query Frontend

class SPARQLClient {
    constructor(config = {}) {
        this.config = {
            endpoint: config.endpoint || 'http://localhost:7200',
            repository: config.repository || 'kgsde-proj',
            username: config.username || '',
            password: config.password || '',
            timeout: config.timeout || 30000
        };
        
        // Base URL for our FastAPI backend
        this.apiBase = '/api';
        console.log('SPARQLClient initialized with config:', this.config);
    }
    
    /**
     * Update client configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('SPARQLClient config updated:', this.config);
    }
    
    /**
     * Execute SPARQL query
     */
    async query(sparql, format = 'json') {
        if (!sparql || !sparql.trim()) {
            throw new Error('SPARQL query cannot be empty');
        }
        
        const startTime = Date.now();
        
        try {
            console.log('Executing SPARQL query:', sparql);
            
            const response = await fetch(`${this.apiBase}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sparql: sparql.trim(),
                    format: format,
                    endpoint: this.config.endpoint,
                    repository: this.config.repository,
                    username: this.config.username || undefined,
                    password: this.config.password || undefined
                })
            });
            
            const data = await response.json();
            const executionTime = Date.now() - startTime;
            
            if (!response.ok) {
                throw new Error(data.detail || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            if (!data.success) {
                throw new Error(data.message || 'Query failed');
            }
            
            console.log('Query executed successfully in', executionTime, 'ms');
            
            return {
                success: true,
                results: data.results,
                executionTime: executionTime,
                query: sparql
            };
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            console.error('Query execution failed:', error);
            
            return {
                success: false,
                error: error.message,
                executionTime: executionTime,
                query: sparql
            };
        }
    }
    
    /**
     * Execute SELECT query
     */
    async select(sparql) {
        if (!sparql.trim().toLowerCase().startsWith('select')) {
            throw new Error('Query must be a SELECT query');
        }
        return await this.query(sparql, 'json');
    }
    
    /**
     * Execute CONSTRUCT query
     */
    async construct(sparql) {
        if (!sparql.trim().toLowerCase().startsWith('construct')) {
            throw new Error('Query must be a CONSTRUCT query');
        }
        return await this.query(sparql, 'json');
    }
    
    /**
     * Execute ASK query
     */
    async ask(sparql) {
        if (!sparql.trim().toLowerCase().startsWith('ask')) {
            throw new Error('Query must be an ASK query');
        }
        return await this.query(sparql, 'json');
    }
    
    /**
     * Execute DESCRIBE query
     */
    async describe(sparql) {
        if (!sparql.trim().toLowerCase().startsWith('describe')) {
            throw new Error('Query must be a DESCRIBE query');
        }
        return await this.query(sparql, 'json');
    }
    
    /**
     * Test connection to GraphDB
     */
    async testConnection() {
        const startTime = Date.now();
        
        try {
            console.log('Testing connection to GraphDB...');
            
            const response = await fetch(`${this.apiBase}/test-connection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    endpoint: this.config.endpoint,
                    repository: this.config.repository,
                    username: this.config.username || undefined,
                    password: this.config.password || undefined
                })
            });
            
            const data = await response.json();
            const testTime = Date.now() - startTime;
            
            if (!response.ok) {
                throw new Error(data.detail || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            console.log('Connection test completed in', testTime, 'ms');
            
            return {
                success: data.success,
                message: data.message,
                testTime: testTime,
                testResult: data.test_result
            };
            
        } catch (error) {
            const testTime = Date.now() - startTime;
            console.error('Connection test failed:', error);
            
            return {
                success: false,
                message: error.message,
                testTime: testTime
            };
        }
    }
    
    /**
     * Get list of available repositories
     */
    async getRepositories() {
        try {
            console.log('Fetching available repositories...');
            
            const response = await fetch(`${this.apiBase}/repositories?endpoint=${encodeURIComponent(this.config.endpoint)}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch repositories');
            }
            
            console.log('Repositories fetched successfully');
            return {
                success: true,
                repositories: data.repositories
            };
            
        } catch (error) {
            console.error('Failed to fetch repositories:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Validate SPARQL query syntax (basic validation)
     */
    validateQuery(sparql) {
        if (!sparql || !sparql.trim()) {
            return { valid: false, error: 'Query cannot be empty' };
        }
        
        const trimmed = sparql.trim().toLowerCase();
        const validPrefixes = ['select', 'construct', 'ask', 'describe', 'insert', 'delete', 'with'];
        
        const isValid = validPrefixes.some(prefix => trimmed.startsWith(prefix));
        
        if (!isValid) {
            return { 
                valid: false, 
                error: 'Query must start with a valid SPARQL keyword (SELECT, CONSTRUCT, ASK, DESCRIBE, INSERT, DELETE, WITH)' 
            };
        }
        
        // Basic bracket matching
        const openBrackets = (sparql.match(/\{/g) || []).length;
        const closeBrackets = (sparql.match(/\}/g) || []).length;
        
        if (openBrackets !== closeBrackets) {
            return { 
                valid: false, 
                error: 'Mismatched curly brackets in query' 
            };
        }
        
        return { valid: true };
    }
    
    /**
     * Get query type
     */
    getQueryType(sparql) {
        if (!sparql) return 'unknown';
        
        const trimmed = sparql.trim().toLowerCase();
        
        if (trimmed.startsWith('select')) return 'select';
        if (trimmed.startsWith('construct')) return 'construct';
        if (trimmed.startsWith('ask')) return 'ask';
        if (trimmed.startsWith('describe')) return 'describe';
        if (trimmed.startsWith('insert')) return 'insert';
        if (trimmed.startsWith('delete')) return 'delete';
        
        return 'unknown';
    }
    
    /**
     * Format query results for display
     */
    formatResults(queryResult) {
        if (!queryResult.success) {
            return {
                success: false,
                error: queryResult.error,
                executionTime: queryResult.executionTime
            };
        }
        
        const results = queryResult.results;
        const queryType = this.getQueryType(queryResult.query);
        
        // Handle different result formats based on query type
        switch (queryType) {
            case 'select':
                return this.formatSelectResults(results, queryResult.executionTime);
            case 'ask':
                return this.formatAskResults(results, queryResult.executionTime);
            case 'construct':
            case 'describe':
                return this.formatGraphResults(results, queryResult.executionTime);
            default:
                return {
                    success: true,
                    type: queryType,
                    data: results,
                    executionTime: queryResult.executionTime
                };
        }
    }
    
    /**
     * Format SELECT query results
     */
    formatSelectResults(results, executionTime) {
        if (!results || !results.results || !results.results.bindings) {
            return {
                success: true,
                type: 'select',
                headers: [],
                rows: [],
                count: 0,
                executionTime: executionTime
            };
        }
        
        const bindings = results.results.bindings;
        const headers = results.head.vars || [];
        
        const rows = bindings.map(binding => {
            const row = {};
            headers.forEach(header => {
                const value = binding[header];
                row[header] = value ? value.value : '';
            });
            return row;
        });
        
        return {
            success: true,
            type: 'select',
            headers: headers,
            rows: rows,
            count: rows.length,
            executionTime: executionTime,
            raw: results
        };
    }
    
    /**
     * Format ASK query results
     */
    formatAskResults(results, executionTime) {
        return {
            success: true,
            type: 'ask',
            result: results.boolean || false,
            executionTime: executionTime,
            raw: results
        };
    }
    
    /**
     * Format CONSTRUCT/DESCRIBE query results
     */
    formatGraphResults(results, executionTime) {
        return {
            success: true,
            type: 'graph',
            triples: results,
            count: Array.isArray(results) ? results.length : 0,
            executionTime: executionTime,
            raw: results
        };
    }
}

// Export for use in other modules
window.SPARQLClient = SPARQLClient; 