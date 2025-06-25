'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { API_BASE_URL } from '../../CONSTS';

export default function InstallPod() {
    const [output, setOutput] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [status, setStatus] = useState(null);
    const [socket, setSocket] = useState(null);
    const [sessionId, setSessionId] = useState(null); // Store sessionId
    const outputRef = useRef(null);

    useEffect(() => {
        const socketInstance = io(API_BASE_URL, {
            reconnection: true,
            reconnectionAttempts: 3,
            reconnectionDelay: 1000,
        });
        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [output]);

    const startInstallation = async () => {
        setOutput([]);
        setIsRunning(true);
        setIsComplete(false);
        setStatus(null);

        try {
            const response = await axios.post(`${API_BASE_URL}/pods/install`);
            const { sessionId } = response.data;
            setSessionId(sessionId); // Store sessionId

            if (socket) {
                socket.emit('start-command', { sessionId });

                socket.on('command-output', ({ sessionId: receivedSessionId, type, data, status: commandStatus }) => {
                    const timestamp = new Date().toLocaleTimeString();
                    if (receivedSessionId === sessionId) {
                        if (type === 'stdout' || type === 'stderr' || type === 'error' || type === 'connected') {
                            setOutput((prev) => [...prev, { type, data, timestamp }]);
                        } else if (type === 'complete') {
                            setOutput((prev) => [...prev, { type, data, timestamp }]);
                            setIsRunning(false);
                            setIsComplete(true);
                            setStatus(commandStatus || 'success');
                            setSessionId(null);
                            socket.disconnect();
                        }
                    }
                });

                socket.on('connect_error', (error) => {
                    console.error('Socket.IO connection error:', error.message);
                    const timestamp = new Date().toLocaleTimeString();
                    setOutput((prev) => [
                        ...prev,
                        { type: 'error', data: `Connection failed: ${error.message}`, timestamp },
                    ]);
                    setIsRunning(false);
                    setIsComplete(true);
                    setStatus('error');
                    setSessionId(null);
                });
            }
        } catch (error) {
            console.error('Error starting installation:', error.message);
            const timestamp = new Date().toLocaleTimeString();
            setOutput((prev) => [
                ...prev,
                { type: 'error', data: `Failed to start installation: ${error.message}`, timestamp },
            ]);
            setIsRunning(false);
            setIsComplete(true);
            setStatus('error');
            setSessionId(null);
        }
    };

    const terminateInstallation = () => {
        if (socket && sessionId) {
            socket.emit('cancel-command', { sessionId });
            setIsRunning(false);
            setIsComplete(true);
            setStatus('cancelled');
            setSessionId(null);
        }
    };

    const handleOk = () => {
        setOutput([]);
        setIsComplete(false);
        setStatus(null);
        setSessionId(null);
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-full max-w-4xl min-w-[56rem] min-h-56 mx-auto p-4">
            <div className="p-6 mt-10 w-full flex flex-col items-center justify-center">
                <div className="flex space-x-4">
                    <button
                        onClick={startInstallation}
                        disabled={isRunning}
                        className={`px-4 py-2 rounded font-medium ${isRunning ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#129f8c] hover:bg-[#198476] text-white '
                            }`}
                    >
                        {isRunning ? 'Installing...' : 'Install/Update Pod'}
                    </button>
                    {isRunning && (
                        <button
                            onClick={terminateInstallation}
                            className="px-4 py-2 rounded font-medium bg-red-500 text-white hover:bg-red-600"
                        >
                            Terminate
                        </button>
                    )}
                </div>
                {output.length > 0 && (
                    <pre
                        ref={outputRef}
                        className="bg-gray-900 text-gray-200 p-4 mt-4 rounded-lg w-full max-h-96 overflow-x-auto font-mono text-sm shadow-inner whitespace-pre"
                    >
                        {output.map((line, index) => (
                            <span
                                key={index}
                                className={`${line.type === 'stderr' || line.type === 'error'
                                    ? 'text-red-400'
                                    : line.type === 'complete'
                                        ? 'text-blue-400'
                                        : 'text-gray-200'
                                    }`}
                            >
                                <span className="text-gray-500">[{line.timestamp}] </span>
                                {line.data}
                                {'\n'}
                            </span>
                        ))}
                    </pre>
                )}
                {isComplete && (
                    <div className="mt-4 w-full flex flex-col items-center">
                        <p
                            className={`font-medium ${status === 'success'
                                ? 'text-green-500'
                                : status === 'cancelled'
                                    ? 'text-yellow-500'
                                    : 'text-red-500'
                                }`}
                        >
                            Status:{' '}
                            {status === 'success'
                                ? 'Success'
                                : status === 'cancelled'
                                    ? 'Cancelled'
                                    : 'Failed'}
                        </p>
                        <button
                            onClick={handleOk}
                            className="px-4 py-2 bg-[#129f8c] hover:bg-[#198476] text-white rounded mt-2"
                        >
                            OK
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}