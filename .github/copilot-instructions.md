# GitHub Copilot Instructions for DDoptim Project

**IMPORTANT: Please refer to and follow all instructions in the `.claude` file at the project root.**

The `.claude` file contains comprehensive project guidelines including:
- Package management with `uv` (use `pyproject.toml`, not `requirements.txt`)
- Code style preferences (type hints, docstrings, naming conventions)
- Project structure and architecture
- DDMRP methodology and domain knowledge
- Development workflow and testing practices
- Common commands and reference documents

## Quick Reference from .claude file:

### Always use `uv` for package management:
- `uv add <package>` to add dependencies
- `uv sync` to sync environment
- `uv run <command>` to run scripts in the virtual environment

### Code Style:
- Type hints for all function signatures
- Google-style docstrings
- snake_case for functions/variables, PascalCase for classes
- 100 character line length max

### Before committing:
1. Run tests: `uv run python tests/test_core_simple.py`
2. Validate networks: `network.validate()`
3. Test with visualization: `uv run python visualization/network_viewer.py`

**For complete details, see the `.claude` file in the project root.**
