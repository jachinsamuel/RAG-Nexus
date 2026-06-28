import os
from typing import List, Dict, Any

class WorkspaceManager:
    def __init__(self):
        self.workspace_root = None

    def set_workspace(self, path: str) -> Dict[str, Any]:
        if not path:
            self.workspace_root = None
            return {"status": "success", "message": "Workspace cleared."}
        
        abs_path = os.path.abspath(path)
        if not os.path.exists(abs_path):
            return {"status": "error", "message": f"Path '{path}' does not exist."}
        if not os.path.isdir(abs_path):
            return {"status": "error", "message": f"Path '{path}' is not a directory."}
        
        self.workspace_root = abs_path
        return {"status": "success", "workspace": abs_path}

    def _resolve_and_confine(self, rel_path: str) -> str:
        if not self.workspace_root:
            raise ValueError("No workspace directory has been configured.")
        
        # Merge relative path safely
        target_path = os.path.abspath(os.path.join(self.workspace_root, rel_path))
        
        # Confinement check
        common_prefix = os.path.commonpath([self.workspace_root, target_path])
        if common_prefix != self.workspace_root:
            raise PermissionError("Access denied: Target path traverses outside the workspace directory.")
        
        return target_path

    def list_files(self) -> List[Dict[str, Any]]:
        if not self.workspace_root:
            return []
        
        ignored_dirs = {".git", "node_modules", "venv", ".venv", "__pycache__", ".agents", ".gemini", "env", "build", "dist", ".next", ".pytest_cache", ".idea", ".vscode"}
        ignored_exts = {".pyc", ".pyo", ".pyd", ".db", ".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip", ".tar", ".gz"}
        
        file_tree = []
        for root, dirs, files in os.walk(self.workspace_root):
            # Prune ignored directories in-place
            dirs[:] = [d for d in dirs if d not in ignored_dirs]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in ignored_exts:
                    continue
                
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, self.workspace_root)
                file_tree.append({
                    "name": file,
                    "path": rel_path.replace(os.sep, '/'),
                    "size": os.path.getsize(full_path)
                })
        
        # Sort files alphabetically
        file_tree.sort(key=lambda x: x["path"])
        return file_tree

    def read_file(self, rel_path: str) -> str:
        safe_path = self._resolve_and_confine(rel_path)
        if not os.path.exists(safe_path):
            raise FileNotFoundError(f"File '{rel_path}' not found in workspace.")
        if os.path.isdir(safe_path):
            raise IsADirectoryError(f"'{rel_path}' is a directory.")
            
        with open(safe_path, 'r', encoding='utf-8', errors='replace') as f:
            return f.read()

    def write_file(self, rel_path: str, content: str) -> str:
        safe_path = self._resolve_and_confine(rel_path)
        
        # Ensure parent directories exist
        os.makedirs(os.path.dirname(safe_path), exist_ok=True)
        
        with open(safe_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return safe_path

# Global single instance
workspace_manager = WorkspaceManager()
