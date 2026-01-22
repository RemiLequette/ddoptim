@echo off
REM Build Weber Pignons Network with uv
REM Run this from the ddoptim project directory

echo Building Weber Pignons network...
echo.
echo Syncing dependencies...
uv sync

echo.
echo Building network...
uv run python examples\create_weber_pignons.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS! Network created in data\weber_pignons_network.json
    echo.
    echo To load and test:
    echo   uv run python load_weber_pignons.py
    echo.
    echo To visualize:
    echo   view_network.bat
) else (
    echo.
    echo ERROR: Failed to create network
    echo Check that you're in the ddoptim directory and uv is installed
)

pause
