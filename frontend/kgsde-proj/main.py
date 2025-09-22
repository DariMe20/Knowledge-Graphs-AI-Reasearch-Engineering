from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import requests
import json
import os
from typing import Optional

# Configuration
GRAPHDB_URL = "http://localhost:7200"  # Default GraphDB port
REPOSITORY_ID = "kgsde-proj"

# FastAPI app
app = FastAPI(title="GraphDB Query Frontend", version="0.1.0")

# Serve static files (frontend)
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

class QueryRequest(BaseModel):
    sparql: str
    format: str = "json"
    endpoint: Optional[str] = None
    repository: Optional[str] = None

class ConnectionRequest(BaseModel):
    endpoint: str
    repository: str
    username: Optional[str] = None
    password: Optional[str] = None

def query_graphdb(sparql_query: str, endpoint: str = None, repository: str = None, username: str = None, password: str = None):
    """Execute SPARQL query against GraphDB"""
    # Use provided endpoint/repository or defaults
    graphdb_url = endpoint or GRAPHDB_URL
    repo_id = repository or REPOSITORY_ID
    sparql_endpoint = f"{graphdb_url}/repositories/{repo_id}"
    
    headers = {
        'Accept': 'application/sparql-results+json',
        'Content-Type': 'application/sparql-query'
    }
    
    # Add authentication if provided
    auth = None
    if username and password:
        auth = (username, password)
    
    try:
        response = requests.post(
            sparql_endpoint,
            data=sparql_query,
            headers=headers,
            auth=auth,
            timeout=30
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"GraphDB query failed: {response.text}"
            )
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")

@app.get("/")
async def root():
    """Serve the main frontend page"""
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    else:
        return {"message": "GraphDB Query Frontend API", "docs": "/docs"}

@app.post("/api/query")
async def execute_query(query_request: QueryRequest):
    """Execute SPARQL query"""
    try:
        results = query_graphdb(
            query_request.sparql,
            query_request.endpoint,
            query_request.repository
        )
        return {"success": True, "results": results}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/test-connection")
async def test_connection(connection_request: ConnectionRequest):
    """Test connection to GraphDB repository"""
    try:
        # Simple test query
        test_query = "SELECT (COUNT(*) as ?count) WHERE { ?s ?p ?o }"
        result = query_graphdb(
            test_query,
            connection_request.endpoint,
            connection_request.repository,
            connection_request.username,
            connection_request.password
        )
        return {"success": True, "message": "Connection successful", "test_result": result}
    except HTTPException as e:
        return {"success": False, "message": e.detail}
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.get("/api/repositories")
async def list_repositories(endpoint: str = GRAPHDB_URL):
    """List available repositories"""
    try:
        response = requests.get(f"{endpoint}/rest/repositories")
        if response.status_code == 200:
            return {"success": True, "repositories": response.json()}
        else:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch repositories")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)