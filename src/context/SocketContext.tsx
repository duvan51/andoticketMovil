// src/context/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextData {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextData>({} as SocketContextData);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, apiUrl, isAuth } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!isAuth || !apiUrl || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    console.log('Connecting socket to:', apiUrl);
    const newSocket = io(apiUrl, {
      transports: ['websocket'],
      query: { token },
      forceNew: true,
      autoConnect: true
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected successfully');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    newSocket.on('connect_error', (error) => {
      console.log('Socket connection error:', error.message);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [isAuth, apiUrl, token]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;
