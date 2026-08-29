# Sentrune: Python 3.14 and Render Deployment Guide

## Executive recommendation

Sentrune currently declares `requires-python = ">=3.10,<3.14"`, pins a dependency set last verified on Python 3.12, and explicitly stops on Python 3.14 in `run_pipeline.py`. Therefore, the dependable path today is to run the existing Sentrune code on **Python 3.13 or 3.12**, even if Python 3.14 is the system interpreter installed on your computer.

Python 3.14 itself is usable, but it requires a dependency refresh and code verification. Numba 0.63.0 added Python 3.14 support, while the project’s current constraint is `numba==0.61.2`; the current `pandas-ta`/Numba/NumPy combination must be re-tested rather than assumed compatible.[^1] Render’s current native runtime supports Python 3.14, and new services may default to Python 3.14.3, but that does not make every pinned dependency in Sentrune compatible.[^2]

For deployment, choose between two modes:

| Mode | Best for | Data behavior | Recommendation |
|---|---|---|---|
| **Demo-only dashboard** | Showing the existing sample database and models publicly | Read-only bundled files; no live refresh | Easiest and suitable for a first public link |
| **Live Sentrune** | Scheduled ingestion, feature computation, and retraining | Requires durable storage and service separation | Use a paid Render service with a persistent disk, or migrate SQLite to Postgres |

The quickest safe launch is a **demo-only Render Web Service** using Python 3.13. After that works, add scheduled data processing and persistence as a second phase.

## 1. Using Sentrune when your computer has Python 3.14

You do not need to uninstall Python 3.14. Install a second interpreter, create a project-specific virtual environment with it, and invoke Sentrune through that environment.

### Option A: install Python 3.13 alongside Python 3.14

On Ubuntu, use a Python-version manager such as `pyenv`, or install Python 3.13 through your operating system’s supported package source. Once `python3.13` is available, run:

```bash
cd /path/to/sentrune
python3.13 -m venv .venv
source .venv/bin/activate
python --version
python -m pip install --upgrade pip
python -m pip install -c constraints.txt -e .
python run_pipeline.py status
python run_pipeline.py dashboard
```

On Windows PowerShell, the equivalent is:

```powershell
cd C:\path\to\sentrune
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -c constraints.txt -e .
python run_pipeline.py status
python run_pipeline.py dashboard
```

On macOS, if the interpreter is installed as `python3.13`, use:

```bash
cd /path/to/sentrune
python3.13 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -c constraints.txt -e .
python run_pipeline.py dashboard
```

The important rule is to use `python -m pip`, not a separate unqualified `pip`, so that packages are installed into the same interpreter that runs Sentrune.

### Option B: use Conda or Miniconda

This is often the least frustrating choice when compiled packages such as NumPy, SciPy, Numba, and LightGBM are involved:

```bash
conda create -n sentrune python=3.13 -y
conda activate sentrune
cd /path/to/sentrune
python -m pip install --upgrade pip
python -m pip install -c constraints.txt -e .
python run_pipeline.py dashboard
```

If the current verified constraints do not install cleanly on 3.13, use Python 3.12 instead:

```bash
conda create -n sentrune312 python=3.12 -y
conda activate sentrune312
python -m pip install -c constraints.txt -e .
```

### Option C: test Python 3.14 deliberately

Do this in a separate environment; do not replace the working 3.12/3.13 environment:

```bash
cd /path/to/sentrune
python3.14 -m venv .venv314
source .venv314/bin/activate
python -m pip install --upgrade pip
python -m pip install -e .
```

Before installation can succeed, make these project changes:

```toml
# pyproject.toml
requires-python = ">=3.10,<3.15"
```

In `run_pipeline.py`, remove or revise the explicit Python 3.14 rejection in `preflight()`. Then update the constraints only after testing a compatible set of `pandas`, `numpy`, `pandas-ta`, `numba`, `llvmlite`, `scipy`, `lightgbm`, and `streamlit` versions on your operating system. A starting point is to test Numba 0.63 or newer, because Numba 0.63.0 introduced Python 3.14 support.[^1]

Run the full validation sequence, not just an import test:

```bash
python -m pip check
python -m pytest -q
python run_pipeline.py all
python run_pipeline.py status
python run_pipeline.py dashboard
```

If any compiled dependency falls back to a source build, fails to build, or causes a numerical/runtime error, return to Python 3.13 for the production deployment. A working Python 3.14 interpreter is not by itself evidence that the complete Sentrune stack is production-ready on 3.14.

## 2. Prepare the repository for Render

Render deploys from a Git repository. Push the Sentrune project to GitHub or GitLab; do not deploy the ZIP as the long-term source of truth. Render’s own deployment guidance recommends a Git-based workflow, pinned dependencies, a native Python runtime for standard applications, and binding the service to `0.0.0.0` on Render’s injected `PORT` value.[^3]

Create a root-level `requirements.txt` for Render. The current `constraints.txt` is a constraints file and its header contains an obsolete install example, so use a straightforward deployment requirements file instead:

```text
-e .
```

