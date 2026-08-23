Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get project root directory
strPath = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strPath

' Select Python/Uvicorn binary from venv if present
If fso.FileExists(strPath & "\venv\Scripts\uvicorn.exe") Then
    strCmd = """" & strPath & "\venv\Scripts\uvicorn.exe"" app.main:app --host 127.0.0.1 --port 8000"
ElseIf fso.FileExists(strPath & "\venv\Scripts\python.exe") Then
    strCmd = """" & strPath & "\venv\Scripts\python.exe"" -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
Else
    strCmd = "uvicorn app.main:app --host 127.0.0.1 --port 8000"
End If

' Launch completely invisible (0 = hide console window, False = don't wait)
WshShell.Run strCmd, 0, False

' Wait 3.5 seconds for FastAPI to finish loading and bind to port 8000
WScript.Sleep 3500

' Open Nexus in default browser
WshShell.Run "http://127.0.0.1:8000", 1, False
