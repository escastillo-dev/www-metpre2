// Test específico para el endpoint de autenticación
'use client';
import { useState } from 'react';

export default function AuthTestPage() {
    const [results, setResults] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const apiUrl = 'https://met-hmaqcjdea9fsh8ak.mexicocentral-01.azurewebsites.net';

    const addResult = (message: string) => {
        setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const testAuthEndpoint = async () => {
        setResults([]);
        setLoading(true);
        addResult('🔍 Probando endpoint de autenticación específicamente...');

        try {
            // Probar el endpoint de autenticación exacto
            addResult('1️⃣ Probando POST /usuarios/autenticar...');
            
            const axios = (await import('axios')).default;
            
            const response = await axios.post(
                `${apiUrl}/usuarios/autenticar`,
                {
                    idUsuarios: 821,
                    pwd: "test123" // Contraseña de prueba
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );
            
            addResult(`✅ POST exitoso: ${response.status}`);
            addResult(`📦 Respuesta: ${JSON.stringify(response.data)}`);
            
        } catch (error: any) {
            if (error.response) {
                addResult(`🟡 Respuesta del servidor: ${error.response.status} - ${error.response.statusText}`);
                addResult(`📦 Data: ${JSON.stringify(error.response.data)}`);
                if (error.response.status === 401 || error.response.status === 403) {
                    addResult('✅ ¡El endpoint funciona! Solo son credenciales incorrectas.');
                }
            } else if (error.request) {
                addResult(`❌ Sin respuesta del servidor: ${error.code || error.message}`);
                addResult(`🔍 Tipo de error: ${error.constructor.name}`);
                addResult(`🔍 Stack: ${error.stack?.substring(0, 200)}...`);
            } else {
                addResult(`❌ Error de configuración: ${error.message}`);
            }
        }

        // Probar también con fetch
        try {
            addResult('2️⃣ Probando con fetch...');
            
            const response = await fetch(`${apiUrl}/usuarios/autenticar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    idUsuarios: 821,
                    pwd: "test123"
                }),
                mode: 'cors'
            });
            
            addResult(`✅ Fetch response: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const data = await response.json();
                addResult(`📦 Data: ${JSON.stringify(data)}`);
            } else {
                const errorData = await response.text();
                addResult(`📦 Error data: ${errorData}`);
            }
            
        } catch (error: any) {
            addResult(`❌ Fetch error: ${error.message}`);
        }

        setLoading(false);
    };

    const testWithRealCredentials = async () => {
        setResults([]);
        setLoading(true);
        addResult('🔐 Probando con credenciales del formulario...');

        try {
            const axios = (await import('axios')).default;
            
            const response = await axios.post(
                `${apiUrl}/usuarios/autenticar`,
                {
                    idUsuarios: 821,
                    pwd: "..." // Usa las mismas credenciales que pusiste en el form
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );
            
            addResult(`✅ Login exitoso: ${response.status}`);
            addResult(`📦 Usuario: ${JSON.stringify(response.data)}`);
            
        } catch (error: any) {
            if (error.response) {
                addResult(`🟡 Status: ${error.response.status}`);
                addResult(`📦 Mensaje: ${JSON.stringify(error.response.data)}`);
            } else {
                addResult(`❌ Error: ${error.message}`);
                addResult(`🔍 Code: ${error.code}`);
            }
        }

        setLoading(false);
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
            <h1>🔐 Test de Endpoint de Autenticación</h1>
            
            <div style={{ marginBottom: '20px' }}>
                <button 
                    onClick={testAuthEndpoint}
                    disabled={loading}
                    style={{ 
                        backgroundColor: '#dc3545', 
                        color: 'white', 
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        marginRight: '10px',
                        opacity: loading ? 0.6 : 1
                    }}
                >
                    🚨 Test con Credenciales Falsas
                </button>

                <button 
                    onClick={testWithRealCredentials}
                    disabled={loading}
                    style={{ 
                        backgroundColor: '#28a745', 
                        color: 'white', 
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1
                    }}
                >
                    🔐 Test con Credenciales Reales
                </button>
            </div>

            <div style={{ 
                backgroundColor: '#2a2a2a', 
                padding: '15px', 
                borderRadius: '5px',
                maxHeight: '500px',
                overflowY: 'auto'
            }}>
                <h3>📋 Resultados:</h3>
                {loading && <p>⏳ Ejecutando pruebas...</p>}
                {results.length === 0 && !loading ? (
                    <p>Haz clic en un botón para ejecutar pruebas</p>
                ) : (
                    results.map((result, index) => (
                        <div key={index} style={{ 
                            marginBottom: '5px', 
                            fontFamily: 'monospace',
                            fontSize: '14px'
                        }}>
                            {result}
                        </div>
                    ))
                )}
            </div>

            <div style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
                <p><strong>Endpoint:</strong> {apiUrl}/usuarios/autenticar</p>
                <p><strong>Objetivo:</strong> Determinar si el endpoint específico de autenticación funciona</p>
            </div>
        </div>
    );
}