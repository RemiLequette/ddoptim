# Setup Guide for DDoptim with uv

## Prerequisites

Install uv if you haven't already:
```powershell
# On Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

## Initial Setup

1. **Clone/Navigate to project:**
   ```bash
   cd C:\Users\RemiLequette\OneDrive\Documents\projects\ddoptim
   ```

2. **Sync dependencies:**
   ```bash
   uv sync
   ```
   
   This will:
   - Create a virtual environment in `.venv/`
   - Install all dependencies from `pyproject.toml`
   - Lock versions in `uv.lock`

## Package Management

### Add a New Dependency
```bash
# Add to project dependencies
uv add <package>

# Example:
uv add numpy
```

### Add Development Dependency
```bash
uv add --dev <package>

# Example:
uv add --dev pytest
```

### Remove a Dependency
```bash
uv remove <package>
```

### Update Dependencies
```bash
uv sync
```

### Show Installed Packages
```bash
uv pip list
```

## Running Scripts

### Use `uv run` for all Python commands:
```bash
# Run tests
uv run python tests/test_core_simple.py

# Build Weber Pignons network
uv run python examples/create_weber_pignons.py

# Launch visualization
uv run python visualization/network_viewer.py

# Run any script
uv run python <your_script.py>
```

### Or activate the virtual environment:
```bash
# On Windows
.venv\Scripts\activate

# Then run normally
python tests/test_core_simple.py
```

## Quick Commands

### Setup (First Time)
```bash
uv sync
```

### Build Network
```bash
uv run python examples/create_weber_pignons.py
# Or use: build_network.bat
```

### Launch Visualization
```bash
uv run python visualization/network_viewer.py
# Or use: view_network.bat
```

### Run Tests
```bash
uv run python tests/test_core_simple.py
```

### Verify Setup
```bash
uv run python verify.py
```

## Project Structure with uv

```
ddoptim/
├── .venv/              # Virtual environment (managed by uv)
├── pyproject.toml      # Project config & dependencies
├── uv.lock             # Locked dependency versions
├── core/               # Source code
├── tests/              # Tests
├── examples/           # Examples
└── visualization/      # Visualization tools
```

## Dependencies in pyproject.toml

Current dependencies:
- `networkx>=3.0` - Graph operations
- `dash>=2.14.0` - Web framework for visualization
- `plotly>=5.17.0` - Interactive plotting
- `dash-bootstrap-components>=1.5.0` - UI components

Development dependencies:
- `pytest>=7.0` - Testing (optional)

## Why uv?

- ⚡ **Fast**: 10-100x faster than pip
- 🔒 **Reliable**: Lock file ensures reproducible installs
- 🎯 **Simple**: Single tool for dependencies, environments, and running scripts
- 🔄 **Compatible**: Works with existing Python projects
- 📦 **Modern**: Uses `pyproject.toml` standard

## Common Tasks

### Adding a Visualization Enhancement
```bash
# Add a new plotting library
uv add seaborn

# Update code to use it
# ...

# Test
uv run python visualization/network_viewer.py
```

### Running Multiple Commands
```bash
# Build and view in one go
uv run python examples/create_weber_pignons.py && uv run python visualization/network_viewer.py
```

### Checking Dependencies
```bash
# Show dependency tree
uv pip list

# Show what depends on a package
uv pip show networkx
```

## Troubleshooting

### "uv: command not found"
Install uv: `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`

### "Module not found"
Run: `uv sync` to install dependencies

### "Wrong Python version"
uv will use the correct Python version specified in `pyproject.toml` (>=3.11)

### Clean Install
```bash
# Remove virtual environment and reinstall
rm -rf .venv
uv sync
```

## Migration from requirements.txt

✅ **Already done!** All dependencies are now in `pyproject.toml`.

The old `requirements.txt` has been replaced with a note about using uv.

## VS Code Integration

If using VS Code with Python extension:
1. uv will auto-create `.venv/`
2. VS Code should auto-detect it
3. If not, select interpreter: `Ctrl+Shift+P` → "Python: Select Interpreter" → Choose `.venv`

## Claude Code Integration

When using Claude Code, it will:
- Recognize `pyproject.toml`
- Use `uv` commands automatically (per `.claude` instructions)
- Run scripts with `uv run`
- Add dependencies with `uv add`

## Next Steps

1. **Sync dependencies**: `uv sync`
2. **Build network**: `build_network.bat` or `uv run python examples/create_weber_pignons.py`
3. **Launch viewer**: `view_network.bat` or `uv run python visualization/network_viewer.py`
4. **Start developing**: Use `uv add` for new packages, `uv run` for scripts

---

**You're all set with uv! 🚀**
