@echo off
REM Build Weber Pignons Network
REM Run this from the ddoptim project directory

echo Building Weber Pignons network...
python examples\create_weber_pignons.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS! Network created in data\weber_pignons_network.json
    echo.
    echo To load and test:
    echo   python load_weber_pignons.py
) else (
    echo.
    echo ERROR: Failed to create network
    echo Check that you're in the ddoptim directory and Python is installed
)

pause
