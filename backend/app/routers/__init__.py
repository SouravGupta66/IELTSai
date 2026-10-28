# backend/app/routers/__init__.py
# This file can be empty, but must exist!
# It tells Python: "this folder is a package"

# Optional: You can import all routers here for convenience
# backend/app/routers/__init__.py
from . import speaking
from . import writing
from . import listening      # <-- MUST have this
from . import reading
from . import auth_router

__all__ = [
    "speaking_router",
    "writing_router", 
    "listening_router",
    "reading_router"
]