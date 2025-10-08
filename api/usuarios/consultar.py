from fastapi import APIRouter, HTTPException, Depends
from typing import List
from models import UsuarioGetOut
from database import get_all_usuarios
from auth import require_roles

router = APIRouter()

@router.get("/usuarios", response_model=List[UsuarioGetOut], tags=["Usuarios"])
async def consultar_usuarios(current=Depends(require_roles())):
    try:
        usuarios = get_all_usuarios()
        if not usuarios:
            raise HTTPException(status_code=404, detail="No se encontraron usuarios")
        return usuarios
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar usuarios: {e}")