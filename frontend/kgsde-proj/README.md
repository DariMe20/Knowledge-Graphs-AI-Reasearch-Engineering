# GraphDB Query Frontend

A modern, web-based SPARQL query interface for GraphDB repositories with a FastAPI backend and interactive frontend. This application provides a professional query editor with syntax highlighting, real-time query execution, and comprehensive result visualization.

## 🚀 Features

### Query Editor
- **SPARQL Syntax Highlighting** - CodeMirror-powered editor with SPARQL syntax support
- **Auto-completion** - Bracket matching and auto-closing
- **Keyboard Shortcuts** - `Ctrl+Enter` to execute queries, `Tab`/`Shift+Tab` for indentation
- **Query Validation** - Real-time syntax validation with visual feedback
- **Sample Queries** - Pre-built example queries for common SPARQL patterns

### Query Execution
- **Multiple Query Types** - Support for SELECT, CONSTRUCT, ASK, and DESCRIBE queries
- **Real-time Execution** - Asynchronous query processing with execution time tracking
- **Connection Management** - Configurable GraphDB endpoint and repository settings
- **Authentication Support** - Optional username/password authentication
- **Connection Testing** - Built-in connection validation

### Results & Data Management
- **Smart Result Display** - Automatic formatting based on query type
- **Table View** - Clean, sortable tables for SELECT query results
- **Raw JSON View** - Complete query response data for debugging
- **Pagination** - Efficient handling of large result sets (50 rows per page)
- **Export Functionality** - CSV and JSON export with metadata
- **Clickable URLs** - Automatic link detection in result data

### User Experience
- **Query History** - Persistent storage of last 50 executed queries with success/failure tracking
- **Configuration Persistence** - Automatic saving of connection settings
- **Responsive Design** - Mobile-friendly interface with CSS Grid layout
- **Loading States** - Visual feedback during query execution
- **Notifications** - Success/error messages with auto-dismiss
- **Statistics Display** - Query execution time and result counts

## 📋 Requirements

- **Python 3.12+**
- **GraphDB** - Local or remote GraphDB instance
- **Modern Web Browser** - Chrome, Firefox, Safari, or Edge

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd kgsde-proj
```

### 2. Install Dependencies
Using pip:
```bash
pip install fastapi uvicorn requests python-multipart
```

Or using the project file:
```bash
pip install -e .
```

### 3. Start the Application
```bash
python main.py
```

The application will start on `http://localhost:8000`

## ⚙️ Configuration

### GraphDB Setup
1. Ensure GraphDB is running (default: `http://localhost:7200`)
2. Create or have access to a repository (default: `kgsde-proj`)
3. Configure connection in the web interface

### Default Configuration
- **Endpoint**: `http://localhost:7200`
- **Repository**: `kgsde-proj`
- **Authentication**: None (optional)

## 🎯 Usage

### Basic Query Execution
1. **Open** the application at `http://localhost:8000`
2. **Configure** connection settings using the ⚙️ Settings button
3. **Test** connection to ensure GraphDB accessibility
4. **Write** or select a SPARQL query in the editor
5. **Execute** with `Ctrl+Enter` or the Execute button
6. **View** results in table or raw JSON format

### Sample Queries
The application includes 6 pre-built sample queries:

1. **Basic Triple Pattern** - Simple subject-predicate-object query
2. **Count All Triples** - Repository statistics
3. **List All Classes** - RDF classes discovery
4. **List All Properties** - RDF properties discovery  
5. **Instance Count by Class** - Class usage statistics
6. **Sample with Optional** - Optional pattern example

### Query Types Supported

#### SELECT Queries
```sparql
SELECT ?subject ?predicate ?object
WHERE {
    ?subject ?predicate ?object
}
LIMIT 10
```
Results displayed in sortable tables with pagination.

#### ASK Queries
```sparql
ASK {
    ?s rdf:type owl:Class
}
```
Returns boolean results with clear true/false indication.

#### CONSTRUCT/DESCRIBE Queries
```sparql
CONSTRUCT {
    ?s ?p ?o
} WHERE {
    ?s ?p ?o
}
LIMIT 10
```
Results shown as RDF triples in table format.

### Data Export
- **CSV Export** - Structured data with proper escaping
- **JSON Export** - Complete metadata including query, timestamp, and execution time
- **Automatic Naming** - Timestamped filenames for easy organization

## 🏗️ Architecture

### Backend (FastAPI)
- **`main.py`** - FastAPI application with REST API endpoints
- **Endpoints**:
  - `POST /api/query` - Execute SPARQL queries
  - `POST /api/test-connection` - Test GraphDB connectivity
  - `GET /api/repositories` - List available repositories
  - `GET /` - Serve frontend application

### Frontend (Vanilla JavaScript)
- **`app.js`** - Main application logic and UI management
- **`sparql-client.js`** - GraphDB communication and query handling
- **`utils.js`** - Utility functions (storage, notifications, export)
- **`query-builder.js`** - Query building utilities (placeholder)
- **`results-renderer.js`** - Result rendering utilities (placeholder)

### Styling
- **`main.css`** - Core application styles with CSS variables
- **`components.css`** - Component-specific styles and utilities

### Data
- **`sample-queries.json`** - Pre-built SPARQL query examples

## 🔧 API Reference

### Query Execution
```http
POST /api/query
Content-Type: application/json

{
  "sparql": "SELECT * WHERE { ?s ?p ?o } LIMIT 10",
  "format": "json",
  "endpoint": "http://localhost:7200",
  "repository": "kgsde-proj",
  "username": "optional",
  "password": "optional"
}
```

### Connection Testing
```http
POST /api/test-connection
Content-Type: application/json

{
  "endpoint": "http://localhost:7200",
  "repository": "kgsde-proj",
  "username": "optional",
  "password": "optional"
}
```

## 🎨 Customization

### Adding Sample Queries
Edit `static/examples/sample-queries.json`:
```json
{
  "name": "Query Name",
  "description": "Query description",
  "sparql": "SELECT ?s ?p ?o WHERE { ?s ?p ?o }"
}
```

### Styling
Modify CSS variables in `static/styles/main.css`:
```css
:root {
  --primary-color: #2563eb;
  --background-color: #f8fafc;
  /* ... other variables */
}
```

## 🐛 Troubleshooting

### Common Issues

**Connection Failed**
- Verify GraphDB is running on the specified endpoint
- Check repository name exists and is accessible
- Verify authentication credentials if required

**Query Timeout**
- Reduce query complexity or add LIMIT clauses
- Check GraphDB performance and resource availability

**JavaScript Errors**
- Ensure all static files are properly served
- Check browser console for specific error messages
- Verify CodeMirror CDN resources are accessible

### Debug Mode
Enable browser developer tools and check:
- Network tab for API request/response details
- Console tab for JavaScript errors and query logs
- Application tab for localStorage data

## 📦 Dependencies

### Backend
- **FastAPI** (>=0.104.0) - Modern web framework
- **Uvicorn** (>=0.24.0) - ASGI server
- **Requests** (>=2.32.4) - HTTP client for GraphDB communication
- **python-multipart** (>=0.0.6) - Form data parsing

### Frontend
- **CodeMirror** (5.65.13) - Code editor with SPARQL syntax highlighting
- **Vanilla JavaScript** - No additional frameworks required

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the KGSDE course project.

## 🏷️ Version

**v0.1.0** - Initial release with core SPARQL query functionality, results visualization, and export capabilities.