This tells Render to install the local Sentrune package, whose dependencies are declared in `pyproject.toml`. If Render’s build log shows that editable installation is unsuitable for your chosen configuration, replace it with the top-level dependencies from `pyproject.toml` and keep the versions pinned in a tested file.

Add a root-level `.python-version` file containing a supported tested version, preferably:

```text
3.13
```

Render permits `.python-version` with a major/minor version and uses the latest corresponding patch release. Alternatively, set the `PYTHON_VERSION` environment variable to a fully qualified version such as `3.13.5`; Render requires the full patch version when using the environment-variable method.[^2]

Do not commit `.env`, API keys, or other credentials. Keep `.env.example` in Git as a naming template, then enter real values in Render’s Environment settings. Render explicitly recommends storing secrets as environment variables rather than in the repository.[^3]

## 3. Deploy the demo-only dashboard to Render

This deployment exposes the existing read-only Streamlit dashboard and the sample database/models already included in the repository. It does **not** promise durable live ingestion. It is the appropriate first deployment because it minimizes architectural changes.

In Render, create a new **Web Service** connected to the Sentrune repository and configure:

| Render setting | Value |
|---|---|
| Runtime | Python 3 |
| Build command | `pip install -r requirements.txt` |
| Start command | `streamlit run src/trading_assistant/dashboard/app.py --server.port $PORT --server.address 0.0.0.0` |
| Python version | `.python-version` with `3.13`, or `PYTHON_VERSION=3.13.x` |
| Health check | Optional for the first deployment |
| Secrets | Add only the keys required by the ingestion code; the read-only dashboard may need none |

The `0.0.0.0` binding and `$PORT` usage are essential: Streamlit’s local default binds to localhost, which is not reachable from outside the Render instance.[^3]

After the first successful deploy, open the public URL and confirm that the Overview, Prices, Technicals, Sentiment, News/Social, and Model panels render. If the dashboard shows no data, verify that `data/trading_assistant.sqlite3` and `models/` are present in the deployed repository and that the build did not exclude them.

## 4. Make Sentrune live on Render

A live Sentrune installation has three distinct responsibilities:

| Component | Sentrune command | Suitable Render service |
|---|---|---|
| Dashboard | Streamlit start command | Web Service |
| Data refresh | `python run_pipeline.py ingest` followed by `features` | Cron Job or Background Worker |
| Model retraining | `python run_pipeline.py train` | Cron Job, less frequently than ingestion |

For a small prototype, use one Web Service for the dashboard and one or more Render Cron Jobs for scheduled processing. A Cron Job can run a command on a schedule, while a Background Worker is appropriate for a continuously running process; Render documents both as separate service types.[^4]

The current code needs a persistence adjustment before live deployment. It writes to `data/trading_assistant.sqlite3` and reads model artifacts from `models/`. Render services have an ephemeral filesystem by default, so local changes disappear on restart or redeploy. Render persistent disks are available for paid Web Services, Background Workers, and Private Services, and only files written under the disk’s mount path persist.[^5]

### Recommended short-term persistence patch

Use a paid Render Web Service or Worker with a persistent disk mounted at `/var/data`, then make the application honor a `SENTRUNE_DATA_DIR` or `DB_PATH` environment variable. The current `run_pipeline.py` sets `DB_PATH` to the repository-local database path, and the dashboard currently derives its database path from the repository root, so simply adding a Render disk without changing these paths will not persist the active database.

The intended behavior is:

```python
# Conceptual pattern; apply consistently in run_pipeline.py and dashboard/app.py
DATA_DIR = Path(os.environ.get("SENTRUNE_DATA_DIR", ROOT / "data"))
DB_PATH = Path(os.environ.get("DB_PATH", DATA_DIR / "trading_assistant.sqlite3"))
MODEL_ROOT = Path(os.environ.get("SENTRUNE_MODEL_DIR", ROOT / "models"))
```

On Render, set:

```text
SENTRUNE_DATA_DIR=/var/data
DB_PATH=/var/data/trading_assistant.sqlite3
SENTRUNE_MODEL_DIR=/var/data/models
```

Then ensure the ingestion, feature, training, and dashboard processes all receive the same environment variables. Mount the persistent disk at `/var/data`, not at the filesystem root. Render’s documentation states that only data under the configured mount path is preserved.[^5]

### Better long-term persistence architecture

For anything beyond a single-instance prototype, migrate the database from SQLite to Render Postgres and store trained model artifacts in object storage or another durable artifact store. SQLite is simple and excellent for local development, but it is not a good multi-instance production database. A Web Service and scheduled worker should not independently mutate separate local SQLite copies.

The durable architecture is:

```text
Render Web Service: Streamlit dashboard
              |
              +--> Render Postgres: prices, news, features, runs, metrics
              |
              +--> Object storage or durable artifact volume: trained models

Render Cron Job or Worker: ingest -> features -> train
```

Keep the demo-only SQLite deployment as a separate low-risk environment until the Postgres migration has tests and a rollback plan.

## 5. Configure scheduled processing

