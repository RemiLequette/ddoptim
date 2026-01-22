@echo off
REM Network Viewer Launcher for uv
REM Run this to start the interactive network visualization tool

echo Starting DDoptim Network Viewer...
echo.
echo Syncing dependencies with uv...
uv sync

echo.
echo Launching viewer...
uv run python visualization\network_viewer.py

pause
