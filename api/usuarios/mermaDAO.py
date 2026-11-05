import mysql.connector
from typing import List, Optional
import os
from datetime import datetime

def get_db_connection():
    return mysql.connector.connect(
        host='localhost',
        user='root',
        password='',
        database='metpre'
    )

def get_mermas_by_sucursales(sucursal_ids: List[str]):
    """Obtiene las mermas filtradas por sucursales"""
    print(f"=== DEBUG get_mermas_by_sucursales ===")
    print(f"Parámetros: {sucursal_ids}")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Crear placeholders para la consulta IN
        placeholders = ','.join(['%s'] * len(sucursal_ids))
        
        # Consulta corregida - usar el nombre correcto de la columna
        query = f"""
        SELECT 
            m.Id,
            m.Fecha,
            m.Anfitrion,
            m.Sucursales,
            m.TotalEvaluado,
            COALESCE(SUM(d.CantidadMerma * d.PrecioUnitario), 0) as TotalMerma
        FROM met_mame m 
        LEFT JOIN met_detmame d ON m.Id = d.IdMerma
        WHERE m.Sucursal IN ({placeholders})
        GROUP BY m.Id, m.Fecha, m.Anfitrion, m.Sucursal, m.TotalEvaluado
        ORDER BY m.Fecha DESC
        """
        
        print(f"Query: {query}")
        print(f"Parámetros para query: {sucursal_ids}")
        
        cursor.execute(query, sucursal_ids)
        results = cursor.fetchall()
        
        print(f"Datos obtenidos de DAO: {len(results)} registros")
        for result in results:
            print(f"  - {result}")
        
        cursor.close()
        conn.close()
        
        print(f"Retornando: {results}")
        return results
        
    except Exception as e:
        print(f"=== ERROR en get_mermas_by_sucursales ===")
        print(f"Error MySQL: {str(e)}")
        return []

def crear_merma_cabecera(fecha: str, anfitrion: str, sucursal: str, total_evaluado: float):
    """Crea una nueva merma en la tabla met_mame"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
        INSERT INTO met_mame (Fecha, Anfitrion, Sucursal, TotalEvaluado)
        VALUES (%s, %s, %s, %s)
        """
        
        cursor.execute(query, (fecha, anfitrion, sucursal, total_evaluado))
        merma_id = cursor.lastrowid
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return merma_id
        
    except Exception as e:
        print(f"Error al crear merma: {str(e)}")
        return None

def agregar_producto_detalle(id_merma: int, producto_id: str, cantidad_merma: float, 
                           precio_unitario: float, motivo_id: int):
    """Agrega un producto al detalle de la merma"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
        INSERT INTO met_detmame (IdMerma, IdProducto, CantidadMerma, PrecioUnitario, IdMotivo)
        VALUES (%s, %s, %s, %s, %s)
        """
        
        cursor.execute(query, (id_merma, producto_id, cantidad_merma, precio_unitario, motivo_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"Error al agregar producto: {str(e)}")
        return False

def get_motivos_merma():
    """Obtiene todos los motivos de merma"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT Id, Descripcion FROM met_motmerma ORDER BY Descripcion")
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return results
        
    except Exception as e:
        print(f"Error al obtener motivos: {str(e)}")
        return []

def buscar_productos(termino: str):
    """Busca productos por nombre o código"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
        SELECT Id, Descripcion, PrecioVenta 
        FROM catalogo 
        WHERE Descripcion LIKE %s OR Id LIKE %s
        LIMIT 10
        """
        
        like_term = f"%{termino}%"
        cursor.execute(query, (like_term, like_term))
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return results
        
    except Exception as e:
        print(f"Error al buscar productos: {str(e)}")
        return []