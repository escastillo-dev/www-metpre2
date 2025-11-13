// Test de CORS y conectividad directa
'use client';
import { useState } from 'react';

export default function CorsTestPage() {
    const [results, setResults] = useState<string[]>([]);
    const apiUrl = 'https://met-hmaqcjdea9fsh8ak.mexicocentral-01.azurewebsites.net';

    const addResult = (message: string) => {
        setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const testCors = async () => {
        setResults([]);
        addResult('🔍 Iniciando pruebas de CORS...');

        // Prueba 1: Fetch simple
        try {
            addResult('1️⃣ Probando fetch simple...');
            const response = await fetch(`${apiUrl}/usuarios/1`, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            addResult(`✅ Fetch exitoso: ${response.status} ${response.statusText}`);
        } catch (error: any) {
            addResult(`❌ Error fetch: ${error.message}`);
        }

        // Prueba 2: Fetch sin CORS
        try {
            addResult('2️⃣ Probando fetch no-cors...');
            const response = await fetch(`${apiUrl}/usuarios/1`, {
                method: 'GET',
                mode: 'no-cors',
            });
            addResult(`✅ No-CORS: ${response.status} ${response.type}`);
        } catch (error: any) {
            addResult(`❌ Error no-cors: ${error.message}`);
        }

        // Prueba 3: Axios
        try {
            addResult('3️⃣ Probando con axios...');
            const axios = (await import('axios')).default;
            const response = await axios.get(`${apiUrl}/usuarios/1`, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            addResult(`✅ Axios exitoso: ${response.status}`);
        } catch (error: any) {
            if (error.response) {
                addResult(`🟡 Axios respuesta: ${error.response.status} - ${error.response.statusText}`);
            } else if (error.request) {
                addResult(`❌ Axios sin respuesta: ${error.message}`);
            } else {
                addResult(`❌ Error axios: ${error.message}`);
            }
        }

        // Prueba 4: Verificar si es problema de SSL
        try {
            addResult('4️⃣ Probando endpoint raíz...');
            const response = await fetch(apiUrl, {
                method: 'GET',
                mode: 'cors',
            });
            addResult(`✅ Endpoint raíz: ${response.status} ${response.statusText}`);
        } catch (error: any) {
            addResult(`❌ Error endpoint raíz: ${error.message}`);
        }
    };

    const openInNewTab = () => {
        window.open(`${apiUrl}/usuarios/1`, '_blank');
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
            <h1>🔬 Test de CORS y Conectividad</h1>
            
            <div style={{ marginBottom: '20px' }}>
                <button 
                    onClick={testCors}
                    style={{ 
                        backgroundColor: '#0070f3', 
                        color: 'white', 
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        marginRight: '10px'
                    }}
                >
                    🚀 Ejecutar Pruebas
                </button>

                <button 
                    onClick={openInNewTab}
                    style={{ 
                        backgroundColor: '#28a745', 
                        color: 'white', 
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    🌐 Abrir API en Nueva Pestaña
                </button>
            </div>

            <div style={{ 
                backgroundColor: '#2a2a2a', 
                padding: '15px', 
                borderRadius: '5px',
                maxHeight: '400px',
                overflowY: 'auto'
            }}>
                <h3>📋 Resultados:</h3>
                {results.length === 0 ? (
                    <p>Haz clic en "Ejecutar Pruebas" para comenzar</p>
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
                <p><strong>URL objetivo:</strong> {apiUrl}</p>
                <p><strong>Qué buscar:</strong></p>
                <ul>
                    <li>Si todas fallan con "CORS": Problema de configuración CORS en la API</li>
                    <li>Si "no-cors" funciona: Definitivamente es CORS</li>
                    <li>Si axios da 401/404: La API funciona, solo falta autenticación</li>
                    <li>Si "Nueva Pestaña" funciona: Es problema de CORS del navegador</li>
                </ul>
            </div>
        </div>
    );
}