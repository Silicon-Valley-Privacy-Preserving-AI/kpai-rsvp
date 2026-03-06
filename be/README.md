# K-PAI Backend Web Server
Backend server code for K-PAI web project. Based on Python + FastAPI framwork with SQLite DB.

## Getting started

1. Prerequisites

- Python 3.12 or above is required

2. Install dependencies

```bash
pip install -r requirements.txt 
```

3. Configure environment variables

Create `.env` file at the root of the project, fill it up with provided `.env.example` format

4. Start server

```bash
python main.py
```


## API Documentation


This project uses automated openapi documentation provided from FastAPI.
- Swagger UI: `http://localhost:{PORT}/docs`
- ReDoc: `http://localhost:{PORT}/redoc`


## Project Structure

```
kpai-web-be/
├── .env.example          # Environment variable
├── .gitignore            # Gitignore
├── main.py               # Server entry point
├── requirements.txt      # Project dependencies
└── src/
    ├── app.py            # FastAPI app definition
    ├── lifespan.py       # Start up / Clean up logics
    ├── config/           # Configurations
    │   ├── database.py       # DB connect & session settings
    │   └── environments.py   # Environment variables load & validation
    ├── middleware/       # Middlewares
    │   └── cors.py           # CORS setting
    ├── model/            # SQLAlchemy DB Model
    │   ├── user.py           # User Table definition
    │   └── ...
    ├── route/            # API router definition
    │   ├── router.py         # Automated router import script
    │   ├── router_base.py    # Router managements
    │   └── v1/
    │       ├── user.py     # User related APIs (CRUD)
    │       └── ...
    ├── schema/           # Pydantic data validation schema
    │   ├── user.py           # User DTO
    │   └── ...
    └── service/          # Business logics
        ├── user_service.py # User service logics
        └── ...
```