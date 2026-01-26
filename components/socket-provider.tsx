"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"

interface SocketContextType {
    socket: Socket | null
    isConnected: boolean
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
})

export const useSocket = () => useContext(SocketContext)

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        const socketInstance = io("http://localhost:3003") // Port 3003 as per backend configuration

        socketInstance.on("connect", () => {
            console.log("[Socket] Connected to server")
            setIsConnected(true)
        })

        socketInstance.on("disconnect", () => {
            console.log("[Socket] Disconnected from server")
            setIsConnected(false)
        })

        setSocket(socketInstance)

        return () => {
            socketInstance.disconnect()
        }
    }, [])

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    )
}
