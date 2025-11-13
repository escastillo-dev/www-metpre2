// Componente de debug para verificar variables de entorno
'use client';
import { useEffect, useState } from 'react';

export default function DebugEnvPage() {
    const [apiUrl, setApiUrl] = useState('');
    const [envVars, setEnvVars] = useState<{[key: string]: string}>({});

    useEffect(() => {
        // Capturar la URL de la API como la ve el cliente
        const url = process.env.NEXT_PUBLIC_API_URL || "NO DEFINIDA";
        setApiUrl(url);

        // Capturar todas las variables que empiecen con NEXT_PUBLIC_
        const vars: {[key: string]: string} = {};
        Object.keys(process.env).forEach(key => {
            if (key.startsWith('NEXT_PUBLIC_')) {
                vars[key] = process.env[key] || 'undefined';
            }
        });
        setEnvVars(vars);
    }, []);

    const testConnection = async () => {
        try {
            console.log('Probando conexión con URL:', apiUrl);
            const response = await fetch(`${apiUrl}/usuarios/1`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log('Respuesta:', response.status, response.statusText);
            alert(`Respuesta: ${response.status} ${response.statusText}`);
        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error}`);
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>🔍 Debug de Variables de Entorno</h1>
            
            <div style={{ backgroundColor: '#f0f0f0', padding: '10px', margin: '10px 0' }}>
                <h3>URL de API detectada:</h3>
                <strong style={{ color: apiUrl === 'NO DEFINIDA' ? 'red' : 'green' }}>
                    {apiUrl}
                </strong>
            </div>

            <div style={{ backgroundColor: '#f0f0f0', padding: '10px', margin: '10px 0' }}>
                <h3>Variables NEXT_PUBLIC_*:</h3>
                {Object.keys(envVars).length > 0 ? (
                    Object.entries(envVars).map(([key, value]) => (
                        <div key={key}>
                            <strong>{key}:</strong> {value}
                        </div>
                    ))
                ) : (
                    <div style={{ color: 'red' }}>No se encontraron variables NEXT_PUBLIC_*</div>
                )}
            </div>

            <button 
                onClick={testConnection}
                style={{ 
                    backgroundColor: '#0070f3', 
                    color: 'white', 
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}
            >
                🔬 Probar Conexión
            </button>

            <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
                <p>Esta página ayuda a diagnosticar problemas con variables de entorno.</p>
                <p>Si la URL aparece como "NO DEFINIDA", hay un problema con el archivo .env.local</p>
            </div>
        </div>
    );
}