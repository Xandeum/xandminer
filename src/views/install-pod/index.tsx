'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { API_BASE_URL } from '../../CONSTS';
import Loader from 'components/Loader';

export default function InstallPod({ onClose }) {
    const [output, setOutput] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [status, setStatus] = useState(null);
    const [socket, setSocket] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [isRestarting, setIsRestarting] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const outputRef = useRef(null);
    const disconnectTimeoutRef = useRef(null);

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
            const response = await axios.post(`${API_BASE_URL}/api/upgrade`);
            const { sessionId } = response.data;
            setSessionId(sessionId);

            if (socket) {
                socket.emit('start-command', { sessionId });

                socket.on('command-output', ({ sessionId: receivedSessionId, type, data, status: commandStatus }) => {
                    const timestamp = new Date().toLocaleTimeString();
                    if (receivedSessionId === sessionId) {
                        if (type === 'stdout' || type === 'stderr' || type === 'connected') {
                            setOutput((prev) => [...prev, { type, data, timestamp }]);
                        } else if (type === 'complete') { // Handle error as terminal state
                            setOutput((prev) => [...prev, { type, data, timestamp }]);
                            setIsRunning(false);
                            setIsComplete(true);
                            setStatus(commandStatus || 'success');
                            if (commandStatus === 'success') {
                                setOutput((prev) => [
                                    ...prev,
                                    {
                                        type: 'stdout',
                                        data: 'Your pNode software has been upgraded successfully. Click Restart XandMiner below. XandMiner will then be unavailable for 30 seconds, and then refresh.',
                                        timestamp: new Date().toLocaleTimeString(),
                                    },
                                ]);
                                // Set a timeout to disconnect socket if no action is taken
                                disconnectTimeoutRef.current = setTimeout(() => {
                                    console.log('Disconnecting socket due to inactivity');
                                    socket.disconnect();
                                }, 300000); // 5 minutes
                            }
                            setSessionId(null);

                        } else if (type === 'error') { // Handle error as terminal state
                            setOutput((prev) => [...prev, { type, data, timestamp }]);
                            setIsRunning(false);
                            setIsComplete(true);
                            setStatus(commandStatus || (type === 'error' ? 'error' : 'success'));
                            setSessionId(null);
                            // Set a timeout to disconnect socket for error case
                            disconnectTimeoutRef.current = setTimeout(() => {
                                console.log('Disconnecting socket due to error state');
                                socket.disconnect();
                            }, 300000); // 5 minutes
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
        if (window.confirm('Are you sure you want to terminate the installation?')) {
            if (socket && sessionId) {
                socket.emit('cancel-command', { sessionId });
                setIsRunning(false);
                setIsComplete(true);
                setStatus('cancelled');
                setSessionId(null);
            }
        }
    };

    const handleRestart = async () => {
        try {
            setIsRestarting(true);
            setCountdown(30);
            await axios.post(`${API_BASE_URL}/api/restart-xandminer`);
            const interval = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        window.location.reload();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (error) {
            console.error('Restart failed:', error.message);
            const timestamp = new Date().toLocaleTimeString();
            setOutput((prev) => [
                ...prev,
                { type: 'error', data: `Restart failed: ${error.message}`, timestamp },
            ]);
            setIsRestarting(false);
            setCountdown(null);
            setStatus('error');
        }
    };

    const handleOk = () => {
        setOutput([]);
        setIsComplete(false);
        setStatus(null);
        setSessionId(null);
        onClose();
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-full max-w-4xl min-w-[56rem] min-h-56 mx-auto p-4">
            <div className="p-6 mt-10 w-full flex flex-col items-center justify-center">
                {
                    (!isRunning || isComplete) && status !== 'success' ?
                        <div className="flex space-x-4 mb-5">
                            <button
                                onClick={startInstallation}
                                disabled={isRunning}
                                className={`px-4 py-2 rounded font-medium ${isRunning ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#129f8c] hover:bg-[#198476] text-white '
                                    }`}
                            >
                                Update pNode Software
                            </button>
                        </div>
                        :
                        null

                }
                {output.length > 0 && (
                    <pre
                        ref={outputRef}
                        className="bg-gray-900 text-gray-200 p-16 mt-4 w-full max-h-96 overflow-x-auto font-mono text-sm rounded-lg shadow-inner whitespace-pre"
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

                {isRunning && (
                    <div className="mt-10 w-full flex flex-row items-center justify-center gap-3">
                        <Loader />
                        <p className="text-gray-200 font-medium">Update is running, please wait...</p>
                    </div>
                )}

                {isComplete && status !== 'success' && (
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
                            className="px-4 py-2 bg-[#129f8c] hover:bg-[#198476] text-white rounded mt-2 "
                        >
                            OK
                        </button>
                    </div>
                )}

                {isComplete && status === 'success' && !isRestarting && (
                    <button
                        onClick={handleRestart}
                        className="px-4 py-2 rounded font-medium bg-[#129f8c] hover:bg-[#198476] text-white mt-10"
                    >
                        Restart XandMiner
                    </button>
                )}

                {isRestarting && countdown !== null && (
                    <p className="mt-4 text-gray-200">Please standby - XandMiner will restart in {countdown} seconds</p>
                )}

            </div>
        </div>
    );
}