For an initial live prototype, create a Cron Job that runs the complete pipeline:

```bash
python run_pipeline.py all
```

Run it at a conservative interval because the pipeline calls external market/news services and some providers impose rate limits. A more controlled production arrangement is:

```bash
python run_pipeline.py ingest && \
python run_pipeline.py features && \
python run_pipeline.py train
```

Use a more frequent schedule for ingestion and feature computation, and a less frequent schedule for model training. If the services share a persistent disk, configure the same `DB_PATH` and model directory in the Cron Job as in the Web Service. If you migrate to Postgres, the Cron Job should use the same database connection variables instead of local files.

## 6. Environment variables and secrets

At minimum, inspect `.env.example` and add only the credentials for sources you intend to use. The no-key mode can still provide the public yfinance and Binance price paths, but news, CryptoPanic, and Reddit features require their respective credentials. Configure them in Render’s Environment section, not in source code.

Use this checklist before making the service public:

| Check | Expected result |
|---|---|
| `PYTHON_VERSION` or `.python-version` | Matches the tested interpreter |
| `requirements.txt` | Installs successfully from a clean environment |
| API keys | Present only in Render’s secret environment settings |
| `PORT` | Used by the Streamlit start command |
| Host binding | `0.0.0.0` |
| Database path | Shared and durable for live mode |
| Model path | Shared and durable for live mode |
| Source rate limits | Conservative enough for each provider |

## 7. Alternatives to Render

**Streamlit Community Cloud** is the simplest alternative for a public dashboard tied to a GitHub repository. It is a good fit for the demo-only mode, but it should not be treated as the durable home for a scheduled multi-process ingestion/training system.[^6]

**Railway** and **Fly.io** can run the same container or Python start command, but you must independently verify their current pricing, sleep behavior, persistent-volume support, and scheduled-job features before choosing them. **Google Cloud Run** is better suited to stateless HTTP containers; because Streamlit maintains interactive sessions and Sentrune currently uses local SQLite/model files, it should be considered only after the persistence architecture is redesigned.

For a first deployment, Render is the clearest match because it directly supports Streamlit-style long-running Web Services, Cron Jobs, Background Workers, and persistent disks in one platform.[^3] [^4] [^5]

## 8. Troubleshooting

**The build fails while installing Numba, llvmlite, pandas-ta, or SciPy.** Use Python 3.13 or 3.12, not 3.14, and make sure the dependency file matches a tested lock/constraints set. Do not solve this by blindly removing the failing package; `pandas-ta` and the feature layer depend on the numerical stack.

**The service deploys but the page is unreachable.** Check that the start command uses both `--server.address 0.0.0.0` and `--server.port $PORT`. A hard-coded port or localhost binding commonly causes this failure.[^3]

**The dashboard is empty after a restart.** This is expected if live data was written to an ephemeral filesystem. Add a paid persistent disk and route both database and model paths beneath its mount point, or migrate to Postgres and durable artifact storage.[^5]

**The dashboard shows data but new scheduled runs do not appear.** Confirm that the Cron Job and Web Service use the same `DB_PATH`, the same mount path, the same Render region, and the same code revision. Separate services with separate ephemeral filesystems will otherwise see different databases.

**The service runs out of memory during sentiment processing or model training.** Keep training in a Cron Job or Worker rather than the interactive Web Service, reduce concurrency, and consider running heavy inference outside the dashboard process. Render’s deployment guidance also recommends caching expensive model loading with Streamlit’s `@st.cache_resource` pattern.[^3]

## 9. The recommended sequence for you

First, install Python 3.13 beside Python 3.14 and verify Sentrune locally using the existing constraints. Second, push the project to GitHub and deploy the read-only dashboard as a Render Web Service with the exact Streamlit start command above. Third, confirm the public demo works before adding any credentials. Fourth, decide whether the live version will use a paid persistent disk as a transitional prototype or Render Postgres as the durable architecture. Finally, add scheduled ingestion and training only after the database/model path is shared and persistent.

This sequence lets you use your existing Python 3.14 installation without making Python 3.14 compatibility the first deployment risk.

## References

[^1]: [Numba 0.63.0 release notes](https://numba.readthedocs.io/en/stable/release/0.63.0-notes.html) — Python 3.14 support.
[^2]: [Render: Setting Your Python Version](https://render.com/docs/python-version) — `PYTHON_VERSION`, `.python-version`, and current Python runtime behavior.
[^3]: [Render: From Localhost to Live — Streamlit and Gradio Deployments](https://render.com/articles/deploy-streamlit-gradio-localhost-to-live) — build/start commands, port binding, secrets, caching, and native runtime guidance.
[^4]: [Render: Cron Jobs](https://render.com/docs/cronjobs) and [Background Workers](https://render.com/docs/background-workers) — scheduled and continuous processing service types.
[^5]: [Render: Persistent Disks](https://render.com/docs/disks) — ephemeral filesystem behavior, mount paths, and persistent disk availability.
[^6]: [Streamlit Community Cloud](https://streamlit.io/cloud) — GitHub-connected Streamlit deployment option.
